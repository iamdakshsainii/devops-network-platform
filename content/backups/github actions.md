# GitHub Actions

A complete guide to GitHub Actions — from understanding what it is and why it exists, to writing workflows, building CI/CD pipelines, deploying to AWS, and production best practices.

> **Official Docs**: https://docs.github.com/en/actions

---

## 1. What is GitHub Actions

### The Manual Workflow Problem

Every time a developer pushes code, someone has to manually run tests, build the app, and deploy it. On a team of 5 people pushing 10 times a day, that is 50 manual deploy operations. Someone forgets to run tests. Someone deploys untested code to production. Something breaks at 2 AM and nobody knows why it passed review.

This is the problem GitHub Actions solves — it automates everything that happens after you push code.

### What GitHub Actions Actually Is

GitHub Actions is a **CI/CD and automation platform built directly into GitHub**. Instead of setting up a separate Jenkins server or CircleCI account, your automation lives in the same repository as your code — as YAML files.

```
You push code to GitHub
    ↓
GitHub Actions detects the event
    ↓
Runs your workflow automatically:
  - Install dependencies
  - Run tests
  - Build Docker image
  - Push to registry
  - Deploy to production
    ↓
You get a pass/fail notification
```

No server to maintain. No separate dashboard. Everything is version-controlled alongside your code.

### What Developer Workflows Look Like

Before GitHub Actions, a typical team workflow was:

```
Developer writes code
    → runs tests locally (sometimes)
    → pushes to GitHub
    → manually SSH into server
    → git pull
    → restart app
    → hope nothing broke
```

With GitHub Actions:

```
Developer writes code
    → pushes to GitHub
    → GitHub Actions automatically:
        tests the code
        builds the image
        deploys if tests pass
    → developer gets notified of result
```

### Why GitHub Actions Over Other Tools

| Tool | Runs on | Setup required | Cost |
|---|---|---|---|
| GitHub Actions | GitHub's servers | None (YAML in repo) | Free for public repos |
| Jenkins | Your own server | Heavy (install, config) | Server cost |
| CircleCI | CircleCI servers | External account | Paid tiers |
| GitLab CI | GitLab's servers | GitLab account | Built into GitLab |

The biggest advantage: **no separate infrastructure to manage**. If your code is on GitHub, Actions is already there.

---

## 2. Core Concepts

### How GitHub Actions Automates Workflows

Understanding the 5 building blocks before writing any YAML:

```
EVENT → triggers → WORKFLOW → contains → JOBS → contain → STEPS → run → ACTIONS or COMMANDS

Example:
  push to main (EVENT)
    → runs build-and-deploy.yml (WORKFLOW)
        → runs "test" job (JOB 1) on ubuntu runner
            → checkout code (STEP 1)
            → install dependencies (STEP 2)
            → run tests (STEP 3)
        → runs "deploy" job (JOB 2) only if test job passes
            → build Docker image (STEP 1)
            → push to ECR (STEP 2)
            → deploy to EC2 (STEP 3)
```

#### Workflow

A workflow is a YAML file in `.github/workflows/`. It defines what to do and when. A repository can have multiple workflows — one for CI, one for deployment, one for scheduled tasks.

```
.github/
  workflows/
    ci.yml           → runs on every pull request
    deploy.yml       → runs on push to main
    nightly.yml      → runs every night at midnight
```

#### Event

An event is what triggers the workflow. The most common events:

```yaml
on: push                              # any push to any branch
on: pull_request                      # any pull request
on:
  push:
    branches: [main, develop]         # push to specific branches only
on:
  schedule:
    - cron: '0 0 * * *'              # every day at midnight (UTC)
on: workflow_dispatch                  # manual trigger from GitHub UI
on:
  release:
    types: [published]               # when a GitHub Release is published
```

#### Job

