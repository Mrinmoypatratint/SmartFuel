# UI/UX Design System & Forecourt Interface Specifications

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**Target Market:** City Gas Distribution (CGD) Companies, Retail Fueling Stations, Commercial Fleet Hubs  
**Design Reference:** SF-ENT-UIUX-2026-V4.0  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Aesthetic Style:** Modern Enterprise Energy B2B — Clean, Authoritative, Professional Station Automation  
**Classification:** Proprietary / Commercial B2B  
**Changelog:** V4.0 incorporates CNG Connect Complete Vehicle Recognition & Queue Management UI layout (ACTIVE vehicle card, UPCOMING/QUEUE list, atomic Done button transaction UX, Camera health status) and GPT-4o Mini Vision API double verification indicators (dual-confirmed badges, AI confidence meter, multi-image evidence strip).  

---

## 1. Design Philosophy & Enterprise Identity

The user interface of the SmartFuel platform is engineered to convey **operational precision, industrial safety, and enterprise trust**. It represents a state-of-the-art commercial forecourt automation system built for energy companies, station operators, and safety supervisors.

### 1.1 Commercial Identity & Aesthetic Boundaries
* **Strict Prohibition of Government Emblems:** SmartFuel is a private commercial software system. All national flags, ministry mastheads, state emblems (Ashoka lions), and government agency disclaimers are strictly omitted.
* **Prohibition of AI Tropes & Sci-Fi Clutter:** Zero dark cyberpunk neon grids, floating holographic particles, pulsing cyan glows, or unreadable low-contrast neomorphic elements.
* **Realistic Commercial Energy Atmosphere:** Grounded in authentic industrial refueling station aesthetics, crisp card typography, high contrast, solid structural borders, and daylight readability.

### 1.2 Core Design Tenets
1. **Instant Comprehension:** Forecourt attendants must discern vehicle authorization status (**APPROVED**, **HOLD**, or **REVIEW**) in under 200 milliseconds from 5 to 10 meters away.
2. **Visual Richness with High Usability:** Combines dynamic visual elements (full-screen background photography carousel, forecourt showcase slider, and real-time live ticker) with rock-solid utilitarian controls.
3. **Responsive Multi-Form Factor:** Adapts fluidly across 24" high-brightness island monitors (`/cng-display`), supervisor desktop workstations (`/`), and attendant handheld rugged tablets.

---

## 2. Commercial Color Palette & Theming Tokens

The palette is derived from commercial energy corporate identities: Deep Admiralty Navy, Safety Gold/Amber, Industrial Charcoal, and internationally recognized safety signalling standards.

```
+----------------------------------------------------------------------------------------------------+
|                                    COMMERCIAL COLOR SYSTEM                                         |
|                                                                                                    |
|  [Deep Admiralty Navy]     [Safety Gold Accent]    [Compliant Status Green]  [Safety Interlock Red]|
|  #04127B / #0B1953         #FFAF00 / #D97706       #10B981 / #059669         #EF4444 / #DC2626     |
|  Brand Anchor & Headers    Highlights & Accents    Approved to Fuel          Hold / Cut-Off Active |
|                                                                                                    |
|  [Light Canvas Grey]       [Clean Card White]      [Structural Border]       [Primary Ink Text]    |
|  #F8FAFC                   #FFFFFF                 #E2E8F0 / #CBD5E1         #0F172A               |
|  Dashboard Canvas          Card Surface            1px Solid Structural      Crisp High-Contrast   |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Palette Tokens Table

| Token Name | Hex Code | Semantic Role & UI Application |
| :--- | :--- | :--- |
| `--brand-navy-dark` | `#04127B` | Primary enterprise header, brand masthead, and dark backdrop overlay. |
| `--brand-navy-card` | `#0B1953` | Forecourt directives container and contrast panels. |
| `--brand-gold` | `#FFAF00` | Safety Gold accent lines, highlight badges, and focus rings. |
| `--status-green` | `#10B981` | Approved compliance status; dispenser energized (`APPROVED`). |
| `--status-red` | `#EF4444` | Safety interlock trip; dispenser solenoid cut (`HOLD`). |
| `--status-amber` | `#F59E0B` | Low confidence or pending inspection review (`UNDER REVIEW`). |
| `--canvas-bg` | `#F8FAFC` | Main administrative portal background; clean, matte, non-reflective slate. |
| `--card-surface` | `#FFFFFF` | Portal card surfaces, inspection panels, and data tables. |
| `--border-subtle` | `#E2E8F0` | Crisp 1px solid container borders and table grid lines. |
| `--text-primary` | `#0F172A` | Primary typography, plate numbers, and telemetry readouts (14:1 contrast). |
| `--text-muted` | `#64748B` | Subtitles, field labels, timestamps, and compliance references. |

