# AWS — Amazon Web Services

A complete, practical reference for DevOps engineers. Covers all 14 core AWS services with architecture, flows, real-world usage, CLI commands, and comparisons.

---

## 1. IAM — Identity and Access Management

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

## 2. EC2 — Elastic Compute Cloud

> EC2 = renting a virtual computer in the cloud. That's it.
> Instead of buying a physical server, you rent one from AWS — pay only for what you use.

---

## 1. What is EC2?

EC2 stands for **Elastic Compute Cloud**. It is one of the most important AWS services — understanding EC2 is understanding how cloud computing works.

EC2 gives you the ability to:
- **Rent virtual machines** (EC2 instances)
- **Store data** on virtual drives (EBS volumes)
- **Distribute load** across machines (Elastic Load Balancer)
- **Scale automatically** based on traffic (Auto Scaling Group)

---

## 2. EC2 Configuration Options

When you launch an EC2 instance, you choose:

| Option | What it means |
|--------|--------------|
| **OS** | Linux, Windows, or Mac OS |
| **CPU** | How many cores (compute power) |
| **RAM** | How much memory |
| **Storage** | Network-attached (EBS, EFS) or hardware (EC2 Instance Store) |
| **Network card** | Speed, Public IP address |
| **Security Group** | Firewall rules — what traffic is allowed in/out |
| **User Data** | A script that runs once when the instance first boots |

---

## 3. EC2 User Data — Bootstrap Script

When your EC2 instance starts for the **very first time**, you can give it a script to run automatically. This is called **bootstrapping**.

- Runs **only once** — at first launch
- Runs as the **root user**
- Used to automate setup tasks like:
  - Installing software (nginx, git, docker)
  - Pulling application code
  - Running system updates

```bash
#!/bin/bash
# Example User Data script
yum update -y
yum install -y nginx
systemctl start nginx
systemctl enable nginx
```

Think of it as: "when this server wakes up for the first time, do these things automatically."

---

## 4. EC2 Instance Types

AWS has many instance types optimized for different needs. The naming convention works like this:

```
m5.2xlarge
│ │  └── Size (nano, micro, small, medium, large, xlarge, 2xlarge...)
│ └──── Generation (higher = newer, better)
└────── Family (what it's optimized for)
```

### Instance Families

**General Purpose** (t2, t3, m5, m6i)
- Balanced CPU, Memory, Networking
- Good for: web servers, code repos, small apps
- Course uses `t2.micro` — it's free tier eligible

**Compute Optimized** (c5, c6i)
- High-performance CPUs
- Good for: batch processing, media transcoding, gaming servers, ML inference

**Memory Optimized** (r5, r6i, x1)
- Lots of RAM for large in-memory data
- Good for: databases (MySQL, Redis), real-time big data processing

**Storage Optimized** (i3, d2)
- Fast local storage, high sequential read/write
- Good for: OLTP databases, cache servers, data warehousing

### Quick Comparison Example

| Instance | vCPU | RAM | Network |
|----------|------|-----|---------|
| t2.micro | 1 | 1 GB | Low-Moderate |
| t2.xlarge | 4 | 16 GB | Moderate |
| c5d.4xlarge | 16 | 32 GB | Up to 10 Gbps |
| r5.16xlarge | 64 | 512 GB | 20 Gbps |

---

## 5. Security Groups — Your EC2 Firewall

Security Groups are the **firewall** around your EC2 instance. They control what traffic is allowed in (inbound) and out (outbound).

```
Internet
    │
    ▼
Security Group (Firewall)
    ├── Inbound rules  → what can come IN to your EC2
    └── Outbound rules → what can go OUT from your EC2
    │
    ▼
EC2 Instance
```

### Key Facts

- Security Groups contain **Allow rules only** — you can't write Deny rules
- Rules can reference **IP addresses** or **other Security Groups**
- One Security Group can be **attached to multiple instances**
- Security Groups are **locked to a region/VPC** — different region = new SG
- If traffic is **blocked**, the EC2 instance never even sees it
- **All inbound traffic is blocked by default**
- **All outbound traffic is allowed by default**

### Common Rules to Know

```
Port 22   → SSH (log into Linux instance)
Port 21   → FTP (upload files)
Port 22   → SFTP (upload files securely via SSH)
Port 80   → HTTP (access websites)
Port 443  → HTTPS (access secure websites)
Port 3389 → RDP (log into Windows instance)
```

### Debugging tip

- App **timeout** when connecting → Security Group is blocking traffic
- App gives **"connection refused"** → Traffic reached EC2, but app isn't running or wrong port

### Referencing Security Groups (Advanced but useful)

Instead of a fixed IP, you can allow traffic from another Security Group. This is useful for internal services:

```
EC2 Instance A (Security Group 1)
    └── Inbound rule: Allow from Security Group 2

EC2 Instance B (Security Group 2)
    └── Can connect to Instance A — regardless of IP
```

This way, when you scale up (new EC2s in SG2), they automatically get access. No need to update IPs.

---

## 6. How to Connect to EC2

Three ways to connect to your EC2 instance:

| Method | OS | Notes |
|--------|-----|-------|
| **SSH** | Mac, Linux, Windows 10+ | Classic way — uses key pair |
| **Putty** | Windows | GUI SSH client for older Windows |
| **EC2 Instance Connect** | All (browser) | No key file needed, AWS handles it |

**EC2 Instance Connect** is the easiest — connects directly in your browser. Works out of the box with Amazon Linux 2. Port 22 must still be open in the Security Group.

---

## 7. EC2 Purchasing Options

This is important — it affects how much you pay. Choose based on your workload.

### On-Demand
- Pay per second (Linux/Windows) after the first minute
- No upfront cost, no commitment
- Most expensive per hour
- Best for: unpredictable workloads, short-term tasks, development

### Reserved Instances (1 or 3 years)
- Up to **72% discount** vs On-Demand
- You commit to a specific instance type, region, OS
- Payment options: No Upfront / Partial Upfront / All Upfront (biggest discount)
- **Convertible Reserved**: can change instance type/OS — up to 66% discount
- Best for: steady, always-on workloads like databases

### Savings Plans (1 or 3 years)
- Commit to a **dollar amount per hour** (e.g. $10/hr) — not a specific instance
- Up to 72% discount — same as Reserved
- More flexible: works across instance sizes and OS within a family
- Best for: long-running workloads where you want flexibility

### Spot Instances
- Up to **90% discount** — cheapest option
- AWS can **terminate your instance** anytime if someone pays more
- Not suitable for critical jobs or databases
- Best for: batch jobs, data analysis, image processing, any fault-tolerant distributed work

### Dedicated Hosts
- A **physical server** fully dedicated to you
- Allows you to use your existing server-bound software licenses (BYOL)
- Most expensive option
- Best for: compliance requirements, specific licensing needs

### Dedicated Instances
- Your instances run on hardware dedicated to you
- May share hardware with other instances in the same account
- No control over exact physical placement
- Cheaper than Dedicated Hosts

### Capacity Reservations
- Reserve On-Demand capacity in a specific Availability Zone
- No time commitment — create/cancel anytime
- No billing discount
- You pay On-Demand rate whether or not you use it
- Best for: short-term workloads in a specific AZ where you cannot afford any capacity issues

### Analogy to Remember

```
On-Demand         → Hotel: walk in, pay full price, leave anytime
Reserved          → Book room 1-3 years ahead, get big discount
Savings Plans     → Pay a fixed monthly hotel budget, use any room
Spot Instances    → Last-minute hotel deal, but hotel can kick you out
Dedicated Host    → Book the entire building — yours only
Capacity Reservation → Reserve a room at full price, even if you don't use it
```

---

## 8. Public IP vs Private IP

EC2 instances have two types of IPs:

| Type | What it is | Who can see it |
|------|-----------|---------------|
| **Public IP** | Address on the internet | Anyone on the internet |
| **Private IP** | Address inside AWS network | Only resources in same VPC |

### Important behaviour

- When you **stop and restart** an EC2 instance, the **Public IP changes**
- The **Private IP never changes**
- If your app needs a fixed public IP → use an **Elastic IP**

### Elastic IP

- A static public IPv4 address that belongs to your account
- You can attach it to an instance and it stays fixed even after stop/start
- AWS allows **5 Elastic IPs per account** (can request more)
- **Try to avoid Elastic IPs** — they are a sign of poor architecture
  - Better approach: use a Load Balancer with a DNS name
  - Or: use Route 53 with a domain name

---

## 9. EC2 Placement Groups

Placement groups let you control **where** your EC2 instances physically sit in AWS infrastructure. Three strategies:

### Cluster
- All instances in the **same rack**, same Availability Zone
- **Pros**: extremely fast network between instances (10 Gbps), ultra-low latency
- **Cons**: if the rack fails, ALL instances fail together
- **Use case**: Big Data jobs that must complete fast, HPC, apps needing very low latency

```
AZ-a
└── Rack 1
    ├── EC2
    ├── EC2
    └── EC2  ← all together, fast, risky
```

### Spread
- Each instance is on **different hardware** (different rack)
- Max 7 instances per AZ per placement group
- **Pros**: maximum isolation — one hardware failure affects only one instance
- **Cons**: limited to 7 per AZ
- **Use case**: critical applications that must be isolated from each other

### Partition
- Instances spread across **partitions** (groups of racks)
- Up to 7 partitions per AZ, up to 100s of EC2 instances
- Instances in one partition don't share hardware with another partition
- Your app can access partition info as metadata
- **Use case**: Hadoop, Cassandra, Kafka — distributed systems that need isolation but at scale

---

## 10. ENI — Elastic Network Interface

An ENI is a **virtual network card** attached to your EC2 instance. Every EC2 gets one primary ENI automatically.

Each ENI can have:
- One primary private IPv4
- One or more secondary private IPv4s
- One Elastic IP (IPv4) per private IP
- One public IPv4
- One or more security groups
- A MAC address

You can **create extra ENIs** and attach/detach them from instances. This is useful for failover — if an instance fails, detach the ENI and attach it to a new instance. The private IP moves with the ENI.

ENIs are **bound to a specific AZ**. You cannot move an ENI to a different AZ.

---

## 11. EC2 Hibernate

You already know Stop and Terminate. Hibernate is a third option.

| Action | What happens to RAM | What happens to EBS | Restart speed |
|--------|--------------------|--------------------|---------------|
| **Stop** | RAM cleared | Data kept | Slow (OS boots fresh) |
| **Terminate** | RAM cleared | Root EBS deleted | — (gone) |
| **Hibernate** | RAM saved to EBS | Data kept | Fast (RAM restored) |

### How Hibernate Works

```
Running instance
    │
    ▼ Hibernate
RAM contents written to root EBS volume
    │
    ▼ Instance stops (not billed for compute)
    │
    ▼ Start again
EBS contents loaded back into RAM
OS does NOT reboot — continues from exactly where it was
```

### Things to Know

- Root EBS volume **must be encrypted**
- RAM must be **less than 150 GB**
- Supported on: C3, C4, C5, I3, M3, M4, R3, R4, T2, T3...
- Works with On-Demand and Reserved Instances
- An instance **cannot hibernate for more than 60 days**
- Use case: long-running processes, saving RAM state, slow-to-initialize apps

---

## Quick Reference

```
EC2            → Virtual server in the cloud
User Data      → Script that runs once on first boot
Instance Types → t = general, c = compute, r = memory, i = storage
Security Group → Firewall. Inbound blocked by default. Outbound open.
Port 22        → SSH. Port 80 → HTTP. Port 443 → HTTPS. Port 3389 → RDP
Connect        → SSH / Putty / EC2 Instance Connect (browser)

Pricing:
  On-Demand    → Pay per second. No commitment. Most flexible.
  Reserved     → 1-3 year commitment. Up to 72% discount.
  Spot         → Up to 90% off. Can be interrupted. Fault-tolerant work only.
  Dedicated    → Physical isolation. Compliance or licensing needs.

Public IP      → Changes on stop/start
Private IP     → Stays the same always
Elastic IP     → Fixed public IP. Max 5. Avoid if possible — use ALB + DNS.

Placement:
  Cluster      → Same rack. Fast. One failure = all down.
  Spread       → Different racks. Isolated. Max 7 per AZ.
  Partition    → Groups of racks. For distributed systems (Kafka, Hadoop).

Hibernate      → Saves RAM to EBS. Fast resume. Max 60 days. EBS must be encrypted.
```

## 3. EBS  Volume, EC2 Instance Store, AMI in Depth 

## 1. EBS Volumes

Amazon Elastic Block Store (EBS) is a network drive you attach to your EC2 instances while they run. It lets your instance **persist data** even after it stops or terminates — solving one of the most painful early mistakes people make on AWS.

### What EBS Actually Is

#### The Data Loss Problem

Imagine you are a developer at a small company. You set up an EC2 instance, install your application, configure nginx, and write some user data to the local disk. Everything runs great for weeks.

Then one day the instance gets accidentally terminated. You spin up a new one — and everything is gone. The config, the files, the logs. Wiped. Because EC2's built-in storage is not designed to survive a termination.

**That is the problem EBS solves.** It is a separate network-attached drive that holds your data independently of the instance's own lifecycle.

#### How It Works

EBS is not a physical disk plugged into your server. It connects over AWS's internal network — like a USB drive, but over the network. This has two consequences:

- There can be a small amount of latency since every read/write is a network call
- You can **detach it from one EC2 and re-attach it to another** without losing data

```
EC2 Instance A (crashed or terminated)
    └── EBS Volume (still intact, floating free)
              │
              ▼ attach
EC2 Instance B (new instance)
    └── EBS Volume (data fully preserved)
```

#### The Rules You Must Know

| Rule | Detail |
|------|--------|
| One volume → one EC2 | A single EBS volume attaches to one instance at a time |
| Locked to one AZ | A volume in `ap-south-1a` cannot attach to EC2 in `ap-south-1b` |
| Provisioned capacity | You pay for what you provision, not what you use |
| Scalable | You can increase the size over time without downtime |

---

### Delete on Termination

#### What Happens When Your EC2 Terminates

By default, AWS behaves like this when an EC2 instance is terminated:

| Volume | Default Behaviour |
|--------|-------------------|
| Root volume (OS disk) | **Deleted** automatically |
| Any additional EBS volumes | **Kept** — not deleted |

This default makes sense most of the time. But there is a scenario where it causes problems.

#### Preserving the Root Volume

Say your DevOps team runs a production server. The root volume contains application config files and recent logs that aren't backed up anywhere else. Someone accidentally terminates the instance.

By default — the root volume is gone.

**The fix**: when launching the instance, turn off "Delete on Termination" for the root volume. Now if the instance is ever terminated, the root EBS volume survives. You can attach it to a new EC2 and recover everything.

You control this from the AWS Console at launch time, or via the CLI:

```bash
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --block-device-mappings \
  '[{"DeviceName":"/dev/xvda","Ebs":{"DeleteOnTermination":false}}]'
```

---

### EBS Snapshots

#### The AZ Lock Problem

EBS volumes are locked to a single Availability Zone. This creates two real problems:

1. **Disaster recovery**: if `ap-south-1a` has an outage, your volume is inaccessible
2. **Migration**: you cannot simply move a volume to a different AZ or region

Snapshots are how you solve both.

#### How Snapshots Work

A snapshot is a **point-in-time backup** of your entire EBS volume stored in S3 (AWS-managed, not your S3 bucket). You don't need to detach the volume first — but it's recommended for consistency.

Snapshots are **incremental** — the first one copies everything, and each one after that only copies what changed. This makes them fast and cost-efficient.

```
EBS Volume (50 GB) — ap-south-1a
    │
    ▼ Create Snapshot
EBS Snapshot (stored at region level in S3)
    │
    ├──► Restore as new EBS volume in ap-south-1a   (same AZ)
    ├──► Restore as new EBS volume in ap-south-1b   (move to different AZ)
    └──► Copy snapshot to ap-southeast-1 → restore  (move to different region)
```

This is the **only way to move an EBS volume across AZs or Regions**.

#### Snapshot Archive

Old snapshots still cost money. If your company policy requires keeping database backups for one year (compliance), those snapshots silently rack up storage costs.

**Solution**: move old snapshots to the **Archive tier**. It is 75% cheaper than standard snapshot storage. The trade-off is that restoring from archive takes **24 to 72 hours** — so only archive snapshots you are keeping for compliance and are unlikely to ever restore in a hurry.

#### Recycle Bin

A junior engineer on your team runs a cleanup script. It accidentally deletes a critical EBS snapshot. It's gone — along with the only recent backup of your production database.

**Solution**: enable the **Recycle Bin**. Deleted snapshots go into the bin instead of being permanently erased. You set the retention window — anywhere from 1 day to 1 year. Within that window you can recover it. After it — it's gone for real.

This is one of those features you should enable before you need it.

#### Fast Snapshot Restore

You restore a snapshot during an incident. The new EBS volume is created — but for the first few minutes, reads are painfully slow. AWS loads the data **lazily** from S3, fetching blocks on-demand as you read them. During an outage, this delay is unacceptable.

**Fast Snapshot Restore (FSR)** forces the entire volume to be pre-initialized so there is **zero latency from the first read**. It costs more — use it only on critical volumes where you cannot tolerate a slow cold start after a restore.

---

## 2. EC2 Instance Store

EBS is a network drive — solid, persistent, reliable. But "network" means there is always a hop between your instance and the disk. For most workloads this is fine. For extremely high-throughput I/O, it becomes a bottleneck.

### When Network Storage Is Not Enough

#### The High I/O Problem

Imagine you are running a video transcoding pipeline. Each EC2 instance takes a raw video, decodes it, applies filters, re-encodes it, and outputs the result. During processing, it reads and writes gigabytes of intermediate frames every second.

EBS can technically handle this — but the network latency adds up. You are doing millions of small I/O operations and every single one involves a network round-trip.

**Instance Store solves this.** It is a physical hard drive directly attached to the physical server your EC2 runs on. No network hop — as fast as a disk can possibly be.

#### What You Get and What You Lose

| Feature | EBS | EC2 Instance Store |
|---------|-----|--------------------|
| Type | Network drive | Physical disk (local) |
| Performance | Good | Very high |
| Data survives stop? | Yes | **No — wiped immediately** |
| Data survives terminate? | Configurable | **No — always gone** |
| Backup options | Snapshots | None built-in — your responsibility |
| Use for | All persistent data | Temp files, cache, buffers |

The moment your EC2 instance **stops or terminates**, everything on Instance Store is permanently deleted. AWS does not snapshot it. There is no recycle bin. It is gone.

This is called **ephemeral storage**.

#### Correct vs Incorrect Usage

```
Wrong:
  Developer stores application logs on Instance Store
  "It's just fast local disk, right?"
  Instance gets stopped for maintenance
  All logs: gone. No recovery. Ever.

Correct:
  Use Instance Store for: temp video frames, ML batch cache,
  database buffer pool, scratch space during a job
  Use EBS for: anything you need after the job is done
```

If the data is recreatable and only exists during the lifetime of a single job — Instance Store is perfect. If there is any chance you need it later — use EBS.

---

## 3. AMI — Amazon Machine Image

### The Repeated Setup Problem

#### Slow and Fragile Deployments

Your team is growing. You need to launch 10 new backend EC2 instances. Each one needs:

- Amazon Linux 2
- Docker installed and configured
- nginx with your custom config
- CloudWatch agent running
- Your app's environment variables set
- A specific version of Node.js

You write a User Data bootstrap script that does all of this. It works — but it takes 8-10 minutes per instance to run. If anything fails mid-script (a package repo is down, a network timeout), the instance boots in a broken state and you don't find out until something starts failing in production.

Scale this to 50 instances during a traffic spike with Auto Scaling? You are waiting 10 minutes for each new instance to become ready — while users are hitting errors.

**AMI solves this by baking the setup in advance.**

### What an AMI Is

An AMI (Amazon Machine Image) is a **pre-packaged snapshot of an EC2 instance** — the OS, installed software, configuration, agents, everything. When you launch from an AMI, your instance starts up **already configured**. No scripts running. No waiting. No chance of a broken boot.

```
Without AMI (User Data approach):
  Launch EC2 → run bootstrap script → 8-10 min → finally ready
  Scale to 10 instances → 8-10 min each → risky, slow

With custom AMI:
  Configure ONE instance perfectly → Create AMI
  Launch 10 instances from that AMI → ready in under 1 minute
  All 10 are identical. No scripts. No surprises.
```

### Types of AMIs

| Type | Created By | When to Use |
|------|-----------|-------------|
| **Public AMI** | AWS | Starting points — Amazon Linux 2, Ubuntu 22.04, Windows Server |
| **Custom AMI** | You | Your software pre-installed, your config baked in |
| **Marketplace AMI** | Third-party vendors | Pre-hardened security images, licensed software (sometimes paid) |

For most real DevOps work, you start from a Public AMI, configure it the way you need, and then save your own Custom AMI.

### Building Your Own AMI

#### Step-by-Step Process

```
Step 1: Launch an EC2 using a base Public AMI (Amazon Linux 2)
           │
Step 2: SSH in and configure everything
         - Install Docker, nginx, your dependencies
         - Set environment variables, configure agents
           │
Step 3: Stop the instance
         (stopping ensures the filesystem is in a clean, consistent state)
           │
Step 4: Create AMI
         - AWS automatically snapshots all attached EBS volumes
         - Those snapshots become the AMI's backing storage
           │
Step 5: Launch as many instances as you want from your custom AMI
         - Fast startup, identical configuration every time
         - Works with Auto Scaling Groups — new instances are ready fast
```

#### AMI and Regions

AMIs are **region-specific**. An AMI you create in `ap-south-1` only exists in `ap-south-1`. If your team needs the same image in Singapore (`ap-southeast-1`), you copy the AMI to that region — AWS copies the underlying EBS snapshots automatically.

```bash
# Copy AMI to another region
aws ec2 copy-image \
  --source-image-id ami-0abcdef1234567890 \
  --source-region ap-south-1 \
  --region ap-southeast-1 \
  --name "my-app-ami-copy"
```

#### AMI in an Auto Scaling Group

This is where AMIs become critical in production. Your Auto Scaling Group launches new instances automatically when traffic spikes. If each instance takes 10 minutes to bootstrap via User Data — your scaling is too slow to help.

With a custom AMI:

```
Traffic spike detected
  → ASG launches new instance from custom AMI
  → Instance boots in ~60 seconds, already configured
  → Registers with Load Balancer
  → Starts serving traffic

vs. User Data approach:
  → Instance boots → runs 10-minute script → becomes ready
  → Spike may already be over by the time the instance is useful
```

---

## 4. EBS Volume Types

Not all EBS volumes are the same. AWS offers different types optimized for different workloads. Choosing the wrong one either wastes money or creates a performance bottleneck.

### Choosing the Right Volume

#### The Mismatch Problem

A team runs a PostgreSQL database on a `gp2` volume. As their data grows, they start seeing slow query times during peak hours. They assume it's the database — they tune queries, add indexes. Still slow.

The real problem: `gp2` IOPS are tied to volume size (3 IOPS per GB). Their 100GB volume only gets 300 IOPS — completely insufficient for a production database.

**Moving to `gp3` or `io2` with explicitly configured IOPS fixes this immediately.**

#### Volume Types Compared

| Type | Category | Max IOPS | Max Throughput | When to Use |
|------|----------|----------|----------------|-------------|
| **gp3** | SSD | 16,000 | 1,000 MB/s | Default choice for almost everything |
| **gp2** | SSD | 16,000 | 250 MB/s | Older, avoid for new workloads |
| **io1 / io2** | SSD | 64,000 | 1,000 MB/s | High-performance databases, critical apps |
| **st1** | HDD | 500 | 500 MB/s | Big data, log processing, sequential reads |
| **sc1** | HDD | 250 | 250 MB/s | Cold data, infrequent access, cheapest |

**Default rule**: always use `gp3` for new volumes. It is cheaper than `gp2` and lets you configure IOPS and throughput independently — you are not locked into the 3 IOPS/GB limitation.

Only upgrade to `io2` when you need more than 16,000 IOPS — typically large relational databases under heavy load.

---

## Quick Reference

