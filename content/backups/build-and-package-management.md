# Build and Package Management

This module teaches you how software goes from raw source code to a deployable artifact.
Every DevOps engineer works with build tools and package managers daily — understanding them deeply makes everything else easier

---

## 01. Why Build and Package Management Exists


You write code in `.py` or `.java` files. The server that runs your application does not care about those files directly. It needs a packaged, runnable artifact — a `.jar`, a `.whl`, a Docker image. Getting from source code to that artifact is what build management solves.

#### The Problem Without It

Imagine a team of five developers working on a Java application. Developer A builds it on their MacBook with Java 17. Developer B builds it on Windows with Java 11. The CI server runs Java 8. The production server runs Java 17.

Every environment produces a slightly different artifact. Bugs appear on production that never showed up locally. Nobody knows why. Deployments are unpredictable.

**Build tools solve this by making the build process explicit, repeatable, and environment-independent.** The same build command produces the same artifact regardless of who runs it or where.

#### The Problem Without Package Management

Your Python application uses 12 third-party libraries. Each library has its own dependencies. Some of those dependencies conflict with each other. Another project on the same machine needs a different version of the same library.

Without package management this is a nightmare — manually downloading ZIPs, copying files, tracking versions in a text document. When something breaks you have no idea what changed.

**Package managers solve this by declaring dependencies in a file, locking exact versions, and installing everything reproducibly in one command.**

#### Two Separate Concerns That Work Together

```
Source Code (.py, .java, .go)
    │
    ▼
Package Manager
  → Downloads all dependencies
  → Locks exact versions
  → Isolates from other projects
    │
    ▼
Build Tool
  → Compiles code (if needed)
  → Runs tests
  → Packages into artifact (.jar, .whl, Docker image)
    │
    ▼
Artifact
  → Ready to deploy
  → Same on every machine
  → Versioned and stored in a registry
```

---



## 02. Build Tools Overview


Different languages have different ecosystems. You do not need to know all of them — but you do need to understand what a build tool does and recognize the most common ones.

#### What a Build Tool Does

Every build tool, regardless of language, does roughly the same things:

```
1. Dependency resolution  → fetch all libraries the project needs
2. Compilation            → turn source code into runnable code (not all languages)
3. Testing                → run the test suite and report results
4. Packaging              → bundle everything into a deployable artifact
5. Publishing             → push the artifact to a registry or server
```

#### Common Build Tools by Language

| Language | Build Tool | Config File | Key Command |
|----------|-----------|-------------|-------------|
| Java / Kotlin | **Gradle** | `build.gradle` | `./gradlew build` |
| Java | **Maven** | `pom.xml` | `mvn package` |
| Python | **Poetry** | `pyproject.toml` | `poetry build` |
| Python | **pip + setuptools** | `requirements.txt` / `setup.py` | `pip install` |
| JavaScript | **npm** | `package.json` | `npm run build` |
| JavaScript | **yarn** | `package.json` | `yarn build` |
| Go | **go build** | `go.mod` | `go build ./...` |
| Rust | **Cargo** | `Cargo.toml` | `cargo build` |

As a DevOps engineer you will encounter all of these in CI/CD pipelines. You need to know enough to write a pipeline step that runs the build, even if you did not write the application code.

---



## 03. Java Build with Gradle


Java is one of the most common languages in enterprise DevOps environments. Gradle is the modern standard for Java builds — it replaced Maven for most new projects because it is faster and more flexible.

#### Why Gradle Over Maven

Maven uses XML configuration (`pom.xml`) — verbose and rigid. Gradle uses a Groovy or Kotlin DSL (`build.gradle`) — concise and programmable. Gradle also has an incremental build system that only rebuilds what changed, making large codebases significantly faster to build.

#### Project Structure

```
my-java-app/
├── build.gradle          ← build configuration
├── settings.gradle       ← project name and subprojects
├── gradlew               ← gradle wrapper script (use this, not global gradle)
├── gradlew.bat           ← windows version
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties   ← specifies gradle version
└── src/
    ├── main/
    │   └── java/
    │       └── com/myapp/
    │           └── App.java
    └── test/
        └── java/
            └── com/myapp/
                └── AppTest.java
```

Always use `./gradlew` (the wrapper) instead of a globally installed Gradle. The wrapper downloads the exact Gradle version specified in the project — everyone gets the same version automatically.

#### A Typical build.gradle

