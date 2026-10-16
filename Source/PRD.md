# Product Requirements Document (PRD)

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**Target Market:** City Gas Distribution (CGD) Companies, Retail Fueling Stations, Commercial Fleet Hubs, and Private Fuel Retail Franchises  
**Document Reference:** SF-ENT-PRD-2026-V4.0  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Classification:** Proprietary / Commercial B2B  
**Changelog:** V4.0 adds GPT-4o Mini Vision API double verification for AI-powered plate number confirmation. V3.0 incorporated CNG Connect Complete Vehicle Recognition & Queue Management Logic (Version 1.0, 15 Oct 2026).

---

## 1. Executive Summary & Vision

The **SmartFuel Platform** is a proprietary, enterprise-grade automated fueling safety, number plate recognition (ANPR), and dispenser interlock platform. It is engineered specifically for City Gas Distribution (CGD) stations, fleet depots, and private fueling networks to eliminate catastrophic on-bay cylinder ruptures during high-pressure (200–250 bar) CNG dispensing.

Every year, unauthorized CNG retrofits, uncertified high-pressure vessels, and expired hydrotesting certificates pose extreme safety hazards at commercial filling stations. Manual inspection by forecourt attendants is slow, prone to human error, easily bypassed during peak rush hours, and exposes station operators to severe civil and regulatory liability.

**SmartFuel replaces manual checks with an automated, sub-second physical and digital safety interlock loop:**
1. The camera **continuously observes** the dispensing bay, detecting each arriving vehicle and assigning a unique event ID.
2. The system captures **3–5 useful plate frames**, runs local OCR on the best images, and sends the captured images to the **GPT-4o Mini Vision API** for double verification to independently recognize and extract the exact, actual vehicle number.
3. The cross-verified plate is instantly queried against vehicle compliance records (validating authorized CNG fuel endorsement and 3-year cylinder hydrostatic test certificates).
4. The forecourt display indicates **APPROVED (GREEN)** or **HOLD (RED)** within 1.2 seconds, while a MODBUS-RTU electrical relay physically cuts power to the dispenser solenoid valve if non-compliance is detected.
5. A **vehicle queue manager** ensures only one vehicle is ACTIVE at a time while additional vehicles are prepared in the background. When the operator clicks **Done**, the next vehicle is promoted automatically.

> **Project Classification Notice:** SmartFuel is a private commercial software product developed by SmartFuel Technologies Pvt. Ltd. It is not an official government agency portal. It automates operational compliance with industry safety standards (such as Gas Cylinders Rules 2016 Rule 35 and Central Motor Vehicles Rules 1989 Rule 115A) for private fuel station operators and CGD franchises.

---

## 2. Industry Standards & Operational Compliance

SmartFuel enables private station operators to automate compliance with national and international petroleum safety standards:

| Standard / Regulation | Scope & Section | Operational Compliance Enforcement |
| :--- | :--- | :--- |
| **Gas Cylinders Rules, 2016** | Rule 35 & Rule 47 | Periodic hydrostatic stretch testing of CNG onboard cylinders every 3 years. Dispensing is locked if cylinder validity has lapsed. |
| **Central Motor Vehicles Rules (CMVR), 1989** | Rule 115-A to 115-C | Verification that vehicle registration records officially endorse CNG kit fitment prior to fueling. |
| **CGD Forecourt Safety Standards** | Technical & Safety Protocols | Automated hardware interlock prevents gas delivery to unauthorized, missing, or blacklisted cylinder serials. |
| **Data Privacy & Telemetry Security** | ISO 27001 & Data Protection | Masking citizen registration identifiers on public screens, encrypted TLS 1.3 transport, and tamper-evident SHA-256 session audit logs. |

---

## 3. Commercial Problem Statement

1. **Catastrophic High-Pressure Hazard:** Onboard cylinders pressurized to 200–250 bar can rupture violently if wall thickness is degraded by internal corrosion or fatigue.
2. **Counterfeit Brass Tags & Plate Swapping:** Unscrupulous vehicle drivers use fake or borrowed compliance tags to deceive attendants during manual checks.
3. **Forecourt Queue Congestion:** Manual paper inspections require 45–90 seconds per vehicle. Attendants frequently skip checks to maintain queue throughput during peak hours.
4. **Lack of Digital Audit Records:** In the event of an on-site safety incident or audit, manual logbooks provide no tamper-evident proof of attendant verification.
5. **No Queue Management:** Without automated queuing, attendants lose track of vehicle order during rush hours, leading to service delays and data mixing between vehicles.
6. **Unreliable Single-Frame OCR:** Systems that rely on a single camera frame for plate recognition are unreliable under real-world conditions (glare, blur, dirt, motion).

