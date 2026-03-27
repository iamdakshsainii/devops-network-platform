# Networking

The first step to understanding networking fundamentals and communication between systems.

---

## 01. Why Networking Matters in DevOps

Most beginners try to skip networking. It feels abstract and full of confusing words. But here is the truth — **almost every real production problem has networking involved somewhere**.

Think about it. When your app can't reach its database — that is a networking problem. When SSH won't connect to your server — networking. When the deployment pipeline can't pull a Docker image — networking. When users see a "502 Bad Gateway" error — networking. If you don't understand networking, you will spend hours debugging problems that should take 5 minutes to fix.

The good news is you do not need to become a network engineer. You just need to understand the fundamentals well enough to know what is happening and which tool to use. That is exactly what this module gives you.


![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634101/uploads/zh4cxvfq4t7qzk1erlux.webp)


### What You Actually Do With Networking as a DevOps Engineer

Here is what real networking work looks like on the job:

```
Setting up a new server:
  → Assign an IP address and hostname
  → Set up SSH key access so you can connect securely
  → Open firewall ports: 80 for HTTP, 443 for HTTPS, 22 for SSH
  → Test everything is reachable with ping and curl

Deploying an application:
  → Configure nginx to forward web traffic to your app
  → Point your domain name to the server IP using DNS
  → Debug why the app cannot talk to the database
  → Check which ports are open: netstat -tulpn

Debugging a live issue at 2am:
  → "Connection refused" → Is the app even running? Wrong port?
  → "Network unreachable" → Routing problem? Wrong subnet?
  → "DNS resolution failed" → DNS config broken?
  → Trace it step by step: ping → traceroute → curl -v
```

Every single line above is networking. Once you learn this module, all of those problems become solvable quickly and confidently.

### The Big Picture — What Happens When You Visit a Website

Before we get into details, let's understand the full journey of a simple web request. This is the story of what happens every time you type a URL and press Enter.

```
You type: google.com and press Enter
              ↓
Your browser asks DNS:
"What is the IP address for google.com?"
              ↓
DNS replies: "The IP is 142.250.185.46"
              ↓
Browser connects to 142.250.185.46 on port 443 (HTTPS)
              ↓
Request travels: Your laptop -> Router -> ISP -> Internet -> Google's server
              ↓
Google's server sends back HTML, CSS, JavaScript
              ↓
Your browser renders the page you see
```

This entire journey happens in less than 100 milliseconds. Every single step of it maps to a concept in this module. By the end, you will understand each step completely.

### What This Module Covers

| Topic | What You Learn | Why It Matters |
|---|---|---|
| OSI & TCP/IP Models | How the layers of networking work | Debug at the right layer |
| IP Addresses & Subnets | How every device gets an address | Configure servers and cloud correctly |
| DNS | How names become IP addresses | Fix connection and domain failures |
| Network Devices | Switches, routers, firewalls | Understand cloud infrastructure |
| Protocols | HTTP, TCP, UDP, SSH and more | Know which protocol does what |
| Linux Commands | ping, curl, netstat, dig, traceroute | Diagnose any problem on any server |
| Security | Firewalls, TLS, SSH hardening | Keep your infrastructure safe |

### 💡 The Real Cost of Not Knowing Networking

Here is a real scenario that plays out every week for engineers who skipped networking fundamentals.

A junior engineer deploys a Node.js app to an EC2 instance. The app runs fine locally. On the server, `systemctl status myapp` shows it is running. But users get "This site can't be reached." The engineer spends 4 hours checking the app code, reinstalling packages, rebooting the server.

The actual problem? The app was listening on `127.0.0.1:3000` instead of `0.0.0.0:3000`. One line of networking knowledge. Four hours lost.

A second scenario: the database connection keeps timing out in production but works locally. The engineer digs into the database config, the ORM settings, the connection pool. Two hours later someone notices the database security group only allows connections from the same VPC — and the new server is in a different subnet.

These are not rare edge cases. They happen constantly. And every single one is obvious once you understand networking. That is what this module gives you.

---

## 02. The OSI Model — 7 Layers of Networking

## Why the OSI Model Exists

When something breaks in networking, where do you even start? The problem could be a bad cable, a wrong IP address, a blocked port, or a broken app. Without a framework, you just guess randomly and waste hours.

OSI (Open Systems Interconnection) is a framework for **thinking about how network communication is organised**. It does not describe a specific technology — it describes the layers of responsibility involved in sending data from one machine to another.

```
Think of it like a courier company sending a package:
  Department 1: packs the item properly
  Department 2: labels it with address
  Department 3: loads it onto a truck
  Department 4: drives to destination
  ...each department has ONE job and doesn't care how the others work internally

OSI works the same way.
Each layer has ONE job.
Each layer talks only to the layer directly above and below it.
```

When you send data:
- It travels **DOWN** through all 7 layers on your side
- Crosses the network
- Travels **back UP** through all 7 layers on the receiver's side

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634357/uploads/hurhwpevomihuahcaral.png)

---

## The 7 Layers

### Layer 1 — Physical (The Wire)

The bottom layer. Actual hardware. This is where data becomes a physical signal.

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634400/uploads/hdo9bg7zvtqsquxjhazv.png)

```
What travels here:
  Copper cable  -> electrical signals (0s and 1s as voltage)
  Fibre optic   -> light pulses
  Wi-Fi         -> radio waves

Everything at this layer is just raw BITS — zeros and ones.
No meaning. No addresses. Just signals.
```

- Devices: cables, network cards (NIC), Wi-Fi antennas, hubs
- Problems here: unplugged cable, broken NIC, Wi-Fi interference, signal too weak
- You CANNOT fix Layer 1 with software — it is a physical problem
- Data unit: **Bits**

---

### Layer 2 — Data Link (MAC Addresses)

Handles communication between devices on the **same local network**. Uses **MAC addresses** — unique hardware addresses burned into every network card at the factory.

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634543/uploads/ccev4cjrwfo7s0e2oo46.png)

```
MAC address format: 00:1A:2B:3C:4D:5E
  - Assigned by manufacturer (hardcoded into the NIC)
  - Every NIC in the world has a unique one
  - Only relevant within the same local network (LAN)

Switch behaviour:
  Keeps a table: "MAC address XX is on port 3"
  Sends data ONLY to the correct port — not to everyone
  That is why switches are more efficient than hubs (which blast to everyone)
```

- Devices: switches, bridges
- Problems here: duplicate MAC addresses, switch misconfiguration
- Data unit: **Frames**

---

### Layer 3 — Network (IP Addresses)

Where **IP addresses** live and where **routing** happens. Responsible for getting data from one network to another — across the internet if needed.

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634492/uploads/gsrqwyfcpmdxqg0yclzc.png)

```
IP address:  192.168.1.10
  - Logical address (assigned, not hardcoded)
  - Tells you: which network + which device on that network

MAC is "who you are physically"
IP  is "where you are logically"

Routing:
  Data leaves your home network -> router decides how to forward it
  Routers keep routing tables: "to reach 10.0.0.0/8, send packets to this next hop"
  Each router hands it to the next until it reaches the destination
```

- Devices: routers
- Problems here: wrong IP, wrong subnet mask, routing table misconfiguration
- Data unit: **Packets**

---

### Layer 4 — Transport (TCP & UDP, Ports)

Handles **end-to-end delivery** between two specific applications. Introduces **port numbers** so data reaches the right app, and the choice between TCP (reliable) or UDP (fast).

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634579/uploads/e0egpyqitdklcja7omd1.png)

```
Port numbers:
  Port 22    -> SSH
  Port 80    -> HTTP
  Port 443   -> HTTPS
  Port 5432  -> PostgreSQL
  Port 3306  -> MySQL
  Port 6379  -> Redis
  Port 27017 -> MongoDB

Without port numbers, your server would receive data but not know which app it's for.
IP gets you to the machine. Port gets you to the right app on that machine.
```

- Problems here: port not open, firewall blocking port, wrong protocol
- Data unit: **Segments**

---

### Layer 5 — Session (Connection Lifecycle)

Your browser opens a connection to a web server. You browse for 10 minutes across multiple requests. How does the system know all those requests belong to the same conversation? How does it know when to keep the connection open and when to close it? That is the Session layer's job.

```
The Session layer manages the LIFECYCLE of a connection:
  - Opening a session   -> establish the communication channel
  - Keeping it alive    -> keep-alive pings, timeout management
  - Checkpointing       -> save progress mid-transfer so it can resume if interrupted
  - Closing the session -> graceful teardown when done

Real example:
  You download a 2 GB file. At 1.5 GB your connection drops.
  Without checkpointing  -> restart from zero
  With session layer     -> resume from 1.5 GB
```

- Protocols here: NetBIOS, RPC (Remote Procedure Call), PPTP
- Problems here: session timeouts, dropped connections mid-transfer, failed resumptions
- In practice: mostly handled transparently by the OS and libraries — you rarely interact with it directly
- Data unit: **Data**

---

### Layer 6 — Presentation (Encryption & Format)

