# Implementation & Engineering Execution Plan

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**Document Reference:** SF-ENT-PLAN-2026-V2.0  
**Target Timeline:** Production Deployment Complete / Multi-Station Franchise Scaling  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Classification:** Proprietary / Commercial B2B  

---

## 1. Executive Implementation Phasing

The implementation strategy follows a structured, enterprise-grade engineering execution model:
1. **Tier 1 (Completed):** Production deployment on cloud VPS (`https://fuel.cscsetu.com`), Traefik dynamic reverse proxy with automated Let's Encrypt TLS 1.3, multi-tenant isolation, commercial B2B visual showcase UI overhaul with auto-sliding carousels, responsive ticker, and relational schema migrations.
2. **Tier 2 (Current / Upcoming):** Live physical pilot across 5 retail CNG stations, hardware dispenser interlock integration (MODBUS RTU relay driver), enterprise security validation, and nationwide multi-CGD scaling.

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
|  [PHASE 3: Edge Vision & Hardware Interlock] ---->  [PHASE 4: 5-Station Commercial Pilot]          |
|  - RTSP Edge Ingress & HSRP Plate OCR Engine        - On-Island Hardware & Camera Mounting         |
|  - MODBUS-RTU Dispenser Solenoid Relay Driver       - Daylight Glare & Headlight Calibration       |
|  - Sub-100ms Cut-Off Circuit Trip Logic             - Attendant Training & Live Vehicle Ingress    |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 5: Enterprise Security & Audit]     ----->  [PHASE 6: Nationwide Multi-CGD Rollout]        |
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

### Phase 3: Edge Vision & Hardware Interlock Integration
- **Task 3.1: High-Speed Optical ANPR Engine (HSRP & BH Series):**
  - Fine-tune contour localization and adaptive thresholding for high-contrast character segmentation.
  - Implement heuristic character-digit disambiguation (e.g., distinguishing `0` vs `O`, `1` vs `I`, `8` vs `B` based on structural position).
  - Add camera motion detection trigger and duplicate scan suppression window (180s).
- **Task 3.2: Hardware Dispenser Interlock Controller:**
  - Develop MODBUS RTU / TCP driver for DIN-rail relay modules over RS-485.
  - Implement fail-safe trip logic: Dispenser power relay cuts off on default, energizes on `APPROVED`, trips on `HOLD` or timeout.
- **Task 3.3: High-Visibility Forecourt Status Screen (`/cng-display`):**
  - Daylight-optimized attendant monitor interface readable from 5 to 10 meters under glaring outdoor sunlight.
  - Connected to real-time Server-Sent Events (SSE) / WebSocket stream for sub-second visual updates.

---

### Phase 4: 5-Station Commercial Pilot Rollout
- **Task 4.1: On-Site Hardware Installation:**
  - Install IP67 4MP varifocal cameras at 5 pilot stations (e.g., IGL Delhi/NCR, GAIL Gas franchise stations).
  - Wire optically isolated relay lines directly into dispenser solenoid control circuits.
  - Mount 24" daylight-readable monitors at fuel dispenser islands.
- **Task 4.2: Optical Calibration Under Real Indian Forecourt Conditions:**
  - Day/night transition tuning (IR cut filter switching).
  - Calibration for headlight high-beam glare, heavy rain, dust accumulation, and non-standard font plates.
- **Task 4.3: Attendant & Supervisor Field Training:**
  - Hands-on training for forecourt attendants on viewing status and explaining safety holds.
  - Train supervisors on the PIN-based Manual Override procedure and physical certificate audit logging.

---

### Phase 5: Enterprise Security & Multi-Station Cloud Federation
- **Task 5.1: Enterprise Security Audit & Penetration Testing:**
  - Full vulnerability assessment and penetration testing (VAPT) across API endpoints, edge devices, and database.
  - Validate SHA-256 cryptographic chaining in `audit_trail_ledger`.
  - Validate data protection compliance (zero PII leakage on public screens).
- **Task 5.2: Multi-Station Telemetry Synchronization:**
  - Implement background delta-sync between station edge mini-PCs and cloud server.
  - Deploy Redis Pub/Sub cluster broadcasting stolen/counterfeit cylinder updates to edge gateways within 60 seconds.

---

### Phase 6: Nationwide Multi-CGD Franchise Rollout
- **Task 6.1: High Availability Cluster Deployment:**
  - Deploy Kubernetes / Docker swarm cluster capable of handling 3,000+ RPS across national networks.
  - Configure PostgreSQL read-replicas with automated failover.
- **Task 6.2: 24/7 Operations Command Center:**
  - Real-time station health monitoring, dispenser uptime telemetry, and automated maintenance alert dispatching.

---

## 3. Resource Allocation & Team Staffing Matrix

| Role | Headcount | Key Responsibilities |
| :--- | :--- | :--- |
| **Principal Solutions Architect** | 1 | Oversees enterprise architecture, client SLA delivery, and hardware integration. |
| **Senior Edge Vision Engineer** | 2 | OpenCV/Tesseract optimization, HSRP plate recognition heuristics, RTSP camera calibration. |
| **Backend & Cloud Lead** | 2 | FastAPI, PostgreSQL partition management, Redis pub/sub, Traefik routing, telemetry APIs. |
| **Frontend & UI/UX Specialist** | 2 | Commercial B2B forecourt design, responsive carousels, daylight kiosk UI, typography. |
| **Hardware & Embedded Engineer** | 1 | Industrial Edge PC setup, RS-485 / MODBUS relay integration, dispenser solenoid wiring. |
| **Security & Penetration Tester**| 1 | Hardening, cryptographic hash chaining, penetration testing, data privacy compliance. |
| **Field Deployment & QA Engineers** | 2 | On-site pilot station installation, daylight testing, operator training, SAT testing. |

---

## 4. Quality Assurance, FAT & SAT Acceptance Criteria

```
+------------------------------------------------------------------------------------+
| STAGE 1: FACTORY ACCEPTANCE TESTING (FAT)                                           |
| - Verify 100% unit and integration test pass rate.                                 |
| - Verify sub-second decision cycle on benchmark hardware.                         |
| - Verify hardware relay click and de-energize within 50 ms.                       |
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
```

---

## 5. Risk Management & Governance Matrix

| Risk Factor | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Driver Resistance on Red Hold** | High | Medium | Island display clearly explains safety reason: *"Refused: Cylinder Hydrotest Expired"*. Attendant provides informational safety pamphlet. |
| **Network Outage at Rural Station** | Medium | High | Station Edge Gateway operates seamlessly on local 30-day cache. Uncached vehicles default to safe `UNDER REVIEW` state. |
| **Harsh Outdoor Dust / Camera Smudge**| High | Medium | Edge PC monitors average image sharpness metrics. If image sharpness drops below threshold, generates automated *Clean Lens* maintenance alert. |
| **Tampering with Hardware Relay** | Low | Critical | Real-time flowmeter pulse line monitoring. If CNG flow is detected while dispenser relay is commanded `LOCKED`, triggers immediate on-site alarm. |
| **Data Privacy & Telemetry Protection** | Low | High | Full owner names and contact numbers are masked before reaching station displays or public logs. |
