# Kubernetes

A complete guide to Kubernetes — from understanding why it exists, to architecture, core components, workloads, networking, storage, scaling, security, and production-grade practices.

---

## 1. What is Kubernetes and Why It Exists


Before Kubernetes, Docker solved the packaging problem. You could put your app and all its dependencies into a container and run it anywhere. That worked fine for a single app on one machine.

But real production systems are different. A mid-sized company might run 50 to 200 containers at once — frontend, backend API, authentication service, database, cache, message queue, background workers. Each needs to run reliably, scale independently, and recover automatically from failures.

Docker alone cannot answer: What happens when a container crashes at 3 AM? How do you roll out an update to 20 containers with zero downtime? How do you automatically add more containers when traffic spikes? How do you spread containers across 10 servers efficiently?

Kubernetes answers all of these.

#### What Kubernetes Actually Does

Kubernetes is an open-source **container orchestration platform**. Orchestration means it manages a group of containers as a coordinated system — automatically handling the things you would otherwise do manually.

```
Without Kubernetes (manual):
  Container crashes → you get paged at 3 AM → manually restart it
  Traffic spike     → you notice slowness → manually add containers
  New version       → manually stop old containers → manually start new ones
  Server dies       → containers on it are gone → manually move them

With Kubernetes (automated):
  Container crashes → Kubernetes detects within seconds → restarts it
  Traffic spike     → HPA detects high CPU → adds containers automatically
  New version       → rolling update with zero downtime → automated
  Server dies       → Kubernetes reschedules pods to healthy nodes
```

#### A Brief History

Kubernetes was originally built internally at Google — they called it Borg — and they used it to manage billions of containers per week. In 2014 Google open-sourced it and donated it to the CNCF (Cloud Native Computing Foundation). It is now the most widely adopted container orchestration system in the world.

The name Kubernetes comes from Greek, meaning "helmsman" or "pilot." The abbreviation **K8s** comes from counting the 8 letters between K and s.

#### Microservices — Why Orchestration Became Necessary

```
Old way (Monolith):
  One big application → one server → easy to manage
  But: one bug can crash everything
       scaling means scaling the whole thing

Modern way (Microservices):
  User Service    → runs in containers
  Order Service   → runs in containers
  Payment Service → runs in containers
  Notification    → runs in containers
  Each scales independently, deploys independently

Problem: 50 containers across 10 servers — impossible to manage manually
Solution: Kubernetes manages all of it automatically
```

---



## 2. Kubernetes Architecture


When you set up Kubernetes you get a **cluster** — a group of machines working together. These machines are called **nodes**. There are two types: the **Control Plane** (the brain) and **Worker Nodes** (the hands).

```
┌──────────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    CONTROL PLANE (MASTER)                      │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────┐  ┌───────────┐  ┌─────────────┐  │  │
│  │  │  API Server  │  │ etcd │  │ Scheduler │  │  Controller │  │  │
│  │  │ (front door) │  │(DB)  │  │ (assigns) │  │  Manager    │  │  │
│  │  └──────────────┘  └──────┘  └───────────┘  └─────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                               │                                      │
│         ┌─────────────────────┼──────────────────────┐              │
│         ↓                     ↓                      ↓              │
│  ┌─────────────┐      ┌─────────────┐       ┌─────────────┐         │
│  │ WORKER NODE │      │ WORKER NODE │       │ WORKER NODE │         │
│  │  ┌───────┐  │      │  ┌───────┐  │       │  ┌───────┐  │         │
│  │  │kubelet│  │      │  │kubelet│  │       │  │kubelet│  │         │
│  │  │  +    │  │      │  │  +    │  │       │  │  +    │  │         │
│  │  │proxy  │  │      │  │proxy  │  │       │  │proxy  │  │         │
│  │  │[pod]  │  │      │  │[pod]  │  │       │  │[pod]  │  │         │
│  │  │[pod]  │  │      │  │[pod]  │  │       │  │[pod]  │  │         │
│  │  └───────┘  │      │  └───────┘  │       │  └───────┘  │         │
│  └─────────────┘      └─────────────┘       └─────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
```

### Control Plane Components

#### API Server

The API Server is the single entry point into the cluster. Every interaction — whether from `kubectl`, a CI/CD pipeline, or internal Kubernetes components — goes through the API Server. It validates requests, authenticates them, and writes the desired state to etcd.

```
kubectl apply -f deployment.yaml
    ↓
API Server receives the request
API Server validates the YAML
API Server authenticates you (RBAC check)
API Server writes the desired state to etcd
    ↓
Other components react to the change
```

