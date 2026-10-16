# Implementation & Engineering Execution Plan

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**Document Reference:** SF-ENT-PLAN-2026-V4.0  
**Target Timeline:** Production Deployment Complete / Multi-Station Franchise Scaling  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Classification:** Proprietary / Commercial B2B  
**Changelog:** V4.0 adds GPT-4o Mini Vision API double verification (Task 3.4b, dual-engine cross-verification, AI confidence rule, FAT/SAT test cases, and risk mitigation). V3.0 incorporated CNG Connect Complete Vehicle Recognition & Queue Management Logic (Version 1.0, 15 Oct 2026).

---

## 1. Executive Implementation Phasing

The implementation strategy follows a structured, enterprise-grade engineering execution model:
1. **Tier 1 (Completed):** Production deployment on cloud VPS (`https://fuel.cscsetu.com`), Traefik dynamic reverse proxy with automated Let's Encrypt TLS 1.3, multi-tenant isolation, commercial B2B visual showcase UI overhaul with auto-sliding carousels, responsive ticker, and relational schema migrations.
2. **Tier 2 (Current / Upcoming):** CNG Connect vehicle recognition & queue management logic implementation, continuous camera monitoring, multi-frame OCR pipeline, vehicle queue manager, Done workflow, and operator dashboard overhaul.
3. **Tier 3 (Upcoming):** Live physical pilot across 5 retail CNG stations, hardware dispenser interlock integration (MODBUS RTU relay driver), enterprise security validation, and nationwide multi-CGD scaling.

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASED EXECUTION ROADMAP                                        |
|                                                                                                    |
|  [PHASE 1: Core Architecture & Live Deploy] ----->  [PHASE 2: Enterprise UI & Forecourt Engine]    |
|  - Production Traefik Dynamic Ingress               - Commercial B2B Forecourt Aesthetics          |
|  - FastAPI ASGI Daemon on Port 8765                 - 5-Slide Full-Screen Background Carousel      |
|  - Zero Disruption to Co-Hosted Domains             - Station Visual Showcase Carousel & Ticker    |
|  - Synthetic Compliance Database Hardening          - Daylight-Optimized Kiosk Display             |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 3: CNG Connect — Vehicle Recognition,  -->  [PHASE 4: CNG Connect — Queue Management      |
|            Multi-Frame OCR & GPT-4o Mini Verify]               & Done Workflow]                     |
|  - Continuous Camera Monitoring Service              - Vehicle Queue Manager (ACTIVE/QUEUED)        |
|  - Vehicle Detection & Tracking (unique events)      - Done Button Atomic Backend Transaction      |
|  - Quality Gate & Best-Frame Selection               - Queue State API & Browser Restore           |
|  - Stage 1: Local OCR & Cross-Frame Agreement        - Operator Dashboard (Active + Queue List)    |
|  - Stage 2: GPT-4o Mini Double Verification          - Duplicate Protection & Event Isolation       |
|  - Dual-Engine Cross-Verification Engine             - Exception State Handling                    |
|  - AI Confidence Rule (composite signals)            - Acceptance Testing (25 scenarios)           |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 5: Edge Vision & Hardware Interlock] ---->  [PHASE 6: 5-Station Commercial Pilot]          |
|  - RTSP Edge Ingress & HSRP Plate OCR Engine        - On-Island Hardware & Camera Mounting         |
|  - MODBUS-RTU Dispenser Solenoid Relay Driver       - Daylight Glare & Headlight Calibration       |
|  - Sub-100ms Cut-Off Circuit Trip Logic             - Attendant Training & Live Vehicle Ingress    |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 7: Enterprise Security & Audit]     ----->  [PHASE 8: Nationwide Multi-CGD Rollout]        |
|  - Penetration Testing & ISO 27001 Controls         - Cloud Multi-AZ Cluster Scaling               |
|  - Cryptographic Hash Audit Ledger Verify           - 6,500+ Franchise Blacklist Sync Engine       |
|  - Data Minimization & Privacy Verification         - 24/7 Operations Command Center               |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Work Breakdown Structure (WBS) & Deliverables

### Phase 1 & 2 (Delivered / Active Production): Core Cloud Platform & Enterprise UI
- **Milestone 1.1: Live Production VPS Deployment (`fuel.cscsetu.com`):**
  - Provisioned Ubuntu 24.04 LTS host (`187.126.118.87`).
  - Configured dynamic Traefik router (`/docker/traefik/dynamic/fuel.yml`) with automated Let's Encrypt TLS 1.3.
  - Implemented systemd daemon `smartfuel.service` running as non-privileged `deploy` user binding to loopback port `8765`.
  - Zero-disruption verification: Co-hosted Apache (`cscsetu.com` :8080) and Docker (`services.cscsetu.com` :3000) remain 100% operational.
