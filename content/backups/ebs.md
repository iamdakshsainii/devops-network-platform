# EBS — Elastic Block Store

---

## 1. What is EBS? — The Problem First

You launched an EC2 instance. You installed nginx, configured your app, stored some data. Everything is running fine.

Then one day your instance crashes. You restart it — and **everything is gone**. The data, the logs, the files — all wiped. Because by default, EC2's internal storage is temporary.

**That's the problem EBS solves.**

EBS (Elastic Block Store) is a **network drive** that attaches to your EC2 instance and **keeps your data safe** even if the instance stops, restarts, or terminates. Think of it as a hard drive that lives in AWS's network — not physically inside your server.

```
Without EBS:
  EC2 crashes → data gone forever

With EBS:
  EC2 crashes → EBS volume still intact
  Attach to new EC2 → data is back
```

---

## 2. How EBS Actually Works

EBS is **not a physical disk inside your server**. It connects over the network. This means:

- There can be a small amount of latency (it's a network call, not a direct disk read)
- You can **detach it from one EC2 and attach it to another** — like unplugging a USB drive
- Your data **persists** even after the EC2 is terminated

### The Rules You Must Know

- **One EBS volume → one EC2 instance at a time.** You cannot share the same EBS between two running instances simultaneously (at the basic level).
- **EBS is locked to one Availability Zone.** A volume created in `ap-south-1a` cannot attach to an EC2 in `ap-south-1b`. They are in different physical data centers.
- **You pay for provisioned capacity** — if you create a 100GB volume and use 10GB, you still pay for 100GB.
- You can **increase the capacity** later without downtime.

---

## 3. EBS in a Real Scenario

Imagine you are a DevOps engineer at a startup. Your backend team has a Node.js app running on EC2. The app writes user-uploaded files to the local disk. One day you need to upgrade the instance type — maybe the team needs more CPU.

**Problem**: If you terminate the old instance and launch a new one, all uploaded files are gone.

**Solution**: Those files were on an EBS volume. You detach it from the old instance, launch a new EC2 with a bigger instance type, and attach the same EBS volume. The files are all there.

```
Old EC2 (t3.medium) ──detach──► EBS Volume (files intact)
                                      │
New EC2 (t3.large) ◄──attach──────────┘
Files still there. Zero data loss.
```

---

## 4. Delete on Termination

**The Problem**: A developer on your team accidentally terminates a production EC2 instance. The instance is gone — but what about the EBS volumes attached to it?

By default AWS behaves like this:

| Volume | Default behaviour on termination |
|--------|----------------------------------|
| **Root volume** (the OS disk) | **Deleted** automatically |
| **Any other attached volume** | **Kept** — not deleted |

So your OS is gone, but your data volumes are safe by default. This is usually what you want.

**But there's a use case to change it**: If your root volume had important config files or logs that you want to preserve after the instance terminates, you can turn OFF "Delete on Termination" for the root volume. The volume will survive even after the instance is gone — you can attach it to another EC2 and recover your data.

You control this from the AWS Console or CLI when launching an instance.

---

## 5. EBS Snapshots — Backup and Migration

**The Problem**: EBS volumes are locked to one AZ. If your whole AZ goes down, your volume is inaccessible. Also — what if you want to copy data to a different region, or just keep a backup from last night in case someone deletes important files?

**The Solution**: EBS Snapshots.

A snapshot is a **point-in-time backup** of your entire EBS volume. AWS stores it in S3 (managed by AWS — you don't interact with S3 directly here).

- You don't need to detach the volume to snapshot it, but it's recommended for consistency
- Snapshots are **incremental** — first snapshot copies everything, next snapshots only copy what changed

```
Scenario: Daksh is a DevOps engineer. His database EC2 runs in ap-south-1a.
His manager asks him to also run the same setup in ap-south-1b for redundancy.

Step 1: Take a snapshot of the EBS volume in ap-south-1a
Step 2: Restore from that snapshot as a new EBS volume in ap-south-1b
Step 3: Attach to a new EC2 in ap-south-1b

EBS (ap-south-1a)
    │
    ▼ snapshot
EBS Snapshot (stored in S3, region-level)
    │
    ├──► Restore in ap-south-1a  (same AZ, disaster recovery)
    └──► Restore in ap-south-1b  (different AZ — this is how you migrate)
         or even copy to ap-southeast-1 (different region entirely)
```

**This is the only way to move an EBS volume across AZs or Regions.**

---

### Snapshot Features Worth Knowing

**EBS Snapshot Archive**

**Problem**: Your company policy says you must keep database backups for 1 year for compliance, but old snapshots cost money.

**Solution**: Move old snapshots to the Archive tier. It is **75% cheaper** than normal snapshot storage. The catch is that restoring from archive takes **24 to 72 hours** — so only use this for snapshots you rarely (or never) need to restore quickly. Good for compliance backups that sit there "just in case."

---

**Recycle Bin for EBS Snapshots**

**Problem**: A junior dev on your team accidentally deletes a critical EBS snapshot. It's gone. You have no backup of the backup.

**Solution**: Enable the Recycle Bin. When a snapshot is deleted, it goes into the bin instead of being permanently erased. You set a retention window — anywhere from 1 day to 1 year. During that window, you can recover it. After the window, it's gone for real.

---

**Fast Snapshot Restore (FSR)**

**Problem**: You restore a snapshot to a new EBS volume and immediately start using it. But for the first few minutes, disk reads are painfully slow. This is because AWS lazily loads the data — blocks are fetched from S3 on demand as you read them, not all at once upfront.

This is a real issue in production. Imagine restoring after an outage and your app is crawling because the volume isn't fully loaded yet.

**Solution**: Fast Snapshot Restore (FSR). It forces the full volume to be initialized immediately, so there is **zero latency from the very first read**. The downside — it costs extra. Use it when you cannot afford slow startup after a restore — like a production database recovery.

---

## 6. AMI — Amazon Machine Image

### The Problem

Your company is growing. You need to launch 10 new EC2 instances for your backend team. Each one needs:
- Amazon Linux 2
- Docker installed
- nginx installed and configured
- Your app's environment variables set
- CloudWatch agent installed

You could write a big User Data script that does all of this on every boot — but that takes 5-10 minutes per instance. And if something goes wrong mid-script, the instance boots in a broken state.

**There is a better way.**

### What is an AMI?

AMI stands for **Amazon Machine Image**. It is a **pre-packaged snapshot of an EC2 instance** — OS, software, config, everything baked in. When you launch from an AMI, your instance starts up **already configured**. No waiting for scripts. No chance of a broken boot.

```
Problem: "I need 10 identical servers, each taking 10 min to configure"

Solution with AMI:
  Configure ONE instance perfectly
  → Create AMI from it
  → Launch 10 instances from that AMI
  → All 10 are ready in seconds, identical, no scripts needed
```

---

### Types of AMIs

| Type | Who creates it | Example |
|------|---------------|---------|
| **Public AMI** | AWS | Amazon Linux 2, Ubuntu 22.04, Windows Server |
| **Your own custom AMI** | You | Your app pre-installed, your config baked in |
| **Marketplace AMI** | Third-party vendors | Pre-hardened security images, licensed software |

---

### How to Build Your Own AMI — Step by Step

```
Step 1: Launch an EC2 using a base AMI (Amazon Linux 2)
           │
Step 2: SSH in and customize it
         - Install Docker, nginx, your app dependencies
         - Configure environment, agents, settings
           │
Step 3: Stop the instance (ensures filesystem is in a consistent state)
           │
Step 4: Create AMI
         - AWS automatically takes EBS snapshots of all attached volumes
         - Those snapshots become the AMI's backing storage
           │
Step 5: Launch as many instances as you need from this AMI
         - Each new instance starts with everything already installed
         - Fast, consistent, repeatable
```

### AMIs are Region-Specific

An AMI you create in `ap-south-1` only exists in `ap-south-1`. If your team in Singapore needs the same image, you copy the AMI to `ap-southeast-1`. AWS copies the underlying EBS snapshots too.

---

## 7. EC2 Instance Store

### The Problem

You are running a video processing service. Each EC2 takes a raw video file, processes it (encode, resize, watermark), and outputs the result. During processing, it reads and writes massive temporary files — gigabytes of intermediate data.

EBS can handle this but **EBS is a network drive**. For very high-speed disk operations, that network hop becomes a bottleneck.

**You need a physical disk directly inside the server.**

### What is EC2 Instance Store?

EC2 Instance Store is a **physical hard drive directly attached to the physical server** that your EC2 runs on. No network involved — it is as fast as a disk can get.

| Feature | EBS | EC2 Instance Store |
|---------|-----|--------------------|
| Type | Network drive | Physical disk |
| Performance | Good | Very high (much faster) |
| Data survives stop? | Yes | No — wiped immediately |
| Data survives terminate? | Configurable | No — always gone |
| Use for | Persistent data | Temp data, cache, buffer |
| Backups | Snapshots | You manage — no built-in backup |

### The Critical Catch — It is Ephemeral

The moment your EC2 instance **stops or terminates**, everything on the Instance Store is **permanently gone**. AWS does not back it up. There is no snapshot option. There is no recycle bin. Gone.

This is called **ephemeral storage**.

```
Scenario: A developer stores application logs on Instance Store
          thinking it is just fast disk storage.
          Instance gets stopped for maintenance.
          All logs: gone. No recovery possible.

Correct use:
  Store logs on EBS (persists)
  Use Instance Store only for temp processing files
  that you don't need after the job is done
```

**Use Instance Store for**: video/image processing temp files, database buffer pools, in-memory cache overflow, any data that is recreatable and only needed during the current job.

**Never use Instance Store for**: application logs, user data, database files, anything you cannot afford to lose.

---

## Quick Reference

```
EBS — Elastic Block Store
  Problem it solves : Data loss when EC2 stops or terminates
  What it is        : Network drive attached to EC2
  Key rules         : One volume per EC2 / Locked to one AZ / Pay for provisioned size
  Migration         : Snapshot → restore in new AZ or Region

EBS Snapshots
  Problem it solves : Backup + cross-AZ/Region migration
  Archive           : 75% cheaper, 24-72hr restore — for compliance backups
  Recycle Bin       : Recover accidentally deleted snapshots (1 day–1 year window)
  FSR               : Zero-latency restore — use when speed matters after restore

AMI — Amazon Machine Image
  Problem it solves : Slow, inconsistent EC2 setup at launch
  What it is        : Pre-packaged EC2 image (OS + software + config)
  Types             : Public (AWS) / Custom (yours) / Marketplace (third-party)
  Key point         : Region-specific. Copy to move across regions.
  Workflow          : Launch → Customize → Stop → Create AMI → Launch many

EC2 Instance Store
  Problem it solves : EBS too slow for very high I/O workloads
  What it is        : Physical disk inside the server — no network
  The big catch     : Ephemeral — data gone on stop/terminate
  Use for           : Temp files, cache, processing buffers
  Never use for     : Anything you need to keep
```