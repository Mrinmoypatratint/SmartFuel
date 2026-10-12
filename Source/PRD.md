# Product Requirements Document (PRD)

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System (ANPR–PESO–VAHAN)  
**Governing Authorities:** Ministry of Petroleum and Natural Gas (MoPNG), Petroleum and Explosives Safety Organisation (PESO), Ministry of Road Transport and Highways (MoRTH), Petroleum and Natural Gas Regulatory Board (PNGRB)  
**Document Reference:** SF-GOV-PRD-2026-V1.0  
**Status:** Approved for Implementation Planning  
**Classification:** Official / Restricted  

---

## 1. Executive Summary & Vision

The **SmartFuel Automated CNG Safety & Compliance Verification System** is an AI-powered Automatic Number Plate Recognition (ANPR) and regulatory verification platform designed to prevent catastrophic vehicular explosions at City Gas Distribution (CGD) CNG fueling stations across India.

Every year, unauthorized CNG retrofits, substandard cylinders, and expired hydrotesting certificates lead to fatal cylinder ruptures during high-pressure (200–250 bar) filling. While Indian law strictly mandates that:
1. Every vehicle fueling CNG must have an official **CNG endorsement on its Registration Certificate (RC)** under the Central Motor Vehicles Rules (CMVR), 1989.
2. Every on-board CNG cylinder must undergo periodic **hydrostatic testing every three (3) years** at a PESO-authorized testing station under the Gas Cylinders Rules, 2016.

Manual verification by fuel station attendants is ineffective, error-prone, easily compromised, and impossible to sustain during peak queuing hours.

**SmartFuel replaces manual checks with an automated, zero-latency physical and digital verification loop:**
- As a vehicle pulls into a station dispenser bay, an overhead ANPR camera captures the registration plate.
- The system automatically validates the vehicle against the **MoRTH VAHAN 4.0 database** (for RC fuel endorsement) and the **PESO Central Hydrotesting Registry** (for cylinder validity and count).
- The island dispenser display shows a high-contrast **APPROVED (GREEN)** or **HOLD / REJECTED (RED)** signal within 1.2 seconds, accompanied by a physical dispenser solenoid interlock to prevent gas dispensing on non-compliant vehicles.

---

## 2. Statutory & Regulatory Mandate

SmartFuel directly operationalizes the following statutory requirements:

| Regulation | Section / Rule | Mandate & Compliance Obligation |
| :--- | :--- | :--- |
| **Gas Cylinders Rules, 2016 (PESO)** | Rule 35 & Rule 47 | Periodic hydrostatic stretch testing of high-pressure CNG cylinders every 3 years. Re-testing must be performed only at testing stations approved by the Chief Controller of Explosives (CCOE/PESO). |
| **Central Motor Vehicles Rules (CMVR), 1989 (MoRTH)** | Rule 115-A, 115-B & 115-C | Vehicles retrofitted with CNG fuel systems must possess an official RC endorsement recorded in the VAHAN National Registry. Unendorsed retrofits are illegal. |
| **PNGRB T4S Regulations (CGD Networks)** | Schedule-I (Technical & Safety Standards) | CNG dispensing operators are legally prohibited from fueling any vehicle without verified compliance plate and valid hydrotesting certification. |
| **Digital Personal Data Protection (DPDP) Act, 2023** | Section 4, 7 & 8 | Processing of vehicle and owner telemetry must preserve citizen privacy. Public station monitors must never expose full owner identity, phone numbers, or residential addresses. |
| **GIGW 3.0 (Guidelines for Indian Govt Websites)** | Accessibility & Usability Standards | Strict compliance with standard Government of India digital interfaces, bilingual support (English/Hindi), and WCAG 2.1 AA accessibility. |

---

## 3. Problem Statement & Operational Challenges

1. **Catastrophic Safety Hazard:** A CNG cylinder filled at 200 bar functions as a high-yield kinetic explosive if compromised by internal corrosion, wall thinning, or mechanical fatigue.
2. **Proliferation of Counterfeit Plates & Plates Swapping:** Unscrupulous vehicle owners affix fake PESO brass compliance plates or duplicate metal tags to bypass manual attendant inspection.
3. **Queue Pressure & Human Compromise:** CNG station attendants face long queues (especially auto-rickshaws, commercial taxis, and intra-city buses). Manual checks take 45–90 seconds per car, leading attendants to skip checks entirely.
4. **Lack of Integrated Verification:** Currently, the police, RTOs (MoRTH), explosive safety regulators (PESO), and CGD retail operators (IGL, MGL, GAIL Gas, Adani Total Gas, HPCL, BPCL, IOCL) operate in data silos with zero real-time interchange at the fuel nozzle.

---

## 4. System Objectives & Key Performance Indicators (KPIs)

### Primary Objectives
- **100% Automated Ingress Inspection:** Eliminate manual certificate inspection at fueling islands.
- **Fail-Safe Hardware Interlock:** Physically cut power to dispenser solenoids when an unauthorized or expired vehicle enters the bay.
- **National Traceability:** Maintain an immutable, tamper-evident audit log of every fueling attempt, compliance status, and supervisor override.
- **Dual-Mode Operation:** Seamless operation across **Mode A (offline local station cache & demonstration)** and **Mode B (live VAHAN 4.0 / PESO production API gateway)**.

