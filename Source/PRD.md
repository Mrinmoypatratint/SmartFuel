# Product Requirements Document (PRD)

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**Target Market:** City Gas Distribution (CGD) Companies, Retail Fueling Stations, Commercial Fleet Hubs, and Private Fuel Retail Franchises  
**Document Reference:** SF-ENT-PRD-2026-V2.0  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Classification:** Proprietary / Commercial B2B  

---

## 1. Executive Summary & Vision

The **SmartFuel Platform** is a proprietary, enterprise-grade automated fueling safety, number plate recognition (ANPR), and dispenser interlock platform. It is engineered specifically for City Gas Distribution (CGD) stations, fleet depots, and private fueling networks to eliminate catastrophic on-bay cylinder ruptures during high-pressure (200–250 bar) CNG dispensing.

Every year, unauthorized CNG retrofits, uncertified high-pressure vessels, and expired hydrotesting certificates pose extreme safety hazards at commercial filling stations. Manual inspection by forecourt attendants is slow, prone to human error, easily bypassed during peak rush hours, and exposes station operators to severe civil and regulatory liability.

**SmartFuel replaces manual checks with an automated, sub-second physical and digital safety interlock loop:**
1. As a vehicle approaches a dispensing bay, a high-definition optical camera captures the registration plate.
2. The system instantaneously queries vehicle compliance against digital records (validating authorized CNG fuel endorsement and 3-year cylinder hydrostatic test certificates).
3. The forecourt display indicates **APPROVED (GREEN)** or **HOLD (RED)** within 1.2 seconds, while a MODBUS-RTU electrical relay physically cuts power to the dispenser solenoid valve if non-compliance is detected.

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

---

## 4. System Objectives & Key Performance Indicators (KPIs)

### Primary Business Objectives
* **100% Automated Vehicle Ingress Inspection:** Sub-second optical plate capture and database verification with zero attendant data-entry overhead.
* **Fail-Safe Hardware Interlock:** Direct MODBUS-RTU relay control wired to dispenser solenoid valves (sub-100ms cut-off response).
* **Enterprise Cloud Telemetry:** Real-time multi-station monitoring, alert feeds, and historical session logs across distributed retail networks.
* **Dual-Mode Resiliency:** Operates seamlessly in live cloud mode or standalone demonstrator mode with local synthetic databases.

### Target Performance Metrics
* **Verification Decision Latency:** $\le 1.2\text{ seconds}$ from optical trigger to forecourt display update.
* **HSRP Optical Recognition Accuracy:** $\ge 98.5\%$ on High-Security Registration Plates (HSRP) under varied illumination and weather.
* **Hardware Interlock Trip Time:** $\le 100\text{ ms}$ upon negative compliance decision.
* **Platform Availability:** $\ge 99.98\%$ SLA with automated multi-worker systemd supervision.

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

2. **Station Manager / Safety Supervisor:**
   * Oversees forecourt operations, handles exceptions, and reviews station alerts (`/alerts/wall`).
   * Can execute authorized manual overrides with mandatory supervisor credential logging.

3. **Corporate Fleet / Safety Auditor:**
   * Reviews multi-station compliance analytics, verifies audit trails, and tracks blacklist propagation across franchise stations.

4. **Vehicle Driver / Customer:**
   * Receives fast, non-intrusive service. In case of refusal, the display clearly states the expiry date and reason.

---

## 6. Functional Modules

### Module 1: Optical Plate Ingress & Verification
* Automated optical plate recognition from industrial RTSP cameras or connected USB webcams.
* Support for standard Indian plate formats (state series, BH-series Bharat numbers, commercial and private vehicles).
* On-demand high-resolution photo upload option with instant crop-and-inspect workflow.

### Module 2: Compliance Decision Engine
* **Check A (RC Fuel Endorsement):** Confirms active registration and approved CNG fuel conversion.
* **Check B (Cylinder Hydrotest Validity):** Validates all installed onboard cylinders against 3-year periodic test expiration dates.
* **Decision States:**
  * `APPROVED`: Fuel endorsement valid AND all cylinders certified active.
  * `HOLD`: Fuel endorsement missing OR any cylinder test certificate expired.
  * `REVIEW`: Plate unread, low confidence OCR, or vehicle not in database.

### Module 3: Forecourt Kiosk & Hardware Relay
* Full-screen daylight-optimized attendant monitor accessible at `/cng-display`.
* MODBUS-RTU electrical relay driver directly controlling dispenser solenoid cut-off valves.

### Module 4: Administrative Dashboard & Security Console
* Central management console at `/` with multi-page navigation:
  * **Vehicle Inspection:** Live camera feed, optical extraction, and compliance breakdown.
  * **Overview:** Real-time KPI summary, station status, and hourly throughput metrics.
  * **Vehicle Entry Logs:** Detailed historical vehicle ingress records with plate snapshots.
  * **Vehicle Database:** Searchable master vehicle and cylinder registry.
  * **Station Alerts:** Live emergency notification feed for non-compliant fueling attempts.
  * **Analytics:** Visual charts for compliance ratios, station throughput, and failure reasons.
  * **Inspection History:** Filterable audit history with date ranges and export capabilities.
  * **System Health:** CPU, memory, database, and hardware relay connectivity telemetry.
* Real-time Emergency Alert Wall at `/alerts/wall` for manager kiosks.

### Module 5: Enterprise Authentication & Landing Portal
* Professional authentication portal at `/login` featuring:
  * Auto-sliding ambient background carousel cycling through forecourt and dispenser infrastructure photography.
  * Prominent **Station Visual Showcase Carousel** with interactive slide indicators and technical descriptions.
  * Real-time operational marquee ticker bar with live safety notices and 24x7 helpline `1800-11-2026`.
  * Multi-role selection (`⛽ Station Operator`, `🛡️ Safety Inspector`, `👑 Administrator`).
  * Alphanumeric security CAPTCHA generator, password reveal toggle, and 1-click evaluation credentials.

---

## 7. Production Deployment & Live Infrastructure

The platform is deployed in production on a dedicated VPS:
* **Production URL:** `https://fuel.cscsetu.com`
* **Edge Proxy:** Traefik dynamic reverse proxy (`/docker/traefik/dynamic/fuel.yml`) with automated Let's Encrypt TLS.
* **Service Daemon:** Isolated systemd service (`smartfuel.service`) running FastAPI/Uvicorn on local port `8765`.
* **Zero Disruption Guarantee:** 100% isolated from co-hosted Apache (`cscsetu.com` on port 8080) and Docker services (`services.cscsetu.com` on port 3000).