A job is a set of steps that runs on one runner. Jobs run in parallel by default. Use `needs` to make one job wait for another.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [...]

  deploy:
    runs-on: ubuntu-latest
    needs: test              # only runs if "test" job succeeds
    steps: [...]
```

#### Step

Each step inside a job either runs a shell command or uses a pre-built Action.

```yaml
steps:
  - name: Install dependencies     # runs a shell command
    run: npm install

  - name: Checkout code            # uses a pre-built Action
    uses: actions/checkout@v4
```

#### Action

An Action is a reusable unit of code someone already wrote — available on the GitHub Marketplace. Instead of writing `git clone` logic yourself, you use `actions/checkout@v4`. Instead of writing AWS auth logic, you use `aws-actions/configure-aws-credentials@v4`.

```yaml
- uses: actions/checkout@v4                    # clone the repo
- uses: actions/setup-node@v4                  # install Node.js
  with:
    node-version: '20'
- uses: docker/login-action@v3                 # log into Docker Hub
- uses: aws-actions/configure-aws-credentials@v4   # AWS auth
```

#### Runner

A Runner is the machine where your job runs. GitHub provides:
- `ubuntu-latest` — most common, Linux
- `windows-latest` — Windows Server
- `macos-latest` — macOS

Each job gets a **fresh, clean virtual machine** — nothing carries over from previous runs. You install what you need every time.

You can also set up **self-hosted runners** on your own EC2 instance or server — useful for accessing internal resources, special hardware, or reducing costs at scale.

---

## 3. Your First Workflow

### Creating the File

All workflows live in `.github/workflows/`. Create this directory in your repo root and add a `.yml` file.

```bash
mkdir -p .github/workflows
touch .github/workflows/ci.yml
```

### A Simple CI Workflow

```yaml
# .github/workflows/ci.yml

name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Run linting
        run: npm run lint
```

**What happens when you push this:**
1. GitHub detects a push to `main`
2. Spins up a fresh Ubuntu VM
3. Clones your repository
4. Installs Node.js 20
5. Runs `npm install`
6. Runs `npm test`
7. Runs `npm run lint`
8. Reports pass or fail on the commit and PR

### Workflow Syntax Reference

```yaml
name: My Workflow            # display name in GitHub UI

on:                          # trigger events
  push:
    branches: [main]

env:                         # environment variables available to all jobs
  NODE_ENV: production
  APP_NAME: my-app

jobs:
  my-job:                    # job ID (used for dependencies)
    name: Build and Test     # display name
    runs-on: ubuntu-latest   # runner type

    env:                     # env vars for this job only
      DATABASE_URL: test-db

    steps:
      - name: Step name
        uses: some/action@v1  # use a pre-built action
        with:                  # inputs to the action
          key: value

      - name: Run command
        run: echo "hello"      # single command

      - name: Multi-line command
        run: |                 # pipe for multiple commands
          echo "line 1"
          echo "line 2"
          npm test

      - name: Conditional step
        if: github.ref == 'refs/heads/main'   # only runs on main branch
        run: echo "This is main branch"
```

---

## 4. Triggers and Events

### Common Triggers You Will Use

```yaml
# Run on push to specific branches
on:
  push:
    branches:
      - main
      - 'release/**'    # wildcard: release/1.0, release/2.0, etc.
    paths:
      - 'src/**'        # only trigger if files in src/ changed
      - '**.js'         # only if .js files changed

# Run on pull requests
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

# Schedule (cron syntax)
on:
  schedule:
    - cron: '0 6 * * 1-5'    # 6 AM every weekday
    - cron: '0 0 * * 0'      # midnight every Sunday

# Manual trigger from GitHub UI (with optional inputs)
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy to which environment?'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

# When a GitHub Release is published
on:
  release:
    types: [published]

# Call from another workflow
on:
  workflow_call:
    inputs:
      image-tag:
        required: true
        type: string
```

### Combining Multiple Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'     # also runs weekly on Sunday
  workflow_dispatch:          # also runnable manually
```