---

## 4. System Objectives & Key Performance Indicators (KPIs)

### Primary Business Objectives
* **100% Automated Vehicle Ingress Inspection:** Sub-second optical plate capture and database verification with zero attendant data-entry overhead.
* **Continuous Camera Monitoring:** Camera never stops detecting vehicles, even while the operator handles the current ACTIVE vehicle.
* **Multi-Frame High-Accuracy ANPR & AI Double Verification:** Capture 3–5 useful frames, run local OCR, and invoke GPT-4o Mini Vision API to cross-verify and extract the true, actual vehicle number before proceeding.
* **One-Vehicle-at-a-Time Queue Management:** Strict ACTIVE/QUEUED ordering so vehicles are never mixed and the operator always works on exactly one vehicle.
* **Atomic Workflow Transitions:** Done button completes the current event and promotes the next queued vehicle in a single atomic backend transaction.
* **Fail-Safe Hardware Interlock:** Direct MODBUS-RTU relay control wired to dispenser solenoid valves (sub-100ms cut-off response).
* **Enterprise Cloud Telemetry:** Real-time multi-station monitoring, alert feeds, and historical session logs across distributed retail networks.
* **Dual-Mode Resiliency:** Operates seamlessly in live cloud mode or standalone demonstrator mode with local synthetic databases.

### Target Performance Metrics
* **Verification Decision Latency:** $\le 1.2\text{ seconds}$ from optical trigger to forecourt display update.
* **HSRP Optical Recognition Accuracy:** $\ge 99.2\%$ composite accuracy leveraging dual-engine verification (Local OCR + GPT-4o Mini Vision API).
* **GPT-4o Mini API Turnaround:** $\le 1.0\text{ seconds}$ p95 round-trip latency for multi-image vision verification.
* **Hardware Interlock Trip Time:** $\le 100\text{ ms}$ upon negative compliance decision.
* **Platform Availability:** $\ge 99.98\%$ SLA with automated multi-worker systemd supervision.
* **Duplicate Event Prevention:** Zero duplicate vehicle events for a single physical vehicle in the capture zone.
* **Queue Integrity:** Zero data mixing between vehicle events under any operational scenario (double-click, browser refresh, multiple screens).

---

## 5. Stakeholder Ecosystem & User Personas

```
+-----------------------------------------------------------------------------------+
|                        ENTERPRISE CENTRAL HEADQUARTERS                            |
|       SmartFuel Cloud Management | Corporate Safety Directors | Fleet Owners       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           CITY GAS DISTRIBUTION (CGD)                             |
|       Franchise Station Networks (e.g., IGL, MGL, GAIL Gas, Adani Total Gas)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         RETAIL FORECOURT OPERATIONS                               |
|   Station Manager / Supervisor  |   Dispenser Attendant   |   Fleet / Private Driver|
+-----------------------------------------------------------------------------------+
```

### User Personas

1. **Forecourt Attendant (On-Island Operator):**
   * Operates the nozzle; looks at the overhead `/cng-display` kiosk screen.
   * Requires instantaneous, unambiguous signals: **GREEN** (Safe to fuel) vs **RED** (Do not fuel).
   * Uses the **Operator Dashboard** showing the ACTIVE vehicle plus UPCOMING/QUEUE list.
   * Clicks **Done** to complete the current vehicle and auto-promote the next one.

2. **Station Manager / Safety Supervisor:**
   * Oversees forecourt operations, handles exceptions, and reviews station alerts (`/alerts/wall`).
   * Can execute authorized manual overrides with mandatory supervisor credential logging.
   * Monitors queue depth and camera health status.

3. **Corporate Fleet / Safety Auditor:**
   * Reviews multi-station compliance analytics, verifies audit trails, and tracks blacklist propagation across franchise stations.

4. **Vehicle Driver / Customer:**
   * Receives fast, non-intrusive service. In case of refusal, the display clearly states the expiry date and reason.

---

## 6. Functional Modules

### Module 1: Continuous Vehicle Detection & Tracking
* **Continuous camera monitoring** — the system never pauses detection while servicing a vehicle.
* **Vehicle tracking** — each physical vehicle is assigned a unique, immutable event ID that persists across all frames.
* **Duplicate protection** — track-based deduplication ensures one event per vehicle, not per frame. OCR observations are stored under the event.
* **Exit/timeout detection** — vehicle departure is determined by tracking loss or configurable timeout, not by plate text alone.