- **Milestone 1.2: Commercial Forecourt Visual Showcase & UI Overhaul:**
  - Designed modern enterprise energy portal theme: Deep Navy (`#04127B`), Gold accents (`#FFAF00`), Slate Grey, and pure white cards.
  - Integrated 5-slide auto-sliding background carousel (`slide1.png` - `slide5.png`) with smooth 5-second cross-fade transitions.
  - Built Forecourt Directives card featuring an interactive **Station Visual Showcase Carousel** with navigation indicators.
  - Deployed responsive live ticker marquee for operational safety bulletins.
  - Implemented 4-box real-time operational statistics dashboard (Scanned Today, Active Bays, Compliance Rate, Safety Interlocks).
- **Milestone 1.3: Compliance Decision Engine Core:**
  - Standardized deterministic rule evaluation: Check A (Registration Fuel Endorsement) + Check B (3-Year Cylinder Hydrotest Expiry).
  - Integrated synthetic database with realistic records matching all statutory compliance states.

---

### Phase 3 (NEW): CNG Connect — Continuous Vehicle Recognition & Multi-Frame OCR Pipeline

- **Task 3.1: Camera Service — Continuous Stream Capture:**
  - Implement reliable RTSP stream capture service that runs continuously 24/7.
  - Camera must never pause detection while the operator handles the current ACTIVE vehicle.
  - Implement connection recovery on camera disconnect (CAMERA_OFFLINE state).
  
- **Task 3.2: Vehicle Detection & Tracking:**
  - Detect vehicles and plate candidates on every frame.
  - Implement visual vehicle tracking to determine whether an observation belongs to an existing vehicle or a new one.
  - Each genuinely new vehicle gets a **unique, immutable event ID**.
  - Track-based duplicate protection: one event per physical vehicle, not per frame.
  - Use exit/timeout rule to determine when a vehicle has left (do not rely on plate text alone).
  
- **Task 3.3: Quality Gate & Best-Frame Selection:**
  - Implement frame quality scoring (blur, illumination, size, obstruction).
  - Reject frames below quality threshold before sending to OCR.
  - Rank captured frames and select the 3–5 clearest useful images per vehicle event.
  
- **Task 3.4: Stage 1 — Local Multi-Frame OCR Pipeline:**
  - Run local OCR (Tesseract 5.4+ / PaddleOCR) on each selected frame independently.
  - Extract preliminary plate string and per-character confidence scores.
  - Compute initial cross-frame consensus across the 3–5 candidate images.
  - Normalize case and remove spaces/hyphens only after retaining raw output.
  - Apply preliminary Indian registration-format syntax checks.

- **Task 3.4b: Stage 2 — GPT-4o Mini Vision API Double Verification Engine:**
  - Base64-encode the 3–5 best-quality cropped plate frames selected by the quality gate.
  - Dispatch concurrent vision prompt to OpenAI `gpt-4o-mini` with structured JSON schema output.
  - System prompt enforces Indian Motor Vehicles Act layout rules (State Code + District Digits + Series Letters + 4 Digits or BH Series format) to resolve common character-digit confusions (e.g. 8 vs B, 0 vs O).
  - Implement **Cross-Verification Engine**:
    - **Dual Consensus Match:** When local OCR majority and GPT-4o Mini agree, mark as dual-confirmed with HIGH confidence.
    - **OCR Ambiguity Override:** When local OCR suffers from optical ambiguity (e.g. WB02A81234 vs WB02AB1234), GPT-4o Mini reading is preferred due to superior visual reasoning.
    - **Graceful Fallback:** If OpenAI API is unreachable or times out (> 1500 ms), fall back safely to local OCR consensus with an `OCR_ONLY` audit tag.
  - Log complete token telemetry, turnaround latency, and raw response payload in `ai_verification_logs`.
  - **Composite AI Confidence Rule:** Composite score = Local OCR results + GPT-4o Mini AI verification + image quality + cross-frame agreement + format validation + trusted vehicle-record lookup.

- **Task 3.5: Retry Strategy:**
  - If evidence is insufficient, try another frame from the same vehicle track.
  - Apply controlled preprocessing (crop/resize/contrast/sharpening).
  - Run recognition again and compare with earlier observations.
  - Stop after configurable retry limit and mark `REVIEW_REQUIRED` or `UNREADABLE`.
  