---

## 5. Workflow Syntax Deep Dive

### Variables and Secrets

#### Environment Variables

```yaml
env:
  APP_NAME: my-app         # available to all jobs

jobs:
  build:
    env:
      BUILD_ENV: production  # available to this job only

    steps:
      - name: Use variable
        run: echo "Building $APP_NAME for $BUILD_ENV"

      - name: Job-level env in step
        env:
          STEP_VAR: hello      # available only in this step
        run: echo "$STEP_VAR"
```

#### Secrets

Secrets are stored in GitHub (Settings → Secrets and variables → Actions) and injected at runtime. They are never visible in logs.

```yaml
steps:
  - name: Deploy using secrets
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    run: |
      aws s3 sync ./dist s3://my-bucket/
```

#### Contexts

Contexts give you access to runtime information about the workflow:

```yaml
steps:
  - run: |
      echo "Repository: ${{ github.repository }}"
      echo "Branch: ${{ github.ref_name }}"
      echo "Commit SHA: ${{ github.sha }}"
      echo "Actor (who triggered): ${{ github.actor }}"
      echo "Event: ${{ github.event_name }}"
      echo "Runner OS: ${{ runner.os }}"
```

### Expressions and Conditions

```yaml
steps:
  # Only run this step on the main branch
  - name: Deploy to production
    if: github.ref == 'refs/heads/main'
    run: ./deploy.sh

  # Only run if previous step succeeded
  - name: Notify success
    if: success()
    run: echo "All good"

  # Run even if previous steps failed (for cleanup)
  - name: Clean up temp files
    if: always()
    run: rm -rf /tmp/build

  # Only run on failure
  - name: Notify on failure
    if: failure()
    run: curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d '{"text":"Build failed!"}'
```

### Job Dependencies — Controlling Order

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test              # only runs if test passes
    steps:
      - run: npm run build

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build             # only runs if build passes
    steps:
      - run: ./deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test, build, deploy-staging]    # waits for ALL three
    steps:
      - run: ./deploy.sh production
```

### Passing Data Between Jobs — Outputs

Jobs run on separate VMs. To share data between them, use outputs:

```yaml
jobs:
  get-version:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get-ver.outputs.version }}
    steps:
      - name: Get version
        id: get-ver
        run: echo "version=$(cat VERSION)" >> $GITHUB_OUTPUT

  build:
    runs-on: ubuntu-latest
    needs: get-version
    steps:
      - name: Use version from previous job
        run: |
          echo "Building version: ${{ needs.get-version.outputs.version }}"
          docker build -t my-app:${{ needs.get-version.outputs.version }} .
```

### Artifacts — Sharing Files Between Jobs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build          # creates dist/ folder

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 7

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - run: aws s3 sync dist/ s3://my-bucket/
```

---

## 6. Runners

### GitHub-Hosted Runners

GitHub provides pre-configured VMs for every job. Each run is a **fresh machine** — nothing cached by default.

| Runner label | OS | Included tools |
|---|---|---|
| `ubuntu-latest` | Ubuntu 22.04 | Docker, Node, Python, Java, Go, AWS CLI, git |
| `windows-latest` | Windows Server 2022 | Similar toolset, PowerShell |
| `macos-latest` | macOS 14 | Xcode, Homebrew, similar toolset |

```yaml
jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Running on Linux"

  build-windows:
    runs-on: windows-latest
    steps:
      - run: echo "Running on Windows"
```

### Self-Hosted Runners

When you need to run on your own infrastructure — access to internal services, specific hardware, or cost savings at high volume:

```yaml
jobs:
  deploy:
    runs-on: self-hosted    # uses your own registered runner machine
    steps:
      - run: ./deploy.sh
```

Set up a self-hosted runner: GitHub repo → Settings → Actions → Runners → New self-hosted runner. Follow the install script for your machine. The runner registers with GitHub and waits for jobs.