```
EBS Volume
  Network drive attached to EC2
  One volume per EC2 at a time
  Locked to one Availability Zone
  Data persists after instance stop/terminate
  Pay for provisioned size regardless of usage
  Default: root volume deleted on termination, extra volumes kept

EBS Snapshots
  Point-in-time backup stored in S3 (AWS-managed)
  Incremental — only changes are stored after first snapshot
  Only way to move a volume across AZs or Regions
  Archive: 75% cheaper, 24-72hr restore time
  Recycle Bin: recover accidental deletes (1 day – 1 year window)
  FSR: zero cold-start latency on restore, costs extra

EC2 Instance Store
  Physical disk inside the server — no network hop
  Very fast — highest I/O performance possible
  Ephemeral: data wiped on stop or terminate
  No built-in backup — you manage replication
  Use for: temp files, cache, buffers, scratch data
  Never for: logs, user data, anything you need after the job

AMI — Amazon Machine Image
  Pre-packaged EC2 image with OS + software + config baked in
  Faster and more reliable than bootstrap scripts
  Region-specific — copy to move across regions
  Types: Public (AWS) / Custom (yours) / Marketplace (third-party)
  Build: Launch → Configure → Stop → Create AMI → Launch many
  Critical for Auto Scaling Groups — fast instance readiness

EBS Volume Types
  gp3 → default, best value, IOPS configurable independently
  gp2 → avoid for new workloads
  io1/io2 → high-perf databases needing 16,000+ IOPS
  st1 → sequential big data reads (HDD)
  sc1 → cold, infrequent access (cheapest)
```

## 4. EFS — Elastic File System


### What is EFS?

EFS is a managed NFS (Network File System). Unlike EBS (one EC2), EFS can be mounted by hundreds of EC2 instances simultaneously — across multiple Availability Zones.

---

### Architecture

```
                    ┌────────────────────────────────┐
                    │           EFS File System        │
                    │   (automatically scales, HA)     │
                    └──────────────┬─────────────────┘
                                   │ NFS (port 2049)
              ┌────────────────────┼────────────────────┐
              │                    │                    │
         EC2 (AZ-a)           EC2 (AZ-b)          EC2 (AZ-c)
         /mnt/efs             /mnt/efs             /mnt/efs
              │                    │                    │
              └── All see the same shared files ────────┘
```

---

### Storage Classes

| Class | Use case | Cost |
|-------|----------|------|
| **Standard** | Frequently accessed files | Higher |
| **Infrequent Access (IA)** | Rarely accessed files | 92% lower |
| **Archive** | Almost never accessed | Even lower |

Use **Lifecycle Management** to automatically move files to IA after 30 days.

---

### Mount EFS on EC2

```bash
# Install the EFS mount helper (Amazon Linux)
sudo yum install -y amazon-efs-utils

# Create mount point
sudo mkdir /mnt/efs

# Mount using EFS helper (handles TLS automatically)
sudo mount -t efs -o tls fs-12345678:/ /mnt/efs

# To auto-mount on reboot, add to /etc/fstab
echo "fs-12345678:/ /mnt/efs efs defaults,_netdev,tls 0 0" | sudo tee -a /etc/fstab
```

---

### EBS vs EFS — When to use what

| Scenario | Use |
|----------|-----|
| Single EC2 app data | EBS |
| Shared config/assets across multiple EC2s | EFS |
| Container (ECS/EKS) shared storage | EFS |
| Database files | EBS (io1/io2) |
| Static web content shared across fleet | EFS or S3 |

---



## 5. Load Balancers — ELB, ALB, NLB, GWLB

> **Official AWS Docs**: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html

---

## 1. Why Load Balancers Exist

### The Problem

Your e-commerce app is running on a single EC2 instance. Black Friday arrives. Traffic spikes 10x. Your one server starts dropping requests, response times climb, and eventually — it crashes. Every user sees a 502 error. Sales stop.

Even on a normal day, what happens when your EC2 instance needs a restart for a security patch? Every user gets an outage.

```
Without a Load Balancer:
  1000 users ──────────────────────► EC2 Instance (overwhelmed, crashes)
                                      Downtime = everyone affected

With a Load Balancer:
  1000 users ──► Load Balancer ──► EC2 Instance A (healthy)
                              ├──► EC2 Instance B (healthy)
                              └──► EC2 Instance C (being patched — removed)
                                   No downtime. Traffic distributed.
```

### What a Load Balancer Actually Does

A load balancer is a server that sits in front of your application servers and forwards incoming requests to them. Users never talk to your EC2 instances directly — they talk to the load balancer, and the load balancer decides which backend server handles each request.

This gives you:

- **Traffic distribution** — no single server gets overwhelmed
- **Single access point** — one DNS name for your whole app (`myapp.com`) regardless of how many servers are behind it
- **Health checking** — LB continuously checks each server. If one fails, traffic stops going to it automatically — no manual intervention
- **SSL termination** — HTTPS is handled at the LB. Your EC2 instances only deal with plain HTTP internally
- **High availability** — runs across multiple Availability Zones. If one AZ goes down, traffic goes to healthy AZs
- **Stickiness** — same user can always be routed to the same server (important for session data)
- **Separation of public and private traffic** — your EC2 instances stay private. Only the LB is public-facing

### Why Use AWS ELB Instead of Your Own

You could install nginx or HAProxy on an EC2 and do load balancing yourself. The problem is you now need to manage that server — patches, scaling, availability, certificates. AWS ELB is a **managed service**:

- AWS guarantees it is working and highly available
- AWS handles maintenance and upgrades
- Integrated natively with EC2, Auto Scaling Groups, ECS, ACM, CloudWatch, Route 53, WAF, Global Accelerator
- You configure it — AWS runs it

The tradeoff: ELB costs more per hour than a self-managed nginx. But the operational savings far outweigh the cost difference at any meaningful scale.

---

## 2. Health Checks — How LB Knows Who is Alive

### The Problem

You have 3 EC2 instances behind your load balancer. One of them has a memory leak — it is still running but the application inside is deadlocked and returning 500 errors to every user. The LB still sends traffic to it because the server is technically "up."

### The Solution — Health Checks

Health checks are the mechanism the load balancer uses to decide whether each backend instance can actually handle requests.

```
Load Balancer checks every instance on a schedule:
  Protocol : HTTP
  Port     : 4567 (your app port)
  Path     : /health  (a dedicated health endpoint)
  Interval : every 30 seconds

Response from instance:
  200 OK           → instance is healthy → keep sending traffic
  Non-200 / Timeout → instance is unhealthy → stop sending traffic
                      after 3 consecutive failures
  Recovers → 200 OK → instance is healthy again → add back automatically
```

Your application needs to expose a `/health` endpoint that returns 200 when everything is fine. This endpoint should check what your app actually depends on — database connection, cache connection, any critical dependency. A server that is running but cannot reach its database should return a non-200 so the LB stops sending it traffic.

```
Good /health endpoint logic:
  Can I connect to the database?  → Yes
  Can I connect to Redis?         → Yes
  Is my disk usage below 95%?     → Yes
  Return: 200 OK { "status": "healthy" }

  Any check fails → Return: 503 Service Unavailable
  LB sees non-200 → removes this instance from rotation
```

---

## 3. Types of Load Balancers on AWS

AWS has 4 types. Three are actively used. One is deprecated.

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLB  — Classic Load Balancer    (v1, 2009)  Layer 4 + 7            │
│         Old generation. Deprecated. Do not use for new workloads.   │
│                                                                      │
│  ALB  — Application Load Balancer (v2, 2016) Layer 7 (HTTP/HTTPS)  │
│         Smart routing. Best for web apps, microservices, containers. │
│                                                                      │
│  NLB  — Network Load Balancer    (v2, 2017)  Layer 4 (TCP/UDP)      │
│         Extreme performance. Static IP. Non-HTTP traffic.           │
│                                                                      │
│  GWLB — Gateway Load Balancer    (2020)      Layer 3 (IP Packets)   │
│         Security appliances. Firewalls, IDS/IPS inspection.         │
└─────────────────────────────────────────────────────────────────────┘
```

Load balancers can be **external** (public-facing, accessible from the internet) or **internal** (private, accessible only within your VPC for service-to-service communication).

---

## 4. Security Groups for Load Balancers

### The Setup That Actually Secures Your EC2

Most people make the mistake of leaving EC2 ports open to the internet and also putting a load balancer in front. This defeats the purpose — an attacker can bypass your LB and hit EC2 directly.

The correct setup:

```
Internet
    ↓ port 80/443 from anywhere (0.0.0.0/0)
Load Balancer Security Group
    ↓ port 80 ONLY from Load Balancer Security Group
EC2 Security Group
    ↓
EC2 Instance

Internet → EC2 directly → BLOCKED (no rule allowing it)
Internet → LB → EC2     → ALLOWED (LB SG is the source)
```

**Load Balancer Security Group rules:**

| Type | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| HTTP | TCP | 80 | 0.0.0.0/0 | Allow all internet HTTP |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Allow all internet HTTPS |

**EC2 Security Group rules:**

| Type | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| HTTP | TCP | 80 | LB Security Group ID | Only traffic from the LB |

The source for EC2's inbound rule is the **Load Balancer's Security Group ID** — not an IP address. This means only traffic arriving from the LB gets through, regardless of what IP it came from.

---

## 5. Application Load Balancer (ALB) — Layer 7

### What Makes ALB Different

ALB operates at Layer 7 — the application layer. It actually reads and understands your HTTP request. It can look at the URL path, the hostname, the query string, and the HTTP headers — and make intelligent routing decisions based on what it sees.

This is what makes ALB the right choice for microservices. One ALB can replace many separate load balancers.

```
One ALB, multiple microservices:

myapp.com/users   ──► Target Group: User Service  (3 EC2 instances)
myapp.com/orders  ──► Target Group: Order Service (2 EC2 instances)
myapp.com/search  ──► Target Group: Search Service (1 Lambda function)