- **Task 3.6: Database Event Model & AI Audit Logging:**
  - Create `vehicle_events` table with immutable event_id, state machine, plate_candidate, ai_verified_plate, ai_confidence, dual_verification_match, verification_status, queue_position, and timing fields.
  - Create `ocr_observations` table storing individual per-frame OCR attempts and `sent_to_ai` flags under each event.
  - Create `ai_verification_logs` table recording full OpenAI API prompts, tokens, latency, and JSON responses.
  - Implement state transitions: DETECTED → CAPTURING → OCR_PROCESSING → RECOGNIZED → AI_VERIFICATION → VALIDATING → VERIFIED/REVIEW_REQUIRED/UNREADABLE.

---

### Phase 4 (NEW): CNG Connect — Vehicle Queue Management & Done Workflow

- **Task 4.1: Queue Manager — Backend-Owned State:**
  - Implement backend-owned ACTIVE/QUEUED ordering per bay.
  - Create `vehicle_queue` table enforcing one ACTIVE event per bay.
  - When no ACTIVE event exists, the new event becomes ACTIVE immediately.
  - Otherwise, the new event enters QUEUED state with sequential positioning.
  - Queued vehicles are fully prepared (recognized, validated, verified) in the background.
  
- **Task 4.2: Done Button — Atomic Backend Transaction:**
  - Implement `POST /api/v1/queue/done` endpoint.
  - The Done operation must be a single atomic transaction:
    1. Verify event is currently ACTIVE.
    2. Save completion timestamp and final status.
    3. Mark current event COMPLETED.
    4. Select oldest eligible QUEUED event.
    5. Promote it to ACTIVE.
    6. Return the new ACTIVE event to dashboard.
  - Guarantee: double-clicks, refreshes, or multiple screens cannot create two ACTIVE vehicles.
  
- **Task 4.3: Queue State API & Browser Restore:**
  - Implement `GET /api/v1/queue/state` endpoint returning current ACTIVE and QUEUED events.
  - On browser refresh, the dashboard restores the exact same ACTIVE/QUEUED state from backend.
  
- **Task 4.4: Operator Dashboard Overhaul:**
  - **ACTIVE VEHICLE card:** Display one vehicle only — plate, recognition state, verification status, arrival time, and transaction status.
  - **UPCOMING / QUEUE list:** Ordered list of vehicles waiting behind ACTIVE.
  - **Recognition panel:** Candidate plate, quality/recognition state, and retry status.
  - **Verification panel:** VERIFIED / NO RECORD / DATA_UNAVAILABLE / REVIEW_REQUIRED.
  - **Done button:** Completes current workflow and triggers next queued event.
  - **Camera panel:** Live connection and health status.
  
- **Task 4.5: Exception State Handling:**
  - Implement all exception states from the CNG Connect spec:
    - CAMERA_OFFLINE: Retry connection, preserve queue.
    - OCR API unavailable: Keep event pending, never delete.
    - Plate unreadable: Preserve evidence, mark UNREADABLE/REVIEW_REQUIRED.
    - OCR disagreement: Capture another frame or secondary check.
    - No vehicle record: Distinct NO_RECORD_FOUND state.
    - Verification data unavailable: DATA_UNAVAILABLE (not automatic success).
    - Duplicate detection: Attach observation to existing event.
    - Two Done clicks: Only first transition succeeds.
    - Browser refresh: Restore state from backend.

- **Task 4.6: Data Separation Enforcement:**
  - OCR answers what characters appear on the plate — it does not prove authorization.
  - Distinguish NO_RECORD_FOUND from OCR failure.
  - Never silently guess on mismatches; retain evidence and mark appropriately.
  - **Safety Boundary:** Unreadable plates, missing records, expired verification, or contradictory information create defined exception states. Recognition software must not become a safety bypass.

---

### Phase 5: Edge Vision & Hardware Interlock Integration
- **Task 5.1: High-Speed Optical ANPR Engine (HSRP & BH Series):**
  - Fine-tune contour localization and adaptive thresholding for high-contrast character segmentation.
  - Implement heuristic character-digit disambiguation (e.g., distinguishing `0` vs `O`, `1` vs `I`, `8` vs `B` based on structural position).
  - Add camera motion detection trigger and duplicate scan suppression window (180s).
- **Task 5.2: Hardware Dispenser Interlock Controller:**
  - Develop MODBUS RTU / TCP driver for DIN-rail relay modules over RS-485.
  - Implement fail-safe trip logic: Dispenser power relay cuts off on default, energizes on `APPROVED`, trips on `HOLD` or timeout.
