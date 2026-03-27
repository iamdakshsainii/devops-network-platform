> AWS IAM controls who can access your AWS account and what they can do.
> It is a global service — not tied to any region.

---

### 1. Users and Groups

IAM starts with identity — who are the people in your AWS account and how do you organize them. Getting this wrong from the start means either locking people out or giving them way more access than they should have.

#### The Root Account Problem

When you first create an AWS account, you get a **root account**. It has complete, unrestricted access to everything — billing, IAM, every service, every region. No restrictions, no guardrails.

A lot of people use this root account for everything. They put it in their CI/CD pipelines, share the credentials with teammates, use it for daily console access. One compromised credential and your entire AWS account is at risk — someone can delete everything, rack up massive charges, or quietly exfiltrate your data.

**The root account should be used for exactly one thing: initial account setup.** After that, create IAM users and lock the root account away. Enable MFA on it, never generate access keys for it, and don't use it again.

#### Organizing People with Users and Groups

#### One Person, One User

Every person who needs AWS access gets their own IAM **User**. This gives you a named, auditable identity for every action taken in your account. If something goes wrong — a resource deleted, a config changed — you know exactly who did it.

**Groups** let you manage permissions at scale. Instead of attaching policies to each user individually, you put users in a group and attach the policy once. Every user in the group inherits those permissions automatically.

```
Group: Developers          Group: Audit Team        Group: Operations
   Alice, Bob                  Charles                  David, Edward

Fred (no group — allowed, but not recommended)
```

Key rules:
- Groups contain **users only** — you cannot put a group inside another group
- A user can belong to **multiple groups** — Charles is in both Developers and Audit Team and gets permissions from both
- A user does not have to be in a group — but always put them in one. It is much easier to manage permissions at the group level than on individual users

---

### 2. Permissions and Policies

Having users and groups is pointless without defining what they are actually allowed to do. That is what policies are for.

#### Controlling Access with JSON Policies

#### The Overpermissioning Problem

A new developer joins your team. You give them AdministratorAccess because it is quick and easy. Three months later they accidentally delete a production S3 bucket with no versioning enabled. The data is gone.

This happens all the time. The default instinct is to give broad access so people can get things done. But **every extra permission is a risk** — accidental actions, compromised credentials, a disgruntled employee.

The correct approach is **least privilege**: give exactly the permissions the person needs for their job. Nothing more.

#### How Policies Work