#### etcd

etcd is a key-value database that stores the entire state of the cluster — every resource, every config, every status. It is the single source of truth. If etcd dies and you have no backup, your cluster state is gone. In production you always run etcd with high availability (multiple replicas).

#### Scheduler

When a new Pod needs to be created, the Scheduler decides which Worker Node it should run on. It looks at:
- How much CPU and memory the pod needs (requests)
- How much is available on each node
- Any constraints like node affinity or taints

It assigns the pod to the best-fit node and writes this assignment back to the API Server.

#### Controller Manager

The Controller Manager runs multiple controllers in loops. Each controller watches the actual state of the cluster and compares it to the desired state. When they differ, the controller acts to fix it.

```
Deployment Controller:
  Desired: 3 replicas of my-app
  Actual:  2 replicas running (one crashed)
  Action:  create 1 new pod

Node Controller:
  Desired: all nodes healthy
  Actual:  Node 2 stopped responding
  Action:  mark pods on Node 2 for rescheduling
```

### Worker Node Components

#### kubelet

The kubelet is an agent that runs on every worker node. It receives pod specs from the API Server and ensures those pods are running and healthy. It reports pod status back to the control plane. If a container crashes, kubelet restarts it.

#### kube-proxy

kube-proxy runs on every node and maintains network rules. It is what makes Services work — when traffic arrives for a Service, kube-proxy knows which pod IPs to forward it to, and load balances across them.

#### Container Runtime

The actual software that runs containers. Kubernetes supports containerd (most common), CRI-O, and others. Docker used to be the runtime but was removed in Kubernetes 1.24 — containerd is now the default.

---



## 3. Node and Pod


### Node

A Node is a physical or virtual machine that is part of the Kubernetes cluster. Worker Nodes are the machines where your application containers actually run.

Each node has:
- A kubelet (talks to the control plane)
- A container runtime (runs the containers)
- kube-proxy (handles network rules)
- System resources: CPU, memory, disk

In cloud environments (EKS, GKE, AKS), nodes are EC2 instances or VMs managed by the cloud provider. You set how many nodes you want and what size.

### Pod

#### What a Pod Is

A Pod is the smallest deployable unit in Kubernetes. You do not deploy containers directly — you deploy Pods. A Pod wraps one or more containers and gives them a shared network and storage environment.

Every container in Kubernetes runs inside a Pod. The most common case is one container per pod. But sometimes you use the **sidecar pattern** — two containers in the same pod that work together.

```
Pod: my-app-pod
  ┌─────────────────────────────────────────────┐
  │  Container: my-app                           │
  │  Container: log-collector (sidecar)          │
  │                                             │
  │  Shared network: both containers use        │
  │    the same IP, can talk via localhost       │
  │  Shared storage: can mount the same volumes  │
  └─────────────────────────────────────────────┘
```

#### Pods Are Ephemeral

Pods are not permanent. They are created, they die, they are replaced. When a pod restarts, it gets a new IP address. This is why you never hardcode a pod's IP — you use a Service instead.

```
Pod lifecycle:
  Pending   → Scheduled to a node, container image being pulled
  Running   → Container(s) started and running
  Succeeded → All containers exited with status 0 (for Jobs)
  Failed    → Container exited with non-zero status
  Unknown   → Node communication lost
```

#### Pod YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: my-app
spec:
  containers:
    - name: my-app
      image: my-app:1.0.0
      ports:
        - containerPort: 3000
      resources:
        requests:
          cpu: "250m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "256Mi"
```

#### Essential kubectl Commands for Pods

```bash
kubectl get pods                          # list all pods in current namespace
kubectl get pods -A                       # list pods in all namespaces
kubectl get pods -o wide                  # show which node each pod is on
kubectl describe pod my-app-pod           # detailed info + events (debug here first)
kubectl logs my-app-pod                   # logs from the container
kubectl logs my-app-pod --previous        # logs from a crashed/previous container
kubectl exec -it my-app-pod -- sh         # shell into the running container
kubectl delete pod my-app-pod             # delete the pod (controller recreates it)
```

---



## 4. Service and Ingress


### Service

#### The Problem With Pod IPs

Your backend app runs in 3 pods. Your frontend needs to call the backend API. You could hardcode one pod's IP — but pods restart all the time and get new IPs. You cannot keep up with changing IPs.

A Service gives you a **stable, permanent endpoint** that routes traffic to whichever pods are currently healthy.

```
Without Service:
  Frontend → hardcodes 10.0.0.5 (Pod A IP)
  Pod A crashes → gets new IP 10.0.0.8
  Frontend → still calling 10.0.0.5 → connection refused

