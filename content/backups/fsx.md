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