### Module 2: Multi-Frame Optical Plate Recognition & GPT-4o Mini Double Verification
* Automated optical plate recognition from industrial RTSP cameras or connected USB webcams.
* **Quality gate** — rejects frames that are too blurred, tiny, blocked, or poorly illuminated for reliable reading.
* **Best-frame selection** — ranks captured frames and selects the 3–5 clearest useful images per vehicle event.
* **Stage 1 (Local OCR)** — runs Tesseract / PaddleOCR on selected frames to extract preliminary candidate readings.
* **Stage 2 (GPT-4o Mini Double Verification)** — transmits the 3–5 best captured plate images to the OpenAI GPT-4o Mini Vision API. The vision model analyzes the images, disambiguates character-digit confusions, handles soiled/distorted plates, and extracts the exact vehicle registration number.
* **Cross-Verification Engine** — compares local OCR readings against GPT-4o Mini results:
  * When both agree → high-confidence confirmed vehicle number.
  * When disagree → GPT-4o Mini result preferred due to superior visual context understanding.
  * When GPT-4o Mini is offline/unavailable → graceful fallback to local OCR consensus with reduced confidence flag.
* **Normalization** — normalizes case and removes spaces/hyphens only after retaining original OCR and AI outputs.
* **Format validation** — applies applicable Indian registration-format rules (HSRP, BH-series). Regex is a filter, not proof of identity.
* **Retry strategy** — if evidence is insufficient, tries another frame with controlled preprocessing (crop/resize/contrast/sharpening), up to a configured retry limit.
* **Final states** — returns VERIFIED, REVIEW_REQUIRED, or UNREADABLE instead of guessing.
* Support for standard Indian plate formats (state series, BH-series Bharat numbers, commercial and private vehicles).
* On-demand high-resolution photo upload option with instant crop-and-inspect workflow.

### Module 3: Compliance Decision Engine
* **Check A (RC Fuel Endorsement):** Confirms active registration and approved CNG fuel conversion.
* **Check B (Cylinder Hydrotest Validity):** Validates all installed onboard cylinders against 3-year periodic test expiration dates.
* **Data Separation:** OCR answers what characters appear on the plate. It does not, by itself, prove that the vehicle is authorized, compliant, or present in the trusted station database. Verification is a separate step.
* **Record Availability:** Distinguishes `NO_RECORD_FOUND` from OCR failure.
* **Decision States:**
  * `APPROVED`: Fuel endorsement valid AND all cylinders certified active.
  * `HOLD`: Fuel endorsement missing OR any cylinder test certificate expired.
  * `REVIEW`: Plate unread, low confidence OCR, or vehicle not in database.

### Module 4: Vehicle Queue Manager
* **One-vehicle-at-a-time rule:** Only one vehicle can be ACTIVE. All other detected vehicles enter QUEUED state.
* **Background preparation:** Queued vehicles have their plate recognized, validated, and verified before becoming ACTIVE.
* **Automatic promotion:** When the ACTIVE vehicle is completed, the oldest eligible QUEUED vehicle is promoted.
* **Event isolation:** Images, OCR results, verification data, and completion status are never mixed between vehicles.
* **Backend-owned state:** All queue transitions are managed by the backend, never by the UI alone.

### Module 5: Operator Dashboard & Done Workflow
* **ACTIVE VEHICLE card:** Displays one vehicle only — plate, recognition state, verification status, arrival time, and transaction status.
* **UPCOMING / QUEUE list:** Ordered list of vehicles waiting behind ACTIVE.
* **Done button:** Triggers an atomic backend transaction that completes the current event and promotes the next queued vehicle.
* **Atomicity guarantees:** Double-clicks, refreshes, or multiple screens cannot create two ACTIVE vehicles.
* **State restoration:** Browser refresh restores ACTIVE and QUEUED state from backend.

### Module 6: Forecourt Kiosk & Hardware Relay
* Full-screen daylight-optimized attendant monitor accessible at `/cng-display`.
* MODBUS-RTU electrical relay driver directly controlling dispenser solenoid cut-off valves.

### Module 7: Administrative Dashboard & Security Console
* Central management console at `/` with multi-page navigation:
  * **Vehicle Inspection:** Live camera feed, optical extraction, and compliance breakdown.
  * **Overview:** Real-time KPI summary, station status, and hourly throughput metrics.
  * **Vehicle Entry Logs:** Detailed historical vehicle ingress records with plate snapshots.
  * **Vehicle Database:** Searchable master vehicle and cylinder registry.
  * **Station Alerts:** Live emergency notification feed for non-compliant fueling attempts.
  * **Analytics:** Visual charts for compliance ratios, station throughput, and failure reasons.
  * **Inspection History:** Filterable audit history with date ranges and export capabilities.
  * **System Health:** CPU, memory, database, camera connection, and hardware relay connectivity telemetry.