With Service:
  Frontend → calls my-backend-svc (stable DNS name)
  Service → routes to whatever pods match its selector
  Pod A restarts with new IP → Service automatically updates
  Frontend → always works
```

#### How Services Find Pods — Labels and Selectors

Services do not use pod names or IPs. They use **labels**. You label your pods with key-value pairs, and the Service uses a selector to find all pods with matching labels.

```yaml
# Pod has a label
metadata:
  labels:
    app: my-backend

# Service selects pods with that label
spec:
  selector:
    app: my-backend   # routes to all pods with this label
```

#### Service Types

```
ClusterIP (default)
  Accessible only inside the cluster
  Other pods and services in the cluster reach it
  Use for: internal service-to-service communication

NodePort
  Opens a port (30000-32767) on every Node's IP
  Accessible from outside: NodeIP:NodePort
  Use for: development, testing, simple external access
  Not for production (port range is ugly, no load balancing)

LoadBalancer
  Provisions a cloud load balancer (AWS ALB, GCP LB, Azure LB)
  Gets an external IP automatically
  Use for: production external access to a single service
  Cost: each LoadBalancer service = one cloud load balancer ($$$)

ExternalName
  Maps a Service to an external DNS name
  Use for: accessing external services from inside the cluster
```

#### Service YAML

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-backend-svc
spec:
  selector:
    app: my-backend         # finds pods with this label
  ports:
    - protocol: TCP
      port: 80              # port the Service exposes
      targetPort: 3000      # port the container listens on
  type: ClusterIP
```

### Ingress

#### The LoadBalancer Cost Problem

You have 8 microservices. Each has a LoadBalancer Service. That means 8 cloud load balancers running 24/7. At ~$20/month each, that's $160/month just for load balancers — and that's a small deployment.

Ingress solves this by acting as a **single smart entry point**. One cloud load balancer, one external IP, one SSL certificate — routes to all your services based on URL path or hostname.

```
Without Ingress:
  users-svc    → LoadBalancer → external IP: 1.2.3.4
  orders-svc   → LoadBalancer → external IP: 1.2.3.5
  products-svc → LoadBalancer → external IP: 1.2.3.6
  8 services = 8 load balancers = expensive

With Ingress:
  One LoadBalancer → external IP: 1.2.3.4
  Ingress routes based on path:
    myapp.com/users    → users-svc
    myapp.com/orders   → orders-svc
    myapp.com/products → products-svc
  8 services = 1 load balancer = cheap
```

#### Ingress Controller

An Ingress resource by itself does nothing. You need an **Ingress Controller** — a pod that reads your Ingress rules and actually implements the routing. The most common is **nginx-ingress-controller**.

```bash
# Install nginx ingress controller via Helm
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

#### Ingress YAML

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: users-svc
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders-svc
                port:
                  number: 80
  tls:
    - hosts:
        - myapp.com
      secretName: myapp-tls-secret     # SSL cert stored as K8s Secret
```

---



## 5. ConfigMap and Secret


#### The Hardcoding Problem

A developer hardcodes the database URL in the Docker image: `DB_HOST=prod-db.company.com`. Now you need to deploy the same app to staging with a different database. You have to rebuild the entire image just to change one URL. And when the database moves, you rebuild again.

Worse — another developer hardcodes the database password in the image. The image is pushed to Docker Hub. Everyone with access to Docker Hub now has the database password.

ConfigMaps and Secrets decouple configuration from your container image.

### ConfigMap

ConfigMap stores **non-sensitive** configuration as key-value pairs. The application reads these at runtime — no rebuild needed when config changes.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DB_HOST: "postgres-svc"
  DB_PORT: "5432"
  APP_ENV: "production"
  LOG_LEVEL: "info"
```

#### Injecting ConfigMap into a Pod

```yaml
# Method 1: As environment variables (all keys at once)
envFrom:
  - configMapRef:
      name: app-config

# Method 2: Specific keys as env vars
env:
  - name: DATABASE_HOST
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DB_HOST

# Method 3: Mount as files in a volume
volumes:
  - name: config-vol
    configMap:
      name: app-config
volumeMounts:
  - name: config-vol
    mountPath: /etc/config
# App reads /etc/config/DB_HOST as a file
```

### Secret

Secret stores **sensitive data** — passwords, API keys, tokens. The data is base64-encoded (not encrypted by default — enable etcd encryption for real security in production).

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  DB_PASSWORD: cGFzc3dvcmQxMjM=    # base64 of "password123"
  API_KEY: c2VjcmV0a2V5           # base64 of "secretkey"
```

