# Implementation & Engineering Execution Plan

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System  
**Document Reference:** SF-GOV-PLAN-2026-V1.0  
**Target Timeline:** 14-Day Pilot Prototype / 12-Week National Rollout  
**Status:** Approved for Implementation Scheduling  
**Classification:** Official / Restricted  

---

## 1. Executive Implementation Phasing

The implementation strategy follows a two-tier execution model:
1. **Tier 1 (Sprint 1–2 / 14 Days):** Production-ready software prototype hardening, official Indian Government (GIGW 3.0) clean theme overhaul, and sandbox integration with simulated/mocked MoRTH and PESO data.
2. **Tier 2 (Sprint 3–8 / 12 Weeks):** Live physical pilot across 5 retail CNG stations, hardware dispenser interlock integration, CERT-In security audit, and national multi-CGD scaling.

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASED EXECUTION ROADMAP                                        |
|                                                                                                    |
|  [PHASE 1: Core Hardening & Govt UI]   ----->  [PHASE 2: Hardware & Edge Interlock]                |
|  - GIGW 3.0 Clean Portal Redesign              - RTSP Edge Ingress & HSRP OCR Tuning               |
|  - Bilingual English/Hindi Foundation          - MODBUS Solenoid Relay Driver                      |
|  - PostgreSQL Schema & Seed Migration          - Island Display Real-Time SSE Feed                 |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 3: Gateway Integration]       ----->  [PHASE 4: 5-Station Pilot Deployment]               |
|  - MoRTH VAHAN 4.0 API Adapter                 - Field Lighting & Glare Calibration                |
|  - PESO Hydrotest Registry Adapter             - Attendant Training & Live Ingress                 |
|  - Offline Edge Cache Sync Engine              - Exception & Override Workflows                    |
|                                                                                                    |
|                                     |                                                              |
|                                     v                                                              |
|                                                                                                    |
|  [PHASE 5: Security & STQC Audit]     ----->  [PHASE 6: Nationwide Multi-CGD Scale]                |
|  - CERT-In Penetration Testing                 - Cloud Multi-AZ Deployment                         |
|  - GIGW 3.0 STQC Certification                 - 6,500+ Station Blacklist Sync                     |
|  - DPDP Act Privacy Verification               - 24/7 Operations Command Center                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Work Breakdown Structure (WBS) & Sprint Schedule

### Sprint 1 (Days 1–7): Core Architecture & Clean Government UI
- **Task 1.1: Government UI Transformation (GIGW 3.0 Standards):**
  - Refactor frontend templates into an authoritative, clean Indian Government portal design.
  - Implement the National Masthead (Tiranga banner, Ashoka Lion Emblem, bilingual labels, font-size adjuster `A- / A / A+`, high-contrast mode).
  - Eliminate all AI sci-fi visual tropes, glowing neon borders, and dark neomorphic themes.
  - Implement bilingual dictionary (`en.json`, `hi.json`) for seamless language toggling.
- **Task 1.2: Database Migration & Relational Hardening:**
  - Execute PostgreSQL DDL migrations for partitioned `inspection_records`, `vahan_rc_registry`, `peso_cylinder_registry`, and `audit_trail_ledger`.
  - Populate 100 realistic Indian synthetic demonstration records matching all 8 statutory test cases (Valid, Expired, Missing Cert, Not Endorsed, Review, Unknown).
- **Task 1.3: Compliance Decision Engine Core:**
  - Standardize deterministic rule evaluation: Check A (RC CNG Endorsement) + Check B (PESO 3-Year Hydrotest Expiry).
  - Enforce sub-millisecond decision turnaround in memory.

---

### Sprint 2 (Days 8–14): Edge Vision & Hardware Interlock Integration
- **Task 2.1: Advanced Indian Plate ANPR Engine (HSRP & BH Series):**
  - Fine-tune contour localization and adaptive thresholding for high-contrast character segmentation.
  - Implement heuristic character-digit disambiguation (e.g., distinguishing `0` vs `O`, `1` vs `I`, `8` vs `B` based on structural position).
  - Add camera motion detection trigger and duplicate scan suppression window (180s).
- **Task 2.2: Hardware Dispenser Interlock Controller:**
  - Develop MODBUS RTU / TCP driver for DIN-rail relay modules.
  - Implement fail-safe trip logic: Dispenser power relay cuts off on default, energizes on `APPROVED`, trips on `HOLD` or timeout.
- **Task 2.3: High-Visibility Island Status Screen (`/cng-display`):**
  - Implement full-screen daylight-optimized attendant monitor interface.
  - Connect real-time Server-Sent Events (SSE) / WebSocket stream for sub-second visual updates.
- **Task 2.4: Acceptance Verification & Proposal Sign-Off:**
  - Run end-to-end acceptance suite covering all 17 requirements of the client proposal.

---