- **Task 5.3: High-Visibility Forecourt Status Screen (`/cng-display`):**
  - Daylight-optimized attendant monitor interface readable from 5 to 10 meters under glaring outdoor sunlight.
  - Connected to real-time Server-Sent Events (SSE) / WebSocket stream for sub-second visual updates.

---

### Phase 6: 5-Station Commercial Pilot Rollout
- **Task 6.1: On-Site Hardware Installation:**
  - Install IP67 4MP varifocal cameras at 5 pilot stations (e.g., IGL Delhi/NCR, GAIL Gas franchise stations).
  - Wire optically isolated relay lines directly into dispenser solenoid control circuits.
  - Mount 24" daylight-readable monitors at fuel dispenser islands.
- **Task 6.2: Optical Calibration Under Real Indian Forecourt Conditions:**
  - Day/night transition tuning (IR cut filter switching).
  - Calibration for headlight high-beam glare, heavy rain, dust accumulation, and non-standard font plates.
- **Task 6.3: Attendant & Supervisor Field Training:**
  - Hands-on training for forecourt attendants on viewing ACTIVE vehicle status, QUEUE list, and using the Done button.
  - Train supervisors on the PIN-based Manual Override procedure and physical certificate audit logging.

---

### Phase 7: Enterprise Security & Multi-Station Cloud Federation
- **Task 7.1: Enterprise Security Audit & Penetration Testing:**
  - Full vulnerability assessment and penetration testing (VAPT) across API endpoints, edge devices, and database.
  - Validate SHA-256 cryptographic chaining in `audit_trail_ledger`.
  - Validate data protection compliance (zero PII leakage on public screens).
- **Task 7.2: Multi-Station Telemetry Synchronization:**
  - Implement background delta-sync between station edge mini-PCs and cloud server.
  - Deploy Redis Pub/Sub cluster broadcasting stolen/counterfeit cylinder updates to edge gateways within 60 seconds.

---

### Phase 8: Nationwide Multi-CGD Franchise Rollout
- **Task 8.1: High Availability Cluster Deployment:**
  - Deploy Kubernetes / Docker swarm cluster capable of handling 3,000+ RPS across national networks.
  - Configure PostgreSQL read-replicas with automated failover.
- **Task 8.2: 24/7 Operations Command Center:**
  - Real-time station health monitoring, dispenser uptime telemetry, and automated maintenance alert dispatching.

---

## 3. Implementation Plan — CNG Connect Integration Checklist

As specified in the CNG Connect document (Section 19), the following implementation order is required:

| # | Component | Description |
| :--- | :--- | :--- |
| 1 | **Camera service** | Reliable stream capture and continuous processing. |
| 2 | **Vehicle tracking** | Unique events and duplicate prevention. |
| 3 | **OCR pipeline** | Quality gate, best frames, recognition, and retries. |
| 3b | **AI double verification** | GPT-4o Mini Vision API integration, prompt engineering, base64 multi-image transmission, cross-verification, and offline fallback. |
| 4 | **Validation** | Normalization, format rules, and multi-frame consistency. |
| 5 | **Database** | Immutable IDs and state transitions. |
| 6 | **Queue manager** | Backend-owned ACTIVE/QUEUED ordering. |
| 7 | **Done transaction** | Atomic completion and next-event promotion. |
| 8 | **Dashboard** | Active vehicle and queue integration. |
| 9 | **Verification** | Connect the configured trusted vehicle/cylinder data source. |
| 10 | **Testing** | Day/night, distance, blur, glare, dirty plates, multiple vehicles, and network failures. |

---

## 4. Resource Allocation & Team Staffing Matrix

| Role | Headcount | Key Responsibilities |
| :--- | :--- | :--- |
| **Principal Solutions Architect** | 1 | Oversees enterprise architecture, client SLA delivery, and hardware integration. |
| **Senior Edge Vision Engineer** | 2 | OpenCV/Tesseract optimization, vehicle tracking, multi-frame OCR pipeline, quality gate, RTSP camera calibration. |
| **Backend & Cloud Lead** | 2 | FastAPI, PostgreSQL partition management, Redis pub/sub, vehicle queue manager, Done transaction handler, Traefik routing, telemetry APIs. |
| **Frontend & UI/UX Specialist** | 2 | Operator dashboard (ACTIVE card + queue list + Done button), commercial B2B forecourt design, responsive carousels, daylight kiosk UI, typography. |
| **Hardware & Embedded Engineer** | 1 | Industrial Edge PC setup, RS-485 / MODBUS relay integration, dispenser solenoid wiring. |
| **Security & Penetration Tester**| 1 | Hardening, cryptographic hash chaining, penetration testing, data privacy compliance. |
| **Field Deployment & QA Engineers** | 2 | On-site pilot station installation, daylight testing, operator training, SAT testing, CNG Connect acceptance criteria validation. |