Your app sends a password to a server. It travels across the internet as raw text — anyone intercepting the packet can read it. Also your app sends JSON but the server expects XML. Or your image is PNG but the receiver needs JPEG. Something has to translate and protect the data. That is the Presentation layer.

```
Three jobs:

  1. Encryption / Decryption
     -> Encrypt data before sending (unreadable in transit)
     -> Decrypt data after receiving (app can read it again)
     -> TLS/SSL lives here — this is why HTTPS exists

  2. Compression
     -> Compress before sending to reduce size and transfer time
     -> Decompress after receiving

  3. Data Format Conversion
     -> Translate between formats (JSON <-> XML, PNG <-> JPEG)
     -> Handle character encoding (ASCII, UTF-8, Unicode)
     -> Ensure both sides speak the same data language
```

```
Real example — HTTPS:
  You type your credit card into a payment form
  Layer 6 (TLS) encrypts it before it leaves your machine
  It travels as scrambled ciphertext across the internet
  The server's Layer 6 (TLS) decrypts it back to the original number
  Nobody intercepting the traffic in the middle can read it

The padlock icon in your browser = TLS (Layer 6) is working
```

- Protocols here: TLS/SSL, JPEG, PNG, MPEG, ASCII, UTF-8, gzip
- Problems here: SSL certificate errors, encoding mismatches, format incompatibility
- Data unit: **Data**

---

### Layer 7 — Application (What Your App Uses)

Your application needs to actually do something — load a webpage, send an email, look up a domain name, transfer a file. It needs a specific protocol that both client and server agree on, with rules for how to ask and how to respond. That is the Application layer.

```
This layer defines:
  - What format requests and responses take
  - What commands are valid
  - What headers are included
  - How errors are reported

Common protocols at Layer 7:
  HTTP / HTTPS  -> web browsing, REST APIs
  FTP           -> file transfer
  SMTP          -> sending email
  IMAP / POP3   -> receiving email
  DNS           -> domain name -> IP address resolution
  SSH           -> secure remote login and command execution
  SNMP          -> network device monitoring
```

```
Real example — HTTP request at Layer 7:
  GET /index.html HTTP/1.1
  Host: www.example.com
  User-Agent: Mozilla/5.0
  Accept: text/html

  This entire thing is Layer 7.
  The browser and web server both speak HTTP.
  GET means "send me this file"
  200 means "here it is"
  404 means "not found"
```

```
Layer 7 vs Layer 4 — the difference:
  Layer 4 (Transport) knows: "send this segment to IP 93.184.216.34 port 443"
  Layer 7 (Application) knows: "this is an HTTP GET request for /index.html"

  Layer 4 is the delivery truck.
  Layer 7 is the letter inside the package.
```

- Problems here: wrong URL, auth failure, API errors, misconfigured web server, DNS not resolving
- DevOps tools here: nginx, Apache, curl, Postman, browser dev tools
- Data unit: **Data**

---

### OSI Quick Reference Table

| Layer | Name | Address Used | Key Protocols / Devices | Data Unit |
|---|---|---|---|---|
| 7 | Application | — | HTTP, FTP, DNS, SSH, SMTP | Data |
| 6 | Presentation | — | TLS/SSL, JPEG, UTF-8, gzip | Data |
| 5 | Session | — | NetBIOS, RPC, PPTP | Data |
| 4 | Transport | Port numbers | TCP, UDP | Segments |
| 3 | Network | IP address | Routers, ICMP | Packets |
| 2 | Data Link | MAC address | Switches, Bridges | Frames |
| 1 | Physical | — | Cables, NICs, Wi-Fi | Bits |

---

### Debugging with OSI — The Real Value

This is why you learn OSI. When something breaks, work **bottom to top**. You will find it every time.

```
Problem: "I cannot connect to the database"

Layer 1 — Physical:
  Is the server powered on and physically connected?
  -> ping the server IP. If ping fails completely, check cables/NIC/Wi-Fi

Layer 3 — Network:
  Can I reach the server's IP at all?
  -> ping db-server-ip
  -> If ping works, the network path is fine

Layer 4 — Transport:
  Is the database port open and listening?
  -> netstat -tulpn | grep 5432
  -> Is a firewall (Security Group in AWS) blocking port 5432?
  -> telnet db-server-ip 5432

Layer 7 — Application:
  Is the database service actually running?
  -> systemctl status postgresql
  -> Are the credentials correct?
  -> Is the connection string using the right database name?

Work layer by layer — you will find it every time.
```

```
Problem: "Website not loading"

Layer 1: Am I connected to Wi-Fi/Ethernet at all?
Layer 3: Can I ping 8.8.8.8? If yes, internet path works.
Layer 3: Can I ping google.com? If no but 8.8.8.8 works -> DNS issue (Layer 7)
Layer 4: Is port 443 reachable on the server?
Layer 6: Is there an SSL certificate error in the browser?
Layer 7: Is nginx/Apache actually running?
```

---

### TCP/IP Model

The TCP/IP model is a **simplified 4-layer version of OSI**. It is what the actual internet is built on.

OSI was designed as a theoretical framework first. TCP/IP was built from real working protocols that were already running the internet, then documented. That is why TCP/IP won.

```
OSI (7 layers)                     TCP/IP (4 layers)
------------------------------     -----------------------------------------
7. Application
6. Presentation       -------->    Application Layer
5. Session                         (HTTP, FTP, SSH, DNS, SMTP, TLS)
------------------------------     -----------------------------------------
4. Transport          -------->    Transport Layer (TCP, UDP)
------------------------------     -----------------------------------------
3. Network            -------->    Internet Layer (IP, ICMP)
------------------------------     -----------------------------------------
2. Data Link          -------->    Network Access Layer
1. Physical                        (Ethernet, Wi-Fi, cables, MAC)
```

---

## TCP vs UDP

This is one of the most common choices you make as a developer or DevOps engineer. Pick wrong and your app is either too slow or loses data.

### TCP — Transmission Control Protocol (The Careful One)

TCP makes sure every single piece of data arrives correctly and in order. Before sending anything, it does a **3-way handshake**:

```
Client                    Server
  |                          |
  |------- SYN -----------> |    "Hey, can we talk?"
  | <------ SYN-ACK -------- |    "Yes, I'm ready!"
  |------- ACK -----------> |    "Great, let's go."
  |                          |
  [ data transfer begins ]
  |------- DATA ----------> |
  | <------ ACK ------------ |    "Got it."
  |------- DATA ----------> |
  | <------ ACK ------------ |    "Got it."
  ...
  [ every packet acknowledged, missing ones are resent ]
```

```
TCP guarantees:
  -> Every packet is acknowledged (if no ACK, it resends)
  -> Data arrives IN ORDER (no missing pieces, no duplicates)
  -> Connection is properly closed (FIN / FIN-ACK)

Cost:
  -> Slower (extra round trips for handshake + ACKs)
  -> More overhead (headers, state management)

Use TCP for:
  -> Loading web pages (HTTP/HTTPS)
  -> Downloading files
  -> Sending emails
  -> Database queries (PostgreSQL, MySQL)
  -> SSH sessions
  -> Anything where losing data is unacceptable
```

### UDP — User Datagram Protocol (The Fast One)

UDP just sends data. No handshake. No acknowledgment. No ordering. Fire and forget.

```
Client                    Server
  |                          |
  |------- data ----------> |
  |------- data ----------> |    (some might not arrive)
  |------- data ----------> |    (UDP does not care)
  |                          |
  [ no confirmation, no resending, no connection ]
```

```
UDP characteristics:
  -> No connection setup (no 3-way handshake)
  -> No acknowledgment (sender doesn't know if data arrived)
  -> Packets may arrive out of order or not at all

Benefits:
  -> Much faster (no handshake overhead)
  -> Lower bandwidth usage
  -> Lower latency

Use UDP for:
  -> Video streaming (a dropped frame is better than pausing)
  -> Online gaming (low latency matters more than a few lost packets)
  -> DNS lookups (fast single request/response)
  -> VoIP calls (slight audio glitch better than delay)
```

```
Analogy:
  TCP = Registered mail. You get a signature confirmation.
        If not delivered, they resend it. Slower but guaranteed.

  UDP = Dropping leaflets from a plane.
        Some land correctly, some blow away. Fast but no guarantee.
```

| Feature | TCP | UDP |
|---|---|---|
| Connection | Required (3-way handshake) | None |
| Reliability | Guaranteed delivery | No guarantee |
| Ordering | Guaranteed in-order | Not guaranteed |
| Speed | Slower | Faster |
| Error Checking | Yes (retransmit on failure) | Basic checksum only |
| Use Cases | HTTP, SSH, email, DB | Streaming, gaming, DNS, VoIP |

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774634333/uploads/uvypfo9zzn1v2pvajfwa.png)

---

### Quick Reference