### Dependency Caching — Speeding Up Runs

Without caching, `npm install` or `pip install` runs from scratch every time. For 100 runs per day, that is a lot of wasted time downloading the same packages.

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Cache Node modules
    uses: actions/cache@v4
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-

  - run: npm ci         # uses cache if package-lock.json hasn't changed
```

```yaml
# Python caching
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}

- run: pip install -r requirements.txt
```

---

## 7. Matrix Builds

### The Multi-Version Testing Problem

Your Node.js library needs to work on Node 18, 20, and 22 — and on Linux, macOS, and Windows. Without matrix builds you would write 9 separate jobs with duplicated YAML.

### Matrix Strategy

Matrix builds let you define a set of variables and GitHub runs one job for every combination.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
        # This creates 3 × 3 = 9 parallel jobs

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      - run: npm install
      - run: npm test
```

```yaml
# Exclude specific combinations
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest]
    node: [18, 20]
    exclude:
      - os: windows-latest
        node: 18       # skip Node 18 on Windows specifically

# Add extra combinations
    include:
      - os: ubuntu-latest
        node: 22
        experimental: true   # custom variable you can reference
```

---

## 8. Build Docker Image and Push to Registry

### The Problem

Your CI pipeline runs tests — great. But how does the tested code get packaged and stored for deployment? You need to build a Docker image and push it to a registry that your deployment server can pull from.

### Build and Push to Docker Hub

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}    # use token not password

      - name: Extract metadata (tags)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKERHUB_USERNAME }}/my-app
          tags: |
            type=sha                        # tag with git SHA: sha-abc1234
            type=ref,event=branch           # tag with branch name
            type=semver,pattern={{version}} # tag with version if it's a release

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha           # use GitHub Actions cache for Docker layers
          cache-to: type=gha,mode=max
```

### Build and Push to AWS ECR

```yaml
name: Build and Push to ECR

on:
  push:
    branches: [main]

permissions:
  id-token: write      # required for OIDC (keyless AWS auth)
  contents: read

jobs:
  build-push-ecr:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC — no stored keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
          aws-region: ap-south-1

      - name: Log in to Amazon ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag and push image to ECR
        env:
          ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-app:$IMAGE_TAG
          echo "IMAGE=$ECR_REGISTRY/my-app:$IMAGE_TAG" >> $GITHUB_ENV
```

---

## 9. Deploy to AWS EC2

### Full CI/CD Pipeline — Test → Build → Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ github.sha }}

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/my-app:${{ github.sha }} .
          docker push $ECR_REGISTRY/my-app:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            aws ecr get-login-password --region ${{ secrets.AWS_REGION }} | \
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
            docker pull ${{ secrets.ECR_REGISTRY }}/my-app:${{ github.sha }}
            docker stop my-app || true
            docker rm my-app || true
            docker run -d \
              --name my-app \
              -p 80:3000 \
              --restart unless-stopped \
              ${{ secrets.ECR_REGISTRY }}/my-app:${{ github.sha }}
```

### Deploy Static Site to AWS S3

```yaml
name: Deploy to S3

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy to S3
        run: |
          aws s3 sync ./dist s3://${{ secrets.S3_BUCKET_NAME }} \
            --delete \
            --cache-control max-age=31536000

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 10. Environment Protection Rules

### The Problem

Your workflow runs tests and deploys automatically. But you do not want code deploying to production without a human reviewing and approving it — especially for a finance or healthcare app where a bad deployment has serious consequences.

### Environments with Required Approvals

GitHub Environments let you set up protection rules — someone must approve before a job targeting that environment can run.

**Set up in GitHub:** Settings → Environments → New environment → "production" → Required reviewers → add your name or team.

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging        # no protection rules, deploys automatically
    steps:
      - run: ./deploy.sh staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: production     # PAUSES here — waits for manual approval
    steps:
      - run: ./deploy.sh production
```

