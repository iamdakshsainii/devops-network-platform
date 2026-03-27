# DevSecOps — Development, Security, and Operations

Security is not something you add at the end. It runs through every step of building and deploying software. This module teaches you the mindset, the tools, and the pipeline practices that make security part of your daily DevOps workflow — not an afterthought.

---

## 01. General Overview

Most engineers think of security as someone else's problem. The security team reviews the app before release, runs a scan, maybe blocks deployment. Development continues in isolation. Security is a checkpoint at the end.
 
That model is broken — and DevSecOps exists to fix it.
 
#### How Software Used to Be Built
 
In traditional software development, a team would spend months building a feature. At the very end, the security team would audit it. They would find 40 vulnerabilities. Fixing them would require rewriting code that was already deployed. The cost and time to fix a vulnerability found in production is **10x more** than if it was caught during development.
 
#### What DevSecOps Changes
 
DevSecOps integrates security at every stage — planning, coding, testing, deployment, and monitoring. Instead of one security review at the end, security checks happen continuously throughout.
 
```
Traditional approach:
  Dev → Dev → Dev → Dev → Security Review → Deploy
                                 ↑
                         Problems found here are expensive and slow to fix
 
DevSecOps approach:
  Dev+Sec → Dev+Sec → Dev+Sec → Test+Sec → Deploy+Monitor
       ↑          ↑          ↑
  Problems caught here — cheap and fast to fix
```
 
#### The Three Words Explained
 
| Word | What it means in practice |
|------|--------------------------|
| **Development** | Planning, writing code, building, testing |
| **Security** | Making security a part of every step above |
| **Operations** | Deploying, monitoring, fixing issues in production |
 
#### Shift Left and Shift Right
 
You will hear these two terms constantly in DevSecOps:
 
**Shift Left** — move security earlier (to the left) in the development timeline. Catch bugs in code review instead of in production. Add security linting to your IDE. Scan dependencies before you merge.
 
**Shift Right** — keep testing security after deployment too. Monitor running apps. Some vulnerabilities only show up under real traffic.
 
Good DevSecOps does both.

## 02. What is DevSecOps — The Mindset Shift


Before understanding tools and pipelines, you need to understand the mindset. DevSecOps is not a tool you install. It is a culture change.

#### The Old Way

In most companies, security and development are separate teams with different goals:

```
Development team goal  → ship features fast
Security team goal     → make sure nothing is vulnerable

Result: constant friction
  Dev: "Stop blocking our releases"
  Security: "Stop writing insecure code"
```

Neither team is wrong. They just have different incentives. DevSecOps aligns them.

#### The New Way

Security becomes a **shared responsibility**. Every developer thinks about security when writing code. Every PR review includes security considerations. The security team shifts from being a gatekeeper to being an enabler — they build tools and guardrails that make it easy for developers to write secure code without slowing them down.

```
Old model:  Dev Team ──────────────────► Security Team ──► Deploy
                      (security is a gate at the end)

New model:  Dev+Sec ──► Build+Sec ──► Test+Sec ──► Deploy+Monitor
                    (security is woven throughout)
```

#### What This Means for a DevOps Engineer

As a DevOps engineer you are the bridge. You build the pipelines, manage the infrastructure, set up the tooling. In DevSecOps your job expands to:

- Adding security scanning steps to CI/CD pipelines
- Managing secrets properly (no hardcoded credentials anywhere)
- Ensuring infrastructure is provisioned securely
- Setting up monitoring and alerting for security events
- Helping developers understand what the security tools are flagging

You do not need to be a security expert. You need to understand enough to build secure pipelines and catch the obvious problems early.

---



## 03. Threat Modeling — Planning Security Before You Code


Most security problems are not surprises. They are predictable. A login form will be attacked with brute force. An API that accepts user input will be tested for injection. An S3 bucket with public permissions will be discovered by automated scanners within hours.

**Threat modeling is the practice of thinking through these risks before you write a single line of code.**

#### Why Waiting Until After Is Costly

Imagine building a payment feature without asking: what happens if someone intercepts the request? What if someone replays an old transaction? What if the session token is stolen?

If you ask these questions before building, the answers shape your design. If you ask them after you have already built and deployed, you are patching a broken foundation.

#### The STRIDE Framework

STRIDE is the most common threat modeling approach. Each letter is a category of attack:

| Letter | Threat | Real Example |
|--------|--------|-------------|
| **S** | Spoofing | Attacker fakes another user's identity in a request |
| **T** | Tampering | Attacker modifies an order total during checkout |
| **R** | Repudiation | User denies making a transaction — no audit log exists |
| **I** | Information Disclosure | Stack trace exposes DB schema in error response |
| **D** | Denial of Service | API endpoint flooded until the service crashes |
| **E** | Elevation of Privilege | Normal user accesses admin panel due to missing auth check |

#### How to Do Basic Threat Modeling

You do not need a formal process. Even a 30-minute team conversation before building a feature is valuable:

```
Step 1: Draw what you are building
  → Boxes for each service, database, user, and API
  → Arrows showing where data flows between them

Step 2: For each arrow (data in transit), ask:
  → What data is crossing here?
  → Can the sender be faked (spoofed)?
  → Is it encrypted in transit?

Step 3: For each box (data at rest), ask:
  → Who has access to this?
  → Is anything sensitive stored here?
  → What happens if this is compromised?

Step 4: For each risk found, decide:
  → Accept it (low risk, documented)
  → Mitigate it (add a control)
  → Eliminate it (redesign to remove the risk)
```

A whiteboard photo and a few notes in a ticket is enough. The goal is to ask the questions — not produce a document.

---



## 04. DevSecOps for Git — Securing Your Code from Commit One


Your Git repository is where everything starts — code, configs, sometimes secrets. It is also one of the most common places where security incidents begin. A developer accidentally commits an AWS access key. A config file with a database password gets pushed. A PR introduces a package with a critical CVE.

**Securing your Git workflow is the first practical step in DevSecOps.**

#### Pre-commit Hooks

Before a commit even reaches the remote repository, you can run checks locally on the developer's machine:

```bash
# Install pre-commit
pip install pre-commit

# .pre-commit-config.yaml in your repo root
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks          # Blocks commits containing secrets

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: detect-private-key     # Catches private SSH keys
      - id: check-yaml             # Validates YAML syntax

# Install the hooks into git
pre-commit install
```

Now every `git commit` runs these checks first. If a secret is detected, the commit is blocked before it leaves the developer's machine.

#### Secret Scanning in CI

Pre-commit hooks can be bypassed. Add secret scanning in CI as a second layer:

```yaml
# GitHub Actions
- name: Secret Scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Branch Protection Rules

Enforce these on your main branch (GitHub / GitLab):

- Require pull request reviews before merging (minimum one reviewer)
- Require status checks to pass before merge (CI must be green)
- Prevent force pushes to main
- Restrict who can approve and merge PRs

#### What Must Never Be Committed

```
Never commit:
  AWS / GCP / Azure access keys
  Database passwords or connection strings
  API tokens (Stripe, Twilio, OpenAI, etc.)
  Private SSH keys (.pem files)
  .env files with real values
  kubeconfig files with cluster credentials

Use instead:
  Environment variables set at runtime
  AWS Secrets Manager / HashiCorp Vault
  GitHub Actions secrets / GitLab CI protected variables
  .gitignore to block sensitive file patterns from ever being tracked
```

---



## 05. IaC Security — Securing Your Infrastructure as Code


Infrastructure as Code (Terraform, CloudFormation, Ansible) is how modern infrastructure is provisioned. The security risk is that a single misconfigured Terraform file can expose your entire cloud environment — an S3 bucket set to public, a security group open to all ports from the internet, an IAM role with unrestricted access.

**IaC security means scanning your infrastructure code for misconfigurations before they are ever applied.**

#### Common Misconfigurations That Cause Real Incidents

```
S3 Buckets:
  → Public access not blocked (data exposed to internet)
  → No encryption at rest
  → No versioning enabled

Security Groups:
  → Port 22 (SSH) open to 0.0.0.0/0 (entire internet can attempt login)
  → Port 3306 (MySQL) or 5432 (Postgres) open to 0.0.0.0/0
  → Wildcard ingress rules allowing all traffic

IAM:
  → Role with Action: "*" and Resource: "*" (full AWS access)
  → No MFA enforcement policy
  → Service account using long-term access keys

RDS Databases:
  → publicly_accessible = true
  → No encryption at rest
  → Backup retention set to 0
```

#### Scanning with Checkov

```bash
# Install
pip install checkov

# Scan a Terraform directory
checkov -d ./terraform/