```
OSI — 7 Layers (top to bottom)
  7 Application  -> HTTP, FTP, DNS, SSH (what your app speaks)
  6 Presentation -> TLS/SSL, encryption, format conversion, compression
  5 Session      -> connection lifecycle: open, keep alive, checkpoint, close
  4 Transport    -> TCP/UDP, port numbers (which app on the machine)
  3 Network      -> IP addresses, routing (which machine)
  2 Data Link    -> MAC addresses, switches (which device on local network)
  1 Physical     -> bits, cables, NICs, Wi-Fi signals

Memory trick (top to bottom): All People Seem To Need Data Processing
Memory trick (bottom to top): Please Do Not Throw Sausage Pizza Away

Debugging — always bottom to top:
  1. Physical:     is it connected?
  2. Network:      can I ping the IP?
  3. Transport:    is the port open? firewall blocking?
  4. Session:      is the connection being maintained?
  5. Presentation: SSL cert errors? encoding issues?
  6. Application:  is the service running? credentials correct?

TCP -> reliable, ordered, slower  (web, SSH, DB, email)
UDP -> fast, no guarantee, lower latency (streaming, gaming, DNS, VoIP)

TCP/IP (4 layers):
  Application (L5-7) -> Transport (L4) -> Internet/IP (L3) -> Network Access (L1-2)
```

## 03. IP Addresses, Subnets & DNS

Every device on a network needs an address. Without addresses, there is no way to know where to send data. For DevOps this is critical daily knowledge — every time you launch a cloud server, configure a VPC, set up a load balancer, or debug "connection refused", you are working with IP addresses.

---

### What is an IP Address

An IP address is a unique identifier for a device on a network — like a postal address for your computer. When data needs to go somewhere, it is addressed to an IP just like a letter is addressed to a house.

The most common type is **IPv4** — a 32-bit number written as four groups separated by dots:

```
      192    .    168    .     1    .    100
       |           |           |          |
   Network      Network     Network     Device
   (first three groups identify the network)  (last group = specific device)

Each number = 0 to 255
Total possible addresses = about 4 billion
```

---

### Public vs Private IP Addresses

Not all IP addresses are the same. Private addresses are used inside networks and are not visible on the internet. Public addresses are globally unique and visible on the internet.

| Type | Range | Where You See It |
|---|---|---|
| Private | `10.0.0.0 – 10.255.255.255` | AWS VPCs, large company networks |
| Private | `172.16.0.0 – 172.31.255.255` | Medium private networks |
| Private | `192.168.0.0 – 192.168.255.255` | Your home Wi-Fi |
| Loopback | `127.0.0.1` | Always means "this machine itself" (localhost) |
| Public | Everything else | Addresses on the real internet |

```
When you SSH into an AWS EC2 instance from your laptop -> you use its PUBLIC IP
When your app talks to its database inside AWS          -> they use PRIVATE IPs

Your home router has one public IP (facing the internet)
and gives private IPs (192.168.1.x) to all your devices inside the home network
```

---

### Subnets and CIDR

A **subnet** is a smaller chunk of a larger network. You divide networks into subnets to organise devices, isolate different systems, and control which devices can talk to each other.

**CIDR notation** is how you write a subnet — the IP address followed by a `/number`:

```
10.0.1.0/24

  10.0.1.0  = the network address (start of this subnet)
  /24       = the first 24 bits identify the NETWORK
              the remaining 8 bits identify individual DEVICES

/24 gives you:
  2^8 = 256 addresses
  minus 2 (network address + broadcast address)
  = 254 usable devices in this subnet
```

#### Common CIDR Sizes

```
/32  =        1 address    (a single specific host)
/30  =        4 addresses, 2 usable (connecting two routers)
/28  =       16 addresses, 14 usable
/24  =      256 addresses, 254 usable  <- most common subnet
/16  =   65,536 addresses              <- VPC level in AWS
/8   =  16 million addresses           (very large networks)
```

#### Real AWS VPC Example

```
VPC: 10.0.0.0/16  (65,536 IPs — the whole space)
          |
     +----+-----------------------------+
     |                                  |
10.0.1.0/24                  10.0.2.0/24
(Public subnet)              (Private subnet)
Web servers                  App servers + Databases
Can reach internet           Cannot reach internet directly
```

This separation keeps your databases safe from direct internet access — a fundamental security practice in every AWS architecture.

---

### IPv6

IPv4 only has 4 billion addresses. We ran out. IPv6 fixes this with 128-bit addresses:

```
IPv4:  192.168.1.100                      (32 bits,  ~4 billion addresses)
IPv6:  2001:0db8:85a3::8a2e:0370:7334     (128 bits, 340 undecillion addresses)
```

You will see IPv6 in modern cloud environments. For most DevOps work IPv4 is still primary, but knowing what IPv6 looks like means you won't be confused when it appears in logs or config.

### Useful Commands

```bash
ip addr show              # All network interfaces and their IPs
ip addr show eth0         # Just the eth0 interface
hostname -I               # Quick list of all your IPs
curl -s https://ifconfig.me  # Your public IP as seen from the internet
```

---

### DNS — How Names Become Addresses

DNS (Domain Name System) is the internet's phone book. You give it a name like `google.com` and it returns the IP address `142.250.185.46` that you actually need to connect. Without DNS you would need to memorise the IP of every website you visit.

#### The DNS Resolution Journey

When you type `devops-network.com` in your browser, here is exactly what happens:

```
Step 1 — Browser cache
  "Have I looked this up recently?"
  Yes -> use cached IP immediately
  No  -> continue

Step 2 — /etc/hosts check
  Linux checks for local overrides in /etc/hosts
  Found -> use that IP
  Not found -> continue

Step 3 — DNS Resolver
  Usually your ISP's server, 8.8.8.8 (Google), or 1.1.1.1 (Cloudflare)
  Resolver checks its own cache
  Not cached -> start the real lookup

Step 4 — Root DNS Servers
  "Who handles .com domains?"
  Root server replies: "Ask the .com TLD server"

Step 5 — TLD Server
  "Who handles devops-network.com?"
  TLD server replies: "The authoritative nameserver is ns1.example-dns.com"

Step 6 — Authoritative DNS Server
  This is the final source — your domain registrar, AWS Route 53, Cloudflare DNS
  Returns the real IP: "54.123.45.67"

Step 7 — Resolver caches and returns IP
  Browser connects to 54.123.45.67
  Page loads

Full process: under 50ms. Cached requests: under 1ms.
```

---

### DNS Record Types

| Record | What It Does | Example |
|---|---|---|
| **A** | Domain -> IPv4 address | `devops-network.com -> 54.1.2.3` |
| **AAAA** | Domain -> IPv6 address | `devops-network.com -> 2001:db8::1` |
| **CNAME** | Alias -> points to another domain | `www.site.com -> site.com` |
| **MX** | Which server handles email | `mail.site.com` (priority 10) |
| **TXT** | Text data (domain verification, SPF) | `"v=spf1 include:sendgrid.net ~all"` |
| **NS** | Which servers are authoritative | `ns1.route53.amazonaws.com` |
| **PTR** | Reverse lookup — IP back to domain | Used for email spam checks |

---

### TTL — How Long DNS Is Cached

Every DNS record has a **TTL (Time To Live)** in seconds — it tells caches how long to remember the answer before asking again.

```
TTL = 300    -> cache for 5 minutes   (records that change frequently)
TTL = 3600   -> cache for 1 hour      (typical for most records)
TTL = 86400  -> cache for 24 hours    (very stable, rarely changed)
```

Before migrating a server to a new IP — lower your TTL to 300 at least 24 hours beforehand. Then when you change the IP, it updates everywhere within 5 minutes instead of 24 hours.

---

### DNS Commands

```bash
# nslookup — simple and quick
nslookup google.com                 # Get the IP for google.com
nslookup -type=MX gmail.com         # Get Gmail's mail servers
nslookup -type=NS google.com        # Get Google's nameservers

# dig — more detailed, great for troubleshooting
dig google.com                      # Full DNS query output
dig +short google.com               # Just the IP — no extras
dig google.com MX                   # Mail server records
dig google.com NS                   # Nameserver records
dig @8.8.8.8 google.com             # Query Google's DNS directly
                                    # bypasses your local DNS — good for testing

# Your system DNS config
cat /etc/resolv.conf                # Which DNS server is your system using?
                                    # "nameserver 8.8.8.8" = Google's public DNS

# /etc/hosts — local overrides, checked BEFORE DNS
cat /etc/hosts
sudo nano /etc/hosts
# Add a line: 192.168.1.100  myserver.local
# Now "myserver.local" resolves locally — no DNS lookup needed

# Real trick: before launch, test a new server by editing /etc/hosts
# Point your domain to the new server IP, test everything, then update real DNS
```

---

### Quick Reference

```
IP Addresses
  Private ranges: 10.x.x.x / 172.16-31.x.x / 192.168.x.x
  Public: everything else (unique on the internet)
  Loopback: 127.0.0.1 (always = this machine)
  IPv4: 32-bit, ~4 billion addresses
  IPv6: 128-bit, 340 undecillion addresses

CIDR
  /32 = 1 host     /24 = 254 hosts (most common)
  /16 = 65k hosts  /8  = 16M hosts
  AWS VPC typically /16, subnets typically /24

DNS Records
  A     -> domain to IPv4
  AAAA  -> domain to IPv6
  CNAME -> alias to another domain (not for root domain)
  MX    -> email server
  TXT   -> verification, SPF
  NS    -> authoritative nameservers
  PTR   -> reverse lookup (IP -> domain)

TTL
  Low (300)   -> changes propagate fast, more DNS queries
  High (86400) -> fewer queries, slow to update
  Lower TTL before any planned DNS change

DNS lookup order:
  Browser cache -> /etc/hosts -> DNS Resolver -> Root -> TLD -> Authoritative
```