When this workflow runs:
- staging deploys automatically
- production job pauses
- GitHub sends notification to required reviewers
- Reviewer clicks Approve in GitHub UI
- Production deployment proceeds

### Environment-Specific Secrets

Each environment can have its own secrets — staging has staging DB credentials, production has production DB credentials. Your workflow uses the same variable names but gets different values based on the environment.

```yaml
# Staging environment has DEPLOY_KEY = staging-server-key
# Production environment has DEPLOY_KEY = production-server-key

jobs:
  deploy:
    environment: ${{ inputs.env }}   # staging or production
    steps:
      - run: echo "${{ secrets.DEPLOY_KEY }}"
      # Gets the right key for the right environment automatically
```

---

## 11. Reusable Workflows

### The Duplication Problem

You have 5 microservices, each with its own repository. Each has a GitHub Actions workflow. They all do the same thing: test → build Docker → push to ECR → deploy. You are copying and pasting the same 80 lines of YAML into every repo. When something needs to change (new AWS region, updated action version), you update 5 files.

### Calling a Reusable Workflow

Define the reusable workflow once in a central repo:

```yaml
# .github/workflows/deploy-reusable.yml (in your shared/devops repo)
name: Reusable Deploy Workflow

on:
  workflow_call:
    inputs:
      app-name:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      AWS_ROLE_ARN:
        required: true
      ECR_REGISTRY:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-south-1

      - name: Deploy
        run: |
          docker pull ${{ secrets.ECR_REGISTRY }}/${{ inputs.app-name }}:${{ inputs.image-tag }}
          # ... rest of deploy logic
```

Call it from each microservice repo:

```yaml
# .github/workflows/ci.yml (in each microservice repo)
jobs:
  test:
    # ... test steps

  deploy:
    needs: test
    uses: my-org/devops/.github/workflows/deploy-reusable.yml@main
    with:
      app-name: user-service
      image-tag: ${{ github.sha }}
    secrets:
      AWS_ROLE_ARN: ${{ secrets.AWS_ROLE_ARN }}
      ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
```

Change the reusable workflow once → all 5 microservices get the update automatically.

---

## 12. Production Best Practices

### Security

#### Use OIDC Instead of Stored Access Keys

Never store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub secrets. If your repo is compromised, those keys are exposed. Use OIDC — GitHub gets a temporary token from AWS with no long-lived credentials stored anywhere.

```yaml
permissions:
  id-token: write       # enables OIDC token generation
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-ci-role
      aws-region: ap-south-1
      # No access key or secret key stored anywhere
```

AWS IAM trust policy for the role (allows GitHub Actions to assume it):

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub":
        "repo:myorg/myrepo:ref:refs/heads/main"
    }
  }
}
```

#### Pin Action Versions

```yaml
# Bad — "latest" could change and break your workflow
- uses: actions/checkout@latest

# Better — pinned to major version
- uses: actions/checkout@v4

# Best — pinned to exact commit SHA (immutable)
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
```

#### Least Privilege Permissions

```yaml
# Default: read all, write all — too permissive
# Better: declare exactly what you need

permissions:
  contents: read          # read the repo
  id-token: write         # get OIDC token for AWS
  packages: write         # push to GitHub Container Registry
  # everything else: none
```

### Concurrency — Prevent Duplicate Runs

If two pushes happen quickly, you do not want two production deployments running simultaneously:

```yaml
concurrency:
  group: production-deploy-${{ github.ref }}
  cancel-in-progress: false   # do not cancel ongoing deploy — let it finish
                               # set true for CI builds (cancel old ones)
```

### Timeout — Prevent Stuck Jobs

```yaml
jobs:
  deploy:
    timeout-minutes: 15     # fail the job if it runs longer than 15 minutes
    runs-on: ubuntu-latest