### Sprint 3–4 (Weeks 3–4): Government Gateway Adapters & Offline Resiliency
- **Task 3.1: MoRTH VAHAN 4.0 Adapter:**
  - Build secure REST adapter with mTLS and PKI request signing.
  - Handle rate limiting, circuit breaking, and response mapping to local registry schema.
- **Task 3.2: PESO Central Hydrotest Registry Adapter:**
  - Implement cylinder serial lookup, test agency license validation, and 3-year validity math.
- **Task 3.3: Offline Edge Gateway Cache & Bi-Directional Sync:**
  - Implement local SQLite cache on Station Edge Mini-PC for 30-day offline operation.
  - Implement background delta-sync with central cloud when network connectivity is restored.

---

### Sprint 5–6 (Weeks 5–8): 5-Station Pilot Rollout & Field Calibration
- **Task 5.1: On-Site Hardware Installation:**
  - Install IP67 4MP varifocal cameras at 5 pilot stations (e.g., IGL Delhi/NCR, GAIL Gas Durgapur).
  - Wire optical isolated relay lines into dispenser solenoid control circuits.
  - Mount 24" daylight-readable monitors at fuel dispenser islands.
- **Task 5.2: Optical Calibration Under Real Indian Conditions:**
  - Day/night transition tuning (IR cut filter switching).
  - Calibration for headlight high-beam glare, heavy rain, dust accumulation, and non-standard font plates.
- **Task 5.3: Attendant & Supervisor Field Training:**
  - Conduct hands-on training for station attendants on viewing status and explaining safety holds.
  - Train supervisors on the Biometric / Aadhaar OTP Manual Override procedure.

---

### Sprint 7 (Weeks 9–10): Statutory Audits & CERT-In Security Certification
- **Task 7.1: CERT-In Empanelled Security Audit:**
  - Full vulnerability assessment and penetration testing (VAPT) across API endpoints, edge devices, and database.
  - Validate SHA-256 cryptographic chaining in `audit_trail_ledger`.
  - Validate DPDP Act 2023 compliance (zero PII leakage on public screens).
- **Task 7.2: STQC Accessibility Certification:**
  - Audit against GIGW 3.0 and WCAG 2.1 AA standards using automated and assistive technology tools.

---

### Sprint 8 (Weeks 11–12): National Scaling & Commissioning
- **Task 8.1: Multi-AZ High Availability Deployment:**
  - Deploy Kubernetes cluster with horizontal pod autoscalers (HPA) capable of handling 3,000+ RPS.
  - Configure multi-region PostgreSQL replication with automated failover.
- **Task 8.2: National Blacklist Broadcasting:**
  - Deploy Redis Pub/Sub cluster broadcasting stolen/counterfeit cylinder updates to 6,500+ edge gateways within 60 seconds.
- **Task 8.3: Project Handover to National Informatics Centre (NIC) & CGD Operators.**

---

## 3. Resource Allocation & Team Staffing Matrix

| Role | Headcount | Key Responsibilities |
| :--- | :--- | :--- |
| **Principal Project Lead / Architect** | 1 | Oversees regulatory compliance, architecture, and stakeholder liaison with MoPNG/PESO. |
| **Senior Edge Vision Engineer** | 2 | OpenCV/Tesseract optimization, HSRP plate recognition heuristics, RTSP camera calibration. |
| **Backend & Cloud Lead** | 2 | FastAPI, PostgreSQL partition management, Redis pub/sub, VAHAN/PESO gateway adapters. |
| **Frontend & GIGW Accessibility Specialist**| 2 | Clean Indian Government web theme, GIGW 3.0 compliance, Devanagari typography, responsive UI. |
| **Hardware & Firmware Engineer** | 1 | Industrial Edge PC setup, RS-485 / MODBUS relay integration, dispenser solenoid wiring. |
| **Security & CERT-In Auditor** | 1 | Hardening, cryptographic hash chaining, penetration testing, DPDP Act compliance. |
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

## 5. Risk Management & Statutory Governance Matrix

| Risk Factor | Likelihood | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Driver Resistance on Red Hold** | High | Medium | Island display explicitly cites statutory authority: *"Refused under Rule 35, Gas Cylinders Rules 2016"*. Attendant handed pre-printed informational safety flyers. |
| **VAHAN / PESO API Outage** | Medium | High | Station Edge Gateway operates seamlessly on local 30-day cache. Uncached vehicles default to safe `UNDER REVIEW` state. |
| **Harsh Outdoor Dust / Camera Smudge**| High | Medium | Edge PC monitors average image sharpness metrics. If image sharpness drops below threshold, generates automated *Clean Lens* maintenance alert. |
| **Tampering with Hardware Relay** | Low | Critical | Real-time flowmeter pulse line monitoring. If CNG flow is detected while dispenser relay is commanded `LOCKED`, triggers immediate on-site alarm. |
| **Statutory Data Privacy Challenge** | Low | High | Full owner names and telephone numbers are masked before reaching station displays or public logs, fully adhering to India's DPDP Act 2023. |