##  04. Network Devices and Firewall  — The Building Blocks

Network devices are the hardware (or software in the cloud) that control how data flows through a network. Understanding them helps you understand cloud architecture — because AWS VPCs, security groups, NAT gateways, and internet gateways are all just software versions of these physical concepts.

Each device operates at a specific OSI layer. The layer it operates at determines what it can "see" in the data and what decisions it can make.

![Image](https://res.cloudinary.com/dyc1j1h62/image/upload/v1774638164/uploads/jb4juhqoh3rx1hg2my0q.png)

---

## Hub, Switch, and Router

These three cause the most confusion for beginners. Here is the clearest way to think about them.

### Hub — Layer 1 (The Dumb Broadcaster)

A hub takes anything arriving on one port and sends it out of ALL other ports. No intelligence — it just shouts everything everywhere.

```
Device A sends data to Device C via Hub:

Device A --> HUB --> Device B  (gets it, but shouldn't)
                --> Device C  (intended recipient)
                --> Device D  (gets it, but shouldn't)

Everyone sees everyone's traffic. Security nightmare.
```

Completely obsolete. You will never buy one. But knowing why it was replaced helps you appreciate what a switch does.

### Switch — Layer 2 (The Smart Director)

A switch learns the MAC address of every device plugged into each of its ports. When data arrives, it sends it ONLY to the correct port. Like a hotel receptionist who knows exactly which room each guest is in.

```
Device A sends data to Device C via Switch:

Device A --> SWITCH (checks MAC address table)
                 +--> Device C only (exact delivery)
             Device B and D do NOT receive the data
```

Switches are everywhere — every office, every data centre, every cloud. Fast, efficient, and secure compared to hubs.

### Router — Layer 3 (The Network Connector)

A router connects different networks together. It reads IP addresses to determine the best path for data to travel, even across the entire internet. Routers maintain a **routing table** — a list of "to reach network X, send packets via Y."

```
Your home network (192.168.1.x)
         |
       ROUTER  (reads IP addresses, decides where to send)
         |
       Your ISP
         |
     The Internet
         |
  Google's servers (142.250.x.x)
```

Your home Wi-Fi box is actually a router + switch + Wi-Fi access point all in one device.

---

## Device Comparison Table

| Device | OSI Layer | Identifies By | Used For |
|---|---|---|---|
| Hub | Layer 1 | Nothing — broadcasts all | Obsolete |
| Repeater | Layer 1 | Nothing — boosts signal | Extending cable range |
| Switch | Layer 2 | MAC address | Connecting devices locally |
| Access Point | Layer 2 | MAC address | Wi-Fi networks |
| Router | Layer 3 | IP address | Connecting networks |
| Firewall | Layer 3–7 | IP, Port, Content | Security control |
| Load Balancer | Layer 4–7 | IP, Port, URL | Distributing traffic |

---

## Modem — The ISP Connection

A modem (Modulator-Demodulator) converts between the digital signals your computer uses and the analog signals that travel over telephone or cable lines to your ISP. It is what connects your home router to the internet.

```
Your devices -> Router -> Modem -> ISP cable/phone line -> Internet
```

In cloud environments there are no modems — virtual machines connect directly to the cloud provider's high-speed internal network.

---

## Firewalls

A firewall is a security system that decides what network traffic is allowed in and out. Think of it like a bouncer at a club — it checks every packet trying to enter or leave and decides based on rules who gets through.

In DevOps you configure firewalls constantly — on Linux servers (`ufw`), in cloud environments (AWS Security Groups), and at network boundaries.

### Types of Firewalls

**Packet Filtering** — the basic type:
- Checks each packet's header: source IP, destination IP, port, protocol
- Simple yes/no decision based on rules
- Fast but does not look inside the packet
- Like a border guard checking passports but not luggage

**Stateful Inspection** — the smarter type:
- Keeps track of active connections
- Knows if a packet belongs to an established conversation or is suspicious new traffic
- Can block packets that are not part of a known connection
- Used in most modern firewalls including AWS Security Groups

**Next-Generation Firewall (NGFW)** — the advanced type:
- Everything above plus: malware scanning, application awareness, encrypted traffic inspection
- Used in enterprise environments
- AWS WAF (Web Application Firewall) is an example

---

## Firewall Commands on Linux

```bash
# UFW — Ubuntu's easy firewall interface
sudo ufw status                     # Is the firewall on? What rules exist?
sudo ufw enable                     # Turn it on
                                    # IMPORTANT: allow SSH before enabling or you lock yourself out

# Allow common ports
sudo ufw allow 22                   # SSH
sudo ufw allow 80                   # HTTP
sudo ufw allow 443                  # HTTPS
sudo ufw allow 3000                 # Custom app port

# More specific rules
sudo ufw allow from 192.168.1.0/24 to any port 22  # SSH from local network only
sudo ufw deny 3306                  # Block MySQL from internet (internal only)
sudo ufw deny 5432                  # Block PostgreSQL from internet

# View and manage rules
sudo ufw status verbose             # All rules with details
sudo ufw status numbered            # Rules with numbers
sudo ufw delete 3                   # Delete rule number 3

# firewalld — CentOS/RHEL systems
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload          # Apply changes
sudo firewall-cmd --list-all        # See all active rules
```

---

## Quick Reference

```
Hub      -> Layer 1, broadcasts to everyone, obsolete
Switch   -> Layer 2, MAC-based, sends only to correct port
Router   -> Layer 3, IP-based, connects different networks
Firewall -> Layer 3-7, allows or blocks based on rules
Load Balancer -> Layer 4-7, distributes traffic across servers

Firewall types:
  Packet Filtering  -> checks IP/port header only, no connection tracking
  Stateful          -> tracks connections, blocks out-of-state packets (AWS SG)
  NGFW              -> full inspection + malware + app awareness (AWS WAF)

UFW quick rules:
  ufw allow 22       -> open SSH
  ufw deny 3306      -> block MySQL from outside
  ufw allow from X/24 to any port 22  -> restrict SSH to a subnet
  Always allow SSH before enabling ufw
```



##  05. Network Protocols — The Languages of the Internet

A protocol is a set of rules that two devices agree to follow so they can communicate. Think of it like a language — you can only have a conversation if both people speak the same language. Computers can only exchange data if they use the same protocol.

Every tool in your DevOps work runs on protocols. HTTP powers APIs. SSH secures server access. DNS resolves domain names. HTTPS encrypts everything.

---

### How Protocols Stack Together

When you run a simple curl command:

```bash
curl https://api.example.com/users
```

Every OSI layer is involved, each with its own protocol:

```
Layer 7 (Application):  HTTP      — formats your GET request
Layer 6 (Presentation): TLS       — encrypts the request (HTTPS)
Layer 4 (Transport):    TCP       — ensures reliable delivery on port 443
Layer 3 (Network):      IP        — routes packets to the server's IP
Layer 2 (Data Link):    Ethernet  — sends frames to your router's MAC address
Layer 1 (Physical):     signal    — electrical through cable / radio through air
```

Every layer adds its own header going down (**encapsulation**). At the receiving end, each layer strips its header going up (**decapsulation**).

---

## The Core Protocols

### HTTP — HyperText Transfer Protocol

The foundation of the web. Every API, every website uses it.

```
Works as request-response: client asks, server answers
Stateless: each request is completely independent
Port: 80
NOT encrypted — data is visible to anyone on the network path
```

### HTTPS — HTTP Secure

HTTP with TLS encryption layered on top.

```
Port: 443
The padlock icon in your browser = HTTPS is working
Use HTTPS for everything that handles user data — no exceptions
```

### SSH — Secure Shell

Lets you remotely control a Linux server through an encrypted connection.

```
Port: 22
Replaced Telnet (which sent everything as plain readable text — dangerous)
Also used for secure file transfer via SCP and SFTP
```

### FTP — File Transfer Protocol

Transfers files between client and server.

```
Port: 21
NOT encrypted — use SFTP instead in production
Still seen in legacy systems
```

### DNS — Domain Name System

Translates domain names to IP addresses.

```
Port: 53
Uses UDP for queries (fast), TCP for large responses
Covered in detail in the IP & DNS section
```

### DHCP — Dynamic Host Configuration Protocol

Automatically assigns IP addresses to devices when they join a network.

```
Port: 67/68, uses UDP
When your laptop connects to Wi-Fi, DHCP assigns it an IP automatically
No manual IP configuration needed
```

### ICMP — Internet Control Message Protocol

Used for diagnostic messages between network devices.

```
No port — operates directly at the IP layer
The ping command uses ICMP
traceroute also uses ICMP
```

---

### Protocol Quick Reference

| Protocol | Port | Transport | Encrypted | Used For |
|---|---|---|---|---|
| HTTP | 80 | TCP | No | Web pages, APIs |
| HTTPS | 443 | TCP | Yes (TLS) | Secure web, secure APIs |
| SSH | 22 | TCP | Yes | Remote server access, file transfer |
| FTP | 21 | TCP | No | File transfer (legacy) |
| SFTP | 22 | TCP | Yes | Secure file transfer |
| DNS | 53 | UDP/TCP | No (default) | Name resolution |
| DHCP | 67/68 | UDP | No | Auto IP assignment |
| SMTP | 25/587 | TCP | Optional | Sending email |
| IMAP | 143/993 | TCP | Yes (993) | Reading email |
| MySQL | 3306 | TCP | Optional | Database |
| PostgreSQL | 5432 | TCP | Optional | Database |
| Redis | 6379 | TCP | Optional | Cache / message queue |
| ICMP | None | — | No | ping, traceroute |

---

### HTTP Deep Dive

HTTP is the protocol you interact with most. Every API test, every health check, every nginx config, every load balancer log uses it.

#### HTTP Methods

```
GET    -> Retrieve data        "Give me the list of users"
POST   -> Create data          "Create a new user"
PUT    -> Replace data         "Replace user 5 with this"
PATCH  -> Partially update     "Just update the email of user 5"
DELETE -> Remove data          "Delete user 5"
```

#### HTTP Status Codes

When something breaks, the status code is the first clue. Read it correctly and you immediately know where to look.

```
2xx — Success
  200 OK           -> request succeeded, here is your data
  201 Created      -> new resource was created successfully
  204 No Content   -> success but nothing to return (common for DELETE)

3xx — Redirect
  301 Moved Permanently -> resource has a new permanent URL
  302 Found             -> temporary redirect
  304 Not Modified      -> your cached version is still valid

4xx — Client Error (you did something wrong)
  400 Bad Request       -> request is malformed — check your JSON/params
  401 Unauthorized      -> you need to authenticate first
  403 Forbidden         -> authenticated but not allowed to do this
  404 Not Found         -> that resource does not exist
  429 Too Many Requests -> you are being rate limited — slow down

5xx — Server Error (the server broke)
  500 Internal Server Error -> something crashed on the server — check logs
  502 Bad Gateway           -> nginx got a bad response from the upstream app
  503 Service Unavailable   -> server overloaded or down for maintenance
  504 Gateway Timeout       -> upstream app took too long to respond
```

```
How to read 5xx errors fast:
  502 -> nginx is fine, the APP behind it is broken
  504 -> nginx is fine, the app is responding but TOO SLOWLY
  503 -> the server is not accepting any connections at all

These codes tell you exactly which layer to investigate.
```

---

### Quick Reference

```
Key ports to memorise:
  22   -> SSH / SFTP
  25   -> SMTP (email sending)
  53   -> DNS
  80   -> HTTP
  443  -> HTTPS
  3306 -> MySQL
  5432 -> PostgreSQL
  6379 -> Redis
  27017 -> MongoDB

Always use encrypted versions:
  HTTP  -> HTTPS   (port 80  -> 443)
  FTP   -> SFTP    (port 21  -> 22)
  IMAP  -> IMAPS   (port 143 -> 993)
  SMTP  -> SMTPS   (port 25  -> 587)

HTTP methods: GET retrieve / POST create / PUT replace / PATCH update / DELETE remove

Status code groups:
  2xx success  3xx redirect  4xx client error  5xx server error

Critical 5xx:
  500 -> app crashed        check app logs
  502 -> app returning bad response  check app health
  503 -> app unreachable    check if app is running
  504 -> app too slow       check app performance / timeouts
```

## 06. Linux Networking Commands — Your Daily Toolkit

These are the commands you will use every single day when working with servers. Learn them properly now and you will solve problems in 5 minutes that would otherwise take hours.

The best way to think about these tools: each one answers a specific question. Pick the right question, pick the right tool.

```
"Is this host reachable?"              → ping
"What is the IP for this domain?"      → dig / nslookup
"Is this port open and listening?"     → netstat / ss
"What is the HTTP response?"           → curl
"Where does the network path fail?"    → traceroute
"What is my IP / routing?"             → ip addr / ip route
"Download this file"                   → wget / curl
```

### The Systematic Debugging Approach

Before using individual tools, here is the mental flow experienced engineers use. It works for almost any connection problem:

```
Something cannot connect?

1. Can I ping it?
   ping server-ip
   YES → network path works, problem is at service level
   NO  → routing or firewall issue

2. Does DNS resolve?
   dig hostname
   YES → DNS fine, use the IP directly
   NO  → DNS problem, check /etc/resolv.conf

3. Is the port open?
   ss -tulpn | grep :PORT
   YES → service listening, firewall might be blocking
   NO  → service not running, start it

4. What does the raw response say?
   curl -v http://server:port
   Gives you the exact HTTP error or connection error

5. Is a firewall blocking?
   sudo ufw status
   telnet server port
```

Work through these five steps and you will find 95% of problems. Stop guessing and start being systematic.

### ping — Test if a Host is Reachable

`ping` sends small test packets (ICMP echo requests) to a host and tells you if they come back, and how long it took. It is always the first diagnostic tool you reach for.

```bash
ping google.com                     # Continuous ping until you press Ctrl+C
ping -c 4 google.com                # Send exactly 4 packets then stop
ping -c 1 192.168.1.100             # Quick one-shot check: is this host alive?
ping -i 2 google.com                # Ping every 2 seconds (default = 1)
ping -W 2 192.168.1.100             # Timeout after 2 seconds per packet (good for scripts)

# Reading the output:
# 64 bytes from 142.250.185.46: icmp_seq=1 ttl=118 time=12.4 ms
#                                                           ^-- round trip time
#
# --- google.com ping statistics ---
# 4 packets transmitted, 4 received, 0% packet loss
#                                    ^-- 0% is good. High % = network problem.
#
# rtt min/avg/max = 12.1/12.4/12.8 ms
#                   ^-- how consistent the latency is
```

**What ping tells you:**
- Host is reachable (Layer 3 networking is working)
- How fast the connection is (latency)
- How reliable it is (packet loss)

**What ping does NOT tell you:** Whether a specific service or port is open. A server can respond to ping but have its web server firewalled off.

### netstat & ss — See What Ports Are Open

`ss` (and the older `netstat`) shows all network connections and which ports are listening on your server. Use this when you need to know "is my app actually running and listening?" or "what process is on port 80?"

```bash
# ss — modern, fast replacement for netstat
ss -tulpn                           # All listening ports with process names
# -t = TCP only
# -u = UDP only
# -l = listening (not established connections)
# -p = show which process owns each socket
# -n = show numbers not names (faster)

ss -tulpn | grep :80                # Is anything listening on port 80?
ss -tulpn | grep :3000              # Is my Node.js app running?
ss -tulpn | grep :5432              # Is PostgreSQL listening?

# netstat — older command, works on all systems
netstat -tulpn                      # Same as ss -tulpn
netstat -an | grep ESTABLISHED      # All active connections right now

# lsof — find which process owns a specific port
sudo lsof -i :80                    # What process is using port 80?
sudo lsof -i :3000                  # Which process is on 3000?

# Reading the output:
# tcp  0  0  0.0.0.0:80    0.0.0.0:*  LISTEN  1234/nginx
#                 ^-- port          ^-- status    ^-- process name
#
# 0.0.0.0:80    = listening on ALL interfaces -- reachable from outside (good)
# 127.0.0.1:80  = listening on localhost only -- NOT reachable from outside (bad)
```

**Common trap:** Your app is running but you cannot reach it from outside. Check `ss -tulpn` — if it shows `127.0.0.1:3000` instead of `0.0.0.0:3000`, your app is only listening on localhost. nginx cannot proxy to it and external traffic cannot reach it. Fix it by telling your app to bind to `0.0.0.0` instead.

### curl — Make HTTP Requests from Terminal

`curl` is your Swiss Army knife for HTTP. Test APIs, check server responses, download files, debug SSL certificates, script health checks — curl does all of it.

```bash
# Basic requests
curl https://example.com                    # GET request — show the response body
curl -s https://example.com                 # Silent — no progress bar
curl -I https://example.com                 # Headers only (no body)
curl -v https://example.com                 # Verbose — show everything happening
                                            # Best for debugging SSL, redirects, auth

# Check if a URL is up and what status code it returns
curl -o /dev/null -s -w "%{http_code}" https://example.com
# Output: 200  (or 404, 500, 502 etc.)
# Great for health check scripts in CI/CD

# API calls — what you do every day
curl -X GET https://api.example.com/users \
  -H "Authorization: Bearer your-token-here" \
  -H "Accept: application/json"

curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{"name": "Daksh", "email": "daksh@example.com"}'

# Download files
curl -O https://example.com/file.tar.gz     # Save with original name
curl -o myfile.zip https://example.com/f    # Save with custom name
curl -L https://short.url/abc               # -L follows redirects

# Get your public IP
curl -s https://ifconfig.me                 # Returns just your public IP

# Health check in a deploy script
if curl -sf https://myapp.com/health > /dev/null; then
    echo "Deployment successful — app is healthy"
else
    echo "HEALTH CHECK FAILED — rolling back"
    exit 1
fi
```

### traceroute — Follow the Path to a Server

`traceroute` shows every router hop that your data passes through on the way to a destination. When `ping` fails, `traceroute` shows you exactly **where** in the network it stops working.

```bash
traceroute google.com               # Trace the full path to google.com
traceroute -n google.com            # Numeric output (no hostname lookups -- faster)

# Reading the output:
#  1  192.168.1.1      1.2 ms   = your home router
#  2  10.50.0.1        5.3 ms   = your ISP's first router
#  3  172.16.0.45      8.1 ms   = ISP backbone
#  4  * * *                     = firewall blocking ICMP (this is normal, not broken)
#  5  108.170.252.1    11 ms    = Google's network
#  6  142.250.185.46   12 ms    = destination reached

# mtr -- combines ping and traceroute, updates live
mtr google.com                      # Live updating view of each hop
mtr --report google.com             # Run once and show a summary report

# How to use traceroute for debugging:
# If traceroute stops at hop 4 between your ISP and destination:
# The problem is in your ISP's network, not on your server
# If it stops right at hop 1: problem is in your local network/router
```

### ip & route — Check and Configure Networking

The `ip` command is the modern way to inspect and configure your server's network configuration.

```bash
# View your network setup
ip addr show                        # All interfaces and IP addresses
ip addr show eth0                   # Just eth0 interface
ip link show                        # Interface status (UP or DOWN)

# View routing table — how your server decides where to send traffic
ip route show
ip route
route -n                            # Classic command — numeric output

# Reading the routing table:
# default via 10.0.1.1 dev eth0
#   ^-- "for everything else, send it to 10.0.1.1 (the gateway)"
# 10.0.1.0/24 dev eth0 proto kernel
#   ^-- "for 10.0.1.x, send directly out of eth0 (same subnet)"

# Add a temporary static route
sudo ip route add 10.0.2.0/24 via 10.0.1.1   # Send 10.0.2.x traffic via this gateway
sudo ip route del 10.0.2.0/24                  # Remove a route

# Useful one-liners
ip route | grep default                         # What is my default gateway?
ip addr | grep "inet " | grep -v 127            # My non-loopback IPs
```

### wget — Simple File Downloads

`wget` is simpler than curl for just downloading files. It is great in scripts because it handles interruptions and retries automatically.

```bash
wget https://example.com/file.tar.gz            # Download to current directory
wget -O custom-name.zip https://example.com/f   # Download with custom filename
wget -c https://example.com/huge-file.iso       # Resume a broken download
wget -q https://example.com/file                # Quiet — no output
wget --limit-rate=1M https://example.com/f      # Limit speed to 1 MB/s

# Download and run an install script (very common pattern)
wget -qO- https://get.docker.com | bash         # Install Docker
```

---

## 07. Network Security — Protecting Your Infrastructure

Security is not something you add later — it is built into how you set things up from day one. The most common production security incidents are embarrassingly simple to prevent: exposed database ports, default passwords, plain HTTP instead of HTTPS.

The core principle is simple: **only expose what actually needs to be exposed**. Every open port that does not need to be open is a door for attackers.

---

### What to Expose and What to Hide

Not every port should be reachable from the internet. Most things should only be accessible from within your own network. Getting this wrong is how databases get leaked and servers get compromised.

```
Expose to the internet (0.0.0.0):
  Port 80   -> HTTP  (redirect users to HTTPS only — do not serve content)
  Port 443  -> HTTPS (your application lives here)
  Port 22   -> SSH   (ideally locked to your IP only, not 0.0.0.0)

Internal only (only app servers should reach these):
  Port 3306 -> MySQL
  Port 5432 -> PostgreSQL
  Port 6379 -> Redis
  Port 8080 -> App server (only nginx or load balancer should talk to this)

Never expose these to the internet:
  Jenkins, Grafana, Kubernetes dashboard -> VPN or SSH tunnel only
  Node.js inspector port 9229           -> debug ports have no business being public
  Prometheus :9090                      -> metrics are internal, not public
```

The rule: if a service does not need to receive traffic from the internet, it should not be reachable from the internet. Use your firewall and security groups to enforce this.

---

### SSH Security

SSH is how you access every server. If it is misconfigured, it is the biggest attack surface you have. Bots scan the entire internet continuously looking for open port 22 with weak configurations. This is not a theoretical threat — check any server's auth logs and you will see thousands of failed attempts every day.

#### Hardening SSH Configuration

All SSH server settings live in `/etc/ssh/sshd_config`. These are the critical ones to change:

```bash
# Open the config file
sudo nano /etc/ssh/sshd_config

# --- Settings to change ---

PermitRootLogin no          # Never allow root to log in directly over SSH
                            # Attackers always try root first

PasswordAuthentication no   # Keys only — no passwords
                            # Passwords can be brute-forced, SSH keys cannot

Port 2222                   # Change from default 22
                            # Reduces automated bot noise significantly
                            # Bots hammer port 22, they rarely try 2222

AllowUsers daksh deploy     # Whitelist exact usernames that can connect
                            # Anyone not on this list is rejected immediately

LoginGraceTime 30           # Drop connection if not authenticated in 30 seconds
                            # Prevents slow brute-force attempts from holding connections

MaxAuthTries 3              # Lock out after 3 failed attempts

# --- After editing ---
sudo systemctl restart sshd
```

#### Seeing Who Is Trying to Break In

```bash
# See recent failed password attempts
grep "Failed password" /var/log/auth.log | tail -20

# See attempts with non-existent usernames
grep "Invalid user" /var/log/auth.log | tail -20
```

If you see thousands of attempts from random IPs, that is completely normal. Every server on the internet gets this. This is exactly why password authentication must be disabled — keys cannot be brute-forced.

### SSH Key Authentication

```bash
# Generate an SSH key pair on your local machine (not the server)
ssh-keygen -t ed25519 -C "daksh@work"
# This creates:
#   ~/.ssh/id_ed25519      -> private key (never share this)
#   ~/.ssh/id_ed25519.pub  -> public key  (this goes on the server)

# Copy your public key to the server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server-ip

# What this does:
# Appends your public key to ~/.ssh/authorized_keys on the server
# From now on you connect with your private key, no password needed

# Connect
ssh -i ~/.ssh/id_ed25519 user@your-server-ip
```

```
How SSH key authentication works:

Your machine has the private key
Server has the public key (in authorized_keys)

When you connect:
  Server sends a random challenge
  Your machine signs it with the private key
  Server verifies the signature with the public key
  Match -> access granted

Private key never leaves your machine
There is nothing to brute-force
```

### SSH Tunnelling — Accessing Internal Services Safely

Admin dashboards (Grafana, Jenkins, K8s dashboard) should never be public. Access them through an SSH tunnel instead.

```bash
# Forward local port 3000 to Grafana running on the server at port 3000
ssh -L 3000:localhost:3000 user@your-server-ip

# Now open http://localhost:3000 in your browser
# Traffic goes: your browser -> SSH tunnel (encrypted) -> server -> Grafana
# Grafana is never exposed to the internet
```

---

## TLS/SSL — Encrypting Data in Transit

TLS (Transport Layer Security) is the encryption that turns HTTP into HTTPS. It ensures data travelling between a browser and a server cannot be read by anyone in the middle — not your ISP, not anyone on your Wi-Fi, not anyone intercepting the traffic.

### Why TLS Matters

```
Without TLS (plain HTTP):
  Browser --> username=daksh&password=secret123 --> Server
  Anyone on the network path can read this exactly as-is

With TLS (HTTPS):
  Browser --> x7k$#mNp9@q2!vB3zzqpA9... --> Server
  Intercepted traffic looks like garbage — useless to an attacker
```

This applies not just to passwords. Session cookies, API tokens, personal data — all of it travels as readable text over HTTP.

### How TLS Works

```
1. Your browser connects and says "I want HTTPS"

2. Server sends its SSL certificate
   Certificate contains:
     - Server's identity (domain name)
     - Server's public key
     - Digital signature from a trusted Certificate Authority (CA)

3. Browser verifies the certificate
   - Is it signed by a CA I trust? (browser has a built-in list of trusted CAs)
   - Does the domain match?
   - Is it expired?
   -> If all pass: padlock appears

4. Browser and server agree on a shared encryption key
   - Uses the server's public key to do this securely
   - The actual shared key never crosses the network in readable form

5. All data from here is encrypted using that shared key
   - Even if someone captures every packet, they see only encrypted bytes
```

### Certificate Types

```
Domain Validated (DV)
  - Cheapest, fastest to get
  - Proves you control the domain
  - Good for: most websites, APIs, internal tools

Organization Validated (OV)
  - CA verifies the organization exists
  - Shows company name in cert details
  - Good for: business websites

Extended Validation (EV)
  - Most rigorous verification
  - Used by banks and financial institutions

Wildcard Certificate
  - *.yourdomain.com
  - Covers all subdomains: api.yourdomain.com, app.yourdomain.com, etc.
  - One cert for all subdomains

Let's Encrypt
  - Free DV certificates
  - Auto-renew every 90 days
  - What most DevOps engineers use for everything
```

### Getting a Free SSL Certificate with Let's Encrypt

```bash
# Install certbot (Let's Encrypt client) with nginx plugin
sudo apt install certbot python3-certbot-nginx

# Get a certificate and auto-configure nginx
sudo certbot --nginx -d yourdomain.com

# What certbot does automatically:
#   - Proves you own the domain (via HTTP challenge)
#   - Gets a free certificate from Let's Encrypt
#   - Edits your nginx config to use HTTPS
#   - Sets up a cron job to auto-renew before expiry

# Certificates expire every 90 days
# Auto-renewal runs twice daily — you almost never need to do this manually
sudo certbot renew --dry-run  # test that renewal would work
```

### Checking Certificates

```bash
# Check the SSL certificate of any site
openssl s_client -connect google.com:443 -showcerts

# Check when a certificate expires — critical for monitoring
echo | openssl s_client -connect yoursite.com:443 2>/dev/null | \
  openssl x509 -noout -dates
# Output:
#   notBefore=Jan 01 00:00:00 2025 GMT
#   notAfter=Apr 01 00:00:00 2025 GMT  <- this is the expiry date

# If expiry is within 30 days -> alert someone
# Expired certificate = all users see a browser security warning = site effectively down
```

### Configuring HTTPS in Nginx

After certbot runs, your nginx config will look like this. Understanding it is important for debugging.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    # Nobody should be able to accidentally use plain HTTP
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    # Certificate files managed by certbot
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Disable old, broken TLS versions (TLS 1.0 and 1.1 are insecure)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Only allow strong cipher suites
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:8080;  # forward to your app
    }
}
```

### HSTS — Forcing HTTPS Even Before the Redirect

There is a gap in the HTTP-to-HTTPS redirect: the very first request from a user is HTTP before the redirect happens. HSTS closes this gap.

```nginx
# Add this inside your HTTPS server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# What this does:
# Browser receives this header once
# For the next 31536000 seconds (1 year), browser goes directly to HTTPS
# Never makes an HTTP request to this domain again
# Even if user types http:// — browser upgrades it internally before sending
```

---

### Firewalls — Controlling Port Access

A firewall is the gatekeeper between your server and the network. It decides which traffic is allowed in and which is dropped before it even reaches your application.

#### UFW — Uncomplicated Firewall (Ubuntu/Debian)

```bash
# Check current firewall status and rules
sudo ufw status verbose