```bash
# Create a secret from the CLI (handles base64 encoding for you)
kubectl create secret generic db-secret \
  --from-literal=DB_PASSWORD=password123 \
  --from-literal=API_KEY=secretkey
```

#### Injecting Secrets

Secrets are injected the same way as ConfigMaps — as environment variables or mounted as files. Mounting as files is more secure (not visible in `docker inspect` or process listings).

```yaml
# As env var
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: DB_PASSWORD

# As mounted file (more secure)
volumes:
  - name: secret-vol
    secret:
      secretName: db-secret
volumeMounts:
  - name: secret-vol
    mountPath: /etc/secrets
    readOnly: true
```

#### ConfigMap vs Secret

| | ConfigMap | Secret |
|---|---|---|
| Use for | Non-sensitive config | Passwords, keys, tokens |
| Encoding | Plain text | base64 |
| Encrypted | No | No (unless etcd encryption enabled) |
| Visible in pod env | Yes | Yes (use mounted files for better security) |

---



## 6. Volume — Persistent Storage


#### The Stateless Container Problem

Your app writes log files, user uploads, or database data to the container's local filesystem. The container crashes and Kubernetes restarts it. New container — fresh filesystem — all that data is gone.

For stateless apps (web servers, APIs) this is fine and even desirable. But for databases, file storage, anything that needs to survive restarts — you need persistent storage.

### Volume Types

#### emptyDir — Temporary Shared Storage

Created when a pod starts, destroyed when the pod is deleted. Shared between all containers in the same pod. Good for temp files, scratch space, sharing data between a main container and a sidecar.

```yaml
volumes:
  - name: shared-data
    emptyDir: {}
containers:
  - name: app
    volumeMounts:
      - name: shared-data
        mountPath: /tmp/data
  - name: log-collector
    volumeMounts:
      - name: shared-data
        mountPath: /var/log/app
```

### Persistent Volume (PV) and Persistent Volume Claim (PVC)

For data that must survive pod restarts and deletions, you need **PersistentVolumes**.

```
PersistentVolume (PV)
  Actual storage resource in the cluster
  Created by a cluster admin
  Like a "storage offer" — here is 50GB of SSD available

PersistentVolumeClaim (PVC)
  A request for storage by a pod
  Like a "storage request" — I need 10GB of SSD
  Kubernetes binds a PVC to a suitable PV

Pod → uses PVC → bound to PV → actual disk
```

```yaml
# PersistentVolumeClaim — what the pod requests
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce          # one node can read/write at a time
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp3      # which type of storage to use

---
# In the pod spec — use the PVC
volumes:
  - name: postgres-storage
    persistentVolumeClaim:
      claimName: postgres-pvc
volumeMounts:
  - name: postgres-storage
    mountPath: /var/lib/postgresql/data
```

### StorageClass — Dynamic Provisioning

With static PVs, an admin has to manually create storage before a pod can use it. **StorageClass** enables **dynamic provisioning** — Kubernetes automatically creates the storage when a PVC is created.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com      # AWS EBS CSI driver
parameters:
  type: gp3
reclaimPolicy: Delete             # delete EBS volume when PVC is deleted
volumeBindingMode: WaitForFirstConsumer
```

#### Access Modes

| Mode | Meaning | Use Case |
|---|---|---|
| ReadWriteOnce (RWO) | One node reads and writes | Databases (PostgreSQL, MySQL) |
| ReadOnlyMany (ROX) | Many nodes read, none write | Config files, static assets |
| ReadWriteMany (RWX) | Many nodes read and write | Shared file storage (NFS, EFS) |

---



## 7. Deployment and StatefulSet


### Deployment

#### Why You Never Create Pods Directly

If you create a pod directly and it crashes, it stays dead — nothing restarts it. If you want 3 copies of your app, you manually create 3 pods. If a node dies and takes your pods with it, they are gone.

A **Deployment** manages pods for you. You tell it "I want 3 replicas of this app" and it makes sure 3 are always running — creating, restarting, and replacing pods automatically.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "250m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

#### Rolling Updates — Zero Downtime Deployments

When you update the image in a Deployment, Kubernetes performs a **rolling update** by default. It gradually replaces old pods with new ones — never taking down more than a configured number at once.

```
Rolling update: my-app:1.0 → my-app:2.0

Before:  [pod v1.0] [pod v1.0] [pod v1.0]   (3 old)