---

## 3. Dynamic Visual Components & Live Forecourt Features

### 3.1 Full-Screen Auto-Sliding Background Carousel
The landing and authentication portal features an automated photographic slider that highlights commercial CNG station infrastructure:
* **Asset Pipeline:** 5 high-resolution photography assets (`static/slides/slide1.png` through `slide5.png`) capturing active dispenser forecourts, high-pressure cascade banks, nozzle hookup, and station safety operations.
* **Transition Dynamics:** Automatic cross-fade every 5 seconds using CSS keyframe transitions (`opacity: 1` to `opacity: 0`, transition duration `1.2s`).
* **Visual Legibility:** An enterprise gradient overlay (`linear-gradient(135deg, rgba(4, 18, 123, 0.78), rgba(15, 23, 42, 0.88))`) ensures 100% text contrast and readability for all foreground login cards and metrics.

### 3.2 Forecourt Directives & Station Showcase Carousel
Positioned prominently within the left-hand column of the portal:
* **Interactive Showcase Slider:** Displays real station photographs with interactive dot indicators, allowing manual selection or automated rotation.
* **Station Safety Directives:** Lists mandatory operational rules (Rule 35 hydrotest verification, zero fueling with passengers onboard, 200-bar dispenser interlock).

### 3.3 Responsive Live Ticker Marquee
Spanning the width of the portal above and below the operational workspace:
* **Live Operational Bulletins:** Displays rotating safety announcements, network status updates (*"Central Verification Engine: 100% Operational | 104 Stations Connected"*), and regulatory compliance reminders.
* **Responsive Speed & Pause:** Smooth horizontal scroll with pause-on-hover interaction for operator reading convenience.

### 3.4 Real-Time 4-Metric Operations Dashboard
Four high-impact telemetry cards providing immediate situational awareness:
1. **Scanned Today:** Total vehicles evaluated across all station bays in the current 24-hour cycle.
2. **Active Bays:** Number of dispensing islands currently online and connected via MODBUS relay.
3. **Compliance Rate:** Percentage of vehicles passing all statutory checks ($\ge 94\%$).
4. **Safety Interlocks:** Real-time count of safety trips actuated to protect against non-compliant cylinders.

---

## 4. High-Visibility Forecourt Island Display (`/cng-display`)

The island monitor operates in full-screen mode on outdoor dispenser monitors mounted above fueling bays. Attendants must comprehend the status within 200 milliseconds under direct sunlight.

```
+------------------------------------------------------------------------------------+
| STATION: SmartFuel Central RO-104 (Durgapur)        ISLAND: 02  |  BAY: B          |
+------------------------------------------------------------------------------------+
|                                                                                    |
|                           VEHICLE REGISTRATION NUMBER                              |
|                                                                                    |
|                                 DL 01 AB 1234                                      |
|                                                                                    |
+------------------------------------------------------------------------------------+
|                                                                                    |
|                       STATUS: APPROVED / अनुमत                                     |
|                                                                                    |
|              ✓ RC Fuel Endorsement Verified (CNG Authorized)                       |
|              ✓ Hydrostatic Stretch Test Certificate Valid (3-Year Cycle)           |
|                                                                                    |
+------------------------------------------------------------------------------------+
| Cylinders: 1/1 Valid  |  Next Test Due: 08-Apr-2027  |  Dispenser Solenoid: ACTIVE |
| 🤖 AI Double Verified: DL01AB1234 (Local OCR + GPT-4o Mini Dual Confirmed)         |
+------------------------------------------------------------------------------------+
```

### 4.1 Color & Status Rules for Island Display
* **APPROVED (GREEN):**
  - Background: Solid Emerald Green (`#059669`), Text: `#FFFFFF`.
  - Icon: Solid bold checkmark (`✓`).
  - Clear message: `APPROVED — Safe to Fuel | Nozzle Power Active`.
* **HOLD / REJECTED (RED):**
  - Background: Solid Safety Red (`#DC2626`), Text: `#FFFFFF`.
  - Icon: Solid bold stop cross (`✕`).
  - Clear message: `HOLD — DO NOT FUEL | Dispenser Interlock Locked`.
  - Reason banner: `Reason: Cylinder Hydrotest Expired (Rule 35 Violation)`.