Without ALB: You need 3 separate load balancers = 3x the cost
With ALB   : One LB, path-based routing, fraction of the cost
```

### ALB Routing Rules — 4 Ways to Route

**1. Path-based routing** — route based on the URL path

```
myapp.com/users        → User Service
myapp.com/posts        → Post Service
myapp.com/admin        → Admin Service
myapp.com/*            → Default (catch-all)
```

**2. Hostname-based routing** — route based on domain or subdomain

```
one.example.com        → Target Group 1
other.example.com      → Target Group 2
admin.example.com      → Admin Target Group
```

**3. Query string / parameter routing** — route based on URL parameters

```
example.com/app?Platform=Mobile   → Mobile Target Group (AWS EC2)
example.com/app?Platform=Desktop  → Desktop Target Group (On-premises)
```

**4. HTTP header routing** — route based on request headers (User-Agent, custom headers, etc.)

```
User-Agent: Mobile-App/1.0   → Mobile backend
User-Agent: Web-Browser      → Web backend
```

### ALB Target Groups — Where Traffic Goes

A Target Group is a collection of destinations. ALB routes to a target group, and the target group distributes among its members.

```
Target Group types:
  EC2 Instances     → standard servers, can be part of an Auto Scaling Group
  ECS Tasks         → containers managed by ECS, dynamic port mapping
  Lambda Functions  → ALB converts HTTP request → JSON event → Lambda
  IP Addresses      → private IPs only (useful for on-premises servers via VPN)

Target Group features:
  Health checks configured at the Target Group level (not LB level)
  ALB can route to multiple different target groups simultaneously
  Each TG can have different health check settings
```

### ALB — Good to Know

**Fixed hostname**: ALB gives you a DNS name like `XXX.region.elb.amazonaws.com`. This is what you point your Route 53 CNAME or Alias record to. ALB does not give you a static IP address.

**Client IP**: When ALB forwards a request to EC2, the EC2 sees the ALB's IP — not the client's real IP. The real client IP is in the `X-Forwarded-For` header. Your app must read this header if you need the actual user IP.

```
Client IP: 12.34.56.78
    ↓
ALB (adds headers):
    X-Forwarded-For: 12.34.56.78    ← original client IP
    X-Forwarded-Port: 443           ← original port
    X-Forwarded-Proto: https        ← original protocol
    ↓
EC2 sees request from ALB's private IP
EC2 reads X-Forwarded-For to get the real client IP
```

**HTTP/2 and WebSocket**: ALB supports both natively. Useful for real-time apps.

**HTTP to HTTPS redirect**: ALB can redirect all HTTP traffic to HTTPS with a simple redirect rule — no code change in your application.

> **Official ALB Docs**: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html

---

## 6. Network Load Balancer (NLB) — Layer 4

### The Problem ALB Cannot Solve

A gaming company runs game servers that communicate over TCP (not HTTP). They need to handle 5 million concurrent connections with sub-millisecond latency. ALB's processing overhead at Layer 7 is too slow for this use case. Also, their enterprise clients need to whitelist specific IP addresses in their firewalls — but ALB's IP changes and you cannot predict it.

### NLB — Pure TCP/UDP at Extreme Speed

NLB operates at Layer 4. It does not read your HTTP request. It just forwards TCP and UDP packets directly to your targets. This makes it:

- Capable of handling **millions of requests per second**
- Ultra-low latency — approximately **100 microseconds** (ALB is ~1ms+)
- **One static IP per Availability Zone** — you can also assign Elastic IPs
- Supports TCP, UDP, TLS protocols

```
Use NLB when:
  ✓ You need a static, predictable IP address (client whitelisting)
  ✓ Your traffic is TCP or UDP (not HTTP/HTTPS)
  ✓ You need extreme throughput (millions req/sec)
  ✓ Ultra-low latency is critical (gaming, financial trading, IoT)
  ✓ You need to put NLB in front of ALB (get static IP + smart routing)

Use ALB instead when:
  ✗ You have web apps with HTTP/HTTPS
  ✗ You need path/hostname-based routing
  ✗ You are working with microservices or containers
```

### NLB Target Groups

```
EC2 Instances    → standard servers
IP Addresses     → private IPs only (on-premises servers)
ALB              → chain NLB → ALB to combine static IP + HTTP routing
```

Health checks for NLB support TCP, HTTP, and HTTPS protocols.

### NLB — Key Difference from ALB

NLB does NOT add `X-Forwarded-For` header — it operates below the HTTP layer. Your backend sees the actual client IP directly (passthrough). NLB also does not use Security Groups by default — access control happens at the EC2 security group level.

> **Official NLB Docs**: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html

---

## 7. Gateway Load Balancer (GWLB) — Layer 3

### The Problem

Your company processes financial transactions. Compliance requires all traffic to pass through a third-party network firewall and intrusion detection system (IDS) before reaching your application. How do you make every packet flow through these security appliances transparently — without changing how users connect?

### GWLB — Transparent Security Inspection

GWLB sits at the network layer (Layer 3 — IP packets). Every packet entering your network is routed through GWLB, which sends it to a fleet of security appliances (firewalls, IDS/IPS, deep packet inspection tools). If the packet passes inspection, GWLB forwards it to your application. If it is malicious, the appliance drops it.

```
Traffic flow with GWLB:

Internet Users (traffic)
       ↓
Route Table (configured to send all traffic to GWLB)
       ↓
Gateway Load Balancer (single entry point)
       ↓
Target Group: Security Appliances (your 3rd party firewall fleet)
       ↓ (traffic inspected — safe or malicious?)
       ├── Safe traffic → forwarded to your application
       └── Malicious → dropped by appliance

Your Application (only sees pre-screened traffic)
```

This is **transparent** — the user's connection appears unbroken. They do not know their traffic is being inspected.

GWLB uses the **GENEVE protocol on port 6081** to encapsulate traffic between itself and the appliance fleet.

Target groups: EC2 instances or private IP addresses running the security software.

> **Official GWLB Docs**: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/introduction.html

---

## 8. Sticky Sessions (Session Affinity)

### The Problem

A user adds items to their shopping cart. The cart is stored in memory on EC2 Instance A (not in a database). The next request from the same user goes to EC2 Instance B — their cart is gone. The user is furious.

### The Solution — Stickiness

Sticky sessions ensure the same user always gets routed to the same EC2 instance. The LB issues a cookie to the user's browser on the first request. Every subsequent request includes that cookie, and the LB reads it to send the request to the same instance.

```
User 1 (first visit) → LB assigns → EC2 Instance A → cookie set
User 1 (next visit)  → LB reads cookie → EC2 Instance A (same one, always)

User 2 (first visit) → LB assigns → EC2 Instance B → cookie set
User 2 (next visit)  → LB reads cookie → EC2 Instance B (same one, always)
```

Stickiness works for **CLB, ALB, and NLB**.

### Cookie Types

**Application-based cookies** — your application generates and controls the cookie:
- *Custom cookie*: created by your target (your app). Can include custom attributes. Do not use reserved names: `AWSALB`, `AWSALBAPP`, `AWSALBTG`
- *Application cookie*: created by the ALB itself. Cookie name: `AWSALBAPP`

**Duration-based cookies** — the load balancer generates and controls the cookie:
- ALB cookie name: `AWSALB`
- CLB cookie name: `AWSELB`
- You set the expiration time (minutes to 7 days)

### The Tradeoff

Stickiness can cause **uneven load distribution**. If one instance gets most of the sticky users and another gets very few, you lose the benefit of load balancing. A better long-term solution is to store session data in a shared store (Redis on ElastiCache or DynamoDB) so any instance can serve any user — and you don't need stickiness at all.

---

## 9. Cross-Zone Load Balancing

### The Problem

You have an ALB with 2 nodes — one in AZ-A, one in AZ-B. You have 2 EC2 instances in AZ-A and 8 EC2 instances in AZ-B. Without cross-zone load balancing, each AZ node distributes traffic only to instances in its own zone:

```
WITHOUT Cross-Zone Load Balancing:
  AZ-A LB Node receives 50% of traffic → distributes to 2 instances = 25% each
  AZ-B LB Node receives 50% of traffic → distributes to 8 instances = 6.25% each

  AZ-A instances: 25% load each (overloaded)
  AZ-B instances: 6.25% load each (underutilized)
  Uneven. Wasteful.

WITH Cross-Zone Load Balancing:
  Each LB node distributes traffic evenly across ALL 10 instances in all AZs
  Each instance gets 10% of traffic
  Even. Efficient.
```

### Default Behavior by LB Type

| LB Type | Cross-Zone Default | Cost for Inter-AZ Data |
|---|---|---|
| **ALB** | Always ON | No charge |
| **NLB** | OFF by default | You pay for inter-AZ data if enabled |
| **GWLB** | OFF by default | You pay for inter-AZ data if enabled |
| **CLB** | OFF by default | No charge if enabled |

For ALB — cross-zone is always on and free. For NLB and GWLB, enabling it has a data transfer cost — worth it for even distribution, but know the cost is there.

---

## 10. SSL/TLS — HTTPS at the Load Balancer

### The Problem

Your app currently runs on HTTP. Every request between your users and your servers is unencrypted. Passwords, session tokens, personal data — all transmitted in plain text. Google also penalizes non-HTTPS sites in search rankings.

You need HTTPS. But managing SSL certificates on every EC2 instance is painful — you have to install, renew, and rotate certificates on each server manually.

### SSL Termination at the Load Balancer

The LB handles HTTPS. Users connect to the LB over HTTPS (encrypted). The LB decrypts the request and forwards it to your EC2 instances over plain HTTP (within your private VPC — this is safe).

```
User
  ↓ HTTPS (encrypted) — public internet
Load Balancer (SSL termination here — decrypts)
  ↓ HTTP (unencrypted) — private VPC network
EC2 Instance

Benefits:
  - One SSL certificate managed in one place
  - EC2 instances don't handle encryption overhead
  - Certificate renewal happens at LB level only
  - Use AWS Certificate Manager (ACM) for free, auto-renewing certificates
```

### SSL Certificates

The LB uses an **X.509 certificate** (the standard SSL/TLS server certificate). You manage certificates via:
- **AWS Certificate Manager (ACM)** — free certificates, automatically renewed, deeply integrated with ALB/NLB. Best option for most cases.
- **Upload your own certificate** — if you have certificates from a third-party CA (Comodo, DigiCert, GoDaddy, Let's Encrypt)

HTTPS listeners require you to specify a default certificate. You can add multiple certificates to support multiple domains.

### SNI — Server Name Indication

### The Problem

You have one ALB serving three different domains:
- `shop.example.com`
- `api.example.com`
- `admin.example.com`

Each domain needs its own SSL certificate. How does the LB know which certificate to present to a user connecting to `shop.example.com` vs `api.example.com`?

### The Solution — SNI

SNI (Server Name Indication) is a TLS extension where the client tells the server **which hostname it is trying to reach** at the start of the TLS handshake — before any HTTP happens. The server reads this, picks the right certificate, and presents it.

```
User browser connects to ALB:
  TLS handshake begins
  Client says: "I'm connecting to shop.example.com"
  ALB reads the SNI hostname
  ALB selects: shop.example.com certificate
  TLS established with the correct certificate
  User sees no error
```

SNI works on **ALB and NLB only**. CLB does not support SNI — you need one CLB per domain if you are using the old generation.

### SSL Certificates per LB Type

| LB Type | SSL Support |
|---|---|
| **CLB (v1)** | One SSL certificate only. Multiple domains = multiple CLBs |
| **ALB (v2)** | Multiple SSL certificates via SNI. Multiple domains = one ALB |
| **NLB (v2)** | Multiple SSL certificates via SNI. Multiple domains = one NLB |

> **Official SSL/TLS Docs**: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html

---

## 11. Connection Draining

### The Problem

You are deploying a new version of your application. You deregister an EC2 instance from the load balancer to stop it from receiving new traffic. But that instance is currently handling 200 in-flight requests — users in the middle of checkouts, file uploads, long API calls. If you terminate it immediately, all 200 requests fail and those users get errors.

### The Solution — Connection Draining

Connection Draining (called **Deregistration Delay** in ALB and NLB) tells the LB to:
1. Stop sending **new** requests to the instance being deregistered
2. Allow **existing** in-flight requests to complete
3. Only fully remove the instance after the drain period expires

```
You deregister EC2 Instance B from the LB:
  
  New requests → LB → Instance A and C only (B excluded)
  
  Existing requests on Instance B:
    → Still being processed
    → LB waits up to 300 seconds (default)
    → Requests complete → instance safely terminated
    
  After drain period:
    → Instance B has zero active connections
    → Safe to stop or terminate
```

The drain period is configurable from **1 to 3600 seconds** (default: 300 seconds / 5 minutes).

Set it to a **low value** (10-30 seconds) if your requests are short-lived (standard REST APIs). Set it higher if your app handles long operations (file uploads, reports, video processing).

Set it to **0** to disable draining entirely — the instance is removed immediately and in-flight requests will fail. Only do this if you are okay with request failures during deployments.

---

## 12. Auto Scaling Group — Working with Load Balancers

### The Problem

Your load balancer distributes traffic perfectly across 3 EC2 instances. Then 10,000 more users arrive for a product launch. Your 3 instances are maxed out. You need to manually log into AWS Console, figure out the right instance type, launch more instances, and register them with the LB. By the time you do all this, the traffic spike is already causing errors.

### The Solution — Auto Scaling Group

An Auto Scaling Group (ASG) automatically adds and removes EC2 instances based on your rules — and automatically registers/deregisters them with your load balancer. You define the rules, AWS does the work.

```
Your app traffic over a day:

9 AM  traffic spikes  → ASG adds 4 instances → LB registers them → traffic distributed
2 PM  traffic normal  → ASG removes 3 instances → LB deregisters them → lower cost
3 AM  traffic low     → ASG at minimum capacity → 2 instances running only
```

### ASG Core Configuration

```
Launch Template: What to launch
  AMI ID           → which image to use
  Instance type    → t3.medium, m5.large etc
  Security groups  → firewall rules
  Key pair         → SSH access
  User Data        → bootstrap script (install app, start services)

Scaling Boundaries: How many to run
  Minimum capacity : 2  → always have at least 2 running (for HA)
  Desired capacity : 4  → target number in normal conditions
  Maximum capacity : 10 → never exceed this (cost protection)
```

### How ASG and LB Work Together

When ASG launches a new instance, it automatically registers it with the attached Load Balancer's Target Group. The instance only starts receiving traffic once its health check passes.

When ASG terminates an instance (scale-in or unhealthy), it first deregisters it from the LB (connection draining applies), then terminates it. No requests are dropped.

```
ASG scales out (adds instance):
  New EC2 launches → registered with LB Target Group
  LB health check starts running
  After 2 healthy checks → LB sends traffic to it

ASG scales in (removes instance):
  LB deregisters the instance (connection draining)
  In-flight requests complete
  Instance terminates cleanly
```

### Scaling Policies

**Target Tracking (simplest and recommended)**

```
"Keep average CPU utilization at 50%"
  CPU < 50% → ASG removes instances
  CPU > 50% → ASG adds instances
  ASG adjusts automatically to maintain the target
```

**Step Scaling**

```
CloudWatch alarm: CPU > 70% → add 2 instances
CloudWatch alarm: CPU > 90% → add 5 instances
CloudWatch alarm: CPU < 30% → remove 1 instance
```

**Scheduled Scaling**

```
Every weekday 8 AM  → set desired = 10 (before business hours)
Every weekday 8 PM  → set desired = 2  (after hours)
Black Friday date   → set minimum = 20 (prepared for known spike)
```

**Predictive Scaling** — AWS analyzes historical traffic patterns and pre-scales before traffic arrives. Good for recurring traffic patterns.

> **Official ASG Docs**: https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html

---

## Quick Reference

```
Load Balancer Types
  ALB  → Layer 7. HTTP/HTTPS. Path, host, query, header routing.
         Best for: web apps, microservices, containers, Lambda
  NLB  → Layer 4. TCP/UDP. Static IP. Millions req/sec.
         Best for: gaming, IoT, financial systems, static IP requirement
  GWLB → Layer 3. IP packets. Security appliance fleet.
         Best for: firewalls, IDS/IPS, packet inspection
  CLB  → Deprecated. Don't use.

Security Groups
  LB SG  → Allow 80/443 from 0.0.0.0/0
  EC2 SG → Allow 80 from LB Security Group ONLY
  Result → EC2 not reachable from internet directly

Health Checks
  Protocol + Port + Path (/health) → must return 200 to be healthy
  Unhealthy → LB stops sending traffic → auto-recovers when healthy again

ALB — Smart Routing
  Path routing     → /users, /orders, /search → different target groups
  Host routing     → api.myapp.com, admin.myapp.com → different target groups
  Query routing    → ?platform=mobile → mobile TG
  X-Forwarded-For  → real client IP passed in header (EC2 reads this)

NLB — Performance
  Layer 4, TCP/UDP, ~100μs latency, millions req/sec
  Static IP per AZ (Elastic IP supported)
  No Security Groups on NLB — control at EC2 SG level

Sticky Sessions
  Same user → same EC2 instance → via cookie
  ALB cookie: AWSALB | CLB cookie: AWSELB
  Tradeoff: may cause uneven load

Cross-Zone LB
  ALB  → Always ON, no charge
  NLB  → OFF by default, inter-AZ data transfer cost if enabled

SSL/TLS
  Terminate HTTPS at LB → EC2 gets plain HTTP
  Use ACM for free auto-renewing certificates
  SNI → multiple SSL certs on one ALB/NLB (one per domain)
  CLB → only one SSL cert (one domain per CLB)

Connection Draining
  CLB: "Connection Draining" | ALB/NLB: "Deregistration Delay"
  Default: 300 seconds → in-flight requests complete before instance removed
  Set low (10-30s) for short APIs / High (300s+) for long operations

Auto Scaling Group
  Min / Desired / Max → boundaries for instance count
  Works with LB → auto register/deregister instances
  Scaling policies: Target Tracking (CPU%), Step, Scheduled, Predictive
  ASG is free → pay only for the EC2 instances it creates
```

> **All ELB Documentation**: https://docs.aws.amazon.com/elasticloadbalancing/
> **Auto Scaling Documentation**: https://docs.aws.amazon.com/autoscaling/ec2/userguide/

## 6. Auto Scaling Group — ASG

> **Official AWS Docs**: https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html

---

## 1. What is an Auto Scaling Group and Why Does It Exist

### The Problem

You run a news website. On a normal Tuesday, 3 EC2 instances handle your traffic comfortably. Then a major story breaks — traffic jumps 8x in 10 minutes. Your 3 instances are maxed out. Response times climb. Users see errors. By the time your on-call engineer wakes up, opens the console, launches new instances, and registers them with the load balancer — the traffic spike is already over and you have lost users and revenue.

The opposite problem also exists. At 3 AM, your 3 instances are sitting at 2% CPU, doing almost nothing — but you are still paying for all 3.

```
Without ASG:
  Traffic spike  → overloaded → manual intervention → too slow → errors
  Traffic drops  → idle servers → money wasted → no action taken

With ASG:
  Traffic spike  → ASG detects → launches instances automatically → problem solved
  Traffic drops  → ASG detects → removes instances automatically → cost saved
```

### What ASG Does

An Auto Scaling Group manages a fleet of EC2 instances and automatically adjusts the size of that fleet based on rules you define:

- **Scale out** — add EC2 instances when load increases
- **Scale in** — remove EC2 instances when load decreases
- **Maintain minimum** — always keep at least N instances running for availability
- **Enforce maximum** — never exceed N instances (protects your bill)
- **Self-heal** — if an instance becomes unhealthy, ASG terminates it and launches a replacement
- **LB integration** — new instances are automatically registered with your Load Balancer Target Group. Terminated instances are deregistered cleanly.

ASG itself is **free**. You only pay for the EC2 instances it creates.

---

## 2. How ASG Works — The Three Numbers

Every ASG is defined by three capacity values:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTO SCALING GROUP                        │
│                                                             │
│  ←────────────── Maximum Capacity: 10 ──────────────────→  │
│                                                             │
│  ←──────── Desired Capacity: 4 ────────→                    │
│                                                             │
│  ←── Minimum Capacity: 2 ──→                                │
│                                                             │
│  [EC2] [EC2] [EC2] [EC2]   ← currently 4 running           │
└─────────────────────────────────────────────────────────────┘

Minimum : 2  → ASG will NEVER go below this. Always at least 2 running.
              Ensures you are never completely down. High availability.

Desired  : 4  → ASG tries to maintain this count at all times.
              If an instance dies, ASG replaces it to get back to 4.
              Scaling policies change this number up or down.

Maximum  : 10 → ASG will NEVER exceed this. Cost protection.
              Even during the biggest spike, never more than 10 instances.
```

When a scaling event happens, ASG changes the desired capacity — then adds or removes instances to match it.

---

## 3. ASG with Load Balancer — The Full Picture

### How They Work Together

In production, ASG and Load Balancer work as a team. The LB handles traffic distribution and health checking. ASG handles instance count and replacement.

```
Users
  ↓
Elastic Load Balancer (ALB)
  ↓ distributes traffic
  ├──► EC2 Instance 1 ─┐
  ├──► EC2 Instance 2  │ All inside the Auto Scaling Group
  ├──► EC2 Instance 3  │ ASG manages these
  └──► EC2 Instance 4 ─┘

ALB health check fails on Instance 3
  ↓
ALB stops sending traffic to Instance 3
  ↓
ASG detects unhealthy instance
  ↓
ASG terminates Instance 3 + launches a replacement
  ↓
New instance starts → passes health check → LB registers it
  ↓
Back to 4 healthy instances. No human intervention needed.
```

The LB checks the health of each instance using the `/health` endpoint. If an instance fails health checks, the LB reports it to ASG. ASG then terminates the bad instance and launches a new one automatically. This is **self-healing infrastructure** — your app recovers from failures on its own.

---

## 4. Launch Template — What to Launch

### The Problem

When ASG needs to add a new instance, it needs to know exactly what to launch — which OS, which size, which security group, which startup script. You define all of this in a **Launch Template**.

A Launch Template is a saved EC2 configuration. Think of it as a recipe — ASG follows this recipe every time it needs to create a new instance.

```
Launch Template contains:
  AMI ID              → which machine image to use (your pre-baked AMI)
  Instance Type       → t3.medium, m5.large etc
  EC2 User Data       → bootstrap script (install app, start service)
  EBS Volumes         → how many, what size, what type
  Security Groups     → which firewall rules apply
  SSH Key Pair        → for SSH access to new instances
  IAM Role            → what AWS services the instance can access
  Network + Subnets   → which VPC, which subnets to launch in
  Load Balancer info  → which Target Group to register with
```

> Note: Launch Configurations are the older version of Launch Templates — they are deprecated. Always use Launch Templates.

### Why a Good AMI Matters Here

If your Launch Template uses a base AMI (like plain Amazon Linux 2) and a User Data script that installs your app, every new instance takes 5–10 minutes to be ready. During that time it is not serving traffic.

Better approach: **bake your app into a custom AMI** — pre-install everything. When ASG launches from your custom AMI, the instance is ready in under 2 minutes. This also shortens the cooldown period (explained later).

---

## 5. CloudWatch Alarms and Scaling

### The Problem

ASG needs a signal to know when to scale. It does not watch your traffic itself — it relies on **CloudWatch alarms** to tell it when something needs to change.

### How CloudWatch Drives Scaling

A CloudWatch alarm monitors a metric and fires when that metric crosses a threshold. You attach scaling policies to those alarms — scale out when the alarm fires, scale in when it recovers.

```
CloudWatch monitors: Average CPU across all instances in the ASG
  CPU crosses 70% for 2 minutes
      ↓
  CloudWatch alarm triggers
      ↓
  ASG scale-out policy fires: add 2 instances
      ↓
  CPU drops (more instances sharing the load)
      ↓
  CPU drops below 30% for 5 minutes
      ↓
  CloudWatch alarm triggers scale-in policy: remove 1 instance
```

### Good Metrics to Scale On

| Metric | What it measures | Use when |
|---|---|---|
| **CPUUtilization** | Average CPU across all instances | App is CPU-bound (most common) |
| **RequestCountPerTarget** | Number of requests per EC2 instance | Web apps — keep load per server stable |
| **Average Network In/Out** | Network traffic volume | App is network-bound (data processing) |
| **Custom metric** | Anything you publish to CloudWatch | Queue depth, active users, order rate |

**RequestCountPerTarget** is particularly useful with an ALB — you can say "keep it at 1000 requests per instance" and ASG will add or remove instances to maintain that number. Much more meaningful than raw CPU for web workloads.

Custom metrics are powerful — if your app processes a queue (SQS), you can scale based on queue depth. If queue has 10,000 messages, scale out. If queue is empty, scale in. CPU tells you nothing useful in this case.

---

## 6. Scaling Policies — How ASG Decides What to Do

### 1. Target Tracking Scaling (Recommended — Start Here)

The simplest policy. You tell ASG to keep a metric at a target value. ASG figures out how many instances are needed to achieve that.

```
Policy: "Keep average CPU at 40%"

Current CPU: 75% with 4 instances
  → ASG calculates: need more instances to bring average to 40%
  → ASG adds 4 instances → now 8 instances
  → CPU drops to ~37% → close to target → stops adding

Current CPU: 15% with 8 instances
  → ASG calculates: can remove instances and still stay near 40%
  → ASG removes 4 instances → now 4 instances
  → CPU rises to ~38% → close to target → stops removing
```

This is the easiest to set up and works well for most workloads.

### 2. Simple / Step Scaling

You define specific rules for specific alarm thresholds. More control than target tracking.

```
Rule 1: If CPU > 70% → add 2 instances
Rule 2: If CPU > 90% → add 5 instances (bigger spike needs bigger response)
Rule 3: If CPU < 30% → remove 1 instance

Why step? Because a CPU spike from 71% to 91% is very different from
a spike from 71% to 72%. You want a proportional response.
```

### 3. Scheduled Scaling

You know your traffic patterns — schedule scaling actions in advance.

```
Every weekday at 8:00 AM   → set desired = 10 (before business hours start)
Every weekday at 8:00 PM   → set desired = 2  (after business hours end)
Every Friday at 5:00 PM    → set minimum = 10 (weekend traffic expected)
December 25 at 12:00 AM   → set desired = 20 (Christmas sale)
```

Useful when traffic follows a predictable daily or weekly pattern. Proactive instead of reactive.

### 4. Predictive Scaling

ASG analyzes your historical traffic data and **forecasts future load**. It pre-scales before traffic arrives — not after.

```
Historical data shows: traffic always spikes at 9 AM on weekdays

Without predictive: spike arrives → alarm fires → scaling takes 2-3 min → users experience lag
With predictive: ASG sees it coming → adds instances at 8:45 AM → spike arrives → no lag

How it works:
  Analyze historical load ──► Generate forecast ──► Schedule scaling actions
  (past patterns)             (what will happen)     (do it before it happens)
```

Good for recurring traffic patterns. Combine with Target Tracking for best results — predictive handles the known patterns, target tracking handles the unexpected.

---

## 7. Scaling Cooldowns

### The Problem

ASG adds 4 instances because CPU spiked. The new instances take 3 minutes to boot and start receiving traffic. During those 3 minutes, CPU is still high. Without a cooldown, ASG keeps adding more instances every minute — you end up with 20 instances when you only needed 8.

### The Solution — Cooldown Period

After a scaling activity, ASG enters a **cooldown period** (default: 300 seconds / 5 minutes). During the cooldown, ASG will not launch or terminate additional instances. This gives the new instances time to start up and the metrics time to stabilize before ASG makes another decision.

```
Scaling action fires: ASG adds 3 instances
       ↓
Cooldown starts (300 seconds)
       ↓
During cooldown: metrics are still high (new instances still booting)
ASG does NOT act — it waits
       ↓
Cooldown ends: new instances are running, metrics stabilize
       ↓
ASG re-evaluates: CPU now at 45% — no further scaling needed
       ↓
Scale-in cooldown similarly prevents removing instances too quickly
```

### How to Reduce the Cooldown Period

The advice from AWS: use a **ready-to-use AMI** (your app pre-installed) instead of a raw AMI with a long User Data bootstrap script.

```
Scenario A — Raw AMI + User Data script:
  Instance boots → runs install script (5-8 minutes) → app starts → health check passes
  Total time to serve traffic: 8-10 minutes
  You need a 600-second cooldown to wait for this

Scenario B — Custom AMI with app pre-baked:
  Instance boots → app already installed → starts in seconds → health check passes
  Total time to serve traffic: 60-90 seconds
  You can use a 90-second cooldown
  ASG reacts faster, scales more precisely
```

---

## 8. ASG Self-Healing — Automatic Instance Replacement

### The Problem

A developer on your team pushed a bad deployment. One of your EC2 instances is now in a broken state — it is running but returning 500 errors to every request. Nobody notices for 20 minutes.

With a properly configured ASG + LB setup, this is caught and fixed automatically:

```
EC2 Instance fails health check (returns non-200 to /health endpoint)
       ↓
LB stops sending traffic to it
       ↓
After N consecutive failures, LB marks instance unhealthy
       ↓
ASG detects unhealthy instance
       ↓
ASG terminates it (connection draining applies)
       ↓
ASG launches a fresh replacement instance from the Launch Template
       ↓
New instance passes health check
       ↓
LB adds it back to rotation

Total time: 3-5 minutes. Zero human intervention.
```

This is why production apps should always run in an ASG — even if you only ever want exactly 3 instances. The self-healing alone is worth it.

---

## Quick Reference

```
ASG — What it does
  Scale out  → add instances when load increases
  Scale in   → remove instances when load decreases
  Self-heal  → replace unhealthy instances automatically
  LB sync    → auto register/deregister with Load Balancer
  Cost       → ASG is free (pay for EC2 instances only)

The Three Numbers
  Minimum  → never go below this (high availability floor)
  Desired  → current target count (scaling policies adjust this)
  Maximum  → never exceed this (cost ceiling)

Launch Template (what to launch)
  AMI, instance type, user data, EBS, security groups,
  SSH key, IAM role, network/subnets, LB info
  Tip: Use a pre-baked custom AMI → faster boot → shorter cooldown

Scaling Policies
  Target Tracking  → "keep CPU at 40%" — simplest, recommended
  Step Scaling     → different responses at different thresholds
  Scheduled        → time-based, for known traffic patterns
  Predictive       → ML-based forecast, pre-scales before spikes

Good Metrics to Scale On
  CPUUtilization          → most common, CPU-bound apps
  RequestCountPerTarget   → web apps, keep per-instance load stable
  Network In/Out          → network-bound apps
  Custom metric           → queue depth, business metrics

Scaling Cooldown
  Default: 300 seconds after a scaling action
  ASG waits — does not add/remove during cooldown
  Reduce it: use a pre-baked AMI so instances start faster

Self-Healing
  LB health check fails → ASG terminates → launches replacement → auto
  No human needed. Works 24/7.
```

> **Official ASG Docs**: https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html
> **CloudWatch Alarms**: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html
> **Launch Templates**: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html

## 7. RDS, Aurora & ElastiCache

> **Official RDS Docs**: https://docs.aws.amazon.com/rds/
> **Official Aurora Docs**: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/
> **Official ElastiCache Docs**: https://docs.aws.amazon.com/elasticache/

---

## 1. What is RDS and Why Not Just Use a Database on EC2

### The Problem

Your team needs a PostgreSQL database. You could install it on an EC2 instance. But now you own everything — installing the software, configuring it, patching security vulnerabilities, setting up backups, building a standby for when the primary fails, monitoring disk space, handling OS updates. Your DevOps engineer spends more time babysitting the database than building features.

And then at 3 AM the primary crashes. No standby. Data at risk. Panic.

### The Solution — RDS

RDS (Relational Database Service) is a **managed database service**. AWS handles the infrastructure. You handle the data and queries.

```
What AWS manages for you with RDS:
  - Automated provisioning and OS patching
  - Continuous backups + restore to any point in time (up to 35 days)
  - Monitoring dashboards (CloudWatch integrated)
  - Read Replicas for improved read performance
  - Multi-AZ standby for disaster recovery and failover
  - Maintenance windows for upgrades
  - Vertical and horizontal scaling
  - Storage backed by EBS

What you give up:
  - You CANNOT SSH into your RDS instance
  - You cannot access the underlying OS
  - AWS manages the machine — you manage the database and schema only
```

### Supported Database Engines

RDS supports: **PostgreSQL, MySQL, MariaDB, Oracle, Microsoft SQL Server, IBM DB2, and Aurora** (AWS's own high-performance engine — covered separately below).

---

## 2. RDS vs EC2 Database — When to Use Which

```
Use RDS when:
  - You want a standard relational database (Postgres, MySQL, etc.)
  - You don't want to manage OS, patching, backups manually
  - You need Multi-AZ failover without building it yourself
  - You want point-in-time recovery

Use Database on EC2 when:
  - You need a database engine RDS doesn't support
  - You need OS-level access to tune kernel parameters
  - You have very specific licensing requirements
  - You need full control (and you are willing to manage everything)

Reality: 90% of teams should use RDS. The operational savings are massive.
```

---

## 3. RDS Storage Auto Scaling

### The Problem

A developer sets up an RDS instance with 100 GB of storage. Six months later, the database hits 95 GB. The app starts throwing "disk full" errors at 2 AM on a Saturday.

### The Solution — Storage Auto Scaling

RDS can automatically increase storage when it detects you are running low — with no downtime and no manual action.

```
RDS detects: free storage < 10% of allocated
AND: Low storage has lasted at least 5 minutes
AND: 6 hours have passed since last modification

→ RDS automatically increases storage

You set a Maximum Storage Threshold (safety ceiling to avoid runaway costs)
```

Good for applications with **unpredictable or growing data** — you set the initial size, RDS grows it as needed. Supports all RDS database engines.

---

## 4. Read Replicas — Scaling Read Traffic

### The Problem

Your production application is a read-heavy platform — users browse products, read articles, view reports. 90% of database queries are SELECTs. Your single RDS instance is handling both the app reads and a heavy analytics/reporting workload from the business team. It is constantly at 80% CPU.

```
Without Read Replicas:
  App reads    ──┐
  App writes   ──┤──► Single RDS Master (overloaded)
  Reports      ──┘
  Analytics  ───┘

All traffic hitting one database. Performance degrades for everyone.
```

### The Solution — Read Replicas

A Read Replica is an **asynchronous copy** of your primary RDS database. It receives all write operations from the master and replicates them. You can then send your read traffic to replicas, freeing the master for writes.

```
With Read Replicas:
  App writes   ──────────────► RDS Master (handles writes only)
                                    │ ASYNC replication
                                    ▼
  App reads    ──────────────► Read Replica 1
  Reports      ──────────────► Read Replica 2
  Analytics    ──────────────► Read Replica 3

Master: low load, consistent write performance
Replicas: each serving a different read workload
```

### Key Facts About Read Replicas

- You can have **up to 15 Read Replicas**
- Replicas can be in the same AZ, a different AZ, or a **different Region** (cross-region)
- Replication is **ASYNC** — replicas are eventually consistent, not real-time. There is a small lag
- Read Replicas are for **SELECT only** — applications must point reads to the replica endpoint and writes to the master endpoint. Your app code must handle this routing
- A Read Replica **can be promoted to its own standalone database** — useful for disaster recovery or database migrations

### Read Replica Use Case

```
Scenario: You have a production app and a reporting team

Production App → writes to Master, reads from Replica 1
Reporting team → runs heavy analytical queries on Replica 2

Impact:
  Production app is unaffected by the heavy reporting queries
  Reporting team gets their own isolated read copy
  Master handles only writes — consistently fast
```

### Network Cost for Read Replicas

- Read Replicas in the **same region** — no data transfer cost between AZs
- Read Replicas in a **different region** — you pay for cross-region data transfer

---

## 5. RDS Multi-AZ — Disaster Recovery

### The Problem

Your RDS instance is in `ap-south-1a`. That availability zone has a hardware failure — your primary database goes down. Your app is down. All your users see errors. It takes 30-60 minutes to manually restore from backup. Revenue lost, users lost, trust lost.

### The Solution — Multi-AZ

Multi-AZ keeps a **standby replica** in a different Availability Zone, synchronously updated. If the primary fails, AWS automatically fails over to the standby — with no manual intervention and no data loss.

```
Normal operation:
  Application ──► RDS Master (ap-south-1a) ──SYNC replication──► Standby (ap-south-1b)
  
  One DNS name points to the master
  Application always uses the same connection string

Failure:
  Master in ap-south-1a fails (hardware, network, AZ outage)
       ↓
  AWS automatic failover (60–120 seconds)
       ↓
  Standby in ap-south-1b is promoted to Master
       ↓
  DNS record updated to point to new master
       ↓
  Application reconnects using the SAME connection string — no code changes
```

### Multi-AZ is NOT for Scaling

This is a common misconception. The standby instance in Multi-AZ **does not serve any traffic** during normal operation. It only exists to take over during a failure. It is purely for availability, not performance.

```
Multi-AZ → Disaster Recovery + High Availability
Read Replicas → Read Performance Scaling

They serve different purposes. You often use both together.
```

### Upgrading to Multi-AZ — Zero Downtime

You can enable Multi-AZ on an existing single-AZ database with no downtime:
1. AWS takes a snapshot of your database
2. Creates a new standby from the snapshot in a different AZ
3. Establishes synchronization between primary and standby
4. Done — no modification to your application needed

### RDS Custom — When You Need OS Access

RDS Custom is a special mode for **Oracle and Microsoft SQL Server** where you get managed RDS benefits BUT also access to the underlying EC2 instance and OS. Use it when you need to install custom agents, patches, or features that standard RDS does not allow. You can SSH or connect via SSM Session Manager.

---

## 6. RDS Backups

### Automated Backups

```
Daily full backup during your maintenance window
Transaction logs backed up by RDS every 5 minutes

Result: You can restore to any point in time from 5 minutes ago up to 35 days back
        Restore to 10:42 AM on March 15? Yes. Exactly.

Retention: 1 to 35 days (set 0 to disable automated backups)
```

### Manual DB Snapshots

```
Triggered by you manually — not automatic
Retained as long as you want (no expiry)

Key use case: Before a major schema migration
  Take a manual snapshot → run migration → if it fails → restore from snapshot

Important trick:
  If you stop an RDS instance to save money, you still pay for storage
  If you plan to stop it for a long time → snapshot it → delete it → restore later
  Storage for snapshots is much cheaper than running instance storage
```

---

## 7. RDS & Aurora Security

```
At-Rest Encryption
  - Data encrypted using AWS KMS
  - Must be enabled at launch time (cannot add later to an unencrypted DB)
  - If master is not encrypted, read replicas also cannot be encrypted
  - To encrypt an unencrypted DB: snapshot → copy encrypted → restore

In-Flight Encryption
  - TLS enabled by default between app and RDS
  - Uses AWS TLS root certificates client-side

Network Access
  - RDS lives in a VPC — not publicly accessible by default
  - Security Groups control which EC2 instances/services can connect
  - No SSH access (except RDS Custom)

IAM Authentication
  - Use IAM roles to connect instead of username/password
  - Supported for MySQL and PostgreSQL

Audit Logs
  - Enable and send to CloudWatch Logs for long-term retention
  - Tracks who ran what query, when
```

---

## 8. Amazon Aurora

### The Problem

Your PostgreSQL database on RDS is handling a large e-commerce platform. You need better performance, faster failover, and higher availability — but you don't want to switch database engines or rewrite your application.

### What is Aurora

Aurora is **AWS's own proprietary database engine** — not open source, built from the ground up by AWS for the cloud. It is compatible with **PostgreSQL and MySQL**, which means your existing drivers, queries, and application code work without changes.

```
Aurora vs Standard RDS:
  5x faster than MySQL on RDS
  3x faster than PostgreSQL on RDS
  Sub-10ms replica lag (vs seconds for standard RDS replicas)
  Failover in under 30 seconds (vs 60-120 seconds for RDS Multi-AZ)
  Storage auto-grows from 10 GB to 128 TB automatically
  Costs 20% more than standard RDS — but you get significantly more for it
```

### Aurora High Availability — Built Into the Storage Layer

Aurora's architecture is fundamentally different from standard RDS. The storage layer itself is distributed.

```
Aurora stores 6 copies of your data across 3 Availability Zones:
  4 out of 6 copies needed for writes (tolerates 2 copy failure)
  3 out of 6 copies needed for reads  (tolerates 3 copy failure)
  Self-healing: bad blocks auto-detected and repaired peer-to-peer

One instance is the Master (handles all writes)
Up to 15 Aurora Read Replicas (handle reads, any of them can become master)
Automated failover for master in under 30 seconds

Cross-Region Replication supported natively
```

### Aurora DB Cluster — Endpoints

```
Aurora gives you two endpoints — your app uses both:

Writer Endpoint   → always points to the current Master
                    Even after failover, same DNS name → new master
                    Your app writes here

Reader Endpoint   → load balances across all Read Replicas
                    Your app reads here
                    As you add more replicas, Reader Endpoint distributes across all of them

Your app connection string never changes — Aurora handles the routing.
```

```
Client
  │
  ├──► Writer Endpoint → Master (writes)
  │
  └──► Reader Endpoint → Replica 1, 2, 3 (reads, load balanced)
                                 │
                          Shared Storage Volume (auto-expanding 10 GB → 128 TB)
```

### Aurora Replicas — Auto Scaling

```
Problem: Black Friday hits. Read traffic is 10x normal.
         Your 3 Read Replicas are maxed out.

Solution: Aurora Reader endpoint has exceeded its threshold
  → Aurora Auto Scaling adds more Read Replicas automatically
  → Reader Endpoint now distributes reads across 6+ replicas
  → Traffic spike handled without manual action
  → After traffic drops → Aurora removes the extra replicas
```

### Aurora Custom Endpoints

When you have replicas of different sizes (some larger for analytics), you can define a Custom Endpoint that points to a specific subset of replicas.

```
Example:
  Writer Endpoint  → Master
  Reader Endpoint  → small replicas (for app reads)
  Custom Endpoint  → large replicas (for analytics team's heavy queries)

Analytics team uses Custom Endpoint → gets routed to powerful replicas
App reads use Reader Endpoint → gets routed to fast small replicas
Both isolated from each other
```

### Aurora Serverless

For workloads that are **infrequent, intermittent, or unpredictable**:

```
Normal Aurora: You choose an instance size, pay for it 24/7
Aurora Serverless: No instance size to choose
  Automatically starts up when you connect
  Scales capacity based on actual load
  Scales down to zero when no connections (you pay nothing)
  Scales back up instantly when connections arrive

Cost model: Pay per second of actual database usage
Use for: dev/test databases, infrequent apps, variable workloads
Not for: steady, high-throughput production databases (regular Aurora is cheaper)
```

### Global Aurora — Cross-Region

```
Primary Region (reads + writes):
  Aurora Primary Cluster — handles all writes
        ↓
        ASYNC replication (< 1 second lag)
        ↓
Secondary Regions (reads only, up to 5):
  Aurora Read-Only Clusters
  Up to 16 Read Replicas per secondary region
  Apps in that region read locally — low latency

Disaster Recovery:
  If primary region fails → promote a secondary region to primary
  Recovery Time Objective (RTO) < 1 minute
  Typical cross-region replication lag: < 1 second
```

### Aurora Backups

```
Automated:
  1 to 35 days retention (cannot be disabled — always on for Aurora)
  Point-in-time recovery within the retention window

Manual Snapshots:
  Same as RDS — triggered manually, retained as long as you want
```

### Aurora Database Cloning

```
Problem: You want to test a big schema migration on production data
         without risking the actual production database

Solution: Aurora Database Cloning
  Creates a new Aurora cluster from an existing one
  Much faster than snapshot + restore
  Uses copy-on-write protocol — initially shares the same data volume
  Only when the clone makes changes does it start copying data

Result: Staging database with identical production data
        Changes to staging don't affect production
        Very fast to create, cost-effective
```

---

## 9. RDS Proxy

### The Problem

Your application uses AWS Lambda for backend logic. Lambda can scale from 0 to thousands of concurrent executions in seconds. Each Lambda invocation opens a new database connection. RDS databases have a **connection limit** — PostgreSQL on a `db.t3.micro` supports about 85 connections.

At scale: 1,000 Lambda functions → 1,000 database connections → connection limit exceeded → database starts rejecting connections → app fails.

### The Solution — RDS Proxy

RDS Proxy sits between your application and your database. It **pools and shares** database connections. Many Lambda functions connect to the Proxy, but the Proxy maintains only a small number of actual database connections.

```
Without RDS Proxy:
  1,000 Lambda functions → 1,000 DB connections → limit exceeded → FAIL

With RDS Proxy:
  1,000 Lambda functions → RDS Proxy (pools connections) → 50 DB connections → works

Benefits:
  - Reduces database connections by up to 66%
  - Reduces failover time by up to 66% (proxy handles reconnection)
  - Fully serverless, auto-scaling, highly available (Multi-AZ)
  - No code changes required for most apps
  - Enforces IAM authentication for DB access
  - Credentials stored in AWS Secrets Manager (not in code)
  - RDS Proxy is never publicly accessible — VPC only
```

Supports: RDS (MySQL, PostgreSQL, MariaDB, MS SQL Server) and Aurora (MySQL, PostgreSQL).

---

## 10. ElastiCache — In-Memory Caching

### The Problem

Your application reads the same data over and over from RDS. Every time a user visits the homepage, your app queries the database for the 10 most popular products, the featured banner, and the user's profile — the same queries, millions of times per day. RDS is handling this load but it is expensive and database latency adds up.

```
Every page load:
  App → SELECT top products FROM rds → 15ms
  App → SELECT featured banner FROM rds → 12ms
  App → SELECT user profile FROM rds → 8ms
  Total: ~35ms just in DB queries per page load
  At 100,000 users/hour: 100,000 × these queries = RDS under heavy load
```

### The Solution — ElastiCache

ElastiCache is a **managed in-memory cache**. It stores frequently-accessed data in RAM — reads take microseconds instead of milliseconds.

```
With ElastiCache:
  App → check cache for top products → found in Redis → 0.1ms (100x faster)
  
  Cache hit:  return data from Redis instantly — DB not touched
  Cache miss: query RDS → get result → store in Redis for next time → return to user

Result:
  - RDS load drops dramatically (only cache misses hit the database)
  - Response time improves significantly for users
  - Application can handle more traffic with same database resources
```

ElastiCache manages: OS maintenance, patching, optimization, setup, configuration, monitoring, failure recovery, and backups. Like RDS — you do not manage the infrastructure.

**Important**: Using ElastiCache requires **application code changes**. Your app must be written to check the cache first, then fall back to RDS. This is not automatic.

### ElastiCache Engines — Redis vs Memcached

| Feature | Redis | Memcached |
|---|---|---|
| **Multi-AZ** | Yes, with auto-failover | No |
| **Read Replicas** | Yes — scale reads, high availability | No |
| **Data Persistence** | Yes — AOF (Append Only File) | No — data lost on restart |
| **Backup & Restore** | Yes | No (Serverless has backup) |
| **Data Structures** | Strings, Lists, Sets, Sorted Sets, Hashes | String key-value only |
| **Sharding** | Yes | Yes — multi-node for partitioning |
| **Multi-threaded** | No (single-threaded per shard) | Yes |
| **Use for** | Sessions, leaderboards, pub/sub, complex data | Simple caching, horizontal scale |

**Choose Redis** for: anything requiring persistence, high availability, complex data types, or sorted sets.
**Choose Memcached** for: pure simple caching where data loss is acceptable and you want multi-threaded performance.

### Two Main Caching Patterns

**Pattern 1 — DB Cache (Lazy Loading)**

```
User requests data:
  App checks ElastiCache → Cache hit? Return immediately.
  Cache miss → App queries RDS → gets data → writes to cache → returns to user

Next request for same data: instant cache hit.

Name: "Lazy Loading" — only cache what is actually requested
      Only two hard things in CS: cache invalidation and naming things

Cache invalidation:
  When data in RDS changes, you must either:
  - Update the cache (write-through)
  - Delete from cache (let next request repopulate it — lazy)
  - Set a TTL (time-to-live) — cache expires automatically after N seconds
```

**Pattern 2 — User Session Store**

```
User logs into any instance of your app behind a load balancer:
  App writes session data to ElastiCache (not local memory)
  
User's next request hits a different EC2 instance:
  App reads session from ElastiCache → user is already logged in
  
Without ElastiCache session store:
  Session stored in EC2 memory → sticky sessions required → uneven load
  
With ElastiCache session store:
  Any instance serves any user → no sticky sessions needed → even load distribution
```

### Redis Use Cases in Production

**Leaderboards (Redis Sorted Sets)**

```
Problem: Gaming leaderboard needs to:
  - Track millions of players' scores
  - Always show correct rank in real-time
  - Insert new scores instantly in sorted order

Redis Sorted Sets solve this:
  Each time a player scores → ZADD leaderboard score player_id
  Redis automatically keeps the set sorted
  Querying rank: ZRANK leaderboard player_id → instant
  Top 10: ZRANGE leaderboard 0 9 WITHSCORES → instant

This is computationally impossible to do in real-time with a relational DB at scale.
Redis Sorted Sets are built exactly for this pattern.
```

**Rate Limiting, Pub/Sub, Real-time Analytics** — all common Redis use cases in production systems.

### ElastiCache Security

```
IAM Authentication
  IAM policies on ElastiCache are for AWS API-level security only
  (creating/deleting clusters, not connecting to the cache itself)

Redis AUTH
  Set a password/token when creating a Redis cluster
  Your app must provide this token to connect
  Extra layer of security on top of security groups
  Also supports SSL in-flight encryption

Memcached
  Supports SASL-based authentication (advanced)

Network Security
  ElastiCache lives in your VPC
  Security Groups control which EC2 instances can connect
```

---

## Quick Reference

```
RDS — Managed Relational Database
  Engines  : PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, DB2, Aurora
  Benefits : Automated backups, patching, Multi-AZ, scaling — no SSH access
  Backups  : Automated (5 min point-in-time, 1-35 days) + Manual snapshots
  Security : KMS encryption, TLS in-flight, Security Groups, IAM auth

Read Replicas vs Multi-AZ
  Read Replicas → scale READ performance (up to 15, ASYNC replication)
                  App must route reads to replica endpoint
                  Same region = free; cross-region = transfer cost
  Multi-AZ      → disaster recovery and high availability (SYNC replication)
                  Standby serves NO traffic — only takes over on failure
                  Same DNS endpoint — no app changes on failover
  Use both together for HA + read scaling

RDS Storage Auto Scaling
  Automatically grows storage when < 10% free
  Set Maximum Storage Threshold as a cost ceiling

RDS Proxy
  Problem: Lambda → too many DB connections → limit exceeded
  Solution: Proxy pools connections → DB sees far fewer connections
  Also: faster failover, IAM auth, Secrets Manager credentials, VPC only

Aurora
  AWS proprietary — Postgres + MySQL compatible
  5x faster than MySQL / 3x faster than Postgres
  6 copies across 3 AZs — storage level HA
  Up to 15 Read Replicas, failover < 30 seconds
  Writer Endpoint (→ master) + Reader Endpoint (→ all replicas)
  Auto-scaling replicas, Custom Endpoints, Serverless, Global (cross-region)
  Cloning → fast staging database from production data (copy-on-write)

ElastiCache — In-Memory Cache
  Redis   → HA, persistent, sorted sets, sessions, leaderboards. Pick this usually.
  Memcached → simple cache, multi-threaded, no persistence. Simple use cases.
  Patterns:
    Lazy Loading  → check cache first, miss → query DB → populate cache
    Session Store → write sessions to cache, any instance reads them
  Requires code changes in your application
  Use for: reducing DB load, improving latency, session storage, leaderboards
```

> **RDS Best Practices**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html
> **Aurora User Guide**: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.html
> **ElastiCache Redis**: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html

## 8. Route 53 — DNS Service


### What is Route 53?

Route 53 is AWS's DNS service. DNS translates `myapp.com` into an IP address. Route 53 also handles health checks, failover, and intelligent traffic routing.

---

### DNS Resolution Flow

```
User types: app.mycompany.com
    │
    ▼
Browser checks local DNS cache → not found
    │
    ▼
ISP's DNS resolver
    │
    ▼
Root DNS (.) → gives .com nameserver address
    │
    ▼
.com TLD nameserver → gives mycompany.com nameserver (Route 53)
    │
    ▼
Route 53 → returns IP (from A record or ALIAS record)
    │
    ▼
Browser connects to IP
```

---

### Record Types

| Type | What it does | Example |
|------|-------------|---------|
| **A** | Domain → IPv4 | `app.com → 52.1.2.3` |
| **AAAA** | Domain → IPv6 | `app.com → 2001:db8::1` |
| **CNAME** | Domain → another domain | `www.app.com → app.com` |
| **ALIAS** | Domain → AWS resource | `app.com → ALB DNS name` |
| **MX** | Email server | `mail.app.com` |
| **TXT** | Text (SPF, DKIM, verification) | DNS validation records |

ALIAS is like CNAME but works at the root domain and is free of charge. Use ALIAS for ALB, CloudFront, S3 website endpoints.

---

### Routing Policies

```
┌────────────────────────────────────────────────────────────┐
│   Simple         → Single value. No health checks.         │
│   Weighted       → 70% traffic to v1, 30% to v2 (canary)  │
│   Failover       → Primary/Secondary with health checks    │
│   Latency        → Route to closest AWS region             │
│   Geolocation    → Route by user's country/continent       │
│   Geoproximity   → Route by distance, with bias            │
│   Multi-value    → Up to 8 healthy records (basic LB)      │
└────────────────────────────────────────────────────────────┘
```

---

## 9. S3 — Simple Storage Service

> **Official Docs**: https://docs.aws.amazon.com/s3/
> **Storage Classes Pricing**: https://aws.amazon.com/s3/storage-classes/
> **S3 Pricing**: https://aws.amazon.com/s3/pricing/

---

## 1. What is Amazon S3 and Why It Exists

### What is S3

Amazon S3 (Simple Storage Service) is one of the **main building blocks of AWS**. It is advertised as "infinitely scaling" object storage.

```
Not a file system. Not a database.
S3 stores OBJECTS (files) inside BUCKETS (directories).

Most websites use S3 as a backbone.
Most AWS services use S3 as an integration.
```

### Real-World Use Cases

```
- Backup and storage
- Disaster Recovery
- Archive (Nasdaq stores 7 years of data in S3 Glacier)
- Hybrid Cloud storage
- Application hosting
- Media hosting
- Data lakes and big data analytics (Sysco runs analytics on business data from S3)
- Software delivery
- Static website hosting
```

---

## 2. S3 Buckets — The Container

### What is a Bucket

A bucket is a top-level container for objects in S3. Think of it like a folder in the cloud — but with global uniqueness.

```
Key rules:
- Buckets must have a GLOBALLY UNIQUE name (across ALL AWS accounts worldwide)
- Buckets are defined at the REGION level (not global, despite unique names)
- S3 looks like a global service but buckets are created in a specific region

Naming Convention:
  - No uppercase, no underscore
  - 3–63 characters long
  - Not an IP address
  - Must start with lowercase letter or number
  - Must NOT start with the prefix "xn--"
  - Must NOT end with the suffix "-s3alias"
```

---

## 3. S3 Objects — What You Actually Store

### Objects and Keys

Every file stored in S3 is an **Object**. Every object has a **Key**.

```
The Key is the FULL path to your object:

  s3://my-bucket/my_file.txt
  s3://my-bucket/my_folder/another_folder/my_file.txt

The key = prefix + object name
  prefix:      my_folder/another_folder/
  object name: my_file.txt

Important: There are NO real "directories" in S3
  The UI shows folders, but it's an illusion
  Everything is just keys with very long names that contain slashes "/"
```

### Object Properties

```
Object Value  -> the actual content (the file body)
  Max object size: 5 TB (5000 GB)
  For files > 5 GB, you MUST use "multi-part upload"

Metadata      -> list of text key/value pairs (system or user metadata)
Tags          -> Unicode key/value pairs, up to 10 per object
                 Useful for security and lifecycle management
Version ID    -> if versioning is enabled on the bucket
```

---

## 4. S3 Security

### The Three Layers

S3 security works at three levels. Understanding which to use when is important.

**User-Based — IAM Policies**

```
Control which API calls are allowed for a specific IAM user
  
  IAM User has an IAM Policy attached
  Policy says: Allow s3:GetObject on this bucket
  User can download objects from that bucket
```

**Resource-Based — Bucket Policies and ACLs**

```
Bucket Policies (most common):
  JSON-based rules applied at the bucket level
  Cross-account access is possible
  Finer grain than IAM (per-prefix, per-object control)

Object Access Control List (ACL):
  Finer grain — set at individual object level
  Can be disabled (less common today)

Bucket Access Control List (ACL):
  Less common, can be disabled
```

**Encryption**

```
Encrypt objects stored in S3 using encryption keys
  (covered in detail in the Security section below)
```

### The Access Decision

```
An IAM principal CAN access an S3 object if:
  The user's IAM permissions ALLOW it
  OR the resource (bucket) policy ALLOWS it
  AND there is no explicit DENY

Explicit DENY in ANY policy always wins — even if another policy allows it
```

---

## 5. S3 Bucket Policies

### What is a Bucket Policy

A Bucket Policy is a **JSON-based policy** attached directly to an S3 bucket. It controls who can access the bucket and what they can do.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::my-bucket/*"]
    }
  ]
}
```

```
Policy structure:
  Resources  -> which buckets and objects this applies to
  Effect     -> Allow or Deny
  Actions    -> Set of S3 API calls (s3:GetObject, s3:PutObject, etc.)
  Principal  -> The AWS account or user the policy applies to
```

### When to Use Bucket Policy

```
Scenario 1: Public Access
  Anonymous website visitor needs to read S3 objects (static site)
  -> Use Bucket Policy: Principal = *, Effect = Allow, Action = s3:GetObject

Scenario 2: User Access
  Internal IAM user needs to access S3
  -> Attach IAM Policy to the user (no bucket policy needed)

Scenario 3: EC2 Instance Access
  EC2 instance needs to read from S3
  -> Create an EC2 IAM Role with S3 permissions
  -> Attach role to EC2 instance
  -> No bucket policy needed

Scenario 4: Cross-Account Access
  IAM User from a different AWS account needs access
  -> Use Bucket Policy: specify the other account's ARN as Principal
```

---

## 6. Block Public Access

### The Problem

A developer accidentally makes an S3 bucket public, exposing company data to the internet. This has caused many real data breaches.

### The Solution

AWS created **Block Public Access settings** as a safety net:

```
Four settings to block:
  - Block public access granted through new ACLs
  - Block public access granted through any ACLs
  - Block public access granted through new bucket policies
  - Block public and cross-account access through any bucket/account policies

These settings OVERRIDE bucket policies and ACLs.
Even if a bucket policy allows public access, Block Public Access can override it.

Default: ALL FOUR settings are ON for new buckets

If you know your bucket should never be public -> leave these ON
Can be set at the account level (applies to all buckets in the account)

Created to prevent company data leaks.
```

---

## 7. S3 Static Website Hosting

### The Problem

You have a static frontend (HTML, CSS, JS files). You need to host it somewhere publicly accessible without running a server.

### The Solution

```
S3 can host static websites and make them accessible on the internet.

The website URL will be:
  http://bucket-name.s3-website-aws-region.amazonaws.com
  OR
  http://bucket-name.s3-website.aws-region.amazonaws.com

If you get a 403 Forbidden error:
  -> Your bucket policy doesn't allow public reads
  -> You must make the bucket public using a Bucket Policy
```

```
What S3 static hosting supports:
  -> HTML, CSS, JavaScript, images
  -> Single-page apps (React, Vue) with routing via index.html fallback

What it does NOT support:
  -> Server-side code (no Node.js, Python, PHP)
  -> Databases
  -> Use CloudFront in front for HTTPS on custom domains
```

---

## 8. S3 Versioning

### The Problem

A developer runs a script that overwrites an important file in S3. There is no backup. The data is gone.

### The Solution — Versioning

```
You can version your files in S3.
Enabled at the bucket level.

Same key overwrite creates a new version: 1, 2, 3, ...

Benefits:
  - Protect against unintended deletes (you can restore a version)
  - Easy rollback to any previous version

Rules:
  - Files that existed before enabling versioning have version "null"
  - Suspending versioning does NOT delete the previous versions
    (they remain — you just stop creating new ones)

How delete works with versioning:
  - Delete an object -> S3 adds a "delete marker" (not actually deleted)
  - The file appears gone but previous versions still exist
  - Restore by removing the delete marker
```

---

## 9. S3 Replication

### The Problem

Your S3 bucket is in Mumbai. Your EU team downloads large files from it daily — high latency, high data transfer costs. Or — your compliance team requires a backup copy in a separate AWS account.

### The Solution — Replication

```
Two types:
  CRR (Cross-Region Replication) -> source and destination in DIFFERENT regions
  SRR (Same-Region Replication)  -> source and destination in the SAME region

How it works:
  Copying is ASYNCHRONOUS (happens in the background)
  Must enable Versioning on BOTH source and destination buckets
  Buckets can be in different AWS accounts
  Must give proper IAM permissions to S3 for replication

After enabling replication:
  Only NEW objects are replicated
  For existing objects -> use S3 Batch Replication
```

### CRR vs SRR Use Cases

```
CRR -> Compliance (data must be in specific region)
    -> Lower latency access for users in another region
    -> Replication across AWS accounts (different teams)

SRR -> Log aggregation from multiple buckets into one
    -> Live replication between production and test accounts
```

### Important Rules for DELETE Operations

```
Can replicate delete markers from source to destination (optional setting — you enable it)
Deletions with a Version ID are NOT replicated (to avoid malicious deletes)

There is NO "chaining" of replication:
  Bucket 1 -> replicates to -> Bucket 2 -> replicates to -> Bucket 3
  Objects created in Bucket 1 are NOT replicated to Bucket 3
  Replication only goes one hop
```

---

## 10. S3 Storage Classes

### The Problem

You store everything in S3 Standard. Your logs from 3 years ago that nobody reads are costing the same per GB as your active production data. You are overpaying massively.

### The Solution — Storage Classes

Different access patterns need different storage costs. S3 has 7 storage classes.

```
All classes:
  Durability: 99.999999999% (11 9s) — same for ALL classes
  If you store 10 million objects, you'd expect to lose 1 object every 10,000 years
  
  Availability: varies by class (how readily available the service is)
```

### Class 1 — S3 Standard (General Purpose)

```
Availability: 99.99%
Latency:      milliseconds
Min Storage:  none
Retrieval:    free

Use for:
  - Frequently accessed data
  - Big data analytics
  - Mobile and gaming applications
  - Content distribution

This is the default. If you don't know which class, use this.
```

### Class 2 — S3 Standard-Infrequent Access (Standard-IA)

```
Availability: 99.9%
Storage Cost: lower than Standard
Retrieval:    PER GB retrieval fee (you pay when you access it)
Min Storage:  30 days

Use for:
  - Disaster Recovery files
  - Backups you rarely access but need fast when you do
  - Data accessed less than once a month
```

### Class 3 — S3 One Zone-Infrequent Access (One Zone-IA)

```
Durability:   99.999999999% WITHIN a single AZ
Availability: 99.5%
              If the AZ is destroyed, data is lost
Storage Cost: even lower than Standard-IA
Retrieval:    PER GB retrieval fee
Min Storage:  30 days

Use for:
  - Secondary backup copies of on-premises data
  - Data you can recreate if the AZ fails
  - Data that doesn't need multi-AZ resilience
```

### Class 4 — S3 Glacier Instant Retrieval

```
Low-cost archival storage
Retrieval:    Milliseconds (instant — great for data accessed once a quarter)
Min Storage:  90 days
Cost:         much cheaper than Standard-IA for storage

Use for: data you archive but occasionally need back instantly
```

### Class 5 — S3 Glacier Flexible Retrieval (formerly Amazon Glacier)

```
Low-cost archival storage
Retrieval options (you choose):
  Expedited    -> 1-5 minutes
  Standard     -> 3-5 hours
  Bulk         -> 5-12 hours (free)
Min Storage:  90 days

Use for: long-term backups, compliance archives, data rarely accessed
```

### Class 6 — S3 Glacier Deep Archive (for long-term storage)

```
Lowest cost storage in S3
Retrieval options:
  Standard     -> 12 hours
  Bulk         -> 48 hours
Min Storage:  180 days

Use for: 7-10 year data retention, regulatory archives, disaster recovery tapes replacement
```

### Class 7 — S3 Intelligent-Tiering

```
Small monthly monitoring and auto-tiering fee
No retrieval charges (you are not penalized for accessing data)
Moves objects automatically between tiers based on usage patterns

Tiers (automatic):
  Frequent Access tier         -> default (accessed recently)
  Infrequent Access tier       -> objects not accessed for 30 days
  Archive Instant Access tier  -> objects not accessed for 90 days

Tiers (optional, you configure):
  Archive Access tier          -> configurable, 90 to 700+ days
  Deep Archive Access tier     -> configurable, 180 to 700+ days

Use for: data with unpredictable access patterns
         You don't know if data will be frequent or infrequent
```

### Class 8 — S3 Express One Zone

```
High-performance SINGLE Availability Zone storage
Objects stored in a Directory Bucket (bucket in a single AZ)
Handles 100,000s requests per second with single-digit millisecond latency
Lower storage cost than Standard (reduces request costs by 50%)
High Durability: 99.999999999% and Availability: 99.95%

Use for:
  - Latency-sensitive apps
  - Data-intensive apps (AI, ML training, HPC)
  - Financial modeling, media processing
  - Best integrated with SageMaker, Athena, EMR
```

### Storage Class Comparison (Quick Reference)

| Class | Availability | Min Storage | Retrieval | Use For |
|---|---|---|---|---|
| Standard | 99.99% | None | Free | Active data |
| Standard-IA | 99.9% | 30 days | Per GB | Backups, DR |
| One Zone-IA | 99.5% | 30 days | Per GB | Recreatable backups |
| Glacier Instant | 99.9% | 90 days | Per GB | Quarterly access |
| Glacier Flexible | 99.99% | 90 days | Per GB (free bulk) | Annual access |
| Glacier Deep Archive | 99.99% | 180 days | Per GB | 7+ year archives |
| Intelligent-Tiering | 99.9% | None | None | Unknown patterns |

> Full pricing: https://aws.amazon.com/s3/storage-classes/

---

## 11. Moving Between Storage Classes — Lifecycle Rules

### The Problem

Your application uploads images to S3 Standard. After 60 days, users rarely access them. After a year, nobody ever does. But you are paying Standard prices forever.

### The Solution — Lifecycle Rules

```
You define rules to AUTOMATICALLY transition objects between storage classes
or DELETE objects after a set time.

Two types of actions:

Transition Actions:
  Move objects to Standard-IA after 60 days of creation
  Move objects to Glacier for archiving after 6 months

Expiration Actions:
  Delete objects after X days (e.g., delete access logs after 365 days)
  Can be used to delete old versions of files (if versioning is enabled)
  Can be used to delete incomplete Multi-Part uploads (common cost leak)

Rules can target:
  - A specific prefix (e.g., s3://my-bucket/logs/*)
  - Specific object tags (e.g., Department=Finance)
```

### Lifecycle Scenario 1

```
Scenario: Your app on EC2 creates image thumbnails after profile photos are uploaded.
          Thumbnails can be easily recreated and only need to be kept for 60 days.
          Source images should be immediately retrievable for 60 days,
          then user can wait up to 6 hours after that.

Solution:
  Source images -> S3 Standard
                -> Lifecycle: transition to Glacier Flexible after 60 days

  Thumbnails   -> S3 One Zone-IA (cheaper, data is recreatable)
                -> Lifecycle: Expiration (delete) after 60 days
```

### Lifecycle Scenario 2

```
Scenario: Company rule says recover deleted S3 objects immediately for 30 days.
          After that, deleted objects should be recoverable within 48 hours for up to 365 days.

Solution:
  Enable S3 Versioning
    -> Deleted objects become "delete markers" — not actually deleted
    -> Previous versions still exist

  Transition "noncurrent versions" to Standard-IA
    -> They are not the live version, so cheaper storage is fine

  Transition "noncurrent versions" to Glacier Deep Archive after 365 days
    -> 48-hour retrieval is acceptable, archive pricing saves cost
```

### S3 Analytics — Storage Class Analysis

```
Helps you decide WHEN to transition objects to the right storage class
  -> Recommendations only for Standard and Standard-IA (not One Zone-IA or Glacier)
  -> Report updated daily
  -> Takes 24-48 hours to start seeing data analysis

Good first step before building Lifecycle Rules:
  Run Analytics -> see which objects are accessed infrequently -> build rules based on data
```

---

## 12. S3 Performance

### Baseline Performance

```
S3 automatically scales to high request rates
Latency: 100-200 milliseconds

Your application can achieve:
  3,500 PUT/COPY/POST/DELETE requests per second per prefix
  5,500 GET/HEAD requests per second per prefix

No limits on number of prefixes in a bucket

Spread reads across multiple prefixes to multiply throughput:
  bucketfolder1/sub1/file  -> prefix: /folder1/sub1/
  bucketfolder1/sub2/file  -> prefix: /folder1/sub2/
  bucket/1/file            -> prefix: /1/
  bucket/2/file            -> prefix: /2/

4 prefixes, reads spread evenly -> 22,000 GET requests/second total
```

### Multi-Part Upload

```
The Problem: You need to upload a 10 GB video file. If the upload fails at 95%,
             you restart from zero. Your connection speed limits throughput.

The Solution: Multi-Part Upload

Recommended for files > 100 MB
Required for files > 5 GB

How it works:
  File is divided into parts
  Each part uploaded in parallel
  S3 reassembles the parts after all uploads complete

Benefits:
  - Faster uploads (parallel transfers)
  - If one part fails, only retry that part (not the whole file)
  - Can pause and resume uploads

Big file -> divide into parts -> upload parts in parallel -> S3 assembles
```

### S3 Transfer Acceleration

```
The Problem: Your user is in Australia. Your S3 bucket is in us-east-1.
             Data travels across the public internet — slow and unreliable.

The Solution: S3 Transfer Acceleration

Increases transfer speed by routing file through an AWS Edge Location
The edge location then forwards to S3 bucket via AWS's private fast network

File in Australia -> Edge Location (Australia) -> AWS private network -> S3 bucket (us-east-1)
                     (close, fast upload)         (AWS backbone, fast)

Benefits:
  - Much faster for uploads from distant locations
  - Compatible with Multi-Part Upload
  - You pay a small fee per GB transferred
```

### S3 Byte-Range Fetches

```
The Problem: You only need the first 100 bytes of a large file (e.g., file metadata in header).
             Or you want to download a large file faster.

The Solution: Byte-Range Fetches

Parallelize GET requests by requesting SPECIFIC byte ranges

Use case 1 — Faster downloads:
  File in S3 -> request Part 1 (bytes 0-1000), Part 2 (bytes 1001-2000), Part 3 (bytes 2001+)
  All in parallel -> faster overall download
  Better resilience — if one range fails, retry only that range

Use case 2 — Partial content:
  Only retrieve the first X bytes of a file
  Example: retrieve just the header of a large file to check metadata
```

---

## 13. S3 Event Notifications

### The Problem

Every time a user uploads a profile photo to S3, you need to automatically generate a thumbnail. You don't want to poll S3 constantly.

### The Solution — Event Notifications

```
S3 events you can react to:
  S3:ObjectCreated
  S3:ObjectRemoved
  S3:ObjectRestore
  S3:Replication
  ...and more

Object filtering possible (e.g., only trigger on *.jpg files)

Can create as many S3 events as desired

Typical delivery time: seconds (can sometimes take a minute or longer)
```

### Three Destinations

```
SNS    -> send notification to email, SMS, other subscribers
SQS    -> put message in a queue for async processing
Lambda -> invoke a function to process the event immediately

Example: Image uploaded to S3 -> S3:ObjectCreated event -> Lambda -> create thumbnail
```

### IAM Permissions for Events

```
S3 needs permission to SEND events to the destination:
  For SNS -> attach an SNS Resource (Access) Policy allowing S3 to publish
  For SQS -> attach an SQS Resource (Access) Policy allowing S3 to send messages
  For Lambda -> attach a Lambda Resource Policy allowing S3 to invoke
```

### EventBridge Integration

```
Advanced option: send ALL S3 events to Amazon EventBridge

Benefits:
  Advanced filtering with JSON rules (by metadata, object size, name, etc.)
  Multiple destinations from a single event:
    -> Step Functions, Kinesis Streams, Kinesis Firehose, and 18+ AWS services
  EventBridge capabilities:
    -> Archive events, replay past events, reliable delivery

Use EventBridge when you need complex routing or multiple consumers per event
```

---

## 14. Requester Pays

### The Problem

You have a public dataset in S3 that you share with other AWS accounts. The data transfer costs are eating your budget — other accounts download terabytes and you pay for their bandwidth.

### The Solution — Requester Pays

```
Standard Bucket:
  Owner pays:  S3 storage cost
  Owner pays:  S3 networking/data transfer cost
  Requester:   pays nothing to download

Requester Pays Bucket:
  Owner pays:  S3 storage cost only
  Requester:   pays S3 networking cost for their own downloads

Requirements:
  Requester must be authenticated in AWS (cannot be anonymous)
  Requester's AWS account gets billed for data transfer

Use for: sharing large datasets with other AWS accounts (research data, public datasets)
```

---

## 15. S3 Batch Operations

### What is Batch Operations

Perform bulk operations on **existing S3 objects** with a single request.

```
What you can do:
  - Modify object metadata and properties
  - Copy objects between S3 buckets
  - Encrypt un-encrypted objects
  - Modify ACLs and Tags
  - Restore objects from S3 Glacier
  - Invoke Lambda function to perform custom action on each object

How it works:
  A job contains:
    -> a list of objects (from S3 Inventory or your own list)
    -> the action to perform
    -> optional parameters

S3 Batch Operations manages:
  -> retries
  -> tracks progress
  -> sends completion notifications
  -> generates reports

Can use S3 Inventory to get object list
Can use Athena to query and filter your objects before the batch job
```

---

## 16. S3 Storage Lens

### The Problem

Your company has 50 AWS accounts and 200 S3 buckets across 10 regions. You have no visibility into which buckets are growing fastest, which are costing the most, or which have missing data protection settings.

### The Solution — S3 Storage Lens

```
Understand, analyze, and optimize storage across your ENTIRE AWS Organization
  -> Discover anomalies
  -> Identify cost efficiencies
  -> Apply data protection best practices across all accounts

How it works:
  Organization -> Accounts -> Regions -> Buckets -> Prefixes
  S3 Storage Lens aggregates metrics at all these levels

  Aggregate data to an S3 bucket (export in CSV, Parquet)
  Default dashboard OR create your own dashboards
  Export metrics daily to S3 for long-term analysis

Default Dashboard:
  Shows Multi-Region and Multi-Account data
  Pre-configured by Amazon S3
  Cannot be deleted, but can be disabled
```

### Storage Lens Metrics

```
Summary Metrics:
  General insights about your S3 storage
  StorageBytes, ObjectCount...
  Identify fastest-growing or unused buckets and prefixes

Cost-Optimization Metrics:
  Identify savings opportunities
  NonCurrentVersionStorageBytes, IncompleteMultipartUploadStorageBytes...
  Find buckets with incomplete multipart uploads older than 7 days
  Identify objects that could move to lower-cost storage class

Data-Protection Metrics:
  VersioningEnabledBucketCount, SSEKMSEnabledBucketCount
  CrossRegionReplicationRuleCount...
  Identify buckets not following data-protection best practices

Access-Management Metrics:
  ObjectOwnershipBucketOwnerEnforcedBucketCount...
  Understand Object Ownership settings

Activity Metrics:
  AllRequests, GetRequests, PutRequests, ListRequests, BytesDownloaded...
  Insights into how storage is being requested

Performance Metrics:
  TransferAccelerationEnabledBucketCount
  Identify which buckets have Transfer Acceleration enabled

Detailed Status Code Metrics:
  200OKStatusCount, 403ForbiddenErrorCount, 404NotFoundErrorCount...

Event Metrics:
  EventNotificationEnabledBucketCount
  Which buckets have S3 Event Notifications configured
```

### Free vs Paid Metrics

```
Free Metrics:
  Automatically available for all customers
  Around 28 usage metrics
  Data available for queries for 14 days

Advanced Metrics and Recommendations (paid):
  Additional paid metrics (Activity Advanced, Cost Optimization, Data Protection, Status)
  CloudWatch Publishing -> access metrics in CloudWatch (additional charge)
  Prefix Aggregation   -> collect metrics at the prefix level
  Data available for queries for 15 months
```

---

## 17. S3 Security — Encryption

### Four Encryption Methods

You can encrypt objects in S3 buckets using one of 4 methods.

### Method 1 — SSE-S3 (Server-Side Encryption with S3 Managed Keys)

```
Enabled by DEFAULT for all new buckets and new objects

Keys handled, managed, and owned by AWS
Object is encrypted server-side
Encryption type: AES-256
Must set header: "x-amz-server-side-encryption": "AES256"

How it works:
  You upload file -> S3 uses its own key to encrypt -> stored encrypted
  You download    -> S3 decrypts with its own key   -> you get plaintext

You have NO control over the key. AWS manages everything.
Use when: you just want encryption without complexity
```

### Method 2 — SSE-KMS (Server-Side Encryption with AWS KMS Keys)

```
Keys handled and managed by AWS KMS (Key Management Service)
YOU have control + audit key usage using CloudTrail
Must set header: "x-amz-server-side-encryption": "aws:kms"

Benefits over SSE-S3:
  -> KMS advantages: user control over rotation, audit who used the key in CloudTrail
  -> See who decrypted what, when

How it works:
  You upload file -> S3 calls KMS -> KMS provides encryption key -> S3 encrypts
  You download    -> S3 calls KMS -> KMS checks IAM permission -> provides decrypt key -> S3 decrypts

SSE-KMS Limitation:
  KMS has API call limits per second (5,500 / 10,000 / 30,000 req/s based on region)
  High-throughput S3 workloads might hit KMS quotas
  Upload calls GenerateDataKey KMS API
  Download calls Decrypt KMS API
  -> Both count toward your KMS quota
  -> You can request a quota increase via Service Quotas Console
```

### Method 3 — SSE-C (Server-Side Encryption with Customer-Provided Keys)

```
You manage the encryption keys OUTSIDE of AWS
Amazon S3 does NOT store the encryption key you provide
You must provide the key with EVERY request

HTTPS is MANDATORY (key must travel securely to S3)
Encryption key must be provided in HTTP headers for every HTTP request

How it works:
  You upload: send file + encryption key in header -> S3 encrypts -> discards key
  You download: send request + same key in header -> S3 decrypts -> discards key

AWS never stores your key. If you lose the key, you lose the data.
Use when: compliance requires you to manage your own keys outside AWS
```

### Method 4 — Client-Side Encryption

```
You encrypt data BEFORE sending to S3
Amazon S3 stores already-encrypted data
You decrypt data yourself after downloading

How it works:
  You have file + client key
  You encrypt it yourself (using Amazon S3 Client-Side Encryption Library or your own)
  Upload the encrypted bytes to S3
  Download encrypted bytes
  Decrypt it yourself with your key

S3 never sees your plaintext data.
Customer fully manages the keys and the entire encryption/decryption cycle.
Use when: you can't trust AWS with plaintext data at any point
```

### Encryption In Transit (SSL/TLS)

```
Also called encryption in flight

S3 exposes two endpoints:
  HTTP Endpoint  -> not encrypted (plaintext in transit)
  HTTPS Endpoint -> encrypted in transit (SSL/TLS)

HTTPS is recommended
HTTPS is MANDATORY for SSE-C (because you send your key in the header)
Most clients use the HTTPS endpoint by default

Force HTTPS only -> use a Bucket Policy with aws:SecureTransport condition:
  Deny any request where "aws:SecureTransport": "false"
  This blocks all HTTP requests to the bucket
```

### Default Encryption vs Bucket Policies

```
SSE-S3 encryption is automatically applied to new objects stored in S3 bucket

You can override "default encryption" using specific headers in your API call
to SSE-KMS or SSE-C.

Bucket Policies can ENFORCE encryption:
  Deny any PutObject request without encryption headers
  This forces all uploads to use a specific encryption method

IMPORTANT NOTE: Bucket Policies are evaluated BEFORE Default Encryption
  If a policy denies unencrypted uploads, no object can be uploaded without headers
```

---

## 18. CORS — Cross-Origin Resource Sharing

### The Problem

Your static website is hosted at `http://www.example.com`. It makes a JavaScript fetch request to `http://other.example.com` (a different S3 bucket). The browser blocks this request because it comes from a different origin.

### What is CORS

```
Cross-Origin Resource Sharing (CORS)

Origin = scheme (protocol) + host (domain) + port
  https://www.example.com   (implied port 443 for HTTPS, 80 for HTTP)

Same origin:     http://example.com/app1  AND  http://example.com/app2
Different origin: http://www.example.com  AND  http://other.example.com

The browser blocks cross-origin requests UNLESS the other server
sends back CORS Headers (like: Access-Control-Allow-Origin)

This is a WEB BROWSER mechanism — server-to-server calls are not affected
```

### S3 CORS Configuration

```
Scenario: Your static website (my-bucket.s3-website.amazonaws.com)
          references images from another S3 bucket (my-images.s3-website.amazonaws.com)
          Browser blocks the image requests — different origin.

Solution: Enable CORS on the BUCKET BEING REQUESTED (the cross-origin bucket)
          Specify which origin is allowed to make requests

CORS config allows:
  - Specific origin: http://my-bucket.s3-website.amazonaws.com
  - All origins: * (wildcard — use carefully)
  - Specific methods: GET, PUT, DELETE
  - Specific headers

Without CORS enabled on the target bucket: browser blocks all cross-origin requests
With CORS enabled: browser gets the Access-Control-Allow-Origin header and allows the request
```

---

## 19. S3 MFA Delete

### What is MFA Delete

```
MFA (Multi-Factor Authentication) Delete forces users to generate a code
on a device (phone or hardware) before doing important operations on S3.

Versioning MUST be enabled on the bucket to use MFA Delete.
Only the bucket OWNER (root account) can enable/disable MFA Delete.

MFA WILL be required to:
  - Permanently delete an object version
  - Suspend versioning on the bucket

MFA will NOT be required to:
  - Enable versioning
  - List deleted versions

Use for: protecting critical data from accidental or malicious permanent deletion
```

---

## 20. S3 Access Logs

### The Problem

You need to audit who is accessing your S3 bucket — for compliance, security investigation, or billing analysis.

### The Solution — Access Logs

```
For audit purposes, log all access to your S3 buckets.
Any request made to S3 — from any account, authorized or denied — will be logged.

Log entries contain: requester, bucket, operation, timestamp, response code
Log format: https://docs.aws.amazon.com/AmazonS3/latest/dev/LogFormat.html

Requirements:
  -> Target logging bucket must be in the SAME AWS region as the source bucket
  -> Logs can be analyzed using data analysis tools (Athena)

WARNING — Do NOT set the logging bucket to be the monitored bucket.
  This creates a logging loop:
    -> Upload creates a log entry
    -> Log entry is an upload
    -> Upload creates another log entry
    -> Infinite loop -> bucket grows exponentially -> massive unintended costs
  Always use a SEPARATE dedicated logging bucket.
```

---

## 21. S3 Pre-Signed URLs

### The Problem

Your S3 bucket is private. You want to give a temporary download link to one specific user for one specific file — without making the bucket public or creating an IAM user for them.

### The Solution — Pre-Signed URLs

```
Generate pre-signed URLs using: S3 Console, AWS CLI, or SDK

URL Expiration:
  S3 Console: 1 minute up to 720 minutes (12 hours)
  AWS CLI:    configure using --expires-in parameter in seconds
              default 3600 seconds, max 604800 seconds (168 hours = 7 days)

How it works:
  You (the owner) generate a URL that is signed with YOUR credentials
  The URL embeds: which object, which operation, when it expires
  User receives the URL -> uses it to GET or PUT -> S3 validates the signature
  
  The pre-signed URL inherits the permissions of the user that generated it
  If you can access the object -> user with your pre-signed URL can access it

Use cases:
  - Allow only logged-in users to download a premium video from your S3 bucket
  - Dynamically generate URLs to let users download files (time-limited)
  - Temporarily let a specific user upload a file to a precise location in your S3 bucket
    without giving them permanent access
```

---

## 22. S3 Object Lock and Glacier Vault Lock

### S3 Object Lock — WORM Model

```
WORM = Write Once Read Many
Block an object version from being deleted for a specified amount of time

Versioning must be enabled

Retention mode — Compliance:
  Object versions can't be overwritten or deleted by ANY user, including root
  Object retention modes and retention periods can't be shortened

Retention mode — Governance:
  Most users can't overwrite/delete an object or alter lock settings
  Some users have special permissions to change or delete the object

Retention Period:
  Protect the object for a fixed period
  Can be extended

Legal Hold:
  Protect object indefinitely, independent of retention period
  Can be freely placed and removed using: s3:PutObjectLegalHold IAM permission
```

### Glacier Vault Lock

```
Adopt a WORM (Write Once Read Many) model for Glacier
Create a Vault Lock Policy to lock the policy for future edits
  -> Once locked, policy can no longer be changed or deleted

Helpful for compliance and data retention requirements
Example: regulation requires backups be immutable for 7 years
  -> Set Glacier Vault Lock -> data cannot be deleted or modified for 7 years
```

---

## 23. S3 Access Points

### The Problem

Your S3 bucket contains data for 3 different teams: Finance, Sales, Analytics. Each team needs different access. Managing this through a single bucket policy becomes huge and complex.

### The Solution — Access Points

```
Access Points simplify security management for S3 buckets.

Each Access Point has:
  - Its own DNS name (Internet Origin or VPC Origin)
  - Its own Access Point Policy (similar to bucket policy — manage security at scale)

Example:
  Finance Access Point   -> IAM users in Finance group -> /finance/* prefix only
  Sales Access Point     -> IAM users in Sales group   -> /sales/* prefix only
  Analytics Access Point -> Analytics team             -> /analytics/* prefix (read-only)

Each team uses their own Access Point endpoint.
The bucket itself doesn't need a complex policy — each Access Point handles its team.

VPC Origin Access Points:
  Define the access point to only be accessible from within your VPC
  You must create a VPC Endpoint (Gateway or Interface Endpoint)
  The VPC Endpoint Policy must allow access to the target bucket and Access Point
```

---

## 24. S3 Object Lambda

### The Problem

Your S3 bucket has raw customer data. One application needs it as-is. Another application needs PII (Personally Identifiable Information) redacted before it gets the data. You don't want to maintain two separate copies of the data.

### The Solution — S3 Object Lambda

```
Use AWS Lambda Functions to change an object before it is retrieved by the caller.
Only one S3 bucket is needed — Lambda transforms on the fly.

How it works:
  Client  -> S3 Access Point -> S3 Object Lambda Access Point -> Lambda function -> modified object

Use cases:
  - Redacting personally identifiable information for analytics or non-production environments
  - Converting data formats (e.g., converting XML to JSON on the fly)
  - Resizing/watermarking images on the fly, tailored for the specific user who requested it

The original object in S3 remains unchanged.
Lambda modifies the response in real time.
```

---

## Quick Reference

```
S3 Basics
  Object Storage (not file system, not database)
  Objects (files) stored in Buckets (directories)
  Bucket names: globally unique, region-level, 3-63 chars, lowercase/number
  Object Key = full path. No real directories — just long key names with /
  Max object size: 5 TB. Files > 5 GB must use Multi-Part Upload.
  Metadata, Tags (up to 10), Version ID per object

Security
  IAM Policy     -> user-level access (what APIs a user can call)
  Bucket Policy  -> resource-level, cross-account, JSON-based
  Block Public Access -> safety override, on by default, prevents data leaks
  Access Points  -> simplify access for multiple teams/apps per bucket

Versioning
  Bucket-level setting. Overwrite = new version (1, 2, 3...)
  Delete = delete marker (object not gone, restore by removing marker)
  Files pre-versioning = version "null"
  Suspend versioning = keep old versions, stop creating new ones

Replication
  CRR = Cross-Region: compliance, latency, cross-account
  SRR = Same-Region: log aggregation, prod/test sync
  Requires versioning on both buckets. Async. Only new objects (use Batch for existing).
  No chaining (A->B->C: A objects don't reach C automatically)
  Delete markers: optional replication. Version ID deletes: never replicated.

Storage Classes
  Standard    -> active data, no min storage, free retrieval
  Standard-IA -> monthly+ access, 30-day min, per-GB retrieval
  One Zone-IA -> 30-day min, one AZ only, recreatable data
  Glacier Instant  -> quarterly access, 90-day min, ms retrieval
  Glacier Flexible -> rare access, 90-day min, hours retrieval
  Glacier Deep     -> 7-year archives, 180-day min, 12-48h retrieval
  Intelligent-Tiering -> unknown patterns, auto-moves, no retrieval fee

Lifecycle Rules
  Transition Actions: move between storage classes on a schedule
  Expiration Actions: delete objects/versions after X days
  Target by prefix or tag

Performance
  3,500 PUT/5,500 GET per second per prefix
  Multi-Part Upload: recommended >100MB, required >5GB, parallel parts
  Transfer Acceleration: edge location -> AWS backbone -> S3
  Byte-Range Fetches: parallel GET by byte range, faster + partial retrieval

Event Notifications
  Triggers: ObjectCreated, ObjectRemoved, ObjectRestore, Replication
  Destinations: SNS, SQS, Lambda
  EventBridge: advanced filtering, 18+ destinations, archive/replay

Encryption
  SSE-S3: AWS managed keys, AES-256, default, header: "AES256"
  SSE-KMS: KMS managed, audit via CloudTrail, header: "aws:kms", beware KMS quota
  SSE-C: customer key in every request header, HTTPS mandatory, AWS never stores key
  Client-Side: encrypt before upload, decrypt after download, you manage everything
  In Transit: HTTPS recommended, mandatory for SSE-C, force with bucket policy

Security Features
  CORS: enable on cross-origin bucket, specify allowed origins/methods
  MFA Delete: require MFA for permanent deletes/suspend versioning, root only
  Access Logs: separate logging bucket, never log to monitored bucket (loop!)
  Pre-Signed URLs: temporary, inherit signer's permissions, up to 7 days via CLI
  Object Lock: WORM model, Compliance (nobody can delete) vs Governance (special perms)
  Glacier Vault Lock: immutable WORM policy once locked, compliance/retention

Advanced
  Storage Lens: org-wide visibility, anomaly detection, cost optimization, free + paid metrics
  Batch Operations: bulk operations on existing objects (copy, encrypt, tag, Lambda, Glacier restore)
  Requester Pays: requester pays bandwidth (must be authenticated AWS account)
  Object Lambda: transform objects in real-time via Lambda before returning to caller
  Access Points: per-team/per-app access with separate DNS + policy, VPC-only option
  S3 Analytics: tells you when to transition to IA, takes 24-48h to start, daily report
```

> **S3 Developer Guide**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
> **Storage Classes**: https://aws.amazon.com/s3/storage-classes/
> **S3 Pricing**: https://aws.amazon.com/s3/pricing/
> **S3 Access Log Format**: https://docs.aws.amazon.com/AmazonS3/latest/dev/LogFormat.html

## 10. CloudFront & AWS Global Accelerator

> **Official CloudFront Docs**: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
> **Official Global Accelerator Docs**: https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html

---

## 1. What is Amazon CloudFront

### The Problem

Your S3 bucket or application is in `ap-south-1` (Mumbai). A user in Brazil downloads a 50 MB file. The request travels halfway across the world — high latency, slow load times. If 10,000 users do this simultaneously, your origin gets hammered on every single request.

### The Solution — CloudFront

CloudFront is a **Content Delivery Network (CDN)**. It caches your content at edge locations around the world so users get it from nearby — not from your origin.

```
How it works:
  User requests content
     -> CloudFront Edge Location (nearest to user) checks its cache
     -> Cache hit?  Return content immediately from edge (fast, low latency)
     -> Cache miss? Fetch from origin, cache it at edge, return to user
     -> Next user in same region -> served from cache

Benefits:
  - Improves read performance (content is cached at the edge)
  - Improves user experience globally
  - Hundreds of Points of Presence globally (edge locations + caches)
  - DDoS protection because it is distributed worldwide
  - Integration with AWS Shield and AWS Web Application Firewall (WAF)
```

```
Source: https://aws.amazon.com/cloudfront/features/?nc=sn&loc=2
(interactive map of all CloudFront edge locations worldwide)
```

---

## 2. CloudFront Origins — What Can CloudFront Cache

CloudFront sits in front of an **origin**. The origin is where your actual content lives. CloudFront supports three types of origins.

### Origin 1 — S3 Bucket

```
Use for:
  - Distributing files and caching them at the edge globally
  - Uploading files to S3 through CloudFront (ingress)

Security:
  - Secured using Origin Access Control (OAC)
  - OAC replaces the older Origin Access Identity (OAI)
  - Your S3 bucket stays private — only CloudFront can access it
  - Users hit CloudFront, CloudFront hits S3 with OAC credentials
```

### Origin 2 — VPC Origin

```
Use for:
  - Applications hosted in VPC private subnets
  - Private Application Load Balancer
  - Private Network Load Balancer
  - EC2 Instances in private subnets

No need to expose your application to the internet.
CloudFront reaches into your VPC through VPC Origins.
```

### Origin 3 — Custom Origin (HTTP)

```
Any public HTTP backend:
  - S3 website (must first enable the bucket as a static S3 website)
  - Any public ALB
  - Any HTTP server anywhere
  - On-premises servers
```

---

## 3. How CloudFront Works — High Level Flow

```
Client makes a request:
  GET /beach.jpg HTTP/1.1
  Host: www.example.com
  User-Agent: Mozilla/5.0 (compatible; MSIE10.0; Windows NT)

Request hits the nearest CloudFront Edge Location

Edge Location checks Local Cache:
  Cache hit  -> return cached content immediately
  Cache miss -> Forward Request to your Origin (S3 or HTTP)
             -> Origin returns content
             -> Edge Location caches it (TTL based)
             -> Returns content to client

Next request for same content from same region:
  -> Served from Local Cache (no origin request)
```

---

## 4. CloudFront — S3 as an Origin

### The Setup

```
Your S3 bucket (origin) is in one region: us-east-1

CloudFront Edge Locations around the world:
  Los Angeles (Private AWS network)
  Mumbai      (Private AWS network)
  Sao Paulo   (Private AWS network - Public subnet)
  Melbourne   (Private AWS network)

Users in each region hit their nearest edge location
Edge location fetches from S3 over the AWS private network (not public internet)

Security:
  S3 bucket has: Origin Access Control (OAC) + S3 bucket policy
  Only CloudFront can read from the bucket
  S3 bucket is NOT publicly accessible
```

### CloudFront vs S3 Cross Region Replication

These two features are often confused. They solve different problems.

```
CloudFront:
  Global Edge Network
  Files are CACHED for a TTL (maybe a day)
  Great for STATIC content that must be available everywhere
  All edge locations share the same cached content
  Content is eventually consistent (cached)

S3 Cross Region Replication:
  Must be SETUP for each region you want replication to happen
  Files are updated in NEAR REAL-TIME (almost immediately)
  Read-only (replication, not write)
  Great for DYNAMIC content that needs to be available at low-latency in FEW specific regions

Decision:
  Static files, global audience, caching OK?   -> CloudFront
  Dynamic files, specific regions, real-time?  -> S3 CRR
```

---

## 5. CloudFront — ALB or EC2 as an Origin

### Option 1 — Using VPC Origins (Private)

```
Scenario: Your application runs on EC2 instances or ALB inside a VPC private subnet.
          You don't want to expose them to the internet directly.

CloudFront -> VPC Origin -> Private Subnet -> Application Load Balancer / EC2

Benefits:
  - EC2 instances stay private (no public IP needed)
  - ALB stays private
  - Only CloudFront can reach your application
  - Users never directly access your backend
```

### Option 2 — Using Public Network

```
Scenario: Your ALB and EC2 are on the public network.

CloudFront Edge Location -> ALB (must be public) -> EC2 (can be private)

Requirements:
  - Allow Public IPs of Edge Locations through to the ALB
    (AWS publishes the list of CloudFront edge location IPs)
  - Application Load Balancer: MUST be public
  - EC2 Instances: CAN be private (ALB handles the public-facing part)
  - Allow Security Group of Load Balancer on EC2 Security Group
```

---

## 6. CloudFront Geo Restriction

### The Problem

Your video streaming platform has licensing agreements — you can only legally serve content in specific countries. Or you need to block users from sanctioned regions.

### The Solution

```
You can restrict who can access your CloudFront distribution:

Allowlist:
  Allow your users to access content only if they are in one of the
  countries on a list of APPROVED countries

Blocklist:
  Prevent your users from accessing content if they are in one of
  the countries on a list of BANNED countries

How "country" is determined:
  Using a 3rd party Geo-IP database (maps IP address -> country)

Use cases:
  - Copyright Laws: can't distribute certain content in certain countries
  - Compliance: block access from sanctioned regions
  - Content licensing: streaming rights are region-specific
```

---

## 7. CloudFront Cache Invalidations

### The Problem

You update your website's CSS file on S3. But CloudFront is still serving the old cached version to users. The TTL might be 24 hours. Users see your old broken styling for a day.

### The Solution — Cache Invalidation

```
When you update the back-end origin, CloudFront doesn't know about it.
It will only get the refreshed content AFTER the TTL has expired.

But you can FORCE a cache refresh by performing a CloudFront Invalidation.

How it works:
  You trigger an invalidation from the console, CLI, or API
  CloudFront removes the specified objects from ALL edge location caches
  Next request for that object -> fetched fresh from origin -> re-cached

What you can invalidate:
  All files:     /*
  Specific path: /images/*
  Single file:   /images/logo.png

After invalidation:
  Next user request -> cache miss -> fetch from origin -> fresh content served
```

---

## 8. AWS Global Accelerator

### The Problem

Your application is deployed in one region (us-east-1). You have global users. They access your app over the public internet — many network hops, unpredictable routing, high latency.

```
Without Global Accelerator:
  User in Australia -> many public internet hops -> Public ALB in us-east-1
  Each hop adds latency. Public internet routing is unpredictable.
  America, Europe, Australia, India users all traverse the slow public internet.
```

### Unicast IP vs Anycast IP — The Key Concept

```
Unicast IP:
  One server holds one specific IP address
  Client is routed to that specific server by IP
  12.34.56.78 -> Server A
  98.76.54.32 -> Server B
  Client must know and connect to the specific IP

Anycast IP:
  ALL servers hold the SAME IP address
  Client is automatically routed to the NEAREST server holding that IP
  12.34.56.78 -> Server A (Americas)
  12.34.56.78 -> Server B (Europe)
  12.34.56.78 -> Server C (Asia)
  Client connects to 12.34.56.78 -> automatically hits closest server
```

### What is AWS Global Accelerator

```
Leverages the AWS internal network to route your application traffic

How it works:
  2 Anycast IPs are created for your application
  These Anycast IPs are fixed and never change
  
  User in Australia:
    -> Connects to the Anycast IP
    -> Routed to the nearest Edge Location (Australia)
    -> Traffic travels the AWS private network (not public internet) to your ALB/EC2
    -> Fast, consistent, low latency

Traffic flow:
  User -> Anycast IP -> Nearest Edge Location -> AWS Private Network -> Your app
```

### Global Accelerator Features

```
Works with: Elastic IP, EC2 instances, ALB, NLB — public or private

Consistent Performance:
  Intelligent routing to lowest latency and fast regional failover
  No issue with client cache (IP never changes — unlike DNS where TTL causes stale IPs)
  Uses the internal AWS network (not the unpredictable public internet)

Health Checks:
  Global Accelerator performs health checks on your application
  Makes your application global with failover in less than 1 minute for unhealthy targets
  Great for disaster recovery (health check built in)

Security:
  Only 2 external IPs need to be whitelisted (your clients only see 2 IPs)
  DDoS protection through AWS Shield (integrated)
```

---

## 9. CloudFront vs Global Accelerator

Both use the AWS global network and edge locations worldwide. Both integrate with AWS Shield for DDoS protection. But they solve different problems.

```
CloudFront (CDN):
  Improves performance for CACHEABLE content (images, videos, static files)
  Dynamic site delivery (API responses, dynamic pages)
  Content is SERVED at the edge (cached)
  Reduces load on your origin
  Best for: websites, static assets, APIs with cacheable responses

Global Accelerator (Network Accelerator):
  Improves performance for a WIDE RANGE of applications over TCP or UDP
  Proxying packets at the edge to applications running in one or more AWS Regions
  Good for non-HTTP use cases: gaming (UDP), IoT (MQTT), Voice over IP
  Good for HTTP use cases that require static IP addresses
  Good for HTTP use cases that need deterministic, fast regional failover
  Does NOT cache content — routes traffic more efficiently

Quick Decision:
  Serving files/content/websites?               -> CloudFront
  Need static IPs for your application?         -> Global Accelerator
  Non-HTTP protocol (UDP, MQTT, VoIP)?          -> Global Accelerator
  Need sub-1-minute failover across regions?    -> Global Accelerator
  Need to cache at edge?                        -> CloudFront
```

---

## Quick Reference

```
CloudFront — CDN
  Caches content at 400+ edge locations globally
  Reduces latency (user served from nearby edge, not distant origin)
  DDoS protection via AWS Shield + WAF integration

  Origins:
    S3 Bucket      -> static files, use OAC (not OAI) to keep bucket private
    VPC Origin     -> private ALB/NLB/EC2 in private subnets
    Custom HTTP    -> public ALB, any HTTP server, on-premises

  CloudFront vs S3 CRR:
    CloudFront  -> cache, global, static, TTL-based, eventual consistency
    S3 CRR      -> real-time, specific regions, dynamic content, read-only

  ALB/EC2 as origin:
    VPC Origin  -> private subnets, CloudFront accesses via VPC origin
    Public      -> ALB must be public, EC2 can be private, allow edge IPs

  Geo Restriction:
    Allowlist: serve only to approved countries
    Blocklist: block banned countries
    Determined by 3rd party Geo-IP database

  Cache Invalidation:
    Force refresh before TTL expires
    Invalidate /* (all) or specific paths /images/*
    Removes cached objects from ALL edge locations

Global Accelerator — Network Accelerator
  2 static Anycast IPs per application
  Routes traffic via AWS private network (not public internet)
  Works for: EC2, ALB, NLB, Elastic IP — public or private
  Health checks with < 1 minute failover
  Only 2 IPs to whitelist
  DDoS protection via Shield

CloudFront vs Global Accelerator:
  CloudFront      -> cacheable content, CDN, websites, static assets
  Global Accel.   -> any TCP/UDP app, static IPs needed, fast failover, non-HTTP protocols
```

> **CloudFront Pricing**: https://aws.amazon.com/cloudfront/pricing/
> **Global Accelerator**: https://aws.amazon.com/global-accelerator/
> **CloudFront Edge Locations**: https://aws.amazon.com/cloudfront/features/

## 11. FSX, Storage gateway, transfer family, Snowball and Data sync

> **Official Docs**: https://docs.aws.amazon.com/whitepapers/latest/aws-storage-services-overview/

---

## 1. AWS Snowball — Moving Massive Data

#### The Problem

Your company has 100 TB of data on-premises and needs to migrate it to AWS. Over a 100 Mbps internet connection, that would take **134 days**. Over 1 Gbps, still **12 days**. And you're paying for every GB of data transfer. Plus — limited bandwidth, high network cost, unstable connection.

```
Time to Transfer (reality check):
  Data    | 100 Mbps  | 1 Gbps   | 10 Gbps
  10 TB   | 12 days   | 30 hours | 3 hours
  100 TB  | 124 days  | 12 days  | 30 hours
  1 PB    | 3 years   | 124 days | 12 days

Challenges with network transfer:
  - Limited connectivity
  - Limited bandwidth
  - High network cost
  - Shared bandwidth (can't maximize the line)
  - Connection stability issues

Rule: If it takes more than a week to transfer over the network -> use Snowball devices
```

#### The Solution — AWS Snowball

```
Highly-secure, portable physical devices to:
  - Collect and process data at the edge
  - Migrate data into and out of AWS

Helps migrate up to PETABYTES of data

How it works:
  1. Request a Snowball device from AWS console
  2. AWS ships the device to you
  3. You load your data onto it (high-speed local transfer)
  4. Ship the device back to AWS
  5. AWS imports your data into S3
  6. Device is wiped and reused
```

### Snowball Device Types

```
Device                          | vCPUs   | Memory  | Storage
Snowball Edge Storage Optimized | 104 vCPU | 416 GB | 210 TB
Snowball Edge Compute Optimized | 104 vCPU | 416 GB | 28 TB
```

### What is Edge Computing

```
Edge Computing = process data while it's being created at an edge location
  A truck on the road, a ship on the sea, a mining station underground...
  These locations may have limited internet and no computing power

Solution: Snowball Edge device for edge computing
  Snowball Edge Compute Optimized -> dedicated for compute workloads
  Snowball Edge Storage Optimized -> for storage + some compute

Capabilities at the edge:
  - Run EC2 Instances directly on the Snowball
  - Run Lambda functions at the edge
  - Shared storage across EC2 instances

Use cases: preprocess data, machine learning, transcoding media — before sending to AWS
```

### Snowball into Glacier — Important Note

```
Snowball CANNOT import to Glacier directly.

You must:
  Snowball -> import to Amazon S3 first -> S3 Lifecycle Policy -> Amazon Glacier

Direct Snowball -> Glacier is not supported.
Always go through S3 first.
```

---

## 2. Amazon FSx — High-Performance File Systems on AWS

### What is FSx

FSx lets you **launch 3rd party high-performance file systems on AWS** as a fully managed service. You get enterprise file system capabilities without managing the underlying infrastructure.

```
Four FSx options:
  FSx for Windows File Server  -> Windows-native file shares (SMB)
  FSx for Lustre               -> High-Performance Computing (HPC)
  FSx for NetApp ONTAP         -> NetApp ONTAP compatibility
  FSx for OpenZFS              -> OpenZFS compatibility
```

---

## 3. FSx for Windows File Server

#### The Problem

Your company runs Windows workloads that need shared file storage — Windows servers, Active Directory authentication, DFS namespaces. EFS only supports Linux. You need a proper Windows file system on AWS.

#### The Solution

```
FSx for Windows is a fully managed Windows file system share drive

Key features:
  - Supports SMB protocol and Windows NTFS
  - Microsoft Active Directory integration, ACLs, user quotas
  - Can be MOUNTED ON LINUX EC2 instances too
  - Supports Microsoft's Distributed File System (DFS) Namespaces
    -> group files across multiple FSx file systems
  - Scale up to 10s of GB/s, millions of IOPS, 100s of PB of data

Storage options:
  SSD -> latency-sensitive workloads (databases, media processing, data analytics...)
  HDD -> broad spectrum of workloads (home directory, CMS...)

Access from on-premises:
  Can be accessed from your on-premises infrastructure via VPN or Direct Connect

High Availability:
  Can be configured to be Multi-AZ

Backup:
  Data is backed up daily to S3
```

---

## 4. FSx for Lustre

#### The Problem

Your ML team needs to train models on terabytes of data. They need a file system that can deliver hundreds of GB/s of throughput and millions of IOPS with sub-millisecond latency. No standard file system can handle this.

#### The Solution

```
Lustre = a type of parallel distributed file system for large-scale computing
Name "Lustre" is derived from "Linux" and "cluster"

Use cases:
  - Machine Learning: High Performance Computing (HPC)
  - Video Processing
  - Financial Modeling
  - Electronic Design Automation

Performance:
  Scale up to 100s GB/s, millions of IOPS, sub-ms latencies

Storage options:
  SSD -> low-latency, IOPS-intensive workloads, small & random file operations
  HDD -> throughput-intensive workloads, large & sequential file operations

S3 Integration (killer feature):
  Can "read" S3 as a file system (through FSx)
  Can write the output of computations back to S3 (through FSx)
  -> Your ML job reads training data from S3 via FSx, writes results back to S3

On-premises:
  Can be used from on-premises servers (VPN or Direct Connect)
```

### FSx for Lustre — Deployment Options

```
Scratch File System:
  - Temporary storage
  - Data is NOT replicated (data lost if file server fails)
  - High burst: 6x faster, 200 MB/s per TiB
  - Use for: short-term processing, optimizing cost

Persistent File System:
  - Long-term storage
  - Data IS replicated within the same AZ
  - Replace failed files within minutes
  - Use for: long-term processing with sensitive data
```

---

## 5. FSx for NetApp ONTAP

##### The Problem

Your company already uses NetApp ONTAP on-premises. You want to move workloads to AWS without rewriting applications or changing how teams access storage.

#### The Solution

```
Managed NetApp ONTAP on AWS
File System compatible with: NFS, SMB, iSCSI protocol

Works with:
  - Linux
  - Windows
  - macOS
  - VMware Cloud on AWS
  - Amazon Workspaces and AppStream 2.0
  - Amazon EC2, ECS, EKS

Features:
  Storage shrinks or grows automatically (no manual resizing)
  Snapshots, replication, low-cost compression, data de-duplication
  Point-in-time instantaneous cloning — helpful for testing new workloads
    (clone production data instantly without copying it — copy-on-write)
```

---

## 6. FSx for OpenZFS

#### The Problem

Your workloads run on ZFS on-premises (Linux, macOS, FreeBSD). You need to move to AWS while keeping the same file system interface.

#### The Solution

```
Managed OpenZFS file system on AWS
Compatible with NFS (v3, v4, v4.1, v4.2)
Move workloads running on ZFS to AWS

Works with:
  - Linux, Windows, macOS
  - VMware Cloud on AWS
  - Amazon Workspaces and AppStream 2.0
  - Amazon EC2, ECS, EKS

Performance:
  Up to 1,000,000 IOPS with < 0.5ms latency
  Snapshots, compression — low cost

Point-in-time instantaneous cloning (helpful for testing new workloads)
```

---

## 7. AWS Storage Gateway — Hybrid Cloud Storage

#### The Problem

AWS is pushing for "hybrid cloud" — part of your infrastructure is in the cloud, part is on-premises. This can be due to long cloud migrations, security requirements, compliance, or IT strategy. The issue: S3 is a proprietary storage technology. Your on-premises systems can't natively access S3 data (unlike EFS which uses NFS).

### The Solution — AWS Storage Gateway

```
Bridge between on-premises data and cloud data
Gives on-premises access to cloud storage seamlessly

Use cases:
  - Disaster recovery (back up on-premises data to cloud)
  - Backup and restore
  - Tiered storage (keep hot data on-premises, cold data in cloud)
  - On-premises cache and low-latency file access

Three types of Storage Gateway:
  1. S3 File Gateway
  2. Volume Gateway
  3. Tape Gateway
```

### Type 1 — S3 File Gateway

```
Scenario: Your on-premises application servers use NFS or SMB to access files.
          You want those files to actually live in S3 (for cost, durability, scale).

How it works:
  Application server -> NFS or SMB -> S3 File Gateway -> HTTPS -> Amazon S3

S3 File Gateway translates NFS/SMB into S3 API calls

Features:
  - S3 buckets accessible using the NFS and SMB protocol
  - Most recently used data is CACHED in the file gateway (low-latency access)
  - Supports: S3 Standard, S3 Standard-IA, S3 One Zone-IA, S3 Intelligent Tiering
  - Transition to S3 Glacier using a Lifecycle Policy
  - Bucket access using IAM roles for each File Gateway
  - SMB Protocol has integration with Active Directory (AD) for user authentication
```

### Type 2 — Volume Gateway

```
Scenario: Your on-premises servers use iSCSI block storage. You want cloud backup.

How it works:
  Application server -> iSCSI -> Volume Gateway -> HTTPS -> S3 Bucket + EBS Snapshots

Block storage using iSCSI protocol — backed by S3
Backed by EBS snapshots (which can help restore on-premises volumes)

Two modes:

  Cached Volumes:
    Primary data in S3
    Most recently accessed data is CACHED on-premises
    Low-latency access to most recent data
    Full dataset is in the cloud

  Stored Volumes:
    Entire dataset is ON-PREMISES
    Scheduled backups to S3 (as EBS snapshots)
    Low-latency access to entire dataset
    Good when you need your full data locally at all times
```

### Type 3 — Tape Gateway

```
Scenario: Some companies still use physical tape backup processes.
          Moving them to cloud while keeping the same backup software workflow.

How it works:
  Backup Server -> iSCSI -> Tape Gateway -> HTTPS -> Amazon S3 + Amazon Glacier

Virtual Tape Library (VTL) backed by Amazon S3 and Glacier
Back up data using existing tape-based processes (and iSCSI interface)
Works with leading backup software vendors (Veeam, Backup Exec, etc.)

Your backup software thinks it's writing to tape — it's actually writing to S3/Glacier
```

---

## 8. AWS Transfer Family

#### The Problem

Your partners and customers send/receive files using FTP, FTPS, or SFTP — old but common protocols used in banking, healthcare, supply chain. You want to receive these files directly into S3 or EFS without running your own FTP servers.

### The Solution — AWS Transfer Family

```
A fully-managed service for file transfers into and out of:
  - Amazon S3
  - Amazon EFS
Using the FTP protocol family

Supported protocols:
  AWS Transfer for FTP   -> File Transfer Protocol (FTP) — plain, no encryption
  AWS Transfer for FTPS  -> File Transfer Protocol over SSL (FTPS)
  AWS Transfer for SFTP  -> Secure File Transfer Protocol (SFTP)

Infrastructure:
  Managed, Scalable, Reliable, Highly Available (Multi-AZ)
  Pay per provisioned endpoint per hour + data transfers in GB
  No servers to manage

Authentication:
  Store and manage users' credentials within the service
  Integrate with: Microsoft Active Directory, LDAP, Okta, Amazon Cognito, custom

Use cases:
  - Sharing files with partners
  - Public datasets
  - CRM, ERP system integrations
```

---

## 9. AWS DataSync — Moving Data Between Storage Services

#### The Problem

You have large amounts of data on-premises (NFS, SMB, HDFS) or in other clouds (S3 API). You need to move it to AWS storage. Network transfers are slow. You need automatic scheduling, bandwidth throttling, and metadata preservation.

### The Solution — AWS DataSync

```
Move large amounts of data to and from:
  - On-premises / other clouds -> AWS (needs an agent installed on-premises)
  - AWS -> AWS (between different storage services — no agent needed)

Can synchronize to:
  - Amazon S3 (any storage class, including Glacier)
  - Amazon EFS
  - Amazon FSx (Windows, Lustre, NetApp, OpenZFS)

Key features:
  - Replication tasks can be scheduled: hourly, daily, weekly
  - File permissions and metadata are preserved (NFS POSIX, SMB...)
  - One agent can use 10 Gbps, can set up a bandwidth limit
  - Data is NOT continuously synced — it's a scheduled replication

On-premises to AWS:
  On-premises (NFS/SMB) -> DataSync Agent -> TLS -> AWS DataSync -> S3/EFS/FSx

AWS to AWS (no agent):
  S3 -> DataSync -> EFS, FSx, another S3 bucket, etc.
  DataSync can copy data and metadata between AWS storage services
```

---

## 10. AWS Cloud Native Storage Options — Full Picture

```
Block Storage:
  Amazon EBS        -> Network drive for one EC2 instance at a time (high IOPS)
  EC2 Instance Store -> Physical storage on EC2 host (temporary, fastest)

File Storage:
  Amazon EFS        -> Network File System for Linux instances, POSIX filesystem, multi-EC2
  Amazon FSx        -> 3rd party high-performance file systems (Windows, Lustre, ONTAP, OpenZFS)

Object Storage:
  Amazon S3         -> Object storage, "infinitely scaling"
  Amazon Glacier    -> Object archival, low cost long-term
```

---

## Quick Reference — Storage Comparison

```
S3            -> Object Storage (files as objects, not blocks or filesystem)
S3 Glacier    -> Object Archival (cheapest, slowest retrieval)
EBS volumes   -> Network storage for ONE EC2 instance at a time (high IOPS)
Instance Store -> Physical storage on EC2 host (temporary, very fast)
EFS           -> Network File System for Linux instances, POSIX filesystem, multi-AZ
FSx for Windows     -> Network File System for Windows servers (SMB, NTFS, AD)
FSx for Lustre      -> High Performance Computing file system (HPC, ML, video)
FSx for NetApp ONTAP -> High OS Compatibility (NFS, SMB, iSCSI, multi-OS)
FSx for OpenZFS     -> Managed ZFS file system (Linux/Mac/Windows)
Storage Gateway -> Bridge on-premises <-> cloud (S3 File / Volume / Tape)
Transfer Family -> FTP/FTPS/SFTP interface on top of S3 or EFS (no server to manage)
DataSync      -> Schedule data sync from on-premises to AWS or between AWS services
Snowball/Snowmobile -> Move large amounts of data physically to the cloud
Database      -> For specific workloads with indexing and querying

Storage Gateway Types:
  S3 File Gateway  -> NFS/SMB on-premises -> S3 (caches recent data locally)
  Volume Gateway   -> iSCSI block storage -> S3 + EBS snapshots
    Cached  -> primary in S3, cache recent data on-premises
    Stored  -> primary on-premises, backup to S3
  Tape Gateway     -> VTL -> S3/Glacier (replace physical tape processes)

FSx Deployment (Lustre):
  Scratch -> temporary, no replication, high burst, short-term processing
  Persistent -> replicated in AZ, long-term, sensitive data

Snowball:
  Physical device shipped to you -> load data -> ship back -> imported to S3
  Edge Computing: run EC2/Lambda on the device at remote locations
  Cannot import to Glacier directly — must go through S3 + Lifecycle Policy

DataSync:
  On-premises -> AWS: needs agent
  AWS -> AWS: no agent needed
  Preserves file permissions and metadata
  Scheduled (hourly/daily/weekly), not continuous
  Up to 10 Gbps per agent
```

> **FSx Overview**: https://aws.amazon.com/fsx/
> **Storage Gateway**: https://aws.amazon.com/storagegateway/
> **DataSync**: https://aws.amazon.com/datasync/
> **Transfer Family**: https://aws.amazon.com/aws-transfer-family/
> **Snowball**: https://aws.amazon.com/snowball/

##  12. AWS Integration & Messaging - SQS, SNS & Kinesis

> **Official Docs**: https://docs.aws.amazon.com/whitepapers/latest/aws-storage-services-overview/

---

## 1. AWS Snowball — Moving Massive Data

#### The Problem

Your company has 100 TB of data on-premises and needs to migrate it to AWS. Over a 100 Mbps internet connection, that would take **134 days**. Over 1 Gbps, still **12 days**. And you're paying for every GB of data transfer. Plus — limited bandwidth, high network cost, unstable connection.

```
Time to Transfer (reality check):
  Data    | 100 Mbps  | 1 Gbps   | 10 Gbps
  10 TB   | 12 days   | 30 hours | 3 hours
  100 TB  | 124 days  | 12 days  | 30 hours
  1 PB    | 3 years   | 124 days | 12 days

Challenges with network transfer:
  - Limited connectivity
  - Limited bandwidth
  - High network cost
  - Shared bandwidth (can't maximize the line)
  - Connection stability issues

Rule: If it takes more than a week to transfer over the network -> use Snowball devices
```

#### The Solution — AWS Snowball

```
Highly-secure, portable physical devices to:
  - Collect and process data at the edge
  - Migrate data into and out of AWS

Helps migrate up to PETABYTES of data

How it works:
  1. Request a Snowball device from AWS console
  2. AWS ships the device to you
  3. You load your data onto it (high-speed local transfer)
  4. Ship the device back to AWS
  5. AWS imports your data into S3
  6. Device is wiped and reused
```

### Snowball Device Types

#### Snowball Edge Storage Optimized
#### Snowball Edge Compute Optimized

```
Device                          | vCPUs   | Memory  | Storage
Snowball Edge Storage Optimized | 104 vCPU | 416 GB | 210 TB
Snowball Edge Compute Optimized | 104 vCPU | 416 GB | 28 TB
```

### What is Edge Computing

```
Edge Computing = process data while it's being created at an edge location
  A truck on the road, a ship on the sea, a mining station underground...
  These locations may have limited internet and no computing power

Solution: Snowball Edge device for edge computing
  Snowball Edge Compute Optimized -> dedicated for compute workloads
  Snowball Edge Storage Optimized -> for storage + some compute

Capabilities at the edge:
  - Run EC2 Instances directly on the Snowball
  - Run Lambda functions at the edge
  - Shared storage across EC2 instances

Use cases: preprocess data, machine learning, transcoding media — before sending to AWS
```

### Snowball into Glacier — Important Note

```
Snowball CANNOT import to Glacier directly.

You must:
  Snowball -> import to Amazon S3 first -> S3 Lifecycle Policy -> Amazon Glacier

Direct Snowball -> Glacier is not supported.
Always go through S3 first.
```

---

## 2. Amazon FSx — High-Performance File Systems on AWS

### What is FSx

FSx lets you **launch 3rd party high-performance file systems on AWS** as a fully managed service. You get enterprise file system capabilities without managing the underlying infrastructure.

```
Four FSx options:
  FSx for Windows File Server  -> Windows-native file shares (SMB)
  FSx for Lustre               -> High-Performance Computing (HPC)
  FSx for NetApp ONTAP         -> NetApp ONTAP compatibility
  FSx for OpenZFS              -> OpenZFS compatibility
```

---

## 3. FSx for Windows File Server

#### The Problem

Your company runs Windows workloads that need shared file storage — Windows servers, Active Directory authentication, DFS namespaces. EFS only supports Linux. You need a proper Windows file system on AWS.

#### The Solution

```
FSx for Windows is a fully managed Windows file system share drive

Key features:
  - Supports SMB protocol and Windows NTFS
  - Microsoft Active Directory integration, ACLs, user quotas
  - Can be MOUNTED ON LINUX EC2 instances too
  - Supports Microsoft's Distributed File System (DFS) Namespaces
    -> group files across multiple FSx file systems
  - Scale up to 10s of GB/s, millions of IOPS, 100s of PB of data

Storage options:
  SSD -> latency-sensitive workloads (databases, media processing, data analytics...)
  HDD -> broad spectrum of workloads (home directory, CMS...)

Access from on-premises:
  Can be accessed from your on-premises infrastructure via VPN or Direct Connect

High Availability:
  Can be configured to be Multi-AZ

Backup:
  Data is backed up daily to S3
```

---

## 4. FSx for Lustre

#### The Problem

Your ML team needs to train models on terabytes of data. They need a file system that can deliver hundreds of GB/s of throughput and millions of IOPS with sub-millisecond latency. No standard file system can handle this.

#### The Solution

```
Lustre = a type of parallel distributed file system for large-scale computing
Name "Lustre" is derived from "Linux" and "cluster"

Use cases:
  - Machine Learning: High Performance Computing (HPC)
  - Video Processing
  - Financial Modeling
  - Electronic Design Automation

Performance:
  Scale up to 100s GB/s, millions of IOPS, sub-ms latencies

Storage options:
  SSD -> low-latency, IOPS-intensive workloads, small & random file operations
  HDD -> throughput-intensive workloads, large & sequential file operations

S3 Integration (killer feature):
  Can "read" S3 as a file system (through FSx)
  Can write the output of computations back to S3 (through FSx)
  -> Your ML job reads training data from S3 via FSx, writes results back to S3

On-premises:
  Can be used from on-premises servers (VPN or Direct Connect)
```

### FSx for Lustre — Deployment Options

```
Scratch File System:
  - Temporary storage
  - Data is NOT replicated (data lost if file server fails)
  - High burst: 6x faster, 200 MB/s per TiB
  - Use for: short-term processing, optimizing cost

Persistent File System:
  - Long-term storage
  - Data IS replicated within the same AZ
  - Replace failed files within minutes
  - Use for: long-term processing with sensitive data
```

---

## 5. FSx for NetApp ONTAP

##### The Problem

Your company already uses NetApp ONTAP on-premises. You want to move workloads to AWS without rewriting applications or changing how teams access storage.

#### The Solution

```
Managed NetApp ONTAP on AWS
File System compatible with: NFS, SMB, iSCSI protocol

Works with:
  - Linux
  - Windows
  - macOS
  - VMware Cloud on AWS
  - Amazon Workspaces and AppStream 2.0
  - Amazon EC2, ECS, EKS

Features:
  Storage shrinks or grows automatically (no manual resizing)
  Snapshots, replication, low-cost compression, data de-duplication
  Point-in-time instantaneous cloning — helpful for testing new workloads
    (clone production data instantly without copying it — copy-on-write)
```

---

## 6. FSx for OpenZFS

#### The Problem

Your workloads run on ZFS on-premises (Linux, macOS, FreeBSD). You need to move to AWS while keeping the same file system interface.

#### The Solution

```
Managed OpenZFS file system on AWS
Compatible with NFS (v3, v4, v4.1, v4.2)
Move workloads running on ZFS to AWS

Works with:
  - Linux, Windows, macOS
  - VMware Cloud on AWS
  - Amazon Workspaces and AppStream 2.0
  - Amazon EC2, ECS, EKS

Performance:
  Up to 1,000,000 IOPS with < 0.5ms latency
  Snapshots, compression — low cost

Point-in-time instantaneous cloning (helpful for testing new workloads)
```

---

## 7. AWS Storage Gateway — Hybrid Cloud Storage

#### The Problem

AWS is pushing for "hybrid cloud" — part of your infrastructure is in the cloud, part is on-premises. This can be due to long cloud migrations, security requirements, compliance, or IT strategy. The issue: S3 is a proprietary storage technology. Your on-premises systems can't natively access S3 data (unlike EFS which uses NFS).

### The Solution — AWS Storage Gateway

```
Bridge between on-premises data and cloud data
Gives on-premises access to cloud storage seamlessly

Use cases:
  - Disaster recovery (back up on-premises data to cloud)
  - Backup and restore
  - Tiered storage (keep hot data on-premises, cold data in cloud)
  - On-premises cache and low-latency file access

### Three types of Storage Gateway
#### S3 File Gateway
#### Volume Gateway
#### Tape Gateway
```

### Type 1 — S3 File Gateway

```
Scenario: Your on-premises application servers use NFS or SMB to access files.
          You want those files to actually live in S3 (for cost, durability, scale).

How it works:
  Application server -> NFS or SMB -> S3 File Gateway -> HTTPS -> Amazon S3

S3 File Gateway translates NFS/SMB into S3 API calls

Features:
  - S3 buckets accessible using the NFS and SMB protocol
  - Most recently used data is CACHED in the file gateway (low-latency access)
  - Supports: S3 Standard, S3 Standard-IA, S3 One Zone-IA, S3 Intelligent Tiering
  - Transition to S3 Glacier using a Lifecycle Policy
  - Bucket access using IAM roles for each File Gateway
  - SMB Protocol has integration with Active Directory (AD) for user authentication
```

### Type 2 — Volume Gateway

```
Scenario: Your on-premises servers use iSCSI block storage. You want cloud backup.

How it works:
  Application server -> iSCSI -> Volume Gateway -> HTTPS -> S3 Bucket + EBS Snapshots

Block storage using iSCSI protocol — backed by S3
Backed by EBS snapshots (which can help restore on-premises volumes)

Two modes:

  Cached Volumes:
    Primary data in S3
    Most recently accessed data is CACHED on-premises
    Low-latency access to most recent data
    Full dataset is in the cloud

  Stored Volumes:
    Entire dataset is ON-PREMISES
    Scheduled backups to S3 (as EBS snapshots)
    Low-latency access to entire dataset
    Good when you need your full data locally at all times
```

### Type 3 — Tape Gateway

```
Scenario: Some companies still use physical tape backup processes.
          Moving them to cloud while keeping the same backup software workflow.

How it works:
  Backup Server -> iSCSI -> Tape Gateway -> HTTPS -> Amazon S3 + Amazon Glacier

Virtual Tape Library (VTL) backed by Amazon S3 and Glacier
Back up data using existing tape-based processes (and iSCSI interface)
Works with leading backup software vendors (Veeam, Backup Exec, etc.)

Your backup software thinks it's writing to tape — it's actually writing to S3/Glacier
```

---

## 8. AWS Transfer Family

#### The Problem

Your partners and customers send/receive files using FTP, FTPS, or SFTP — old but common protocols used in banking, healthcare, supply chain. You want to receive these files directly into S3 or EFS without running your own FTP servers.

### The Solution — AWS Transfer Family

```
A fully-managed service for file transfers into and out of:
  - Amazon S3
  - Amazon EFS
Using the FTP protocol family

### Supported Protocols
#### AWS Transfer for FTP
#### AWS Transfer for FTPS
#### AWS Transfer for SFTP

Infrastructure:
  Managed, Scalable, Reliable, Highly Available (Multi-AZ)
  Pay per provisioned endpoint per hour + data transfers in GB
  No servers to manage

Authentication:
  Store and manage users' credentials within the service
  Integrate with: Microsoft Active Directory, LDAP, Okta, Amazon Cognito, custom

Use cases:
  - Sharing files with partners
  - Public datasets
  - CRM, ERP system integrations
```

---

## 9. AWS DataSync — Moving Data Between Storage Services

#### The Problem

You have large amounts of data on-premises (NFS, SMB, HDFS) or in other clouds (S3 API). You need to move it to AWS storage. Network transfers are slow. You need automatic scheduling, bandwidth throttling, and metadata preservation.

### The Solution — AWS DataSync

```
Move large amounts of data to and from:
  - On-premises / other clouds -> AWS (needs an agent installed on-premises)
  - AWS -> AWS (between different storage services — no agent needed)

Can synchronize to:
  - Amazon S3 (any storage class, including Glacier)
  - Amazon EFS
  - Amazon FSx (Windows, Lustre, NetApp, OpenZFS)

Key features:
  - Replication tasks can be scheduled: hourly, daily, weekly
  - File permissions and metadata are preserved (NFS POSIX, SMB...)
  - One agent can use 10 Gbps, can set up a bandwidth limit
  - Data is NOT continuously synced — it's a scheduled replication

On-premises to AWS:
  On-premises (NFS/SMB) -> DataSync Agent -> TLS -> AWS DataSync -> S3/EFS/FSx

AWS to AWS (no agent):
  S3 -> DataSync -> EFS, FSx, another S3 bucket, etc.
  DataSync can copy data and metadata between AWS storage services
```

---

## 10. AWS Cloud Native Storage Options — Full Picture

```
Block Storage:
  Amazon EBS        -> Network drive for one EC2 instance at a time (high IOPS)
  EC2 Instance Store -> Physical storage on EC2 host (temporary, fastest)

File Storage:
  Amazon EFS        -> Network File System for Linux instances, POSIX filesystem, multi-EC2
  Amazon FSx        -> 3rd party high-performance file systems (Windows, Lustre, ONTAP, OpenZFS)

Object Storage:
  Amazon S3         -> Object storage, "infinitely scaling"
  Amazon Glacier    -> Object archival, low cost long-term
```

---

## Quick Reference — Storage Comparison

```
S3            -> Object Storage (files as objects, not blocks or filesystem)
S3 Glacier    -> Object Archival (cheapest, slowest retrieval)
EBS volumes   -> Network storage for ONE EC2 instance at a time (high IOPS)
Instance Store -> Physical storage on EC2 host (temporary, very fast)
EFS           -> Network File System for Linux instances, POSIX filesystem, multi-AZ
FSx for Windows     -> Network File System for Windows servers (SMB, NTFS, AD)
FSx for Lustre      -> High Performance Computing file system (HPC, ML, video)
FSx for NetApp ONTAP -> High OS Compatibility (NFS, SMB, iSCSI, multi-OS)
FSx for OpenZFS     -> Managed ZFS file system (Linux/Mac/Windows)
Storage Gateway -> Bridge on-premises <-> cloud (S3 File / Volume / Tape)
Transfer Family -> FTP/FTPS/SFTP interface on top of S3 or EFS (no server to manage)
DataSync      -> Schedule data sync from on-premises to AWS or between AWS services
Snowball/Snowmobile -> Move large amounts of data physically to the cloud
Database      -> For specific workloads with indexing and querying

Storage Gateway Types:
  S3 File Gateway  -> NFS/SMB on-premises -> S3 (caches recent data locally)
  Volume Gateway   -> iSCSI block storage -> S3 + EBS snapshots
    Cached  -> primary in S3, cache recent data on-premises
    Stored  -> primary on-premises, backup to S3
  Tape Gateway     -> VTL -> S3/Glacier (replace physical tape processes)

FSx Deployment (Lustre):
  Scratch -> temporary, no replication, high burst, short-term processing
  Persistent -> replicated in AZ, long-term, sensitive data

Snowball:
  Physical device shipped to you -> load data -> ship back -> imported to S3
  Edge Computing: run EC2/Lambda on the device at remote locations
  Cannot import to Glacier directly — must go through S3 + Lifecycle Policy

DataSync:
  On-premises -> AWS: needs agent
  AWS -> AWS: no agent needed
  Preserves file permissions and metadata
  Scheduled (hourly/daily/weekly), not continuous
  Up to 10 Gbps per agent
```

> **FSx Overview**: https://aws.amazon.com/fsx/
> **Storage Gateway**: https://aws.amazon.com/storagegateway/
> **DataSync**: https://aws.amazon.com/datasync/
> **Transfer Family**: https://aws.amazon.com/aws-transfer-family/
> **Snowball**: https://aws.amazon.com/snowball/

## 13. Container, ECS, EKS and ECR

## 1. Docker and Containers

Before jumping into AWS container services, you need to understand what Docker is and why it exists — because every AWS container service is built around it.

### The Compatibility Problem Docker Solves

#### When "It Works on My Machine" Breaks Everything

A developer on your team builds a Python app. It works perfectly on their laptop running Ubuntu 22.04 with Python 3.11. They hand it off to another developer running Windows with Python 3.8. It crashes. You deploy it to an EC2 instance running Amazon Linux — different behavior again.

Every environment has different OS versions, different library versions, different configs. You spend more time debugging environment issues than building features.

**Docker solves this by packaging the app and everything it needs into a single container.** The container runs the same way on any machine — your laptop, a teammate's Windows PC, an EC2 instance, or a Kubernetes cluster.

#### What Docker Actually Is

Docker is a platform that lets you package your application into a **container** — a self-contained unit that includes the app code, runtime, libraries, and config. Once it's in a container:

- Runs on any machine regardless of OS
- No compatibility issues
- Predictable, identical behavior everywhere
- Easy to ship, scale, and maintain

```
Without Docker:
  Dev machine (Ubuntu, Python 3.11) → works
  Staging server (Amazon Linux, Python 3.8) → breaks
  Colleague's Windows machine → breaks differently

With Docker:
  Build container once
  Run anywhere: laptop, EC2, ECS, EKS, Fargate
  Same behavior. Every time.
```

Use cases in DevOps: microservices, lift-and-shift from on-premises to cloud, CI/CD pipelines, reproducible build environments.

---

### Docker vs Virtual Machines

#### The Architecture Difference

Both Docker and VMs let you run isolated environments — but the underlying architecture is very different.

```
Virtual Machines:                    Docker Containers:
┌─────────────────────┐              ┌─────────────────────┐
│ App  │ App  │ App   │              │App  │ App  │ App    │
│──────│──────│───────│              │─────│──────│────────│
│Guest │Guest │Guest  │              │Lib  │ Lib  │ Lib    │
│OS    │OS    │OS     │              │─────────────────────│
│──────────────────── │              │   Docker Daemon     │
│    Hypervisor       │              │─────────────────────│
│─────────────────────│              │   Host OS (EC2)     │
│      Host OS        │              │─────────────────────│
│─────────────────────│              │   Infrastructure    │
│   Infrastructure    │              └─────────────────────┘
└─────────────────────┘

Each VM has its OWN OS              Containers SHARE the host OS
Heavy — GBs per VM                  Lightweight — MBs per container
Minutes to start                    Seconds to start
```

- VMs virtualize hardware — each one runs a full OS
- Containers virtualize the OS — they share the host OS kernel
- Result: containers are **much lighter, faster to start, and more efficient**
- Many containers can run on a single EC2 instance sharing its resources

---

### Where Docker Images Are Stored

#### The Image Distribution Problem

You build a Docker image on your laptop. Now you need your EC2 instance to use it. How does it get there? You need a **registry** — a central place to store and distribute images from.

#### Docker Hub vs Amazon ECR

Docker Hub (`hub.docker.com`) is the default public registry. It has base images for almost every technology — Ubuntu, Node.js, Python, MySQL, nginx. When you run `docker pull nginx`, that's Docker Hub.

For your company's private application images, you use **Amazon ECR**.

| Feature | Docker Hub | Amazon ECR |
|---------|-----------|------------|
| Visibility | Public by default | Private by default |
| IAM integration | No | Yes — full AWS IAM |
| AWS service integration | Manual setup | Native and seamless |
| Vulnerability scanning | Paid | Built-in on push |
| Pull cost within AWS | Data transfer charges | Free within same region |

In practice: CI/CD pipeline builds image → pushes to ECR → ECS/EKS pulls from ECR to deploy.

---

### Building and Running a Container

#### The Workflow

```
Dockerfile (instructions)
    │
    ▼ docker build
Docker Image (packaged app)
    │
    ├──► docker push → Registry (Docker Hub or ECR)
    │                         │
    │                         ▼ docker pull
    └──► docker run   → Running Container
```

A Dockerfile defines what goes inside your image:

```dockerfile
FROM node:18-alpine          # Start from official Node.js base image
WORKDIR /app                 # Set working directory inside container
COPY package*.json ./        # Copy dependency files first
RUN npm install              # Install dependencies
COPY . .                     # Copy rest of application code
EXPOSE 3000                  # Document the port the app uses
CMD ["node", "server.js"]    # Command to run when container starts
```

---

## 2. Amazon ECS

Once you understand Docker, the next question is: how do you run containers at scale in production? You could SSH into an EC2 and run `docker run` manually — but that has no self-healing, no auto-scaling, and is a complete nightmare to manage across dozens of instances.

**ECS (Elastic Container Service) is Amazon's answer to this.**

### EC2 Launch Type

#### Running Containers on Your Own Infrastructure

With EC2 Launch Type, you provision EC2 instances that form your ECS Cluster. ECS places and manages containers across those instances — but you are responsible for the EC2s themselves.

```
Your ECS Cluster (EC2 Launch Type)
┌────────────────────────────────────────────────┐
│  EC2 Instance 1         EC2 Instance 2         │
│  ┌───────────────┐      ┌───────────────┐      │
│  │  ECS Agent    │      │  ECS Agent    │      │
│  │  Container A  │      │  Container B  │      │
│  │  Container B  │      │  Container C  │      │
│  └───────────────┘      └───────────────┘      │
│                                                │
│  You manage   : EC2 instances, patching,       │
│                 cluster capacity, sizing       │
│  AWS manages  : container placement,           │
│                 restarts, scheduling           │
└────────────────────────────────────────────────┘
```

- Each EC2 instance must run the **ECS Agent** to register with the cluster
- AWS decides which container runs on which instance
- AWS handles starting, stopping, and restarting containers
- You still handle EC2 sizing, patching, and scaling the cluster itself

Use EC2 Launch Type when you need specific instance types (GPU for ML), want to use Reserved Instances for cost savings, or have compliance requirements around physical isolation.

---

### Fargate Launch Type

#### The Operational Overhead Problem

With EC2 Launch Type your team spends real time managing EC2 instances — choosing sizes, patching them, deciding how many the cluster needs, resizing when traffic grows. This work doesn't make your application better. It's just infrastructure babysitting.

#### Going Serverless with Fargate

With Fargate Launch Type, you don't provision any EC2 instances at all. You define what your container needs (CPU and RAM) and AWS handles the rest.

```
Fargate:
  You define  → container image + how much CPU and RAM it needs
  AWS handles → where it runs, how many servers, patching everything
  You see     → just your running containers. No EC2 anywhere.

To scale:
  EC2 Launch Type → resize cluster, add more EC2s, wait
  Fargate         → increase task count. Done.
```

- Fully serverless — no EC2 instances in your account for this
- Pay per second for the exact CPU and RAM your tasks consume
- No idle capacity — you only pay for running containers

Use Fargate for most new workloads. Less operational overhead, faster time to production.

---

## 3. Amazon EKS

### When Your Team Needs Kubernetes

#### The Portability Problem

ECS is excellent — but it is AWS-proprietary. If your company runs workloads on-premises, on GCP, or on Azure as well, your team ends up learning a completely different orchestration system for each environment. When engineers move between teams or clouds, their knowledge doesn't transfer.

Kubernetes is the open-source industry standard for container orchestration — used on every major cloud and on-premises. If your team already knows Kubernetes, or you are building for multi-cloud, EKS is the right choice.

**Amazon EKS** is AWS's managed Kubernetes. AWS runs and manages the Kubernetes control plane (master nodes, API server, etcd). You run the worker nodes on EC2 or Fargate.

```
ECS  → AWS proprietary. Simpler. AWS only.
EKS  → Managed Kubernetes. Open standard. Same manifests work on
        GKE (Google), AKS (Azure), on-prem, or EKS.
```

Use EKS when: team has Kubernetes expertise, multi-cloud strategy, complex microservices needing advanced Kubernetes features like custom controllers or service meshes.

---

## 4. AWS Fargate

### Serverless Compute for Both ECS and EKS

Fargate is not a container orchestrator itself — it is a **serverless compute engine** that eliminates the need to manage EC2 instances for either ECS or EKS.

```
Without Fargate:
  ECS → you provision and manage EC2 cluster
  EKS → you provision and manage EC2 worker nodes

With Fargate:
  ECS + Fargate → define tasks, AWS runs them, no EC2
  EKS + Fargate → define pods,  AWS runs them, no EC2
```

You specify CPU and memory per task or pod. AWS finds the capacity, runs it, patches the underlying compute, and scales it. You never see or manage an EC2 instance.

Cost model: pay per second for the CPU and RAM your container actually uses. No idle EC2 capacity sitting around.

---

## 5. Amazon ECR — Container Registry

### Storing and Distributing Your Images

#### The Private Registry Problem

Your CI/CD pipeline builds a new version of your application container. Your ECS cluster needs to pull it. Your DR cluster in another region also needs it. Docker Hub is public by default — you cannot put production application images there. And pulling from Docker Hub on every deployment introduces an external dependency that can throttle or fail.

**ECR is the solution.** A fully managed private Docker registry that lives inside AWS, controlled by IAM.

```
CI/CD Pipeline (GitHub Actions, GitLab, Jenkins)
    │
    ▼ docker build → docker push
Amazon ECR (private, IAM-controlled, region-level)
    │
    ├──► ECS pulls image → runs your containers
    ├──► EKS pulls image → runs your pods
    └──► Lambda (container) pulls from ECR
```

#### Pushing to ECR

```bash
# 1. Authenticate Docker to ECR (token valid 12 hours)
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com

# 2. Create the repository (one-time setup)
aws ecr create-repository \
  --repository-name my-app \
  --image-scanning-configuration scanOnPush=true

# 3. Build, tag, and push
docker build -t my-app:latest .

docker tag my-app:latest \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/my-app:latest

docker push \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/my-app:latest
```

#### Keeping Storage Costs Down with Lifecycle Policies

Over time, ECR fills up with old image versions. Each tagged image version costs storage. A lifecycle policy automatically cleans up old images:

```json
{
  "rules": [{
    "rulePriority": 1,
    "description": "Keep only last 10 images",
    "selection": {
      "tagStatus": "any",
      "countType": "imageCountMoreThan",
      "countNumber": 10
    },
    "action": { "type": "expire" }
  }]
}
```

---

## Quick Reference

```
Docker
  Packages app + all dependencies into a container
  Runs identically on any OS or machine
  Lighter than VMs — shares host OS kernel, starts in seconds
  Dockerfile → image → push to registry → run anywhere

Registries
  Docker Hub   → public images, base images (node, nginx, python)
  Amazon ECR   → private registry, IAM-controlled, AWS-native,
                 vulnerability scanning, free pull within AWS

ECS — Elastic Container Service
  AWS's own container orchestrator
  EC2 Launch Type  → you manage EC2 instances in the cluster
  Fargate          → serverless, define CPU/RAM, AWS runs it

EKS — Elastic Kubernetes Service
  Managed Kubernetes (open source standard)
  AWS manages the control plane
  Worker nodes: EC2 or Fargate
  Use for: multi-cloud, existing K8s teams, complex workloads

Fargate
  Serverless compute engine for containers
  Works with ECS and EKS
  No EC2 to manage or patch
  Pay per second for actual CPU + RAM used

ECR — Elastic Container Registry
  Private Docker image registry inside AWS
  IAM-controlled access
  Vulnerability scanning on every push
  Lifecycle policies to auto-delete old images

Decision Guide:
  New workload, AWS only, simple setup  → ECS + Fargate
  Need GPU / Reserved Instance savings  → ECS + EC2 Launch Type
  Kubernetes, multi-cloud, complex      → EKS + Fargate or EC2
  Store and distribute container images → ECR
```

## 14. CloudWatch — Monitoring and Observability


### What is CloudWatch?

CloudWatch is AWS's native monitoring service. It collects metrics, logs, and events from every AWS service. You use it to build dashboards, set alarms, and trigger automated responses.

---

### CloudWatch Architecture

```
┌────────────────────────────────────────────────────────────┐
│   Sources                                                  │
│   EC2, RDS, ALB, Lambda, ECS → push metrics automatically │
│   Your app (custom metric) → pushed via SDK or CLI         │
│   Your app logs → pushed via CloudWatch Agent              │
│                                                            │
│   CloudWatch                                               │
│   ├── Metrics   → Time-series data (CPU, memory, requests) │
│   ├── Logs      → Log groups > Log streams > Log events    │
│   ├── Alarms    → Trigger SNS, ASG, Lambda when threshold  │
│   ├── Dashboards → Visual graphs of metrics                │
│   └── Events    → Schedule or respond to AWS events        │
└────────────────────────────────────────────────────────────┘
```

---

### Default EC2 Metrics

EC2 sends these automatically (no agent needed):

- CPU Utilization
- Network In/Out
- Disk Read/Write (for instance store only)
- Status Checks (instance reachability)

Not available without agent: Memory usage, disk space, swap usage.

---

### CloudWatch Agent — Extended Metrics

Install the agent on EC2 to get memory, disk, and custom metrics:

```bash
# Install agent (Amazon Linux 2)
sudo yum install -y amazon-cloudwatch-agent

# Generate config interactively
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

---

### CloudWatch Alarms

```bash
# Alarm: if CPU > 80% for 5 minutes, send to SNS topic
aws cloudwatch put-metric-alarm \
  --alarm-name "high-cpu-ec2" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-south-1:123456789:my-alerts
```

---

### Log Insights — Query Logs

CloudWatch Logs Insights lets you query logs like a database:

```sql
# Find all ERROR logs in the last hour
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Count requests by status code
fields @timestamp, statusCode
| stats count(*) as requests by statusCode
| sort requests desc
```

---



## 12. ECR — Elastic Container Registry


### What is ECR?

ECR is AWS's private Docker registry. When your CI/CD pipeline builds a Docker image, it pushes to ECR. ECS, EKS, and Lambda then pull from ECR.

---

### ECR vs Docker Hub

| Feature | ECR | Docker Hub |
|---------|-----|------------|
| Privacy | Private by default | Public by default |
| IAM Integration | Yes | No |
| AWS Integration | Native | Manual credentials |
| Vulnerability scanning | Built-in | Paid plan |
| Pull pricing | Free within AWS | Rate limited free tier |

---

### CI/CD Pipeline — Push to ECR

```bash
# 1. Authenticate Docker to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com

# 2. Create the repository (one time)
aws ecr create-repository \
  --repository-name my-app \
  --image-scanning-configuration scanOnPush=true

# 3. Build image
docker build -t my-app:latest .

# 4. Tag for ECR
docker tag my-app:latest \
  123456789012.dkr.ecr.ap-south-1.amazonaws.com/my-app:latest

# 5. Push
docker push 123456789012.dkr.ecr.ap-south-1.amazonaws.com/my-app:latest
```

---

### Lifecycle Policies — Auto-Cleanup

ECR can auto-delete old images to save storage cost:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }
  ]
}
```

---

### GitHub Actions → ECR Integration

```yaml
- name: Login to ECR
  uses: aws-actions/amazon-ecr-login@v1

- name: Build and Push
  env:
    ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
    IMAGE_TAG: ${{ github.sha }}
  run: |
    docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
    docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
```

---



## 13. CloudTrail — Audit Logging


### What is CloudTrail?

CloudTrail records every API call made in your AWS account — console clicks, CLI commands, SDK calls, automated service calls. It is your complete audit log.

---

### How CloudTrail Works

```
User/Service makes API call
    │
    ▼
AWS API (e.g., RunInstances, DeleteBucket, AssumeRole)
    │
    ▼
CloudTrail captures the event:
    ├── Who: IAM user/role/account
    ├── What: API action taken
    ├── When: Timestamp
    ├── Where: Source IP, region
    └── Result: Success or failure + error message
    │
    ▼
Stored in: CloudTrail History (90 days free)
           S3 bucket (for longer retention, requires Trail config)
           CloudWatch Logs (for real-time querying and alerts)
```

---

### Key Use Cases

- **Security**: Detect unauthorized access, root account usage
- **Compliance**: Prove who changed what and when
- **Debugging**: Find what API call caused an issue
- **Alerts**: Get notified when someone deletes production resources

---

### Enable a Trail

```bash
# Create a trail that stores logs to S3
aws cloudtrail create-trail \
  --name my-audit-trail \
  --s3-bucket-name my-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name my-audit-trail

# Look up recent events (last 90 days)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=daksh-devops
```

---

### CloudTrail + CloudWatch Alarms

Set an alarm when someone uses the root account:

```
CloudTrail → CloudWatch Logs → Metric Filter
(root login event) → Count > 0 → CloudWatch Alarm → SNS → Email/Slack
```

---



## 14. Secrets Manager — Secrets Storage


### What is Secrets Manager?

Secrets Manager stores sensitive values — database passwords, API keys, tokens — and serves them to your applications securely. No more hardcoding credentials anywhere.

---

### The Problem Without Secrets Manager

```
Bad practice:
  DB_PASSWORD=mypassword123  ← in .env file → committed to git → exposed

Also bad:
  EC2 environment variable   ← visible in console, logs, error messages
```

---

### How It Works

```
Application (EC2, ECS, Lambda)
    │
    ├── AWS SDK call: GetSecretValue("prod/db/password")
    │       │
    │       ▼
    │   Secrets Manager (checks IAM permission)
    │       │
    │       ▼
    │   Returns: {"username":"admin","password":"xyz123"}
    │
    └── Application uses the value in memory (never written to disk)
```

---

### Store and Retrieve Secrets

```bash
# Create a secret
aws secretsmanager create-secret \
  --name "prod/db/credentials" \
  --secret-string '{"username":"admin","password":"s3cr3t123"}'

# Retrieve a secret
aws secretsmanager get-secret-value \
  --secret-id "prod/db/credentials"

# Update a secret
aws secretsmanager update-secret \
  --secret-id "prod/db/credentials" \
  --secret-string '{"username":"admin","password":"new_password"}'
```

In Python:
```python
import boto3
import json

client = boto3.client('secretsmanager', region_name='ap-south-1')
response = client.get_secret_value(SecretId='prod/db/credentials')
secret = json.loads(response['SecretString'])
db_password = secret['password']
```

---

### Automatic Rotation

Secrets Manager can auto-rotate DB passwords using a Lambda function — zero downtime.

```
Every 30 days:
  Secrets Manager triggers Lambda
      └── Lambda creates new DB password
      └── Updates DB with new password
      └── Updates secret in Secrets Manager
      └── App gets new password on next call (no restart needed)
```

---

### Parameter Store vs Secrets Manager

| Feature | Parameter Store | Secrets Manager |
|---------|----------------|-----------------|
| Cost | Free (Standard tier) | ~$0.40/secret/month |
| Rotation | Manual only | Automatic |
| Encryption | Optional (KMS) | Always encrypted |
| Versioning | Yes | Yes |
| Use for | Config values, feature flags | Passwords, API keys, tokens |

---



## 15. Lambda — Serverless Functions


### What is Lambda?

Lambda runs your code without you managing servers. You write a function, choose what triggers it, and AWS runs it — automatically scaling from zero to thousands of concurrent executions.

---

### Lambda Execution Model

```
Trigger (event)
    │
    ▼
Lambda Service
    │
    ├── Cold start: Pull container image, init runtime
    │       │
    │       ▼ (~100ms-1s for first call)
    │
    └── Warm start: Reuse existing container
            │
            ▼ (~1ms-10ms for subsequent calls)
    │
    ▼
Your function code runs
    │
    ▼
Response returned to caller
    │
    ▼
Container stays warm for ~15 minutes (then recycled)
```

---

### Common Lambda Triggers

```
┌─────────────────────────────────────────────────────┐
│   API Gateway  → HTTP request → Lambda → response   │
│   S3           → File upload  → Lambda → process    │
│   SQS          → Message      → Lambda → consume    │
│   SNS          → Notification → Lambda → handle     │
│   EventBridge  → Schedule/event → Lambda → run      │
│   CloudWatch   → Alarm        → Lambda → react      │
│   DynamoDB     → Stream       → Lambda → process    │
└─────────────────────────────────────────────────────┘
```

---

### Lambda Limits

| Limit | Value |
|-------|-------|
| Timeout | Max 15 minutes |
| Memory | 128MB – 10,240MB |
| Package size (zip) | 50MB |
| Package size (unzipped) | 250MB |
| Concurrent executions | 1,000 (default, can increase) |
| Ephemeral storage (/tmp) | 512MB – 10GB |

---

### Example Lambda Function (Python)

```python
import json
import boto3

def lambda_handler(event, context):
    # event contains the trigger data
    # context contains runtime info (function name, timeout remaining, etc.)
    
    print(f"Event: {json.dumps(event)}")
    
    # Example: process an S3 upload event
    if 'Records' in event:
        for record in event['Records']:
            bucket = record['s3']['bucket']['name']
            key = record['s3']['object']['key']
            print(f"File uploaded: s3://{bucket}/{key}")
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Success'})
    }
```

---

### Deploy Lambda via CLI

```bash
# Package your function
zip function.zip lambda_function.py

# Create function
aws lambda create-function \
  --function-name my-function \
  --runtime python3.12 \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256

# Update code
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip

# Invoke manually
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  output.json
```

---

### Lambda vs EC2 vs ECS — When to use what

| Scenario | Use |
|----------|-----|
| Event-driven tasks (file processing, webhooks) | Lambda |
| Long-running processes (> 15 min) | EC2 or ECS |
| Persistent web server | EC2, ECS, or EKS |
| Background jobs, async processing | Lambda or ECS |
| Scheduled tasks (cron jobs) | Lambda + EventBridge |
| Stateful applications | EC2 or ECS |

---



## 10. VPC — Virtual Private Cloud


### What is VPC?

A VPC is your own isolated, private network inside AWS. Every EC2, RDS, Lambda (in VPC mode), and other resource lives inside a VPC. Understanding VPC is the single most important AWS networking concept.

---

### VPC Architecture — Full Picture

```
┌─────────────────────── AWS Region (ap-south-1) ────────────────────────┐
│                                                                         │
│   ┌─────────────────────── VPC: 10.0.0.0/16 ──────────────────────┐   │
│   │                                                                │   │
│   │  ┌──── AZ-a (ap-south-1a) ────┐  ┌──── AZ-b (ap-south-1b) ─┐ │   │
│   │  │                            │  │                           │ │   │
│   │  │  Public Subnet             │  │  Public Subnet            │ │   │
│   │  │  10.0.1.0/24               │  │  10.0.2.0/24              │ │   │
│   │  │  [ALB, NAT GW, Bastion]    │  │  [ALB, NAT GW]            │ │   │
│   │  │                            │  │                           │ │   │
│   │  │  Private Subnet            │  │  Private Subnet           │ │   │
│   │  │  10.0.3.0/24               │  │  10.0.4.0/24              │ │   │
│   │  │  [EC2, ECS, Lambda]        │  │  [EC2, ECS, Lambda]       │ │   │
│   │  │                            │  │                           │ │   │
│   │  │  DB Subnet                 │  │  DB Subnet                │ │   │
│   │  │  10.0.5.0/24               │  │  10.0.6.0/24              │ │   │
│   │  │  [RDS, ElastiCache]        │  │  [RDS, ElastiCache]       │ │   │
│   │  └────────────────────────────┘  └───────────────────────────┘ │   │
│   │                                                                │   │
│   │   Internet Gateway (for public subnets)                       │   │
│   │   NAT Gateway (for private subnets to reach internet)         │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Key VPC Components

| Component | Purpose |
|-----------|---------|
| **CIDR Block** | IP range for the VPC (e.g., 10.0.0.0/16 = 65,536 IPs) |
| **Subnet** | Sub-division of the VPC, tied to one AZ |
| **Internet Gateway (IGW)** | Allows public subnets to reach the internet |
| **NAT Gateway** | Allows private subnets to reach internet (outbound only) |
| **Route Table** | Rules for where traffic goes |
| **Security Group** | Stateful firewall attached to instances |
| **Network ACL (NACL)** | Stateless firewall attached to subnets |
| **VPC Peering** | Connect two VPCs |
| **VPC Endpoints** | Private access to AWS services (no internet) |

---

### Public vs Private Subnet — The Key Difference

```
Public Subnet:
  Route Table has: 0.0.0.0/0 → Internet Gateway
  Resources get: Public IP (optional but possible)
  Use for: ALB, NAT Gateway, Bastion host

Private Subnet:
  Route Table has: 0.0.0.0/0 → NAT Gateway
  Resources get: No public IP
  Use for: EC2 app servers, RDS, ECS tasks

DB Subnet:
  Route Table has: Only local VPC routes (NO internet)
  Use for: RDS, ElastiCache — completely isolated
```

---

### Security Groups vs NACLs

| Feature | Security Group | NACL |
|---------|---------------|------|
| Level | Instance level | Subnet level |
| Stateful? | Yes (response auto-allowed) | No (must allow both directions) |
| Allow/Deny | Allow only | Both Allow and Deny |
| Default inbound | Deny all | Allow all |
| Use case | Fine-grained per-instance control | Subnet-level blocklists |

---

### VPC Endpoints

VPC Endpoints let your private resources reach AWS services without going through the internet (no NAT Gateway needed).

```
Without VPC Endpoint:
  EC2 (private) → NAT GW → Internet → S3
  Cost: NAT GW data charges

With VPC Gateway Endpoint (S3, DynamoDB):
  EC2 (private) → VPC Endpoint → S3
  Cost: Free

With VPC Interface Endpoint (SSM, STS, ECR, etc.):
  EC2 (private) → ENI in subnet → AWS service
  Cost: ~$0.01/hr per AZ
```

---

### CLI — Create a Basic VPC

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnet
aws ec2 create-subnet \
  --vpc-id vpc-xxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ap-south-1a

# Create and attach Internet Gateway
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-xxxxx \
  --vpc-id vpc-xxxxx

# Create route table and add default route
aws ec2 create-route-table --vpc-id vpc-xxxxx
aws ec2 create-route \
  --route-table-id rtb-xxxxx \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-xxxxx
```

---



## Quick Reference — All 14 Services


```
┌─────────────────────────────────────────────────────────────────────┐
│  COMPUTE                                                            │
│  EC2      → Virtual servers. The foundation of AWS compute.         │
│  Lambda   → Serverless functions. Event-driven, no servers.         │
│                                                                     │
│  STORAGE                                                            │
│  S3       → Object storage. Files, backups, Terraform state.        │
│  EBS      → Block storage. Hard drive for EC2 (one EC2 only).       │
│  EFS      → File system. Shared storage for many EC2s.              │
│  ECR      → Container registry. Store and pull Docker images.       │
│                                                                     │
│  NETWORKING                                                         │
│  VPC      → Your private network. Subnets, routing, security.       │
│  ELB/ALB  → Load balancer. Distribute traffic, health checks.       │
│  Route 53 → DNS. Translate domains to IPs, smart routing.           │
│  ASG      → Auto Scaling. Add/remove EC2s based on demand.          │
│                                                                     │
│  DATABASE                                                           │
│  RDS      → Managed relational DB. PostgreSQL, MySQL, Aurora.       │
│                                                                     │
│  SECURITY & MANAGEMENT                                              │
│  IAM      → Who can access AWS and what they can do.                │
│  CloudWatch → Metrics, logs, alarms, dashboards.                    │
│  CloudTrail → Audit log of every API call ever made.                │
│  Secrets Manager → Store and rotate sensitive credentials.          │
└─────────────────────────────────────────────────────────────────────┘
```