# Example output:
# Check: CKV_AWS_20: S3 bucket has public ACL
# FAILED for resource: aws_s3_bucket.data_bucket
# File: /terraform/s3.tf:5-12
# Fix: add acl = "private"
```

#### Adding IaC Scanning to CI/CD

```yaml
# GitHub Actions
- name: IaC Security Scan
  uses: bridgecrewio/checkov-action@v12
  with:
    directory: terraform/
    framework: terraform
    soft_fail: false    # Fail the pipeline if issues are found
```

#### IaC Security Tools Comparison

| Tool | What It Scans | Notes |
|------|--------------|-------|
| **Checkov** | Terraform, CF, K8s, Docker | Most popular, free, broad coverage |
| **tfsec** | Terraform only | Very fast, detailed Terraform rules |
| **terrascan** | Terraform, K8s, Docker | Good multi-framework support |
| **KICS** | Almost everything | Broadest coverage |

The principle is the same for all: run in CI so a misconfigured resource never reaches production.

---



## 06. Container Security — Securing Docker Images and Kubernetes


Containers are the default deployment unit in modern DevOps. But containers introduce their own security surface — a vulnerable base image, a process running as root inside the container, a Kubernetes pod with excessive permissions, secrets stored as plain environment variables.

**Container security means securing the image itself, the runtime behavior, and the Kubernetes configuration around it.**

### Docker Image Security

#### Base Image and Build Practices

Every Docker image starts from a base image. If that base image has 200 known vulnerabilities (which `ubuntu:latest` often does), your application inherits all of them even if your own code is perfectly clean.

```dockerfile
# Avoid: large base image with many packages = large attack surface
FROM ubuntu:latest

# Better: slim variant with fewer packages
FROM python:3.11-slim

# Best for production: distroless (no shell, no package manager, minimum possible)
FROM gcr.io/distroless/python3
```

Always run as a non-root user:

```dockerfile
# Create a non-root user and switch to it before the CMD
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser
USER appuser
CMD ["python", "app.py"]
```

#### Scanning Images for Vulnerabilities

```bash
# Trivy — scan an image for CVEs
trivy image my-app:latest

# Output example:
# CRITICAL  CVE-2023-1234  openssl 1.1.1t  → upgrade to 1.1.1u
# HIGH      CVE-2023-5678  libcurl 7.68.0  → upgrade base image
```

In CI/CD — scan before pushing to the registry:

```yaml
- name: Container Vulnerability Scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: my-app:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1      # Fail the pipeline if CRITICAL or HIGH found
```

### Kubernetes Security

#### RBAC — Least Privilege for Pods

```yaml
# Bad: giving a service account cluster-admin
roleRef:
  kind: ClusterRole
  name: cluster-admin    # This pod can do anything to the whole cluster

# Good: only the specific permissions the app actually needs
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list"]    # Read-only access to configmaps only
```

#### Pod Security Context

```yaml
spec:
  securityContext:
    runAsNonRoot: true              # Never run as root
    runAsUser: 1000
    readOnlyRootFilesystem: true    # App cannot write to container filesystem
  containers:
    - name: my-app
      securityContext:
        allowPrivilegeEscalation: false   # Cannot gain more privileges
        capabilities:
          drop: ["ALL"]                   # Drop all Linux capabilities
```

#### Handling Secrets in Kubernetes

```yaml
# Worst: hardcoded in the manifest
env:
  - name: DB_PASSWORD
    value: "mysecretpassword"   # Visible in git, in kubectl describe, in logs

# Better: reference a Kubernetes Secret
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password

# Best: External Secrets Operator — sync from AWS Secrets Manager or Vault
# Secret never lives in the cluster at all
```

---



## 07. SAST, SCA and DAST — Testing Application Security


Once your code is written, how do you automatically find security vulnerabilities before they reach production? There are three main types of automated security testing — each one catches different kinds of problems.

### SAST — Static Application Security Testing

SAST scans your **source code** without running it. It looks for patterns that indicate vulnerabilities — SQL queries built with string concatenation, user input passed directly to shell commands, hardcoded credentials, use of deprecated crypto.

```
What SAST is:  A security-focused code reviewer that never sleeps
When it runs:  On every commit or PR, in CI
What it finds: SQL injection, XSS, hardcoded secrets, insecure functions
What it misses: Runtime issues, auth logic, business logic flaws
```

| Tool | Language | Notes |
|------|----------|-------|
| **Semgrep** | Multi-language | Fast, open-source, highly customizable rules |
| **Bandit** | Python | Standard for Python projects |
| **ESLint security** | JavaScript/TS | Plugs into existing ESLint setup |
| **CodeQL** | Multi-language | GitHub native, very thorough |
| **SonarQube** | Multi-language | Full platform with dashboard and history |

```yaml
# GitHub Actions — Semgrep
- name: SAST Scan
  uses: semgrep/semgrep-action@v1
  with:
    config: p/owasp-top-ten