# CRITICAL: Allow SSH before enabling the firewall
# If you forget this, you will lock yourself out permanently
sudo ufw allow ssh           # allows port 22
sudo ufw allow 2222/tcp      # if you changed SSH to port 2222, use this instead

# Allow common services
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS

# Allow from specific IP only (for admin tools)
sudo ufw allow from 203.0.113.5 to any port 8080

# Enable the firewall
sudo ufw enable

# Block a specific IP (if you see attacks from one source)
sudo ufw deny from 203.0.113.100

# Delete a rule
sudo ufw delete allow 80/tcp
```

### Firewalld (RHEL/CentOS/Fedora)

```bash
# Check active zone and rules
sudo firewall-cmd --list-all

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Allow custom port
sudo firewall-cmd --permanent --add-port=2222/tcp

# Apply changes
sudo firewall-cmd --reload
```

### AWS Security Groups vs OS Firewall

In AWS, Security Groups act as a firewall at the network level before traffic even reaches your EC2 instance. Your OS-level firewall (ufw/firewalld) is a second layer.

```
Internet
    |
    v
Security Group (AWS network level — controls what reaches EC2)
    |
    v
EC2 Instance
    |
    v
OS Firewall / ufw (local to the machine — controls what reaches processes)
    |
    v
Your Application
```

Both layers work together. Security Groups are stateful (return traffic is automatically allowed). NACLs are stateless (you manage both directions). The OS firewall gives you a final layer of control even if Security Groups are misconfigured.

---

### Quick Reference

```
Port exposure rules:
  Public  : 80 (redirect only), 443 (app), 22 (SSH, lock to your IP)
  Internal: 3306 MySQL, 5432 Postgres, 6379 Redis, 8080 app
  Never public: admin dashboards, debug ports, metrics endpoints