* **UNDER REVIEW (AMBER):**
  - Background: Solid Safety Amber (`#D97706`), Text: `#FFFFFF`.
  - Clear message: `UNDER REVIEW — Confirm Plate on Supervisor Console`.

---

## 5. Operator Station Dashboard & Queue UI Layout (CNG Connect Spec)

The Operator Dashboard is the primary touchpoint for the forecourt attendant. Per the CNG Connect specification (Section 18), the dashboard is strictly partitioned to operate **one vehicle at a time** while continuously visualizing upcoming queue readiness and recognition health.

```
+----------------------------------------------------------------------------------------------------+
| SMARTFUEL FORECOURT CONSOLE — STATION DL-104 (BAY 02)          CAMERA: ONLINE [25 FPS] [● LIVE]    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [ACTIVE VEHICLE] — IN BAY NOW (ONE AT A TIME)                                                |  |
|  |                                                                                              |  |
|  |  REGISTRATION:  DL 01 AB 1234                                                                |  |
|  |  DECISION:      APPROVED (GREEN) — SAFE TO FUEL                                              |  |
|  |  STATUS:        [RC: CNG ENDORSED ✓]  [CYLINDER: VALID TILL 08-APR-2027 ✓]                   |  |
|  |  VERIFICATION:  🤖 DUAL CONFIRMED (Local OCR: DL01AB1234 | GPT-4o Mini: DL01AB1234)          |  |
|  |  ARRIVED AT:    14:30:15 IST (Elapsed: 02m 45s)                                              |  |
|  |  INTERLOCK:     DISPENSER UNLOCKED (24V ACTIVE)                                              |  |
|  |                                                                                              |  |
|  |  [ ✓ DONE — COMPLETE TRANSACTION & PROMOTE NEXT VEHICLE ]  [ ⚠ REPORT EXCEPTION ]           |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | [UPCOMING / QUEUE LIST] — PREPARED IN BACKGROUND (NEVER MIXED WITH ACTIVE)                  |  |
|  +----+------------------+------------------+----------------------------+---------------------+  |
|  | POS| EVENT ID         | PLATE CANDIDATE  | VERIFICATION STATUS        | READINESS / ACTION  |  |
|  +----+------------------+------------------+----------------------------+---------------------+  |
|  | #1 | EVT-DL104-0043   | WB 26 AC 5678    | HOLD (CYLINDER EXPIRED)    | READY (PRE-SCANNED) |  |
|  |    |                  |                  | 🤖 GPT-4o Mini Confirmed   | Solenoid will Lock  |  |
|  +----+------------------+------------------+----------------------------+---------------------+  |
|  | #2 | EVT-DL104-0044   | MH 12 DE 3456    | APPROVED (COMPLIANT)       | READY (PRE-SCANNED) |  |
|  |    |                  |                  | 🤖 GPT-4o Mini Confirmed   | Instant Promotion   |  |
|  +----+------------------+------------------+----------------------------+---------------------+  |
|  | #3 | EVT-DL104-0045   | UP 16 BT 9988    | CAPTURING (Frame 2 of 4)   | OCR / AI ANALYZING  |  |
|  +----+------------------+------------------+----------------------------+---------------------+  |
|                                                                                                    |
|  CAMERA & SYSTEM HEALTH:                                                                           |
|  • RTSP Stream: 1920x1080 @ 25 FPS (Latency: 42ms) | Local OCR: Tesseract 5.4 Active                |
|  • GPT-4o Mini Vision API: Connected (p95: 780ms)  | Hardware Relay: MODBUS Channel 2 [HEALTHY]    |
+----------------------------------------------------------------------------------------------------+
```

### 5.1 Operator Dashboard Components

| Area | UI Component | Real-Time Dynamic Behavior |
| :--- | :--- | :--- |
| **ACTIVE VEHICLE Card** | High-contrast prominent card (White surface, Admiralty Navy border) | Displays the **only** currently active vehicle. Shows plate, arrival time, safety decision, fuel endorsement, cylinder test status, and dual-engine AI verification result. |
| **Done Button** | Primary green button with atomic state locking | Tapping **Done** disables the button immediately (optimistic UI), sends `POST /api/v1/queue/done`, marks current event COMPLETED, atomically promotes the oldest queued event, and displays the next pre-prepared vehicle with zero attendant rescan delay. |
| **UPCOMING / QUEUE Drawer** | Ordered tabular queue list | Shows vehicles waiting behind the active vehicle. Each card shows queue position, event ID, recognized plate, dual-verification badge, and safety status. Automatically refreshes on SSE queue events. |
| **Camera & Engine Health Bar** | Status indicator strip in header | Shows camera connection status (CAMERA_ONLINE vs CAMERA_OFFLINE), RTSP FPS, Local OCR engine state, and GPT-4o Mini Vision API latency. |