```

### SCA — Software Composition Analysis

Your application depends on dozens (or hundreds) of third-party libraries. Each one is code you did not write. SCA scans your dependency list and flags packages with known CVEs.

```
Example:
  Your package.json has: lodash@4.17.4
  SCA finds: CVE-2021-23337 — Prototype Pollution — HIGH severity
  Fix: upgrade to lodash@4.17.21
```

| Tool | Works With | Notes |
|------|-----------|-------|
| **Snyk** | npm, pip, Maven, Go, Docker | Most popular, free tier available |
| **Dependabot** | GitHub repos | Auto-creates PRs to fix vulnerable deps |
| **OWASP Dependency-Check** | Java, .NET, more | Free, self-hosted |
| **npm audit** | Node.js | Built into npm, run it regularly |

```bash
snyk test --severity-threshold=high   # Fail only on high/critical
```

### DAST — Dynamic Application Security Testing

DAST attacks your **running application** from the outside — exactly as an attacker would. It sends malicious inputs, probes endpoints, tests authentication flows, and checks for misconfigurations in the HTTP layer.

```
What DAST is:  A safe, controlled automated hacker
When it runs:  Against a staging environment before production release
What it finds: Auth bypass, injection attacks, exposed admin endpoints,
               insecure HTTP headers, CSRF, open redirects