Step 1:  [pod v1.0] [pod v1.0] [pod v2.0]   (create 1 new, still serving traffic)
Step 2:  [pod v1.0] [pod v2.0] [pod v2.0]   (remove 1 old, create 1 new)
Step 3:  [pod v2.0] [pod v2.0] [pod v2.0]   (all new, done)

At no point is the app down — old pods serve traffic while new ones come up
```

```bash
# Update the image (triggers rolling update)
kubectl set image deployment/my-app my-app=my-app:2.0

# Check rollout status
kubectl rollout status deployment/my-app

# View rollout history
kubectl rollout history deployment/my-app

# Roll back to previous version
kubectl rollout undo deployment/my-app

# Roll back to a specific revision
kubectl rollout undo deployment/my-app --to-revision=2
```

#### Deployment vs ReplicaSet

A Deployment manages ReplicaSets. When you update a Deployment, it creates a new ReplicaSet for the new version while keeping the old one around (for rollback). You almost never create ReplicaSets directly — always use a Deployment.

```
Deployment (my-app)
  └── ReplicaSet v1 (my-app:1.0) → scaled to 0 after update
  └── ReplicaSet v2 (my-app:2.0) → scaled to 3 (current)
```

### StatefulSet

#### When Deployment Is Not Enough

Deployments are great for stateless apps. But databases are different. If you run a PostgreSQL deployment with 3 replicas, each pod gets a random name (my-db-abc12, my-db-xyz34), a random IP, and potentially a different disk.

A database cluster needs: stable pod names, stable network identity, and each pod to have its own dedicated persistent storage. Deployments cannot provide this.

**StatefulSet** manages stateful applications where each pod has a unique, stable identity.

```
StatefulSet: postgres
  postgres-0  → always first, stable name, dedicated PVC
  postgres-1  → always second, stable name, dedicated PVC
  postgres-2  → always third, stable name, dedicated PVC

  Pods start in order: 0 → 1 → 2
  Pods stop in reverse: 2 → 1 → 0
  postgres-0 is always the primary (master)
  postgres-1 and postgres-2 are always replicas
```

#### Deployment vs StatefulSet

| | Deployment | StatefulSet |
|---|---|---|
| Pod names | Random (my-app-abc12) | Stable ordered (my-app-0, my-app-1) |
| Pod identity | Interchangeable | Each pod has unique identity |
| Storage | Shared or none | Each pod gets its own PVC |
| Startup order | All at once | Ordered (0 → 1 → 2) |
| Use for | Stateless apps (APIs, web) | Databases, queues, clustered apps |

### DaemonSet

A DaemonSet ensures **one pod runs on every node** in the cluster. When a new node is added, the DaemonSet pod is automatically scheduled on it. When a node is removed, the pod is cleaned up.

Use for: log collectors (Fluentd, Promtail), monitoring agents (Node Exporter), security scanners — tools that need to run on every machine.

---



## 8. Kubernetes Configuration


### Namespaces

#### The Multi-Team Problem

Your company has 4 teams — frontend, backend, data, and devops — all sharing one Kubernetes cluster. Without isolation, any team can accidentally delete another team's pods, consume all cluster resources, or read each other's secrets.

A **Namespace** divides one physical cluster into multiple virtual clusters. Each namespace is isolated — its own pods, services, secrets, and resource quotas.

```
cluster
├── namespace: frontend-team
│     pods, services, secrets for frontend team
├── namespace: backend-team
│     pods, services, secrets for backend team
├── namespace: staging
│     test environment for all teams
└── namespace: production
      production workloads
```

#### Default Namespaces

```
default          → where your resources go if you don't specify a namespace
kube-system      → Kubernetes system components (API server, scheduler, etc.)
kube-public      → publicly readable, used for cluster info
kube-node-lease  → node heartbeat tracking
```

```bash
# Create a namespace
kubectl create namespace backend-team

# Work in a specific namespace
kubectl get pods -n backend-team

# Set default namespace for your context
kubectl config set-context --current --namespace=backend-team

# List all namespaces
kubectl get namespaces
```

#### Resource Quotas

Prevent one team from consuming all cluster resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: backend-team-quota
  namespace: backend-team
spec:
  hard:
    pods: "20"
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

### Resource Requests and Limits

#### Why Resources Must Be Defined

Without resource definitions, a pod with a memory leak can consume all memory on a node and crash every other pod running there. This is called the "noisy neighbor" problem.

```
requests:
  cpu: "250m"       → this pod needs 0.25 CPU core to function
  memory: "128Mi"   → this pod needs 128MB RAM to function
  
  Kubernetes uses requests for SCHEDULING decisions.
  Scheduler only places the pod on a node that has this much available.