```groovy
plugins {
    id 'java'
    id 'application'
}

group = 'com.mycompany'
version = '1.0.0'

repositories {
    mavenCentral()         // where to download dependencies from
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.1.0'
    implementation 'com.google.guava:guava:32.0.0-jre'

    testImplementation 'org.junit.jupiter:junit-jupiter:5.9.3'
}

application {
    mainClass = 'com.mycompany.App'
}

test {
    useJUnitPlatform()
}
```

#### Common Gradle Commands

```bash
# Build the project (compile + test + package)
./gradlew build

# Just compile without running tests
./gradlew compileJava

# Run tests only
./gradlew test

# Create the runnable JAR in build/libs/
./gradlew jar

# Run the application locally
./gradlew run

# See all available tasks
./gradlew tasks

# Clean the build directory (useful when builds behave strangely)
./gradlew clean

# Build skipping tests (use sparingly — only for speed in CI when tests run separately)
./gradlew build -x test
```

#### What the Build Produces

```
After ./gradlew build:

build/
├── classes/         ← compiled .class files
├── libs/
│   └── my-app-1.0.0.jar    ← the artifact you deploy
├── reports/
│   └── tests/       ← HTML test report
└── test-results/    ← JUnit XML results (consumed by CI)
```

The `.jar` file is the artifact. In a CI/CD pipeline you build it, then either run it directly on a server or copy it into a Docker image.

---



## 04. Python Build with Poetry


Python has multiple packaging tools — pip, setuptools, conda, pipenv. Poetry has become the modern standard because it handles dependency management, virtual environments, and packaging in one tool with a clean interface.

#### The Problem Poetry Solves

Python's old workflow had real problems:

```
Old way (requirements.txt):
  pip install flask           → installs "latest" flask
  pip freeze > requirements.txt  → captures current versions

  Problems:
    → requirements.txt has no way to separate dev deps from prod deps
    → No lock file by default — "latest" today is different in 6 months
    → Virtual environments are managed separately (venv, virtualenv)
    → No standard way to build and publish packages

Poetry fixes all of this in one tool.
```

#### Installing Poetry

```bash
# Install Poetry (do not use pip install poetry — use the official installer)
curl -sSL https://install.python-poetry.org | python3 -

# Verify
poetry --version
```

#### Starting a New Project

```bash
# Create a new project
poetry new my-app

# Or initialize in an existing directory
cd existing-project
poetry init
```

This creates:

```
my-app/
├── pyproject.toml    ← project config and dependencies (replaces setup.py + requirements.txt)
├── poetry.lock       ← exact locked versions of every dependency (commit this to git)
├── README.md
└── my_app/
    └── __init__.py
```

#### pyproject.toml — The Single Config File

```toml
[tool.poetry]
name = "my-app"
version = "1.0.0"
description = "A sample Flask application"
authors = ["Daksh <daksh@company.com>"]

[tool.poetry.dependencies]
python = "^3.11"
flask = "^3.0.0"
requests = "^2.31.0"
psycopg2-binary = "^2.9.7"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
black = "^23.0.0"
flake8 = "^6.0.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

Note the separation: `[tool.poetry.dependencies]` for production deps, `[tool.poetry.group.dev.dependencies]` for development-only tools. This means your production Docker image will not have pytest or black installed.

#### Common Poetry Commands

```bash
# Install all dependencies (creates virtualenv automatically)
poetry install

# Install only production dependencies (for Docker builds)
poetry install --only main

# Add a new dependency
poetry add flask

# Add a dev-only dependency
poetry add --group dev pytest

# Remove a dependency
poetry remove requests

# Run a command inside the virtualenv
poetry run python app.py
poetry run pytest

# Activate the virtualenv in your shell
poetry shell

# Build the package (.whl and .tar.gz)
poetry build

# Show all installed packages
poetry show

# Update all dependencies to latest allowed versions
poetry update

# Check for version conflicts
poetry check
```

#### poetry.lock — Why You Must Commit It

The `poetry.lock` file records the exact version of every package and every transitive dependency. When you run `poetry install` with a lock file, Poetry installs exactly those versions — not "latest matching the constraints".

```
pyproject.toml says:  flask = "^3.0.0"  (any version >= 3.0.0 and < 4.0.0)
poetry.lock says:     flask = 3.0.2     (this exact version, always)

Without lock file:
  You install today → flask 3.0.2
  Colleague installs next month → flask 3.0.3 (bug introduced)
  CI installs in 6 months → flask 3.1.0 (breaking change)

With lock file:
  Everyone always gets flask 3.0.2
  Consistent builds everywhere
```

**Always commit `poetry.lock` to git.**

---



## 05. Package Managers and Dependencies


Package managers are what make modern software development possible. Without them, using a third-party library means manually downloading source code, figuring out its dependencies, downloading those too, keeping track of versions, and updating manually when security patches are released.

#### What a Package Manager Does

```
You write in pyproject.toml:   flask = "^3.0.0"