### Target KPIs
- **End-to-End Decision Latency:** $\le 1.2$ seconds from camera trigger to island display decision.
- **Plate Recognition Accuracy:** $\ge 98.5\%$ on High Security Registration Plates (HSRP) under variable daylight, headlight glare, and night conditions.
- **False Acceptance Rate (FAR):** $\le 0.001\%$ (Zero tolerance for dispensing to expired cylinders).
- **System Availability:** $\ge 99.95\%$ uptime per station, with offline local verification fallback for up to 72 hours of network disconnection.

---

## 5. Stakeholder Ecosystem & User Personas

```
+-----------------------------------------------------------------------------------+
|                        CENTRAL REGULATORS & MONITORING                            |
|       Ministry of Petroleum (MoPNG) | PESO / CCOE | MoRTH (VAHAN 4.0)             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           CITY GAS DISTRIBUTION (CGD)                             |
|       Entity Level HQ (IGL, MGL, GAIL Gas, IOCL, BPCL, HPCL, Adani Total)         |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         STATION LEVEL OPERATIONS (RETAIL)                         |
|   Station Safety Manager   |   Dispenser Attendant   |   Vehicle Driver / Citizen |
+-----------------------------------------------------------------------------------+
```

### User Personas

#### 1. CNG Dispenser Attendant (On-Island Operator)
- **Role:** Operates the dispensing nozzle; views the high-visibility overhead island display.
- **Needs:** Glanceable, unambiguous visual indicators (GREEN = OK to fuel, RED = Do not fuel). Needs zero data-entry burden.
- **Pain Point:** Cannot read fine print or paper certificates in poor lighting or high-traffic hours.

#### 2. Station Safety Supervisor / Manager
- **Role:** Oversees station operations; conducts investigations when a vehicle is placed on HOLD.
- **Needs:** Comprehensive inspection details, recognized plate snapshot, cylinder breakdown, ability to record formal manual override with biometric/OTP authentication.
- **Pain Point:** Accountable for safety violations during PESO surprise audits.

#### 3. City Gas Distribution (CGD) Head of Operations / Safety
- **Role:** Monitors compliance across hundreds of retail outlets in a geographical area (GA).
- **Needs:** Centralized dashboard, real-time alert feed, station compliance leaderboards, blacklist propagation.

#### 4. PESO / MoRTH Enforcement Officer
- **Role:** Regulatory auditor inspecting station compliance and tracing counterfeit cylinder suppliers.
- **Needs:** Queryable history of fueling attempts, cylinder serial lifecycle tracking, flagged illegal retrofits.

#### 5. Vehicle Owner / Citizen
- **Role:** Consumer fueling CNG.
- **Needs:** Clear reason when fueling is refused (e.g., "Cylinder #2 expired on 14-Aug-2026; visit accredited testing station"); automated SMS/WhatsApp renewal reminders 30 days prior to expiry.

---

## 6. Functional Requirements (FR)

### Module 1: Automated ANPR Ingress & Image Capture
- **FR-1.1:** Support dual-input mechanisms:
  - Option A: Continuous RTSP/ONVIF video stream from fixed industrial IP cameras (2MP–4MP, WDR, IR).
  - Option B: High-definition USB webcam / on-demand image upload for desktop-based pilot stations.
- **FR-1.2:** Automatic motion detection and license plate localization utilizing regional bounding box heuristics.
- **FR-1.3:** Plate normalization handling Indian number formats:
  - Standard Indian plates: `[State 2-char][District 2-digit][Series 1-3 char][Number 4-digit]` (e.g., `DL01AB1234`, `WB00DE0001`).
  - Bharat (BH) Series plates: `[Year 2-digit]BH[Number 4-digit][Series 1-2 char]` (e.g., `22BH1234AA`).
  - Diplomatic / Commercial / EV / Defense variations.
- **FR-1.4:** OCR character confidence scoring. Any plate read with confidence below 85% must automatically trigger `UNDER REVIEW` status with mandatory operator confirmation.
- **FR-1.5:** Duplicate suppression window (configurable, default 180 seconds) to prevent redundant event spamming while a car is queued at the nozzle.

### Module 2: Regulatory Compliance Decision Engine
- **FR-2.1 (Check A — MoRTH VAHAN 4.0 RC Fuel Endorsement):**
  - Verify that registration exists and is in `ACTIVE` status.
  - Verify that `fuel_type` is officially marked as `CNG`, `PETROL/CNG`, or `DIESEL/CNG`.
  - Check for stolen vehicle, NOC cancellation, or RTO blacklist flags.
  - *Outcome:* If CNG is not endorsed, immediate `HOLD: RC_NOT_ENDORSED`.