limits:
  cpu: "500m"       → this pod can never use more than 0.5 CPU core
  memory: "256Mi"   → if this pod tries to use more than 256MB, it is killed (OOMKilled)
  
  Kubernetes uses limits for ENFORCEMENT.
```

```yaml
resources:
  requests:
    cpu: "250m"        # 250 millicores = 0.25 CPU
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

### Health Probes

#### Why Probes Exist

A pod can be "running" but completely broken. The app inside started but immediately panicked. Or it started fine but after 10 minutes a memory leak makes it return 500 errors on every request. Without probes, Kubernetes keeps sending traffic to this broken pod.

#### Liveness Probe

"Is this container still alive? Should it be restarted?"

If the liveness probe fails, Kubernetes restarts the container. Use for detecting deadlocks, infinite loops, or crashed internal state.

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30    # wait 30s after start before first check
  periodSeconds: 10          # check every 10 seconds
  failureThreshold: 3        # restart after 3 consecutive failures
```

#### Readiness Probe

"Is this container ready to receive traffic?"

If the readiness probe fails, the pod is removed from the Service endpoints — it stops receiving traffic. The pod keeps running. Use for: app still loading initial data, warming up cache, waiting for dependencies.

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

#### Startup Probe

"Has this app finished starting up?"

For slow-starting applications. While the startup probe is running, liveness and readiness probes are disabled. Prevents the liveness probe from killing a slow-starting pod before it finishes initializing.

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  failureThreshold: 30       # allow up to 30 × 10s = 5 minutes to start
  periodSeconds: 10
```

| Probe | Fails → | Use for |
|---|---|---|
| Liveness | Container restarted | Deadlocks, crashed state |
| Readiness | Removed from Service (no traffic) | Slow startup, dependencies |
| Startup | Nothing (liveness/readiness paused) | Very slow-starting apps |

---



## 9. Minikube and kubectl — Local Setup


#### The Problem of Running Kubernetes Locally

Kubernetes needs a cluster — multiple machines, networking between them, a control plane. You cannot run a real production cluster on your laptop. But you need a way to develop and test locally before deploying to a real cluster.

**Minikube** solves this by running a single-node Kubernetes cluster inside a VM or container on your local machine. It includes both the control plane and one worker node in one machine.

### Installing Minikube and kubectl

```bash
# macOS
brew install minikube kubectl

# Linux
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### Starting Minikube

```bash
# Start a local cluster (uses Docker driver by default)
minikube start

# Start with specific resources
minikube start --cpus=4 --memory=8g

# Check cluster status
minikube status

# Open the Kubernetes dashboard
minikube dashboard

# Stop the cluster
minikube stop

# Delete the cluster completely
minikube delete
```

### Essential kubectl Commands

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes
kubectl get nodes -o wide

# Namespace management
kubectl get namespaces
kubectl create namespace my-app
kubectl config set-context --current --namespace=my-app

# Apply/delete resources from YAML
kubectl apply -f deployment.yaml
kubectl apply -f ./k8s/           # apply all YAML files in a directory
kubectl delete -f deployment.yaml

# Inspect resources
kubectl get all                    # pods, services, deployments in current namespace
kubectl get pods
kubectl get services
kubectl get deployments
kubectl describe pod my-pod        # full details + events (debug here first)
kubectl get pod my-pod -o yaml     # full YAML representation of the resource

# Debugging
kubectl logs my-pod
kubectl logs my-pod -f             # follow logs in real time
kubectl logs my-pod --previous     # logs from previous crashed container
kubectl exec -it my-pod -- sh      # shell into the container
kubectl port-forward svc/my-svc 8080:80   # forward local 8080 to service port 80

# Scaling
kubectl scale deployment my-app --replicas=5

# Rolling updates
kubectl set image deployment/my-app my-app=my-app:2.0
kubectl rollout status deployment/my-app
kubectl rollout undo deployment/my-app
```

### kubectl Context — Managing Multiple Clusters

```bash
# See all configured clusters
kubectl config get-contexts

# Switch between clusters
kubectl config use-context my-eks-cluster
kubectl config use-context minikube

# See current context
kubectl config current-context
```

---



## 10. Complete Demo — Deploy WebApp with MongoDB


This section walks through deploying a complete application to Kubernetes — a web app connected to a MongoDB database. This is exactly the pattern used in production.