Poetry (package manager):
  1. Looks up flask on PyPI (Python Package Index)
  2. Finds the latest version matching ^3.0.0
  3. Reads flask's own dependencies
  4. Resolves the full dependency tree (flask needs Werkzeug, Jinja2, Click...)
  5. Checks for version conflicts across all packages
  6. Downloads and installs everything
  7. Records exact versions in poetry.lock
```

You declare what you need. The package manager handles everything else.

#### Dependency Types

Understanding dependency types matters for keeping production images lean and secure:

| Type | Purpose | In Production? |
|------|---------|---------------|
| **Production** | App actually needs this to run | Yes |
| **Dev** | Testing, linting, formatting tools | No |
| **Peer** | Expected to be provided by the consumer | Depends |
| **Optional** | Extra features, not always needed | Only if needed |

#### Version Constraint Syntax

You will see these everywhere — in `pyproject.toml`, `package.json`, `build.gradle`:

```
Exact:      flask==3.0.2      → only this exact version
Compatible: flask^3.0.0       → >=3.0.0 and <4.0.0  (most common)
Patch only: flask~3.0.0       → >=3.0.0 and <3.1.0
Any:        flask>=3.0.0      → 3.0.0 or higher (risky — could break)
Range:      flask>=3.0,<4.0   → explicit range
```

In practice: use `^` (caret/compatible) for most dependencies. It allows patch and minor updates but prevents major version breaking changes from sneaking in.

#### Dependency Security

Every dependency is code you did not write and cannot fully audit. Package managers are also a common attack vector — attackers publish packages with names similar to popular ones (typosquatting) or compromise existing popular packages.

```
Basic hygiene:
  → Run snyk test or npm audit regularly to find known CVEs
  → Pin versions in lock files — do not use "latest"
  → Review what new packages you add before adding them
  → Keep dependencies updated — old versions have known vulnerabilities
  → Use private registries (Artifactory, Nexus) in enterprise environments
    to control which packages your team can use
```

---



## 06. Versioning and Artifacts


Once your build tool packages the code, you have an artifact. That artifact needs a version number so you can track exactly what is deployed, roll back to a previous version if something breaks, and communicate changes to your team.

#### Semantic Versioning (SemVer)

The industry standard for version numbers is **Semantic Versioning**: `MAJOR.MINOR.PATCH`

```
Version: 2.4.1
         │ │ └── PATCH: Bug fixes, no new features, no breaking changes
         │ └──── MINOR: New features added, fully backward compatible
         └────── MAJOR: Breaking changes — existing code may stop working

Examples:
  1.0.0 → 1.0.1   Bug fix in authentication
  1.0.1 → 1.1.0   New /users endpoint added
  1.1.0 → 2.0.0   API completely restructured, old endpoints removed
```

When your CI/CD pipeline builds an artifact, tag it with the version. Never deploy an artifact tagged `latest` to production — you cannot tell what version is actually running.

#### Artifact Versioning in Practice

```bash
# Tag with version from pyproject.toml in CI
VERSION=$(poetry version -s)   # outputs: 1.2.3
docker build -t my-app:$VERSION .
docker build -t my-app:latest .   # also tag latest for convenience

# Or use git commit SHA for immutable, traceable builds
GIT_SHA=$(git rev-parse --short HEAD)   # outputs: a3f8c12
docker build -t my-app:$GIT_SHA .

# Best practice in production: use both
docker tag my-app:$GIT_SHA my-app:1.2.3
```

Using the git SHA means you can trace any running container back to the exact commit that produced it.

#### Artifact Registries

Once built and tagged, artifacts are stored in registries:

| Artifact Type | Registry Options |
|--------------|-----------------|
| Docker images | Amazon ECR, Docker Hub, GitHub Container Registry |
| Python packages | PyPI (public), Artifactory, AWS CodeArtifact (private) |
| Java JARs | Maven Central (public), Nexus, Artifactory (private) |
| npm packages | npmjs.com (public), Verdaccio, Artifactory (private) |

In CI/CD: build → tag with version → push to registry → deploy by pulling that exact tag.

---



## 07. Dockerizing Your Application


Once your application is built and its dependencies are managed, the final packaging step for modern deployments is putting it in a Docker image. Docker makes the artifact fully portable — the same image runs identically in development, staging, and production.

#### The Problem Docker Solves at This Stage

You have a Python Flask app. It works on your machine. The staging server has a different Python version, different OS libraries, different system packages. It breaks.

A Docker image bundles the app, the runtime, and everything it needs into one artifact. The server just needs Docker — nothing else.

#### A Production-Quality Dockerfile for Flask

```dockerfile
# Stage 1: Build stage — install dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install poetry
RUN pip install poetry==1.7.1