Permissions are defined as **JSON documents called policies** and attached to users, groups, or roles.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:Describe*",
      "Resource": "*"
    }
  ]
}
```

Every policy statement has three parts:

| Field | What it means |
|-------|--------------|
| `Effect` | Allow or Deny — what to do when this rule matches |
| `Action` | Which AWS API calls are affected (e.g. `s3:GetObject`, `ec2:*`) |
| `Resource` | Which specific resources — use `*` for all, or an ARN for a specific one |

#### How Policies Are Inherited

Policies attach to groups and every user in that group gets them automatically. A user in multiple groups gets the combined permissions of all groups.

```
Developers group policy  ──► Alice, Bob, Charles get developer permissions
Audit Team policy        ──► Charles also gets audit permissions (he's in both)
Inline policy            ──► Fred only — attached directly on the user (not recommended)
```

Removing a user from a group immediately removes those permissions. No manual cleanup.

---

### 3. Password Policy

#### Enforcing Strong Credentials Across the Team

#### The Weak Password Problem

Left to their own devices, people use weak passwords — `Password123`, `company2024`, their own name. If an attacker gets into the AWS console with a stolen credential, they can do serious damage.

AWS lets you enforce a **Password Policy** across all IAM users in your account so you control the minimum standard everyone must meet.

You can configure:
- Minimum password length
- Required character types: uppercase, lowercase, numbers, special characters
- Allow users to change their own passwords
- Mandatory password expiration (e.g. every 90 days)
- Prevent password re-use (cannot go back to last N passwords)

This is a baseline control. It works alongside MFA — not instead of it.

---

### 4. MFA — Multi-Factor Authentication

#### Your Password Is Not Enough

#### When Credentials Get Stolen

A developer on your team works from a coffee shop on public Wi-Fi. An attacker on the same network intercepts their session and gets their AWS password. With just a password, the attacker now has full access to whatever that account can do.

**MFA stops this completely.** Even with the correct password, the attacker cannot log in without the physical device that generates the second factor.

MFA = **password you know** + **security device you own**

The password can be stolen remotely. The physical device cannot.

#### Where to Enable MFA

- Root account — mandatory, no exceptions
- All admin and privileged IAM users
- Any account with access to production

#### MFA Options in AWS

| Type | How It Works | Examples |
|------|-------------|---------|
| Virtual MFA app | App generates a 6-digit code that refreshes every 30s | Google Authenticator, Authy |
| U2F Security Key | Physical USB key — plug in and tap | YubiKey |
| Hardware Key Fob | Physical device with a rotating code on a screen | Gemalto (standard AWS) |
| Hardware Key Fob | Same, for GovCloud environments | SurePassID |

Virtual MFA via an authenticator app is the most practical. It is free, works on any phone, and is significantly better than password-only access.

---

### 5. How Users Access AWS

#### Three Ways to Interact with AWS

#### Picking the Right Access Method

Not everyone accesses AWS the same way. A developer clicking through the console is different from a deployment script running in a CI/CD pipeline. Using the wrong method creates both security and operational problems.

| Method | Protected By | Use For |
|--------|-------------|---------|
| AWS Management Console | Password + MFA | Humans using the web interface |
| AWS CLI | Access Keys | Terminal commands, automation scripts |
| AWS SDK | Access Keys | Code — Python, Node.js, Java, Go, etc. |

#### Access Keys — Handle With Care

Access Keys are the credentials used for CLI and SDK access. Each key has two parts:

```
Access Key ID     ≈  username  (safe to share)
Secret Access Key ≈  password  (never share)
```

Generated from the AWS Console. Once you close the creation dialog, you cannot see the Secret Access Key again — if you lose it, you must create a new one.

Rules for access keys:
- Never share them with anyone
- Never commit them to git — even accidentally. Automated scanners watch GitHub 24/7 for leaked AWS keys
- Never hardcode them into your application source code
- Rotate them regularly
- Deactivate immediately if you suspect a leak

The safest approach: for EC2 and Lambda, never use access keys at all. Use IAM Roles instead.

---

### 6. IAM Roles for Services

#### When AWS Services Need Permissions

#### The Hardcoded Credentials Problem

Your EC2 instance runs an app that reads from S3 and writes to DynamoDB. A developer puts AWS access keys directly in the application config file to make it work. The config file gets committed to a private GitHub repo.

Three months later the repo is accidentally made public for 10 minutes. An automated scanner finds the keys in under a minute. The AWS account is now compromised.

This is one of the most common causes of AWS security incidents. **Hardcoded credentials in application code are never the answer.**

#### How IAM Roles Fix This

An IAM Role is a set of permissions that a service can **temporarily assume**. The service requests temporary credentials automatically — no keys stored anywhere.

```
EC2 app needs to read from S3:

Wrong way:
  AWS_ACCESS_KEY_ID=AKIAXXXXX in app config → hardcoded → security risk

Right way:
  Attach IAM Role "ec2-s3-read-role" to the EC2 instance
  Role has policy: Allow s3:GetObject on my-bucket/*
  AWS SDK on EC2 automatically fetches temp credentials from instance metadata
  Credentials expire and rotate automatically
  No keys to leak. No keys to rotate manually.
```

Common roles you will use:
- **EC2 Instance Roles** — give EC2 apps access to S3, DynamoDB, Secrets Manager
- **Lambda Execution Roles** — give Lambda functions access to other AWS services
- **ECS Task Roles** — give containers access to AWS services
- **CloudFormation Roles** — allow CloudFormation to create resources on your behalf

---

### 7. IAM Security Tools

#### Auditing Your IAM Setup

#### The Permissions Drift Problem

Over time, permissions accumulate silently. A developer needed access to a service for one project — the project ended but the permissions stayed. A contractor left but their user still exists and still has active access keys. A Lambda function has permissions to 15 services but only calls 3 of them.

This is **permissions drift** — your IAM configuration gradually becomes more permissive than it needs to be. More permissions = bigger blast radius if anything goes wrong. AWS gives you two tools to catch and fix this.

#### IAM Credentials Report

An account-level snapshot of every IAM user and the state of their credentials:
- Does the user have a password? When was it last used?
- Do they have access keys? Active or inactive? When last used?
- Is MFA enabled?

Download it from the IAM console. Use it to find:
- Users who haven't logged in for months — probably left the company
- Access keys not used in 90+ days — probably unnecessary
- Users without MFA — a security gap to close

#### IAM Access Advisor

A user-level tool showing **which AWS services a specific user or role has actually accessed**, and when they last accessed each one.

If a developer has permissions for S3, EC2, RDS, and Lambda but Access Advisor shows they have only ever touched S3 in the last 90 days — safely remove the EC2, RDS, and Lambda permissions. This is least privilege in practice, not just in theory.

---

### 8. Best Practices

These are the rules that prevent most IAM incidents. They are not optional guidelines.

- Never use the root account for daily work — create admin IAM users instead
- One physical person = one IAM user — never share credentials between people
- Assign users to groups — attach policies to groups, not to individual users
- Set a strong password policy — enforce complexity and expiration
- Enable MFA on root and all admin users — no exceptions
- Use IAM Roles for services — EC2, Lambda, ECS should never have hardcoded access keys
- Never share IAM users or access keys — if someone needs access, create them their own user
- Audit regularly with Credentials Report and Access Advisor — remove what is not being used

---

### Quick Reference

```
Root Account   → Initial setup only. Never daily work. Enable MFA. No access keys.

Users          → One per real person. Password for console. Access keys for CLI/SDK.
Groups         → Contain users only. Attach policies to groups, not users directly.
Policies       → JSON documents. Effect + Action + Resource. Always least privilege.
               → Inline policies (on user directly) are not recommended.

Password Policy → Minimum length, character types, expiry, no re-use.

MFA            → Password + physical device. Mandatory on root + admins.
               → Virtual app (Authenticator) is simplest. YubiKey is strongest.

Access Methods:
  Console      → Password + MFA. For humans.
  CLI / SDK    → Access Keys. For scripts and code.
  Access Keys  → Never share. Never commit to git. Never hardcode. Rotate regularly.

Roles          → Temporary permissions for AWS services. No keys stored anywhere.
               → EC2, Lambda, ECS — always use roles, never hardcode access keys.
               → SDK reads temp credentials automatically from instance metadata.

Audit Tools:
  Credentials Report → All users + credential status. Account level.
  Access Advisor     → Which services a user actually used. Use to trim permissions.
```