SSH hardening (in /etc/ssh/sshd_config):
  PermitRootLogin no
  PasswordAuthentication no
  Port 2222
  AllowUsers yourname
  LoginGraceTime 30
  MaxAuthTries 3
  -> sudo systemctl restart sshd

SSH keys:
  ssh-keygen -t ed25519         -> generate key pair
  ssh-copy-id user@server       -> put public key on server
  Private key stays on your machine, public key goes on server

TLS/SSL:
  HTTP  -> data readable by anyone on network path
  HTTPS -> data encrypted, unreadable in transit
  Certificates expire every 90 days (Let's Encrypt)
  sudo certbot --nginx -d yourdomain.com  -> get free cert, auto-configure nginx

Check cert expiry:
  echo | openssl s_client -connect site.com:443 2>/dev/null | openssl x509 -noout -dates

HSTS: forces browser to always use HTTPS, even before any redirect
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

UFW quick commands:
  sudo ufw allow ssh            -> allow SSH before enabling
  sudo ufw allow 443/tcp        -> allow HTTPS
  sudo ufw enable               -> turn on firewall
  sudo ufw status verbose       -> see current rules
```

## 08. Diagnosing & Fixing Network Problems

# Network Troubleshooting

The difference between a junior and a senior engineer is not knowing more commands — it is being **systematic** rather than random when something breaks. Guessing wastes hours. A structured approach finds the problem in minutes.

---

## The Three Buckets

Before running a single command, identify which bucket your problem falls into. This tells you exactly which tools to reach for.

```
Bucket 1 — Connectivity:  "I cannot reach the server at all"
Bucket 2 — DNS:           "I cannot resolve the hostname"
Bucket 3 — Service:       "I can reach the server but the app does not respond"
```

Start at Bucket 1 and work forward. There is no point debugging DNS if the server is not even reachable. There is no point debugging the app if the port is blocked.

---

## The Diagnostic Playbook

Work through these steps in order. Each step rules out one possible cause.

### Step 1 — Raw Connectivity

Check if you can reach anything at all, bypassing DNS entirely by using IP addresses directly.

```bash
ping 8.8.8.8          # Can I reach the internet? (Google's DNS IP — no DNS needed)
ping 192.168.1.1      # Can I reach my local gateway?
ip addr show          # Do I actually have an IP address assigned?
ip route show         # Is my routing table correct?
```

```
Reading the results:

ping 8.8.8.8 works    -> you have internet. Problem is DNS or the service.
ping 8.8.8.8 fails    -> no internet. Check ip addr (no IP?) or ip route (no gateway?)
ping gateway fails    -> local network issue. Wrong subnet, bad cable, wrong gateway.

ip addr show output:
  No IP at all        -> DHCP failed or static IP not configured
  169.254.x.x         -> DHCP failed, OS assigned a self-link address (not real)
  Correct IP          -> Layer 3 is fine, problem is above this
```

### Step 2 — DNS Check

Once you know the network itself works, check if names resolve correctly.

```bash
dig google.com                  # Does DNS resolve at all?
dig @8.8.8.8 google.com         # Bypass your local DNS, query Google directly
cat /etc/resolv.conf            # What DNS server is your machine configured to use?
cat /etc/hosts                  # Any local overrides that might conflict?
```

```
Reading the results:

dig google.com fails, dig @8.8.8.8 google.com works
  -> Your local DNS server (/etc/resolv.conf) is broken
  -> Fix: point to a working DNS (8.8.8.8) or restart your DNS resolver

Both fail
  -> Firewall is blocking UDP port 53 (DNS)
  -> Or no network at all (go back to Step 1)

dig works but app still fails with "name not known"
  -> Check /etc/hosts for a conflicting override on that hostname
```

### Step 3 — Port and Service Check

The network is fine and DNS resolves. Now check if the service is actually running and listening on the right port.

```bash
ss -tulpn | grep :80            # Is something listening on port 80?
ss -tulpn | grep :3000          # Is my app listening on port 3000?
sudo lsof -i :80                # Which process is using port 80?
systemctl status nginx          # Is nginx running? What does its status say?
systemctl status myapp          # Is my application service running?
```

```
Reading ss -tulpn output:

tcp  LISTEN  0  128  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1234))
     |                |                              |
     Listening        Port 80                        Process name