```

### Continue on Error

```yaml
steps:
  - name: Run optional security scan
    run: snyk test
    continue-on-error: true    # don't fail the whole job if this fails
```

---

## 13. Monitoring and Debugging

### Reading Workflow Logs

Go to your repository → Actions tab → click the workflow run → click a job → click a step to expand its logs.

Key things to look for in failed steps:
- The exact error message (usually near the bottom of the step log)
- Exit code (non-zero = failure)
- Which command caused the failure

### Enabling Debug Logs

When normal logs are not enough, enable debug mode. Add these as repository secrets or re-run with debug enabled:

```
Secret name: ACTIONS_STEP_DEBUG   Value: true
Secret name: ACTIONS_RUNNER_DEBUG  Value: true
```

Or re-run failed jobs with debug logging enabled from the GitHub UI: click "Re-run jobs" → "Enable debug logging".

### Adding Debug Output in Your Workflow

```yaml
steps:
  - name: Debug information
    run: |
      echo "GitHub ref: ${{ github.ref }}"
      echo "Event: ${{ github.event_name }}"
      echo "SHA: ${{ github.sha }}"
      env                          # print all environment variables
      ls -la                       # list files
      docker images                # check what images exist
      aws sts get-caller-identity  # verify AWS auth worked
```

### Common Failures and Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Permission denied` | Missing IAM permission | Check role policies |
| `No such file or directory` | Wrong working directory or missing checkout | Add `actions/checkout` step |
| `secret not found` | Secret not configured in repo settings | Add secret in Settings → Secrets |
| Job stuck at environment | Waiting for approval | Go to Actions → approve the deployment |
| `Image not found` | ECR login failed or wrong image tag | Check ECR login step output |
| Tests pass locally, fail in CI | Missing env var or different versions | Check Node/Python version, add env vars |

---

## Quick Reference

```
File location
  .github/workflows/*.yml   → all workflow files live here

Core structure
  on:         → trigger (push, pull_request, schedule, workflow_dispatch)
  jobs:       → one or more jobs (run in parallel by default)
  needs:      → make a job wait for another
  runs-on:    → ubuntu-latest / windows-latest / macos-latest / self-hosted
  steps:      → ordered list of commands or actions
  uses:       → a pre-built action from GitHub Marketplace
  run:        → a shell command
  with:       → inputs to an action
  env:        → environment variables
  secrets:    → ${{ secrets.SECRET_NAME }}

Contexts
  ${{ github.sha }}         → commit SHA
  ${{ github.ref_name }}    → branch name
  ${{ github.actor }}       → who triggered the run
  ${{ github.event_name }}  → push / pull_request / etc
  ${{ runner.os }}          → Linux / Windows / macOS

Useful built-in actions
  actions/checkout@v4                     → clone the repo
  actions/setup-node@v4                   → install Node.js
  actions/setup-python@v5                 → install Python
  actions/cache@v4                        → cache dependencies
  actions/upload-artifact@v4              → save files between jobs
  actions/download-artifact@v4            → retrieve saved files
  aws-actions/configure-aws-credentials@v4 → AWS OIDC auth
  aws-actions/amazon-ecr-login@v2         → log into ECR
  docker/build-push-action@v6             → build + push Docker image

Security best practices
  OIDC for AWS         → no stored access keys
  Pin action versions  → use @v4 or commit SHA, not @latest
  Least privilege      → declare only needed permissions
  Environments         → require approval before production deploys
  Concurrency          → prevent duplicate deploys

Common patterns
  Test → Build → Deploy to staging → Approve → Deploy to production
  Push to main → build + push image → SSH into EC2 → pull + restart
  Push to main → build → sync to S3 → invalidate CloudFront
```

> **GitHub Actions Docs**: https://docs.github.com/en/actions
> **Workflow Syntax**: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
> **Events Reference**: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows
> **GitHub Marketplace**: https://github.com/marketplace?type=actions