# Copy dependency files first (Docker layer caching — deps only reinstall when these change)
COPY pyproject.toml poetry.lock ./

# Install only production dependencies, no virtualenv (we're in a container)
RUN poetry config virtualenvs.create false && \
    poetry install --only main --no-interaction --no-ansi

# Stage 2: Runtime stage — copy only what's needed to run
FROM python:3.11-slim AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser

# Copy installed packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose the port Flask runs on
EXPOSE 5000

# Run the application
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
```

#### Why Multi-Stage Builds

The build above uses two stages. Here is why that matters:

```
Without multi-stage:
  Image contains: Python + Poetry + all build tools + app code
  Image size: ~800MB
  Attack surface: large (Poetry, pip, build tools all present)

With multi-stage:
  Builder stage: installs everything needed to build
  Runtime stage: copies only the installed packages and app code
  Image size: ~120MB
  Attack surface: minimal (only Python runtime and app)
```

Stage 1 does the heavy lifting. Stage 2 is the lean production image.

#### Docker Layer Caching — The Key Optimization

```dockerfile
# Slow (no caching benefit):
COPY . .
RUN poetry install

# Fast (dependencies cached separately from code):
COPY pyproject.toml poetry.lock ./    # Only changes when deps change
RUN poetry install                     # Cached unless deps change
COPY . .                               # Changes on every code change
                                       # But install step above is cached
```

Copy dependency files first, install, then copy source code. Dependencies change rarely. Source code changes constantly. This way Docker reuses the cached install layer on every code-only change — much faster builds.

---



## 08. Automating with Makefile


A `Makefile` in the root of your project gives everyone a consistent set of commands regardless of the underlying tool. Instead of remembering `poetry run pytest --cov=app --cov-report=term-missing`, your teammate just runs `make test`.

#### Why Makefile in a DevOps Context

CI/CD pipelines, local development, and onboarding new developers all benefit from having standard commands defined in one place. The pipeline calls `make build`. The developer calls `make build`. Same thing runs everywhere.

```
Without Makefile:
  Dev: "How do I run tests?"
  → "Run poetry run pytest -v --cov=app --cov-report=term-missing tests/"
  Dev: "How do I build the Docker image?"
  → "Run docker build --build-arg ENV=production -t my-app:$(git rev-parse --short HEAD) ."
  Dev: "How do I run linting?"
  → checks Confluence page that is 3 months out of date

With Makefile:
  make test     → runs tests
  make build    → builds Docker image
  make lint     → runs linter
  make help     → shows all available commands
```

#### A Practical Makefile for a Python Flask Project

```makefile
# Variables
APP_NAME     = my-flask-app
VERSION      = $(shell poetry version -s)
GIT_SHA      = $(shell git rev-parse --short HEAD)
IMAGE_TAG    = $(APP_NAME):$(VERSION)-$(GIT_SHA)
REGISTRY     = 123456789012.dkr.ecr.ap-south-1.amazonaws.com

.PHONY: help install test lint format build push deploy clean

## Show this help message
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## Install all dependencies
install:
	poetry install

## Run tests with coverage
test:
	poetry run pytest -v --cov=app --cov-report=term-missing tests/

## Run linting
lint:
	poetry run flake8 app/ tests/
	poetry run black --check app/ tests/

## Auto-format code
format:
	poetry run black app/ tests/

## Build Docker image
build:
	docker build -t $(IMAGE_TAG) .
	docker tag $(IMAGE_TAG) $(APP_NAME):latest
	@echo "Built: $(IMAGE_TAG)"

## Push image to ECR
push: build
	aws ecr get-login-password --region ap-south-1 | \
	  docker login --username AWS --password-stdin $(REGISTRY)
	docker tag $(IMAGE_TAG) $(REGISTRY)/$(IMAGE_TAG)
	docker push $(REGISTRY)/$(IMAGE_TAG)
	@echo "Pushed: $(REGISTRY)/$(IMAGE_TAG)"

## Run the app locally
run:
	poetry run flask run --host=0.0.0.0 --port=5000

## Run the app in Docker
run-docker: build
	docker run -p 5000:5000 --rm $(APP_NAME):latest

## Clean build artifacts
clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf dist/ .coverage htmlcov/ .pytest_cache/

## Full CI pipeline locally
ci: install lint test build
	@echo "CI pipeline passed locally"