What it misses: Code-level issues (that is SAST's job)
```

| Tool | Type | Notes |
|------|------|-------|
| **OWASP ZAP** | Free | Industry standard, active and passive scanning |
| **Burp Suite** | Paid | Most powerful, used by professional pentesters |
| **Nikto** | Free | Quick web server scanner |

```yaml
- name: DAST — OWASP ZAP
  uses: zaproxy/action-baseline@v0.10.0
  with:
    target: 'https://staging.myapp.com'
```

#### How All Three Work Together

```
Developer writes and commits code
    │
    ├── SAST → scans source code for vulnerability patterns
    ├── SCA  → scans dependencies for known CVEs
    │
    ▼
Code merged → app built and deployed to staging
    │
    └── DAST → attacks the running app from outside
    │
    ▼
Only then → production deployment
```

---



## 08. The DevSecOps Pipeline — Bringing It All Together


All the individual tools need to be wired into your CI/CD pipeline. This is where DevOps engineers do the most important DevSecOps work — building the pipeline that makes security automatic.

#### A Secure Pipeline Structure

```
Developer pushes code
    │
    ├── Pre-commit (local, developer's machine)
    │     ├── Secret detection (gitleaks)
    │     └── Linting and syntax checks
    │
    ▼
CI Pipeline starts (GitHub Actions / GitLab CI / Jenkins)
    │
    ├── Stage 1: Code Security
    │     ├── SAST scan (Semgrep / CodeQL)
    │     ├── Secret scanning (gitleaks)
    │     └── SCA — dependency vulnerabilities (Snyk / Dependabot)
    │
    ├── Stage 2: Build
    │     ├── docker build
    │     ├── Container image scan (Trivy)
    │     └── Push to registry (ECR) if scan passes
    │
    ├── Stage 3: Infrastructure
    │     ├── terraform plan
    │     ├── IaC scan (Checkov)
    │     └── terraform apply (main branch only)
    │
    ├── Stage 4: Deploy to Staging
    │     ├── Deploy application to staging environment
    │     └── DAST scan against staging (OWASP ZAP)
    │
    └── Stage 5: Deploy to Production
          ├── All previous stages must be green
          ├── Manual approval gate
          └── Deploy → Monitor
```

#### GitHub Actions Example

```yaml
name: Secure CI Pipeline
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Secret Scanning
        uses: gitleaks/gitleaks-action@v2

      - name: SAST — Semgrep
        uses: semgrep/semgrep-action@v1
        with:
          config: p/owasp-top-ten

      - name: SCA — Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  build:
    needs: security
    runs-on: ubuntu-latest
    steps:
      - name: Build Image
        run: docker build -t my-app:${{ github.sha }} .

      - name: Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: my-app:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1

  iac:
    runs-on: ubuntu-latest
    steps:
      - name: IaC Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
```

#### Secrets in the Pipeline — The Right Way

```yaml
# Never do this
env:
  AWS_ACCESS_KEY_ID: AKIAXXXXXXXX       # Hardcoded key in pipeline file

# Do this — OIDC (no keys stored anywhere)
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-ci-role
    aws-region: ap-south-1
    # GitHub gets temporary credentials from AWS STS via OIDC
    # No key is stored. Credentials expire after the job ends.
```

---



## 09. What Good DevSecOps Looks Like in Practice


Knowing the tools is one thing. Knowing what a mature, working DevSecOps setup looks like day-to-day is different.

#### Maturity Levels — Where Most Teams Are

```
Level 0 — No security automation
  Security review is manual, at the end
  Vulnerabilities are found in production
  Security team and dev team are in constant conflict

Level 1 — Basic automation
  Secret scanning added to CI
  Dependabot sending dependency alerts
  Basic SAST running on PRs
  Developers start seeing security feedback inline

Level 2 — Security in every pipeline stage
  SAST + SCA + container scanning in CI
  IaC security scanning before terraform apply
  Staging environment with DAST before production
  Security failures block merges to main

Level 3 — Security as culture
  Developers fix their own security findings without being asked
  Threat modeling happens before features are designed
  Security metrics tracked: open vulns by severity, mean time to fix
  Post-mortems include security review
  Security team is an enabler, not a gatekeeper
```

#### Practical Things to Do First

If your team has zero DevSecOps today, start here — in this order:

```
Week 1:
  → Add .gitignore patterns for .env, *.pem, credentials files
  → Enable Dependabot on all repositories
  → Enable branch protection on main (require PR + passing CI)

Week 2:
  → Add gitleaks secret scanning to CI pipeline
  → Add Snyk or npm audit to CI for dependency scanning
  → Add Trivy container scanning if you use Docker

Week 3:
  → Add Semgrep or CodeQL for SAST on PRs
  → Add Checkov for IaC scanning if you use Terraform
  → Set up pre-commit hooks for developers

Month 2+:
  → Add DAST scanning against staging environment
  → Move to OIDC for CI/CD → AWS (remove stored access keys)
  → Start threat modeling before major features
  → Track and report on security metrics
```

#### The Core Principle to Remember

Security found in development costs almost nothing to fix.
Security found in production costs everything — time, money, reputation, and sometimes data.

DevSecOps is simply the practice of moving that discovery as early as possible.

---



## Quick Reference


```
DevSecOps Core Idea
  Security integrated at every stage, not bolted on at the end
  Shared responsibility — developers, ops, security all own it
  Shift left: catch early / Shift right: monitor after deploy

Threat Modeling
  STRIDE: Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Privilege Escalation
  Do it before building — draw flows, ask "what can go wrong here?"

Git Security
  Pre-commit hooks: gitleaks for secret detection before commit
  CI secret scanning: second layer in pipeline
  Branch protection: require PR review + passing CI to merge
  Never commit: keys, passwords, .env files, kubeconfig, .pem files

IaC Security
  Checkov / tfsec: scan Terraform for misconfigurations in CI
  Common issues: public S3, open security groups, over-permissive IAM
  Run before terraform apply — never after

Container Security
  Use slim/distroless base images (smaller = fewer vulnerabilities)
  Never run as root inside containers
  Trivy: scan images for CVEs before pushing to registry
  Kubernetes: least-privilege RBAC, drop capabilities, readOnlyRootFilesystem
  Secrets: use External Secrets Operator, not plain env vars

Testing Types
  SAST   → scans source code, no app running (Semgrep, CodeQL, Bandit)
  SCA    → scans dependencies for known CVEs (Snyk, Dependabot)
  DAST   → attacks running app from outside (OWASP ZAP, Burp Suite)

CI/CD Pipeline Order
  Pre-commit → SAST + SCA + Secret scan → Build + Container scan
  → IaC scan → Deploy staging → DAST → Manual gate → Production

Secrets in Pipelines
  Use OIDC for GitHub Actions → AWS (zero stored keys)
  Store secrets in GitHub Secrets / GitLab protected variables
  Never hardcode credentials in pipeline YAML files
```