* Real-time Emergency Alert Wall at `/alerts/wall` for manager kiosks.

### Module 8: Enterprise Authentication & Landing Portal
* Professional authentication portal at `/login` featuring:
  * Auto-sliding ambient background carousel cycling through forecourt and dispenser infrastructure photography.
  * Prominent **Station Visual Showcase Carousel** with interactive slide indicators and technical descriptions.
  * Real-time operational marquee ticker bar with live safety notices and 24x7 helpline `1800-11-2026`.
  * Multi-role selection (`⛽ Station Operator`, `🛡️ Safety Inspector`, `👑 Administrator`).
  * Alphanumeric security CAPTCHA generator, password reveal toggle, and 1-click evaluation credentials.

---

## 7. Exception Handling Requirements

| Exception | Required System Behavior |
| :--- | :--- |
| **Camera disconnected** | Show CAMERA_OFFLINE, retry connection automatically, and preserve existing queue. |
| **Local OCR API unavailable** | Keep event in pending/retry state; never delete the event. |
| **GPT-4o Mini API unavailable / timeout** | Gracefully fall back to local OCR consensus with reduced confidence. Flag record as `OCR_ONLY`. |
| **GPT-4o Mini API rate limit** | Queue request with exponential backoff; fallback to local consensus if timeout threshold (1.5s) reached. |
| **Local OCR vs GPT-4o Mini disagree** | Prefer GPT-4o Mini reading; if confidence score < threshold, route to `REVIEW_REQUIRED` for operator confirmation. |
| **Plate unreadable by both engines** | Preserve all evidence images and mark event as UNREADABLE / REVIEW_REQUIRED. |
| **OCR disagreement across frames** | Capture another useful frame or run secondary recognition check. Do not invent a final plate. |
| **No vehicle record found** | Show NO_RECORD_FOUND distinctly from OCR failure. |
| **Verification data unavailable** | Show DATA_UNAVAILABLE; missing data is never treated as automatic success. |
| **Duplicate detection** | Attach new observation to existing vehicle event. |
| **Two Done clicks** | Only the first valid backend state transition succeeds. |
| **Browser refresh** | Restore ACTIVE and QUEUED state from backend. |

> **Safety Boundary:** Unreadable plates, missing records, expired verification, or contradictory information must create defined exception states. Recognition software must not become a safety bypass. Any actual CNG dispensing authorization must remain under the station's approved control and safety architecture.

---

## 8. Acceptance Criteria

| Test Scenario | Expected Result |
| :--- | :--- |
| One vehicle arrives | One event created; becomes ACTIVE when eligible. |
| Same vehicle produces many frames | No duplicate vehicle events. |
| Second vehicle arrives during first | Second is detected and QUEUED. |
| Third vehicle arrives | Third joins queue behind second. |
| First vehicle Done | First becomes COMPLETED and second becomes ACTIVE automatically. |
| Next vehicle already recognized | Its prepared data appears without a new scan. |
| Unreadable plate | Event preserved as UNREADABLE / REVIEW_REQUIRED. |
| Conflicting OCR across frames | System does not invent a final plate. |
| GPT-4o Mini & Local OCR agree | Vehicle plate confirmed with HIGH confidence and logged as dual-verified. |
| GPT-4o Mini resolves OCR misread (e.g. 8 vs B) | GPT-4o Mini verified plate accepted; observation logged. |
| GPT-4o Mini API timeout / down | System gracefully falls back to local OCR consensus with `OCR_ONLY` flag. |
| Camera failure | Existing events remain safe and recovery is attempted. |
| Browser refresh | Backend restores the same ACTIVE/QUEUED state. |
| Double Done click | Only one completion succeeds. |
| No record found | NO_RECORD_FOUND is distinct from OCR failure. |

---

## 9. Production Deployment & Live Infrastructure

The platform is deployed in production on a dedicated VPS:
* **Production URL:** `https://fuel.cscsetu.com`
* **Edge Proxy:** Traefik dynamic reverse proxy (`/docker/traefik/dynamic/fuel.yml`) with automated Let's Encrypt TLS.
* **Service Daemon:** Isolated systemd service (`smartfuel.service`) running FastAPI/Uvicorn on local port `8765`.
* **Zero Disruption Guarantee:** 100% isolated from co-hosted Apache (`cscsetu.com` on port 8080) and Docker services (`services.cscsetu.com` on port 3000).