```

Now your CI/CD pipeline is simply:

```yaml
- run: make install
- run: make lint
- run: make test
- run: make build
- run: make push
```

And any developer can run `make ci` locally to simulate the full pipeline before pushing.

---



## 09. Reference Project — Python Flask App


Everything covered in this module comes together in a single reference project. This is a minimal but production-structured Python Flask application with Poetry, Docker, and Makefile wired up correctly.

#### Project Structure

```
flask-demo/
├── app/
│   ├── __init__.py
│   └── routes.py
├── tests/
│   ├── __init__.py
│   └── test_app.py
├── Dockerfile
├── Makefile
├── pyproject.toml
├── poetry.lock           ← committed to git
└── README.md
```

#### app/__init__.py

```python
from flask import Flask

def create_app():
    app = Flask(__name__)

    from app.routes import main
    app.register_blueprint(main)

    return app
```

#### app/routes.py

```python
from flask import Blueprint, jsonify

main = Blueprint('main', __name__)

@main.route('/health')
def health():
    return jsonify({"status": "ok", "message": "Build & Package Demo"})

@main.route('/')
def index():
    return jsonify({"message": "Build & Package Demo", "status": "ok"})
```

#### tests/test_app.py

```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ok'

def test_index(client):
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'message' in data
```

#### pyproject.toml

```toml
[tool.poetry]
name = "flask-demo"
version = "1.0.0"
description = "Reference Flask app for Build and Package Management"

[tool.poetry.dependencies]
python = "^3.11"
flask = "^3.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-cov = "^4.1.0"
black = "^23.0.0"
flake8 = "^6.0.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

#### Running the Full Workflow

```bash
# Clone and set up
git clone https://github.com/yourorg/flask-demo
cd flask-demo
make install

# Run tests
make test
# Output:
# tests/test_app.py::test_health_check PASSED
# tests/test_app.py::test_index PASSED
# Coverage: 94%

# Run locally
make run
# curl http://localhost:5000/health
# {"message": "Build & Package Demo", "status": "ok"}

# Build Docker image
make build
# Built: flask-demo:1.0.0-a3f8c12

# Run in Docker
make run-docker
# curl http://localhost:5000/health
# {"message": "Build & Package Demo", "status": "ok"}

# Full CI simulation locally
make ci
# install → lint → test → build
# CI pipeline passed locally
```

#### Verify the Container

```bash
# Check the image was built
docker images | grep flask-demo

# Inspect what is inside (security check — make sure it runs as non-root)
docker inspect flask-demo:latest | grep -i user

# Run with environment variables
docker run -p 5000:5000 -e FLASK_ENV=production flask-demo:latest

# Check running processes inside container
docker exec <container-id> ps aux
# Should show: appuser   python -m flask run
# Should NOT show: root
```

---



## Quick Reference


```
Why It Exists
  Build tools  → turn source code into deployable artifacts, reproducibly
  Package mgrs → declare, lock, and install dependencies consistently

Build Tools by Language
  Java/Kotlin  → Gradle  (build.gradle,   ./gradlew build)
  Python       → Poetry  (pyproject.toml, poetry build)
  JavaScript   → npm     (package.json,   npm run build)
  Go           → go tool (go.mod,         go build ./...)

Gradle Key Commands
  ./gradlew build        → compile + test + package (produces .jar)
  ./gradlew test         → run tests only
  ./gradlew clean build  → fresh build from scratch
  Always use ./gradlew (wrapper), not system gradle

Poetry Key Commands
  poetry install         → install all deps + create virtualenv
  poetry install --only main  → production only (for Docker)
  poetry add flask       → add dependency
  poetry run pytest      → run inside virtualenv
  poetry build           → build .whl package
  poetry.lock            → always commit this to git

Versioning
  SemVer: MAJOR.MINOR.PATCH
  MAJOR → breaking change / MINOR → new feature / PATCH → bug fix
  Tag artifacts with version + git SHA for full traceability
  Never deploy "latest" tag to production

Dockerfile Best Practices
  Multi-stage builds    → small, lean production image
  Copy deps first       → layer caching speeds up rebuilds
  Run as non-root       → security requirement
  Use slim/distroless   → minimal attack surface

Makefile
  Standardizes commands across dev, CI, and onboarding
  make install / make test / make lint / make build / make push
  CI pipeline calls make targets — same commands locally and in CI

Reference Project Structure
  app/          → Flask application code
  tests/        → pytest test suite
  Dockerfile    → multi-stage production image
  Makefile      → standard commands for all workflows
  pyproject.toml + poetry.lock → dependency declaration and lock
```