### Architecture

```
External Traffic
      ↓
 Ingress / NodePort Service
      ↓
 WebApp Deployment (3 replicas)
      ↓
 MongoDB Service (ClusterIP)
      ↓
 MongoDB StatefulSet (1 pod)
      ↓
 PersistentVolumeClaim → PersistentVolume (disk)
```

### Step 1 — MongoDB Secret

```yaml
# mongodb-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque
data:
  mongo-root-username: YWRtaW4=      # admin
  mongo-root-password: cGFzc3dvcmQ=  # password
```

```bash
kubectl apply -f mongodb-secret.yaml
```

### Step 2 — MongoDB ConfigMap

```yaml
# mongodb-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-configmap
data:
  database_url: mongodb-service
```

### Step 3 — MongoDB Deployment and Service

```yaml
# mongodb.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:6.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: mongo-root-username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: mongo-root-password
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
spec:
  selector:
    app: mongodb
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
  type: ClusterIP          # internal only — webapp accesses it, not the internet
```

### Step 4 — WebApp Deployment and Service

```yaml
# webapp.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
        - name: webapp
          image: nanajanashia/k8s-demo-app:v1.0
          ports:
            - containerPort: 3000
          env:
            - name: USER_NAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: mongo-root-username
            - name: USER_PWD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: mongo-root-password
            - name: DB_URL
              valueFrom:
                configMapKeyRef:
                  name: mongodb-configmap
                  key: database_url
---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
spec:
  selector:
    app: webapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
      nodePort: 30100      # accessible via NodeIP:30100
  type: NodePort
```

### Step 5 — Deploy Everything

```bash
kubectl apply -f mongodb-secret.yaml
kubectl apply -f mongodb-configmap.yaml
kubectl apply -f mongodb.yaml
kubectl apply -f webapp.yaml

# Check everything is running
kubectl get all

# Access the app in minikube
minikube service webapp-service

# Or get the URL manually
minikube ip    # get node IP
# Open browser: http://<minikube-ip>:30100
```

### Debugging the Deployment

```bash
# Check if pods are running
kubectl get pods

# Pod stuck in Pending?
kubectl describe pod <pod-name>    # look at Events section at the bottom

# Pod in CrashLoopBackOff?
kubectl logs <pod-name>            # read the error
kubectl logs <pod-name> --previous # if it crashed and restarted

# Service not routing correctly?
kubectl describe service webapp-service   # check Endpoints section
# Endpoints should show pod IPs — if empty, selector labels don't match

# Shell into a running pod to check environment
kubectl exec -it <pod-name> -- sh
env | grep DB_URL                  # verify env vars are set correctly
```

---



## 11. HPA — Horizontal Pod Autoscaling


#### The Manual Scaling Problem

Traffic to your webapp spikes during lunch hours. You manually run `kubectl scale deployment/webapp --replicas=10`. Traffic drops at night. You forget to scale back down. You are paying for 10 replicas running idle all night.

The Horizontal Pod Autoscaler (HPA) solves this — it watches a metric and automatically adjusts the replica count.

### How HPA Works

```
HPA watches → Metrics Server → collects CPU/memory from pods
                                        ↓
              Current CPU: 80% on average across 3 pods
              Target CPU:  50%
              Formula:     current replicas × (current/target) = 3 × (80/50) = 4.8 → 5 replicas
                                        ↓
              HPA scales Deployment to 5 replicas
                                        ↓
              CPU drops to ~48% → close to target → no further scaling
```

HPA requires the **Metrics Server** to be installed in the cluster.

```bash
# Install metrics server on minikube
minikube addons enable metrics-server

# On a real cluster
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### HPA YAML

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-deployment
  minReplicas: 2          # never go below this
  maxReplicas: 10         # never exceed this
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50    # scale when average CPU across pods > 50%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

```bash
# Create HPA imperatively
kubectl autoscale deployment webapp-deployment \
  --cpu-percent=50 \
  --min=2 \
  --max=10

# Check HPA status
kubectl get hpa
kubectl describe hpa webapp-hpa

# Watch scaling in action
kubectl get hpa -w
```

---



## 12. RBAC — Role Based Access Control


#### The Over-Permission Problem

Your company has two teams using the same cluster — frontend devs and backend devs. Both have full cluster-admin access because nobody set up proper permissions. A frontend dev accidentally deletes the backend database StatefulSet. Production is down. All because everyone had access to everything.

RBAC lets you define exactly who can do what in which namespace.

### How RBAC Works

```
Subject (who)          Verb (what action)        Resource (on what)
──────────────         ──────────────────         ──────────────────
User: alice        →   get, list, watch       →   pods
ServiceAccount: ci →   create, update         →   deployments
Group: devs        →   delete                 →   never (not granted)