---

## 6. GPT-4o Mini Double Verification UI Badges & Visual Design

To establish trust with operators, supervisors, and safety auditors, the interface incorporates dedicated visual cues highlighting the multi-frame AI double verification pipeline:

### 6.1 Status Badges

| Badge | Appearance | Meaning & Context |
| :--- | :--- | :--- |
| `🤖 Dual Confirmed` | Solid Navy background (`#04127B`), White text, Gold robot icon | Local OCR majority consensus and GPT-4o Mini Vision API agreed 100% on the registration number. |
| `AI Context Override` | Safety Gold background (`#FFAF00`), Deep Navy text (`#04127B`) | Local OCR had optical ambiguity (e.g. 8 vs B), and GPT-4o Mini successfully resolved the true character. |
| `OCR Only (Fallback)` | Muted Grey background (`#64748B`), White text | OpenAI Vision API was unreachable or timed out; vehicle was verified using local multi-frame consensus. |
| `Plate Under Review` | Safety Amber background (`#F59E0B`), White text | Local OCR and GPT-4o Mini returned conflicting readings; routed to supervisor review. |

### 6.2 Supervisor Multi-Frame Inspection Drawer
When an event requires manual confirmation (`REVIEW_REQUIRED`), clicking **Inspect Evidence** opens a slide-over panel displaying:
1. **Candidate Plate Strip:** Side-by-side thumbnails of the 3–5 best camera frames captured by the quality gate.
2. **Local OCR Analysis:** Tabular list of per-frame raw OCR readings and confidence scores.
3. **GPT-4o Mini AI Analysis:** Exact JSON output from GPT-4o Mini, including detected state code, series, numbers, and optical disambiguation notes.
4. **Resolution Input:** Attendant or supervisor can confirm the AI-extracted plate with a single click or type a manual correction with mandatory supervisor PIN logging.

---

## 7. Typography Hierarchy & Form Design

### 7.1 Typography Hierarchy
* **Primary Sans:** `Inter`, `Segoe UI`, `Roboto`, -apple-system, sans-serif.
* **Monospace (Plates & Serials):** `SFMono-Regular`, `Consolas`, `Monaco`, monospace.

```
+--------------------------------------------------------------------------------------+
| Element               | Size / Weight         | Line Height | Example Text           |
+--------------------------------------------------------------------------------------+
| Enterprise Brand Name | 20px / Bold (700)     | 28px        | SmartFuel Platform     |
| Page Heading          | 24px / Semi-Bold (600)| 32px        | Station Safety Console |
| Island Display Plate  | 56px / Bold (700)     | 64px        | DL 01 AB 1234          |
| Island Status Banner  | 36px / Bold (700)     | 44px        | APPROVED / अनुमत       |
| Table Headers         | 13px / Bold (700)     | 18px        | VEHICLE NUMBER / PLATE |
| Body & Metadata       | 14px / Regular (400)  | 20px        | Hydrotest Valid 2027   |
+--------------------------------------------------------------------------------------+
```

### 7.2 Form Controls & Role Selector Buttons
* **Role Selection Tabs:** Quick-switch buttons for `Station Operator`, `Safety Inspector`, and `Administrator` that auto-fill corresponding enterprise test credentials.
* **Input Fields:** Crisp 1px solid borders (`#CBD5E1`), 8px border radius, 12px padding, subtle shadow. Active focus state displays a solid 2px outline in Brand Navy (`#04127B`).

---

## 8. Commercial Portal Footer & Telemetry Meta

The portal footer confirms private commercial identity and platform operational status:

```
+----------------------------------------------------------------------------------------------------+
| SmartFuel Technologies Pvt. Ltd. | Commercial CNG Dispensing & Safety Management Automation        |
| Host: fuel.cscsetu.com | Traefik TLS 1.3 | Systemd Service: Active | Local Node: 127.0.0.1:8765      |
|                                                                                                    |
| [Forecourt Directives]   [Safety Regulations]   [API Status]   [Support: support@smartfuel.in]     |
| Automated Safety Compliance under Gas Cylinders Rules 2016 & CMVR 1989                             |
+----------------------------------------------------------------------------------------------------+
```