- **FR-2.2 (Check B — PESO Central Cylinder Hydrotest Registry):**
  - Query all on-board cylinders linked to the chassis/plate.
  - Count of installed cylinders must match registered count (1 to 4 cylinders).
  - Check `last_hydrotest_date` and `expiry_date` for **every** individual cylinder.
  - Verify that the hydrotesting facility possesses an active, unrevoked PESO license ID.
  - *Outcome:* If any single cylinder has expired or is unrecorded, immediate `HOLD: HYDROTEST_EXPIRED` or `HOLD: CYLINDER_UNREGISTERED`.
- **FR-2.3 (Decision Matrix):**
  - `APPROVED (YES)`: Check A = PASS **AND** Check B = PASS.
  - `HOLD (NO)`: Check A = FAIL **OR** Check B = FAIL.
  - `REVIEW (AMBER)`: Plate unregistered, low confidence OCR, or network offline without cached record.

### Module 3: Station Display & Island Safety Interlock
- **FR-3.1:** Separate full-screen Attendant Decision Display accessible via `/cng-display` with auto-polling/WebSocket updates every 1.5 seconds.
- **FR-3.2:** High-visibility daylight-readable UI displaying:
  - Registration Number (Large, bold 56pt font).
  - Decision Status Banner: Green (`अनुमत / APPROVED`), Red (`रोका गया / HOLD`), Amber (`समीक्षा / REVIEW`).
  - Specific, non-technical reason (e.g., *Cylinder Expired: Test due on 12-05-2026*).
  - Vehicle Model & Station Bay identifier.
  - Masked citizen privacy (no full owner names on public screens).
- **FR-3.3:** Hardware Interlock Relay: Provide digital GPIO / MODBUS output to trip the dispenser power relay, mechanically locking the fueling solenoid until an `APPROVED` signal is received.

### Module 4: Central Administrative & Regulatory Portal
- **FR-4.1:** Multi-tier Role-Based Access Control (RBAC):
  - `Super Admin (Ministry / PESO)`
  - `CGD Admin (Company Headquarters)`
  - `Station Manager / Safety Officer`
  - `Station Attendant`
  - `Enforcement Auditor`
- **FR-4.2:** Real-time Inspection Ledger & Event Log: Searchable by plate, station, date range, compliance outcome, and bay number.
- **FR-4.3:** Sample & Official PDF Certificate Generator: Downloadable official inspection slips with QR code verification, National Emblem styling, and digital signature watermarks.
- **FR-4.4:** Real-time Emergency Alert Wall (`/alerts/wall`): Audio-visual red banner alert triggered at station manager terminals whenever an expired or blacklisted vehicle attempts fueling.
- **FR-4.5:** Supervisor Manual Override: Strict workflow requiring supervisor digital credentials, pre-defined justification code, and biometric/OTP confirmation. Overrides are permanently logged and audited.

---

## 7. Non-Functional Requirements (NFR)

### 7.1 Performance & Scalability
- **Transaction Throughput:** Backend must handle $\ge 2,500$ concurrent station verification requests per second across national CGD networks.
- **Response Time:** 95th percentile ($P95$) API latency $\le 350\text{ ms}$; Edge-to-Display total cycle $\le 1.2\text{ seconds}$.
- **Storage Scalability:** Store up to 50 million inspection records with compressed snapshots for a minimum statutory retention period of 5 years.

### 7.2 Reliability & Disaster Recovery
- **Offline Resiliency:** Local edge station box retains 30 days of active local vehicle records. If internet connectivity fails, station continues verification in offline cached mode.
- **High Availability:** Cloud tier deployed across Multi-Availability Zone architecture with automated failover ($99.95\%$ SLA).
- **Data Backup:** Automated daily snapshot backups with write-ahead log (WAL) archiving.

### 7.3 Security, Privacy & CERT-In Compliance
- **Transport Security:** Mandatory TLS 1.3 encryption across all communication links.
- **Session Protection:** HttpOnly, Secure, SameSite=Strict cookies with HMAC-SHA256 signing and server-side revocation.
- **CSRF & Injection Defenses:** Cryptographic double-submit CSRF tokens for all state-changing endpoints; 100% parameterized ORM queries.
- **Data Protection:** Compliance with India's DPDP Act 2023. Personally Identifiable Information (PII) encrypted at rest using AES-256-GCM.
- **Tamper-Evident Audit Trail:** Every administrative action and override is chained with SHA-256 cryptographic hashes to prevent retro-active log tampering.

### 7.4 Usability & Accessibility (GIGW 3.0)
- Full compliance with **Guidelines for Indian Government Websites (GIGW 3.0)**.
- High-contrast mode toggle, text resizing (`A-`, `A`, `A+`), keyboard navigation, screen reader compatibility (WCAG 2.1 AA).
- Bilingual interface (English and Hindi), with extensible localization for state languages (Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada).

---

## 8. Out of Scope (Current Release)
- Automatic debit / FASTag / UPI payment processing (retained in oil marketing company POS systems).
- Direct issuance of new PESO hydrotesting licenses (remains within the PESO CCOE portal).
- Integration with roadside traffic speed cameras (system is strictly calibrated for stationary/ingress CNG fueling bays).