---

## 5. Quality Assurance, FAT & SAT Acceptance Criteria

```
+------------------------------------------------------------------------------------+
| STAGE 1: FACTORY ACCEPTANCE TESTING (FAT)                                           |
| - Verify 100% unit and integration test pass rate.                                 |
| - Verify sub-second decision cycle on benchmark hardware.                         |
| - Verify hardware relay click and de-energize within 50 ms.                       |
| - Verify multi-frame OCR pipeline produces correct results on test datasets.      |
| - Verify GPT-4o Mini Vision API integration: 3-5 images, prompt formatting, JSON. |
| - Verify dual-engine cross-verification logic (exact match, override, fallback).   |
| - Verify queue management: no duplicate events, correct ACTIVE/QUEUED ordering.   |
| - Verify Done transaction atomicity: double-clicks produce only one completion.   |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
| STAGE 2: SITE ACCEPTANCE TESTING (SAT) - FIELD COMMISSIONING                        |
| - Minimum 500 live vehicle ingresses per station over 7 continuous days.            |
| - Plate detection accuracy >= 98.5% on clean HSRP plates.                         |
| - Zero false dispenses to simulated expired cylinders (0% Critical Error Rate).   |
| - Attendant satisfaction rating >= 95%.                                           |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
| STAGE 3: CNG CONNECT ACCEPTANCE CRITERIA (per specification Section 20)             |
| - One vehicle → one event; becomes ACTIVE when eligible.                           |
| - Same vehicle produces many frames → no duplicate vehicle events.                 |
| - Second vehicle arrives during first → detected and QUEUED.                       |
| - Third vehicle arrives → joins queue behind second.                               |
| - First Done → first COMPLETED, second becomes ACTIVE automatically.              |
| - Next vehicle already recognized → prepared data appears without new scan.        |
| - Unreadable plate → event preserved as UNREADABLE / REVIEW_REQUIRED.             |
| - Conflicting OCR → system does not invent a final plate.                          |
| - Dual Agreement: Local OCR + GPT-4o Mini match → verified with HIGH confidence.   |
| - AI Disambiguation: GPT-4o Mini correctly resolves blurred character (e.g. B vs 8).|
| - API Outage Fallback: If OpenAI API unreachable → seamless fallback to local OCR.  |
| - Camera failure → existing events remain safe, recovery attempted.               |
| - Browser refresh → backend restores same ACTIVE/QUEUED state.                    |
| - Double Done click → only one completion succeeds.                                |
| - No record found → NO_RECORD_FOUND distinct from OCR failure.                    |
+------------------------------------------------------------------------------------+
```

---

## 6. Risk Management & Governance Matrix

| Risk Factor | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Driver Resistance on Red Hold** | High | Medium | Island display clearly explains safety reason: *"Refused: Cylinder Hydrotest Expired"*. Attendant provides informational safety pamphlet. |
| **Network Outage at Rural Station** | Medium | High | Station Edge Gateway operates seamlessly on local 30-day cache. Uncached vehicles default to safe `UNDER REVIEW` state. |
| **Harsh Outdoor Dust / Camera Smudge**| High | Medium | Edge PC monitors average image sharpness metrics via quality gate. If image sharpness drops below threshold, generates automated *Clean Lens* maintenance alert. |
| **Tampering with Hardware Relay** | Low | Critical | Real-time flowmeter pulse line monitoring. If CNG flow is detected while dispenser relay is commanded `LOCKED`, triggers immediate on-site alarm. |
| **Data Privacy & Telemetry Protection** | Low | High | Full owner names and contact numbers are masked before reaching station displays or public logs. |
| **Multiple vehicles in rapid succession** | High | Medium | CNG Connect queue manager handles unlimited concurrent QUEUED events. Camera never pauses. Each vehicle gets independent tracking and event isolation. |
| **OCR disagreement across frames** | Medium | Medium | Multi-frame agreement algorithm requires configurable consensus threshold. System marks REVIEW_REQUIRED instead of guessing. |
| **GPT-4o Mini API Latency / Rate Limits / Outage** | Medium | High | Strict 1.5s timeout on OpenAI API calls; graceful fallback to local OCR consensus with `OCR_ONLY` tag; exponential backoff on 429 rate limit errors; keep connection pool warm. |
| **Double Done clicks / browser refresh** | Medium | High | Atomic backend transaction prevents duplicate completions. Queue state API restores exact ACTIVE/QUEUED state on refresh. |
