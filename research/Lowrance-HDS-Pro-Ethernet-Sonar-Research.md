# Tapping and Decoding Live Sonar/Structure Traffic from Lowrance HDS Pro MFDs over Ethernet

*A cited research report. Compiled June 2026.*

---

## Executive summary — the one thing to know

There is a hard split in how well-understood the Navico/Lowrance ecosystem is, and your goal sits on the wrong side of it:

- **The recorded sonar log formats (`.sl2` / `.sl3` / `.slg`) are thoroughly reverse-engineered** — documented down to byte offsets, with many mature open-source parsers.
- **The Navico broadband radar Ethernet protocol is also well reverse-engineered** (OpenCPN `radar_pi`), proving live Navico Ethernet decoding is feasible.
- **But the LIVE sonar / StructureScan / ActiveTarget imagery stream over Ethernet is genuinely undocumented.** After extensive searching of GitHub, owner forums, and reverse-engineering communities, there is **no known public project that captures and decodes the live sonar imagery wire protocol.** The closest anyone gets is (a) extracting a single *depth scalar* from the stream, or (b) screen-mirroring the MFD's rendered display over an undocumented RTSP feed.

So: you can absolutely capture the packets (the networking is standard Ethernet), and you have a strong "Rosetta Stone" in the documented `.sl3` log format — but decoding the live sonar payload would be original reverse-engineering work, not the application of an existing tool.

---

## 1. Network architecture of HDS Pro and the Navico ecosystem

### Two separate data fabrics

A Navico-family vessel (Lowrance, Simrad, B&G all share the ecosystem) carries **two distinct networks** with completely different roles:

**NMEA 2000 (a CAN bus) — low-bandwidth nav/instrument data.** The HDS Pro install guide describes its single NMEA 2000 port as supporting "data sharing between connected sources... suitable for a compass, engine computers, and other sensors." This is the standardized (with proprietary extensions) backbone for GPS position, depth *value*, speed, wind, heading, engine, and AIS data. It runs at 250 kbps — far too slow for sonar imagery. The backbone is a powered trunk (≤100 m, its own fused 12 V supply, a terminator at each end) with short drop cables (≤6 m) to each device. ([HDS Pro install guide](https://www.retailspecs.com/files/pdf/attachment/140627/000-15996-001-Installation-Guide.pdf); [HDS Live install manual](https://defender.com/assets/pdf/lowrance/hds-live_im_en_988-12076-004_w.pdf); [Lowrance NMEA 2000 blog](https://www.lowrance.com/news-videos/blog-nmea-2000-network-install/))

**Ethernet — high-bandwidth imagery and sharing.** The HDS Pro install guide states plainly: *"Ethernet is used to connect devices such as radar, displays, and sonar modules such as ActiveTarget®2 or S3100. Connect a device directly to the Ethernet port, or use a network expansion device to connect multiple devices."* Confirmed data types over Ethernet:

- **Radar imagery** (HALO/broadband radars are Ethernet devices).
- **Chart cartography** — *"Charts on chart cards are shared over the Ethernet network, so only one chart card per vessel is required."* ([HDS Pro Operator Manual](https://productimageserver.com/literature/ownersManual/96135OM.pdf))
- **Network sonar sharing** — *"allows you to share transducers from one unit with other units connected on the Ethernet network."* ([Operator Manual](https://productimageserver.com/literature/ownersManual/96135OM.pdf))
- **ActiveTarget / ActiveTarget 2** live sonar and the **S3100** sonar module.
- **Software/chart updates.**
- **NOT shared:** composite video input is local-only — *"The video images will not be shared with another unit via the network."* ([HDS Pro install guide](https://www.retailspecs.com/files/pdf/attachment/140627/000-15996-001-Installation-Guide.pdf))

### Physical layer, speed, and switching

The Navico Ethernet is **electrically standard Ethernet with proprietary (sealed marine) connectors** — as marine-electronics analyst Ben Ellison (Panbo) puts it, *"I'm not aware of any MFDs that use non-standard Ethernet, though many use non-standard connectors."* ([Panbo](https://panbo.com/marineelectronicsforum/network-your-boat/multiple-plotters-supported-from-a-standard-ethernet-switch/))

- **Speed:** The legacy Navico Ethernet (yellow 5-pin connector, used by HDS Pro's own ports, HDS Live, and the NEP-2 switch) is **100BASE-T (100 Mbit/s)**. HDS Pro's spec line reads "Ethernet 100BASE-T, 2 ports (5-pin connector)." The 100 Mbit ceiling reflects 4-wire (two-pair) cabling. ([HDS Pro install guide](https://www.retailspecs.com/files/pdf/attachment/140627/000-15996-001-Installation-Guide.pdf))
- **Switched network:** Multiple MFDs, radar, and sonar modules connect through a marine Ethernet switch. The **NEP-2** (P/N 000-10029-001) is a 5-port 100 Mbit waterproof switch; the newer **NEP-3** (P/N 000-16008-001) is a 5-port **gigabit** switch using green 8-pin M12 connectors. ([NEP-2 at GPS Store](https://www.thegpsstore.com/Brands/Lowrance-Electronics/Navico-NEP-2-Network-Expansion-Port-for-Lowrance-and-Simrad); [NEP-3 at Defender](https://defender.com/en_us/navico-nep-3-five-port-m12-gigabit-ethernet-switch-000-16008-001))
- Note: an HDS Pro display port stays at 100 Mbit even on a gigabit NEP-3, because the display's own port is 100BASE-T.

### Connectors and adapters (you will need these to tap in)

The MFDs use a proprietary sealed connector, **not** bare RJ45. To insert a switch or tap you must break out to standard RJ45:

- **Yellow 5-pin Ethernet** (legacy; HDS Pro, HDS Live, NEP-2). Official RJ45 adapters: **000-10438-001** (RJ45-M to Yellow-5pin-F, ~$53) and **000-0127-56** (5-pin-M to RJ45-F, 2 m, ~$49). ([Lowrance adapter 000-10438-001](https://www.lowrance.com/lowrance/type/accessories/adapter-ethernet-rj45-m-to-yellow-f/); [Lowrance adapter 000-0127-56](https://www.lowrance.com/lowrance/type/accessories/sensor-networking-accessories/ethrnt-yelw-cbl-5-pin-malerj45-fmale-2m/))
- **Green 8-pin M12** (newer; NEP-3, gigabit). Adapter to yellow 5-pin: 000-16448-001; to RJ45: 000-16078-001. ([GPS Store NEP-3 page](https://www.thegpsstore.com/Brands/Lowrance-Electronics/Navico-NEP-3-Network-Expansion-Port-for-Lowrance-Simrad-BG))
- **Pinout reality:** community testing found the yellow connector follows T-568B, with only the **orange and green pairs active** (i.e. 100BASE-TX over two pairs) and a 5th pin as shield. This means a cheap 10/100-class tap is well-matched. A DIY route is to cut a yellow-to-yellow cable and crimp RJ45 onto each half. ([The Hull Truth — yellow/RJ45 pinout](https://www.thehulltruth.com/marine-electronics-forum/728644-lowrance-ethernet-yellow-rj-45-connector.html); [Cruisers Forum](https://www.cruisersforum.com/forums/f134/help-wiring-rj45-connector-for-navico-radar-213616.html))

### HDS Pro vs. HDS Live vs. HDS Carbon

HDS Pro (announced Dec 2022, on sale 2023; 9/10/12/16") **retains the same yellow 5-pin, 100BASE-T Navico Ethernet** on its own connectors — it did not move to gigabit hardware at the display. The notable networking change is **two Ethernet ports per display** (vs. one on HDS Live), which lets you daisy-chain displays/radar/sonar without always needing an external switch, and it supports **two ActiveTarget modules simultaneously**. ([HDS Pro install guide](https://www.retailspecs.com/files/pdf/attachment/140627/000-15996-001-Installation-Guide.pdf); [Panbo HDS Pro launch](https://panbo.com/lowrance-unveils-new-hds-pro-activetarget-2-and-active-imaging-hd/); [The Hull Truth — HDS Live vs Pro networking](https://www.thehulltruth.com/marine-electronics-forum/1274391-hds-live-pro-network-question.html))

HDS Live and HDS Carbon use the same yellow 5-pin 100BASE-T scheme. (HDS Carbon's exact port count was not line-item verified in this research but is the same Navico Ethernet family.)

### Shared ecosystem (Lowrance / Simrad / B&G)

Lowrance, Simrad, and B&G are all **Navico Group** brands (a division of Brunswick). *"The connectors are the same across the Navico brands"* (Panbo), and the NEP-2/NEP-3 switches and radar domes are explicitly cross-branded. **Important caveat:** Navico does **not** guarantee or test cross-brand *software* compatibility — mixing brands on one Ethernet net often works but can break on a firmware update. ([Panbo — cross-brand Ethernet](https://panbo.com/marineelectronicsforum/network-your-boat/multiple-plotters-supported-from-a-standard-ethernet-switch/))

---

## 2. How to physically/logically capture the traffic

### The core problem: a switch won't show you other devices' unicast traffic

On a modern **switched** network you cannot simply plug a laptop into a spare port and see everything. A switch learns which MAC lives on which port and forwards **unicast** frames only out the destination port — your sniffer sees nothing of a conversation between two other devices. ([Global Knowledge — how switches work](https://www.globalknowledge.com/us-en/resources/resource-library/articles/how-switches-work/))

Old **hubs** (Layer-1 repeaters) flooded every frame to every port, making sniffing trivial — but **genuine 10/100 hubs are now essentially extinct**; almost everything sold today as a "switch" or "hub" is a switch. Don't count on finding a real one. ([PlaneTech — hub vs switch](https://planetechusa.com/what-is-the-difference-between-an-ethernet-hub-and-a-switch/); [Cisco community](https://community.cisco.com/t5/switching/is-an-unmanaged-switch-actually-a-hub/td-p/2377200))

### The free win: multicast and broadcast are flooded by default

This is the most important practical point for Navico work. A switch floods **broadcast** to all ports, and **by default treats multicast like broadcast** — flooding it to all ports — *unless* IGMP snooping is enabled. ([CBT Nuggets — IGMP snooping](https://www.cbtnuggets.com/blog/technology/networking/what-is-igmp-snooping))

Because the most useful Navico traffic — **GoFree service discovery and the radar/sonar discovery and imagery streams — is UDP multicast**, you may see it on any switch port with **no SPAN and no tap**, provided IGMP snooping is off. What you will *not* see this way is unicast payload between two specific devices. So:

- Relying on "free" multicast visibility — make sure **IGMP snooping is OFF** (default-off on many cheap switches).
- Need unicast payload — use SPAN or a tap (below).

### Method 1 — Port mirroring / SPAN (cheapest)

Configure a managed switch to copy traffic from the device port(s) to a monitor port where your laptop captures. On a **TP-Link Easy Smart (TL-SG105E/SG108E)**: Monitoring → Port Mirror → enable, set mirroring (destination) port = laptop, mirrored (source) ports = device ports, mode = both Ingress+Egress. On a **Netgear GS105E/GS108E**: Monitoring → Mirroring → set Destination Port, Mirroring Direction = "Tx and Rx", tick Source Ports, Apply. ([TP-Link port mirror FAQ](https://www.tp-link.com/us/support/faq/527/); [Netgear KB 21852](https://kb.netgear.com/21852/); [Wireshark SwitchReference/NetGear](https://wiki.wireshark.org/SwitchReference/NetGear))

Tradeoffs: cheap and flexible, but the monitor port can be **oversubscribed and silently drop** mirrored packets under heavy load, and switches **don't mirror physical-layer errors**. ([Dualcomm — TAP vs SPAN](https://www.dualcomm.com/blogs/articles/tap-vs-span-their-pros-and-cons))

### Method 2 — Inline network tap (most reliable, safest on a live nav net)

A tap splices inline into a cable, passing live traffic through while copying it to monitor port(s).

- **Throwing Star LAN Tap** (Great Scott Gadgets) — the canonical cheap *passive* 10/100 tap, no power needed. Monitor ports are **receive-only** (it physically cannot inject onto the target network — a real safety advantage on a live boat). A passive full-duplex tap presents the two directions on two monitor ports, so you may need **two capture NICs** and merge afterward. It deliberately forces gigabit links to renegotiate down to 100M (fine here, since Navico display links are 100M anyway). ([Throwing Star LAN Tap](https://greatscottgadgets.com/throwingstar/))
- **Dualcomm ETAP** — a powered *aggregating* tap that combines both directions into one stream (single NIC), at full gigabit with no packet loss; some models are zero-delay failsafe (link survives tap power loss). ([Dualcomm USB tap](https://www.dualcomm.com/products/usb-powered-10-100-1000base-t-network-tap))

Advantages over SPAN: **no dropped packets** under load, sees physical errors, no configuration, and cannot accidentally inject. Downsides: costs more, one tap watches one link. ([Dualcomm — TAP vs SPAN](https://www.dualcomm.com/blogs/articles/tap-vs-span-their-pros-and-cons); [Wikipedia — network tap](https://en.wikipedia.org/wiki/Network_tap))

### Method 3 — Capturing with Wireshark

- Use a **dedicated capture NIC** (e.g. a USB-Ethernet adapter) connected only to the tap/monitor port; keep your management/internet NIC separate.
- **Capture filters** (BPF, e.g. `udp port 6678`) decide what's written to disk and can't change mid-capture; **display filters** (e.g. `ip.addr==239.2.1.1`) only change what's shown and can be edited live. ([Wireshark capture filters](https://wiki.wireshark.org/CaptureFilters); [display filters](https://wiki.wireshark.org/DisplayFilters))
- **Workflow:** start broad (no capture filter) to discover device IPs and multicast groups via GoFree/discovery traffic, then narrow with display filters.
- **High-bandwidth captures (sonar/radar are heavy):** capture with **`dumpcap`**, not the GUI; increase the capture buffer; disable real-time packet list, auto-scroll, coloring, and DNS name resolution; use a fast SSD and a ring buffer. ([Wireshark performance](https://wiki.wireshark.org/Performance); [dumpcap man page](https://www.wireshark.org/docs/man-pages/dumpcap.html))

### Suggested rig for a Navico capture

Yellow-to-RJ45 adapter(s) → a small managed switch with SPAN **or** a Throwing Star / Dualcomm tap inline on the MFD-to-sonar-module cable → RJ45 → dedicated capture NIC → `dumpcap`/Wireshark. Start broad to grab multicast discovery; SPAN/tap a specific link for unicast payload. Prior art confirms this approach works — researchers used Wireshark to analyze Navico Ethernet for the radar reverse-engineering. ([ResearchGate — Navico radar interface paper](https://www.researchgate.net/publication/226363952))

---

## 3. What's known about the live Ethernet protocol (and what isn't)

A naming correction worth stating: the widely cited blog `stripydog.blogspot.com` ("The Curious World of Marine Data Networking") is by **Keith Young** (author of *kplex*), **not** Kees Verruijt. Verruijt authored *canboat* and leads the OpenCPN radar plugin. Both are central figures in this community but are different people.

Public knowledge falls into three sharply different tiers.

### (A) Well reverse-engineered

**Broadband Radar (BR24 / 3G / 4G / HALO)** is the best-decoded part of the entire ecosystem, with two independent code lineages that agree on the wire format: OpenCPN **`radar_pi`/`BR24radar_pi`** (Kees Verruijt et al.) and the academic **OpenBR24** work (Dabrowski et al., Springer 2011), plus a Lua Wireshark dissector in **`fkie-cad/maritime-dissector`**. ([radar_pi](https://github.com/opencpn-radar-pi/radar_pi); [BR24radar_pi](https://github.com/keesverruijt/BR24radar_pi); [maritime-dissector](https://github.com/fkie-cad/maritime-dissector); [Springer paper](https://link.springer.com/chapter/10.1007/978-3-642-22836-0_12))

- **Transport:** IPv4 **UDP multicast** over 100 Mbit Ethernet, little-endian fields. Multicast means no DHCP dependency — any IPv4 address works.
- **Multicast addresses/ports (legacy fixed, verified in source *and* in the dissector docs):** data `236.6.7.8:6678`, report `236.6.7.9:6679`, command `236.6.7.10:6680` (radar A); a 4G's second radar uses `236.6.7.13/15/14`. Newer 4G++/HALO announce on `236.6.7.5:6878` and are discovered via a wake command and a discovery report carrying serial + packed IP/port fields. ([br24Receive.cpp](https://github.com/keesverruijt/BR24radar_pi/blob/master/src/br24Receive.cpp); [BR24-protocol.md](https://raw.githubusercontent.com/fkie-cad/maritime-dissector/master/docs/BR24-protocol.md))
- **Packet structure:** the radar batches **32 spokes** per UDP frame; each scanline = 24-byte header + 512 bytes of 8-bit grayscale pixels (one byte per range bin) — 17,160-byte frame. Headers carry status, a mod-4096 spoke counter, angle, heading, and range/scale. Control is a register protocol (write `0xC1`/read `0xC2`) to the command multicast, with a mandatory ~10 s keep-alive.
- **Honest caveat:** the core path (angle, range, intensity, transmit/range/gain control, discovery) is solved and working; many auxiliary fields are still labeled "unknown" in the source, and the two codebases disagree on minor 4G details.

**GoFree service discovery** is **documented by Navico itself** (not reverse-engineered) and corroborated by the stripydog blog:

- Mechanism: **Bonjour/mDNS + JSON announcements over UDP multicast**.
- **Multicast group `239.2.1.1`, port `2052`** (legacy `2050`), announced at **1 Hz**; a client treats an MFD as gone after ~2 s of silence. Verified in the GoFree Tier 2 toolkit PDF's prose and its sample code. ([GoFree Tier 2 toolkit PDF](https://s3-eu-west-1.amazonaws.com/navicodigitalassets/AMER/GoFree/GoFree+Tier+2+toolkit.pdf); [stripydog](http://stripydog.blogspot.com/2014/01/the-curious-world-of-marine-data.html))
- JSON: `{ "Name", "IP", "Model", "Services":[ { "Service", "Version", "Port" } ] }`.

### (B) Partially known / published but gated

**GoFree data APIs** expose only scalar/instrument data, **not imagery**:
- **Tier 1** = NMEA 0183 v4.00 sentences over TCP, read-only (depth as a *number*, not sonar). ([Tier 1 spec mirror](https://docplayer.net/13076255-Contents-gofree-tier-1-networking-specification.html))
- **Tier 2** = JSON over WebSocket (TCP 443, service `navico-nav-ws`); explicitly *"digital data does not include high bandwidth data such as radar or sonar."* The full SDK requires a (nominally free) Navico license that developers in ~2017 found effectively unobtainable. ([GoFree Tier 2 PDF](https://s3-eu-west-1.amazonaws.com/navicodigitalassets/AMER/GoFree/GoFree+Tier+2+toolkit.pdf); [Panbo — GoFree SDK access issues](https://mt.panbo.com/2017/09/navico-gofree-sdk.html))
- Tiers above 2 — **Tier 3 (MPEG4 video), Tier 4 ("custom radar and sonar"), Tier 5 (file transfer)** — were the only sanctioned imagery routes, required Navico approval and now-discontinued WiFi-1 hardware, and have **no open-source implementation.** ([Panbo — GoFree Toolkit](https://panbo.com/navico-gofree-toolkit-developers-invited/))

### (C) Genuinely undocumented — the live sonar imagery stream

**Bottom line: the live, real-time sonar / StructureScan / DownScan / ActiveTarget echo-data wire protocol over Navico Ethernet is essentially undocumented and has NOT been publicly reverse-engineered into a usable open spec.** Across extensive searching of GitHub (`opensounder`, `radar_pi`, Signal K, OpenCPN/OpenMarine), forums, and blogs, no public project decodes the per-ping sonar imaging stream. (This is a proof-of-absence — it can't exclude a private effort — but the absence is conspicuous given how present the radar and log-file work are in the same communities.)

What people do instead, none of which is decoding the sonar wire protocol:

1. **Screen-mirror the rendered display** via an undocumented RTSP/H.264 feed (`rtsp://<MFD-IP>:554/screenmirror`, found by firmware inspection). This yields a *picture of the screen*, not sonar data. ([ArduPilot forum](https://discuss.ardupilot.org/t/lowrance-hds-stream-full-sonar-to-pc-mission-planner/104674))
2. **Extract one depth scalar.** Even commercial gateway maker **Yacht Devices** can pull only the StructureScan *depth value*, and instructs users to Wireshark-hunt for **1429-byte packets with first data byte `0x28` on UDP port `10754`** — strong evidence the broader stream is opaque even to industry. ([Yacht Devices — StructureScan](https://www.yachtd.com/news/lowrance_strucurescan_3d.html))
3. The OpenCPN community's own verdict: no sonar plugin exists because *"Fishfinders, like radars, require high-speed interfaces… some proprietary format"* — wanted, not done. ([OpenMarine forum](https://forum.openmarine.net/showthread.php?tid=3545))

No public protocol analysis of **ActiveTarget** specifically was found at all.

---

## 4. The recorded `.sl2` / `.sl3` log formats (the well-understood Rosetta Stone)

Unlike the live wire protocol, the **recorded** Lowrance/Navico log formats are documented to the byte. The canonical references are **Herbert Oppmann's "Navico Sonar Log File Format" PDF** and the **OpenStreetMap SL2 wiki**, corroborated by parser source code. ([Oppmann PDF](https://www.memotech.franken.de/FileFormats/Navico_SLG_Format.pdf); [OSM SL2 wiki](https://wiki.openstreetmap.org/wiki/SL2); [opensounder format docs](https://github.com/opensounder/sounder-log-formats/blob/master/lowrance/sl-format.md))

### Format family

A format code in the file header distinguishes: **format 1 = `.slg`** (sonar only, oldest), **format 2 = `.sl2`** (adds DownScan/SideScan/StructureScan), **format 3 = `.sl3`** (adds ForwardScan + a 3D channel). All values little-endian; floats IEEE-754 32-bit.

### Structure

- **File header:** 8 bytes for sl2/sl3 — Format (ushort), Version (ushort), BytesPerSounding/blocksize (ushort), flags. Then a contiguous list of frames, no gaps.
- **SL2 frame header:** a **fixed 144 bytes**, followed by `PacketSize` bytes of sounding data. Key offsets (cross-confirmed): FrameSize (+28), ChannelType (+32), PacketSize (+34), WaterDepth feet (+64), Speed (+100), Water temperature °C (+104), **Easting (+108) / Northing (+112)**, Track/heading (radians), Flags (+132), TimeOffset ms (+140), then amplitude bytes at +144. Each frame also stores the file offsets of the last frame of each channel (an in-file linked list).
- **SL3 frame header:** reorganized and larger — **168 bytes** for normal channels, **128 bytes** for channel types 7/8 (parsers must branch). Same logical fields at different offsets — e.g. depth at +48 (vs +64 in SL2), lat/lon at +92/+96 (vs +108/+112). SL3 moves the per-channel offset table to the *end* of the header and adds the 3D channel. The community SL3 offset documentation is explicitly self-flagged as not fully tested. ([opensounder format-3.md](https://github.com/opensounder/sounder-log-formats/blob/master/lowrance/format-3.md))

### Channel types and amplitude data

ChannelType: 0 primary, 1 secondary, 2 DownScan/DSI, 3 sidescan **left**, 4 sidescan **right**, 5 sidescan **composite** (StructureScan), 9 = 3D (SL3), 10/11 debug. The trailing `PacketSize` bytes are the actual returns: **one unsigned byte (0–255 amplitude) per range bin**, forming one column of the waterfall image per ping. ([datainwater — parsing in NumPy](https://www.datainwater.com/post/sonar_numpy/))

### Coordinate encoding (the "Lowrance int" trick)

Easting/Northing are 32-bit ints in a **spherical Mercator projection using the WGS84 polar radius 6356752.3142 m** (not the equatorial radius):

```
POLAR_EARTH_RADIUS = 6356752.3142
longitude = Easting  / POLAR_EARTH_RADIUS * (180/π)
latitude  = (2*atan(exp(Northing / POLAR_EARTH_RADIUS)) - π/2) * (180/π)
```

This identical formula appears in Oppmann's spec, the OSM wiki, and the NumPy parser. ([OSM SL2 wiki](https://wiki.openstreetmap.org/wiki/SL2))

### Open-source parsers and tools

- **Python:** `sllib` (pip, opensounder) — [github](https://github.com/opensounder/python-sllib); `sonarlight` (Kenneth Martinsen, MIT) — pandas DataFrame, `.image()`, `.sidescan_xyz()` — [github](https://github.com/KennethTM/sonarlight) / [PyPI](https://pypi.org/project/sonarlight/); the [datainwater NumPy tutorial/gist](https://gist.github.com/KennethTM/adfd2d786749dae64825be662b6f44b8); **PINGMapper** (Cameron Bodine, academic, georeferenced benthic mapping) — [github](https://github.com/CameronBodine/PINGMapper).
- **C#:** **SL3Reader** (Ákos Halmai, backs a peer-reviewed paper, exports georeferenced sidescan) — [github](https://github.com/halmaia/SL3Reader); **SonarLogApi** — [github](https://github.com/risty/SonarLogApi).
- **R:** **sonaR** — [github](https://github.com/KennethTM/sonaR).
- **Node/Go/Ruby/Java:** node-sl2format, sl2decode, sl2json, etc. (linked from the OSM wiki).
- **Commercial:** **ReefMaster** ([reefmaster.com.au](https://reefmaster.com.au/index.php/products/waypoint-manager)), Navico's own Insight Map Creator, SonarTRX.

*(Note: no repo literally named "lowmapper" or "pysl3" surfaced; the de-facto Python parsers are `sllib` and `sonarlight`. "sonarlight" is Python; "sonaR" is the R predecessor.)*

### Why this helps with the live stream — a hypothesis, not a fact

The recorded log is produced by the same MFD firmware that consumes the live stream, and the per-frame model (small metadata header + a run of one-byte-per-bin amplitudes, with channel-type and frequency enums) is exactly the granularity a live ping stream needs. So the documented log format gives you a **known dictionary** of field meanings, enum values, units (feet/knots/radians/°C), and the spherical-Mercator coordinate trick — useful for pattern-matching unknown bytes in captured Ethernet payloads.

**State this plainly as unverified:** no source confirms byte-for-byte correspondence. The live stream almost certainly differs in transport framing, handshaking/keep-alive/sequence packets, possibly field ordering, and the log's in-file offset pointers are a *file-storage* artifact meaningless on the wire. Treat the log format as a guide to **semantics and value encodings**, not a guaranteed packet layout — confirmable only by capturing live traffic while simultaneously recording a log and aligning the two.

---

## 5. Existing open-source projects for live Navico data

| Layer | Open-source live decoding? |
|---|---|
| NMEA 2000 / CAN (incl. proprietary Navico PGNs) | **Yes** — canboat, canboatjs, Signal K |
| GoFree WebSocket instrument data (Tier 1/2) | **Yes** — GoFreeWebSocketTest, gofree-ios, WsLogger |
| Navico **radar** imagery over Ethernet | **Yes** — radar_pi / BR24radar_pi |
| Navico **sonar/StructureScan imagery** over Ethernet (LIVE) | **No known open-source project** |
| Recorded sonar logs (.sl2/.sl3/.slg files) | Yes — but these are **files, not the live stream** |

- **Signal K** ([signalk.org](https://signalk.org/installation/)) — open marine data server; ingests **NMEA 0183/2000** (via canboatjs) and acts as a gateway. It does **not** decode the proprietary Navico Ethernet sonar imagery — only Navico data that appears on N2K/0183 (position, depth value, wind).
- **canboat** ([github](https://github.com/canboat/canboat)) — the gold-standard **NMEA 2000 (CAN)** PGN decoder, including reverse-engineered proprietary Navico PGNs. Its "Navico (TCP 8086)" input is still **CAN frames**, not sonar imagery.
- **radar_pi / BR24radar_pi** ([github](https://github.com/opencpn-radar-pi/radar_pi)) — the strongest existing example of open-source live decoding of a proprietary Navico **Ethernet** stream. It joins the radar multicast group and decodes imagery — but it's **radar, not sonar**. It proves the concept is feasible; there is no sonar equivalent.
- **GoFree WebSocket tools** ([GoFreeWebSocketTest](https://github.com/parsley72/GoFreeWebSocketTest), [gofree-ios](https://github.com/tomcheney/gofree-ios), [WsLogger](https://github.com/AndyBryson/WsLogger)) — all stream **instrument/CAN data over WebSocket**, explicitly excluding radar/sonar imagery.

**Direct answer to "does anything decode the live sonar Ethernet stream?": No.** All substantial open-source sonar work targets **recorded `.sl2`/`.sl3`/`.slg` files**, not the live feed.

---

## 6. Legal and practical caveats

*This is general information, not legal advice. Laws vary by country; consult a qualified attorney before acting — especially before distributing any tool.*

- **Firmware encryption/signing.** Assume modern Navico/Lowrance MFDs use **signed (and likely encrypted) firmware** (standard secure-boot practice), which makes extracting protocol details *from firmware* hard. Navico's specific scheme isn't publicly documented. Note that **passive network sniffing sidesteps firmware decryption entirely** — which matters for the legal analysis below. ([Lowrance firmware guide](https://lowrance.ladesk.com/302698-How-to-Update-Your-Lowrance-Firmware-Step-by-Step-Guide))
- **DMCA §1201 (US).** §1201 bars circumventing access-control measures and **"trafficking in" circumvention tools**. But **§1201(f) permits reverse engineering for interoperability**, and the pre-DMCA precedent **Sega v. Accolade (9th Cir. 1992)** held that reverse-engineering software for compatibility can be fair use. EFF's key warning: even when your own circumvention is exempt, **distributing the resulting tools may still violate the anti-trafficking provisions** — *"Do not distribute code or other tools... regulated under Section 1201 without talking to a lawyer first."* ([EFF Reverse Engineering FAQ](https://www.eff.org/issues/coders/reverse-engineering-faq); [Copyright Office §1201](https://www.copyright.gov/1201/); [Sega v. Accolade](https://en.wikipedia.org/wiki/Sega_v._Accolade))
- **Proprietary protocol risk.** Navico does **not publish** the Ethernet sonar/radar protocol and offers no API/license for the live imagery stream outside the gated GoFree program. Any reverse-engineered tool can **break with a firmware update** that changes ports, formats, or encryption — the same fragility the canboat/radar_pi communities manage by continuous re-observation.
- **Practical risk gradient.** Lowest risk: **passively sniffing your own network** read-only (as radar_pi does), provided you aren't circumventing an access-control measure to do it. Higher risk: **distributing circumvention tools**. Safety-critical: **never inject/replay traffic onto a live navigation network underway** — it can disrupt radar, sonar, or autopilot. Keep experimentation passive and/or on a bench. ([EFF FAQ](https://www.eff.org/issues/coders/reverse-engineering-faq); [canboat README](https://github.com/canboat/canboat))

---

## Honest known-vs-unknown ledger

**Solidly known:**
- Network architecture (Ethernet = imagery/radar/charts/sonar-sharing; N2K = scalar nav/instrument data); HDS Pro = 2× 100BASE-T yellow 5-pin ports; NEP-2/NEP-3 switches; cross-brand connector compatibility.
- How to capture (SPAN, taps, multicast flooding/IGMP, Wireshark/dumpcap).
- The radar Ethernet protocol (multicast addresses, spoke/scanline structure, control registers).
- GoFree discovery (`239.2.1.1:2052`, Bonjour+JSON) and GoFree Tier 1/2 scalar data.
- The `.sl2`/`.sl3` log formats down to byte offsets, with many parsers.

**Partially known:**
- Radar auxiliary fields; GoFree Tiers 3–5 (gated/closed); some SL3 offsets (community-flagged as untested).

**Genuinely undocumented:**
- The **live sonar / StructureScan / ActiveTarget imagery wire protocol** over Ethernet. Only a depth scalar (UDP 10754, 1429-byte/`0x28` packets per Yacht Devices) and a screen-mirror RTSP feed are publicly reachable. No open-source decoder exists.
- Whether the live stream's payload matches the documented log frames (plausible but unverified).

---

## Realistic path forward for your goal

1. **Build the capture rig:** yellow-to-RJ45 adapters → managed switch with SPAN (or a Throwing Star tap) on the MFD–S3100/StructureScan link → `dumpcap`/Wireshark on a dedicated NIC. Confirm IGMP snooping is off so you also see multicast.
2. **Map the network first:** capture broad, identify device IPs, and catalog the multicast groups/ports (expect GoFree `239.2.1.1:2052`; radar `236.6.7.x`; and check UDP `10754` for StructureScan). This alone tells you a lot.
3. **Isolate the sonar stream:** SPAN/tap the specific transducer-module-to-MFD link, identify the high-bandwidth UDP flow, and look for the ~1429-byte StructureScan packets Yacht Devices references as a starting landmark.
4. **Use the `.sl3` format as your decoding dictionary:** simultaneously record a `.sl3` log on the MFD while capturing, then align the per-ping amplitude byte runs and metadata (depth, channel, frequency) against the captured payload to test the Rosetta-Stone hypothesis.
5. **Expect original work:** there is no existing tool to finish this for you. Budget it as a genuine reverse-engineering project, keep it passive on your own gear, and don't distribute circumvention tooling without legal advice.

---

## Selected sources

**Architecture & hardware:** [HDS Pro install guide](https://www.retailspecs.com/files/pdf/attachment/140627/000-15996-001-Installation-Guide.pdf) · [HDS Pro Operator Manual](https://productimageserver.com/literature/ownersManual/96135OM.pdf) · [HDS Live install manual](https://defender.com/assets/pdf/lowrance/hds-live_im_en_988-12076-004_w.pdf) · [Panbo — HDS Pro launch](https://panbo.com/lowrance-unveils-new-hds-pro-activetarget-2-and-active-imaging-hd/) · [Panbo — cross-brand Ethernet](https://panbo.com/marineelectronicsforum/network-your-boat/multiple-plotters-supported-from-a-standard-ethernet-switch/) · [NEP-3 at Defender](https://defender.com/en_us/navico-nep-3-five-port-m12-gigabit-ethernet-switch-000-16008-001) · [Hull Truth — yellow/RJ45 pinout](https://www.thehulltruth.com/marine-electronics-forum/728644-lowrance-ethernet-yellow-rj-45-connector.html)

**Capture:** [TP-Link port mirror](https://www.tp-link.com/us/support/faq/527/) · [Netgear KB 21852](https://kb.netgear.com/21852/) · [Throwing Star LAN Tap](https://greatscottgadgets.com/throwingstar/) · [Dualcomm TAP vs SPAN](https://www.dualcomm.com/blogs/articles/tap-vs-span-their-pros-and-cons) · [CBT Nuggets — IGMP snooping](https://www.cbtnuggets.com/blog/technology/networking/what-is-igmp-snooping) · [Wireshark performance](https://wiki.wireshark.org/Performance)

**Live protocol:** [radar_pi](https://github.com/opencpn-radar-pi/radar_pi) · [br24Receive.cpp](https://github.com/keesverruijt/BR24radar_pi/blob/master/src/br24Receive.cpp) · [maritime-dissector BR24 protocol](https://raw.githubusercontent.com/fkie-cad/maritime-dissector/master/docs/BR24-protocol.md) · [GoFree Tier 2 toolkit PDF](https://s3-eu-west-1.amazonaws.com/navicodigitalassets/AMER/GoFree/GoFree+Tier+2+toolkit.pdf) · [stripydog — marine data networking](http://stripydog.blogspot.com/2014/01/the-curious-world-of-marine-data.html) · [Yacht Devices — StructureScan depth](https://www.yachtd.com/news/lowrance_strucurescan_3d.html) · [ArduPilot — Lowrance RTSP](https://discuss.ardupilot.org/t/lowrance-hds-stream-full-sonar-to-pc-mission-planner/104674) · [OpenMarine — no sonar plugin](https://forum.openmarine.net/showthread.php?tid=3545)

**Log formats & parsers:** [Oppmann SLG format PDF](https://www.memotech.franken.de/FileFormats/Navico_SLG_Format.pdf) · [OSM SL2 wiki](https://wiki.openstreetmap.org/wiki/SL2) · [opensounder format docs](https://github.com/opensounder/sounder-log-formats) · [datainwater NumPy tutorial](https://www.datainwater.com/post/sonar_numpy/) · [python-sllib](https://github.com/opensounder/python-sllib) · [sonarlight](https://github.com/KennethTM/sonarlight) · [SL3Reader](https://github.com/halmaia/SL3Reader) · [SonarLogApi](https://github.com/risty/SonarLogApi) · [PINGMapper](https://github.com/CameronBodine/PINGMapper) · [ReefMaster](https://reefmaster.com.au/index.php/products/waypoint-manager)

**Existing tools & legal:** [Signal K](https://signalk.org/installation/) · [canboat](https://github.com/canboat/canboat) · [GoFreeWebSocketTest](https://github.com/parsley72/GoFreeWebSocketTest) · [Panbo — GoFree SDK](https://mt.panbo.com/2017/09/navico-gofree-sdk.html) · [EFF Reverse Engineering FAQ](https://www.eff.org/issues/coders/reverse-engineering-faq) · [Copyright Office §1201](https://www.copyright.gov/1201/) · [Sega v. Accolade](https://en.wikipedia.org/wiki/Sega_v._Accolade)