If nothing shows for port 80:
  -> The service is not running or it started on a different port
  -> Check your app config for which port it binds to
  -> Start the service: sudo systemctl start nginx

If the process shows but app still fails:
  -> It is listening but something else is wrong (firewall, config)
  -> Move to Step 4
```

### Step 4 — Application Response

The service is running and listening. Now test if it actually responds correctly.

```bash
# Test from inside the server first — removes network/firewall from the equation
curl -v http://localhost:80

# Test from outside
curl -v http://server-ip:80

# Get just the HTTP status code
curl -o /dev/null -s -w "%{http_code}" http://server-ip

# Test HTTPS and see full certificate + response details
curl -v https://yourdomain.com
```

```
Reading curl -v output:

* Connected to server-ip (x.x.x.x) port 80   -> TCP connection worked
< HTTP/1.1 200 OK                              -> app responded correctly
< HTTP/1.1 502 Bad Gateway                    -> nginx running, upstream app broken
< HTTP/1.1 504 Gateway Timeout                -> upstream app too slow

curl localhost:80 works but curl server-ip:80 fails
  -> The app itself is fine
  -> Something is blocking external traffic: firewall or security groups
  -> Move to Step 5
```

### Step 5 — Firewall Check

Everything works locally but external traffic cannot reach the service. The firewall is blocking it.

```bash
# Check current ufw rules
sudo ufw status verbose