The chain:
  Subject → RoleBinding → Role → Rules (verb + resource)
```

### Role and ClusterRole

**Role** — permissions within one namespace only
**ClusterRole** — permissions cluster-wide (all namespaces)

```yaml
# Role: allow reading pods in "production" namespace only
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
```

```yaml
# ClusterRole: allow reading pods in ANY namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
```

### RoleBinding and ClusterRoleBinding

A Role does nothing on its own. A **RoleBinding** connects a Role to a Subject (user, group, or service account).

```yaml
# Bind pod-reader role to user "alice" in production namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: alice-reads-pods
  namespace: production
subjects:
  - kind: User
    name: alice
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# ServiceAccount for CI/CD — can deploy in production namespace
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deploy-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: ci-deploy-sa
    namespace: production
roleRef:
  kind: ClusterRole
  name: edit              # built-in ClusterRole: create/update/delete resources
  apiGroup: rbac.authorization.k8s.io
```

```bash
# Test if a user can do something
kubectl auth can-i delete pods --namespace production --as alice
# Output: no

kubectl auth can-i get pods --namespace production --as alice
# Output: yes
```

### Common Verbs Reference

| Verb | What It Allows |
|---|---|
| get | View a single resource |
| list | View all resources of a type |
| watch | Stream changes to resources |
| create | Create new resources |
| update | Modify existing resources |
| patch | Partially modify resources |
| delete | Delete resources |
| deletecollection | Delete multiple resources |

---



## Full Kubernetes Flow — Code to Production


```
Developer pushes code → Git (main branch)
        ↓
CI pipeline triggers (GitHub Actions / GitLab CI)
  - Build Docker image: my-app:v2.1-abc1234
  - Run tests
  - Push image to registry (ECR / Docker Hub)
        ↓
CD pipeline triggers (Helm / ArgoCD)
  - helm upgrade my-app ./chart --set image.tag=v2.1-abc1234
        ↓
kubectl / Helm → API Server (validates + writes to etcd)
        ↓
Deployment Controller detects change → creates new ReplicaSet (v2.1)
        ↓
Scheduler assigns pods to nodes
        ↓
kubelet pulls image → starts containers
        ↓
Startup Probe → Readiness Probe passes → Pod added to Service
Traffic flows to new pods
        ↓
Old pods gracefully shut down (SIGTERM → drain → SIGKILL)
        ↓
HPA monitors CPU → scales replicas as needed
Prometheus scrapes metrics → Grafana dashboards update
        ↓
SOMETHING GOES WRONG?

  Auto-healing:
    Liveness probe fails → kubelet restarts container
    Pod dies → Deployment Controller creates replacement

  Manual rollback:
    kubectl rollout undo deployment/my-app
    helm rollback my-app 1

  Debug:
    kubectl describe pod <name>       → events and errors
    kubectl logs <name> --previous    → crash logs
    kubectl exec -it <name> -- sh     → shell into container
```

---



## Quick Reference


```
Architecture
  Control Plane → API Server, etcd, Scheduler, Controller Manager
  Worker Node   → kubelet, kube-proxy, container runtime, pods

Core Resources
  Pod           → smallest unit, wraps containers, ephemeral
  Deployment    → manages pods, rolling updates, rollback
  StatefulSet   → stable pod identity + storage (for databases)
  DaemonSet     → one pod per node (log agents, monitoring)
  Service       → stable endpoint for pods (ClusterIP/NodePort/LB)
  Ingress       → single entry point, routes to multiple services
  ConfigMap     → non-sensitive config injected into pods
  Secret        → sensitive data (base64 encoded)
  PVC/PV        → persistent storage that survives pod restarts
  Namespace     → virtual cluster isolation, resource quotas

kubectl Essentials
  apply -f      → create or update from YAML
  get           → list resources
  describe      → detailed info + events (debug here first)
  logs          → container output
  exec -it -- sh → shell into pod
  rollout undo  → roll back deployment
  scale         → change replica count manually

HPA
  Watches CPU/memory → adjusts replica count automatically
  Requires Metrics Server
  Set min + max replicas + target metric

RBAC
  Role          → namespace-scoped permissions
  ClusterRole   → cluster-wide permissions
  RoleBinding   → connects role to user/SA in a namespace
  ServiceAccount → non-human identity for pods/CI pipelines
```