# Try to connect raw to a port (from another machine)
telnet server-ip 80
# "Connected to server-ip" = port is open and reachable
# Hangs                    = firewall is dropping packets (no response)
# "Connection refused"     = firewall is passing but nothing listens there

# On AWS — check Security Groups in the console
# Inbound rules must allow the port from the right source
```

```
Common firewall fixes:

sudo ufw allow 80/tcp           # Open HTTP
sudo ufw allow 443/tcp          # Open HTTPS
sudo ufw allow from x.x.x.x to any port 22   # SSH from specific IP only

On AWS:
  Go to EC2 -> Security Groups -> Inbound Rules
  Add rule: Type=HTTP, Port=80, Source=0.0.0.0/0
```

---

## Common Errors and Exact Fixes

| Error | What It Means | Fix |
|---|---|---|
| `Connection refused` on port X | Nothing is listening on that port | Start the service / check what port your app actually binds to |
| `Connection timed out` | Packet dropped — firewall blocking it | Open the port in ufw / check AWS Security Groups |
| `Name or service not known` | DNS resolution failed | Check `/etc/resolv.conf` / test with `dig @8.8.8.8` |
| `502 Bad Gateway` | nginx running, upstream app broken | Check app logs: `journalctl -u myapp -f` |
| `504 Gateway Timeout` | Upstream app too slow | Check app performance / increase nginx `proxy_read_timeout` |
| `Permission denied (publickey)` | SSH key mismatch | Check `~/.ssh/authorized_keys` on the server |
| `ssh: connect to host X port 22` | SSH port blocked or server is down | Check firewall / verify server is up |
| `curl: (7) Failed to connect` | Port is not open or service not running | Run `ss -tulpn | grep :PORT` on the server |

---

## Reading Logs — Where to Look

When curl returns a bad status code, the next step is always logs.

```bash
# Nginx access and error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Systemd service logs (works for any service managed by systemd)
journalctl -u nginx -f              # follow nginx logs live
journalctl -u myapp --since "10 min ago"   # last 10 minutes of your app

# Auth log — SSH attempts
grep "Failed password" /var/log/auth.log | tail -20
grep "Accepted publickey" /var/log/auth.log | tail -10

# Kernel and system messages
dmesg | tail -20
```

```
What to look for in logs:

nginx error.log:
  "connect() failed (111: Connection refused)"  -> app is not running on that port
  "no live upstreams while connecting to upstream" -> all backend instances are down
  "upstream timed out (110)"                    -> app is running but too slow

journalctl for your app:
  Look for the actual exception or error message
  This is where you find why the app crashed or is returning 500s
```

---

## traceroute — Finding Where Packets Die

When a connection just hangs or packets never arrive, `traceroute` shows you every hop between you and the destination. You can see exactly where packets stop.

```bash
traceroute google.com          # on Linux
tracert google.com             # on Windows

# Example output:
# 1  192.168.1.1 (your router)        1.2ms
# 2  10.10.1.1   (ISP gateway)        8.4ms
# 3  * * *                            (firewall dropping ICMP — normal)
# 4  142.250.x.x (Google)             12.1ms

# * * * means that hop is not responding to ICMP
# Not necessarily broken — many firewalls silently drop ICMP
# If every hop from a point onwards is * * *, something is blocking there
```

---

## The Decision Tree

```
Cannot connect to the app?
  |
  +-> ping 8.8.8.8
        |
        +-> fails -> No network. Check ip addr, ip route, cable, ISP
        |
        +-> works -> Network is fine
              |
              +-> dig hostname
                    |
                    +-> fails -> DNS broken. Check /etc/resolv.conf
                    |
                    +-> works -> DNS is fine
                          |
                          +-> curl localhost:PORT on server
                                |
                                +-> fails -> Service not running.
                                |            Check: systemctl status, ss -tulpn
                                |
                                +-> works -> Service runs locally but blocked externally
                                              Check: ufw status, AWS Security Groups
                                              Use: telnet server-ip PORT to confirm
```

---

## Quick Reference

```
Systematic order — always work through this:
  1. ping 8.8.8.8                         -> can I reach the internet?
  2. dig hostname / dig @8.8.8.8 hostname -> does DNS resolve?
  3. ss -tulpn | grep :PORT               -> is the service listening?
  4. curl -v http://localhost:PORT        -> does the app respond locally?
  5. curl -v http://server-ip:PORT        -> does it respond from outside?
  6. sudo ufw status verbose              -> what is the firewall allowing?

Three error buckets:
  Connection refused  -> nothing listening on that port   -> start the service
  Connection timed out -> firewall dropping packets       -> open the port
  Name not known      -> DNS failing                      -> fix /etc/resolv.conf

Log locations:
  /var/log/nginx/error.log          -> nginx errors
  journalctl -u servicename -f      -> any systemd service
  /var/log/auth.log                 -> SSH attempts

Key tools:
  ping      -> raw connectivity (uses ICMP)
  dig       -> DNS resolution check
  ss -tulpn -> what is listening on which port
  curl -v   -> full HTTP request with headers
  telnet    -> raw TCP port connectivity test
  traceroute -> where packets stop in the network path
```

## Quick Reference — All Networking Commands

Every networking command you will ever need, organised by what question it answers. Bookmark this page — you will come back to it constantly when working on any server.

### Command Tables by Category

#### Connectivity Testing

| Command | What It Answers |
|---|---|
| `ping -c 4 host` | Is this host reachable? |
| `ping -c 1 -W 2 host` | Quick check with 2s timeout |
| `traceroute host` | Where does the path to this host fail? |
| `mtr host` | Live traceroute with packet loss per hop |
| `curl -I https://host` | Is the web server responding? |
| `telnet host port` | Is this specific TCP port open? |

#### DNS Lookup

| Command | What It Answers |
|---|---|
| `dig domain` | Full DNS query with all details |
| `dig +short domain` | Just the IP address |
| `dig domain MX` | Mail server records |
| `nslookup domain` | Quick DNS lookup |
| `dig @8.8.8.8 domain` | Query Google DNS directly |
| `cat /etc/resolv.conf` | What DNS server am I using? |
| `cat /etc/hosts` | Any local DNS overrides? |

#### Port & Service

| Command | What It Answers |
|---|---|
| `ss -tulpn` | All listening ports + which process |
| `ss -tulpn \| grep :80` | Is something on port 80? |
| `sudo lsof -i :3000` | Which process owns port 3000? |
| `netstat -tulpn` | Same as ss (older systems) |

#### Interface & Routing

| Command | What It Answers |
|---|---|
| `ip addr show` | What are my IP addresses? |
| `ip route show` | What is my routing table? |
| `hostname -I` | Quick list of my IPs |
| `curl -s ifconfig.me` | What is my public IP? |
| `ip route \| grep default` | What is my gateway? |

#### Downloads & HTTP

| Command | What It Does |
|---|---|
| `curl -v https://url` | Verbose request — shows all headers |
| `curl -X POST url -d '{}'` | POST with JSON body |
| `curl -o /dev/null -s -w "%{http_code}" url` | Just get status code |
| `wget url` | Download a file |
| `wget -c url` | Resume interrupted download |

#### Firewall

| Command | What It Does |
|---|---|
| `sudo ufw status verbose` | See all rules |
| `sudo ufw allow 443` | Open a port |
| `sudo ufw deny 3306` | Block a port |
| `sudo ufw enable` | Turn firewall on |
| `sudo firewall-cmd --list-all` | Rules on CentOS/RHEL |

---

## What Comes After Networking

You have now completed the two most critical foundations. Every tool you learn from here — Docker, Kubernetes, cloud networking — is just networking concepts with different names. You already understand how they work underneath.

### Your DevOps Roadmap From Here

```
[DONE] Linux (Module 1 -- complete)
[DONE] Networking (Module 2 -- you are here)
         ↓
[NEXT] Scripting and Python
```

> 📚 **Resources to Go Deeper:**
> - [Cloudflare Learning Center](https://www.cloudflare.com/learning/) — The best free explanations of networking on the internet
> - [Julia Evans Networking Zines](https://wizardzines.com) — Visual beginner-friendly networking guides
> - [Subnet Calculator](https://www.subnet-calculator.com/) — Calculate subnets visually with a tool
> - [ExplainShell](https://explainshell.com) — Paste any command and see exactly what each part does

