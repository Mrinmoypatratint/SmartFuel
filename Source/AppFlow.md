# Application Workflow & System Journey (AppFlow)

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System  
**Document Reference:** SF-GOV-FLOW-2026-V1.0  
**Status:** Approved for Implementation  
**Classification:** Official / Restricted  

---

## 1. End-to-End System Operational Journey

The core operational workflow governs the transition from physical vehicle ingress at a CNG station dispenser island to the automated safety verification, physical dispenser solenoid trip, and permanent audit logging.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Vehicle Driver
    participant Cam as Island ANPR Camera
    participant Edge as Station Edge Gateway
    participant Cloud as SmartFuel Cloud Core
    participant Gov as VAHAN 4.0 / PESO Gateway
    participant Disp as Island Display (/cng-display)
    participant Relay as Dispenser Solenoid Relay
    actor Attendant as Fuel Attendant

    Driver->>Cam: Pulls vehicle into Dispenser Bay
    Cam->>Edge: Continuous RTSP Frame Stream
    Note over Edge: Motion Trigger & Plate Localization<br/>Deskew + OCR Extraction (HSRP / BH)
    Edge->>Cloud: POST /api/v1/edge/scan (Plate, Snapshot, Conf)
    Note over Cloud: Duplicate Suppression Check (180s)
    Cloud->>Gov: Dual Verification Query (Plate)
    Gov-->>Cloud: VAHAN (Fuel/RC) + PESO (Cylinders) Data
    Note over Cloud: Compliance Decision Engine Evaluates Rules
    
    alt Both Checks Pass (Compliant)
        Cloud-->>Edge: Decision = APPROVED
        Edge->>Disp: Display GREEN (अनुमत / APPROVED)
        Edge->>Relay: Energize Solenoid Relay (UNLOCK 24V)
        Attendant->>Driver: Connects Nozzle & Dispenses CNG
    else Either Check Fails (Expired / Non-Endorsed)
        Cloud-->>Edge: Decision = HOLD
        Edge->>Disp: Display RED (रोका गया / HOLD + Reason)
        Edge->>Relay: De-energize Relay (CUT SOLENOID POWER)
        Attendant->>Driver: Refuses Fueling; Directs to Safety Office
    else Uncertain Plate / Low Confidence (<85%)
        Cloud-->>Edge: Decision = UNDER REVIEW
        Edge->>Disp: Display AMBER (समीक्षा / REVIEW)
        Edge->>Relay: Maintain Interlock (LOCKED)
        Attendant->>Attendant: Verifies plate manually on Terminal
    end
    
    Cloud->>Cloud: Write Immutable Audit Ledger & Event Log
```

---

## 2. Vehicle Inspection State Machine

The verification lifecycle transitions through strictly deterministic states. No vehicle may reach `APPROVED` without satisfying both MoRTH RC endorsement and PESO cylinder validity rules.

```mermaid
stateDiagram-v2
    [*] --> INGRESS_DETECTED: Vehicle enters bay camera ROI
    
    INGRESS_DETECTED --> OCR_PROCESSING: Frame captured
    
    OCR_PROCESSING --> LOW_CONFIDENCE_REVIEW: Confidence < 85% or Non-Standard Plate
    OCR_PROCESSING --> PLATE_NORMALIZED: Confidence >= 85%
    
    LOW_CONFIDENCE_REVIEW --> MANUAL_CORRECTION: Operator enters plate on terminal
    LOW_CONFIDENCE_REVIEW --> REJECTED_UNREADABLE: Plate illegible / missing
    
    MANUAL_CORRECTION --> PLATE_NORMALIZED: Plate confirmed
    
    PLATE_NORMALIZED --> EVALUATING_COMPLIANCE: Query VAHAN & PESO registries
    
    state EVALUATING_COMPLIANCE {
        [*] --> CHECKING_RC
        CHECKING_RC --> RC_FAILED: Fuel != CNG / Stolen / Blacklisted
        CHECKING_RC --> CHECKING_CYLINDERS: RC Endorsed
        
        CHECKING_CYLINDERS --> CYLINDERS_FAILED: Cylinder Expired / Missing / Unregistered
        CHECKING_CYLINDERS --> ALL_CHECKS_PASSED: All cylinders within 3-yr validity
    }
    
    RC_FAILED --> HOLD_STATE: Decision: HOLD (RC_NOT_ENDORSED)
    CYLINDERS_FAILED --> HOLD_STATE: Decision: HOLD (HYDROTEST_EXPIRED)
    ALL_CHECKS_PASSED --> APPROVED_STATE: Decision: APPROVED (COMPLIANT)
    
    APPROVED_STATE --> DISPENSER_UNLOCKED: Send Signal to Dispenser Relay
    DISPENSER_UNLOCKED --> FUELING_COMPLETE: Nozzle returned / Timeout (10 min)
    
    HOLD_STATE --> DISPENSER_LOCKED: Dispenser cut-off maintained
    DISPENSER_LOCKED --> SUPERVISOR_OVERRIDE: Exception handled by Station Manager
    
    SUPERVISOR_OVERRIDE --> OVERRIDE_LOGGED: Biometric/OTP + Justification captured
    OVERRIDE_LOGGED --> DISPENSER_UNLOCKED: Temporary fueling clearance
    
    FUELING_COMPLETE --> [*]
    DISPENSER_LOCKED --> [*]
```

---

## 3. Detailed Role-Based User Journeys

### 3.1 Journey A: Dispenser Attendant (On-Island Operation)
1. **Station Login:** Attendant authenticates via kiosk or station portal using Station ID and Operator PIN.
2. **Shift Assignment:** Selects assigned dispenser bay (e.g., *Island 2, Bay A & B*).
3. **Passive Surveillance:** Overhead monitor continuously runs `/cng-display` in full-screen mode, showing station readiness banner.
4. **Vehicle Arrival:** As a vehicle stops at the dispenser, the monitor updates within 1.2 seconds:
   - If **GREEN:** Attendant hears confirmation chime, checks that plate on screen matches physical vehicle, plugs nozzle, and begins dispensing.
   - If **RED:** High-intensity red alert shows specific failure reason (e.g., *Cylinder Expired: WB00DE0001*). Dispenser keypad remains unresponsive (solenoid locked). Attendant explains safety rejection to driver.
   - If **AMBER:** Attendant checks plate number on the companion handheld/wall tablet, taps *Confirm Plate* if OCR was slightly misread, or directs vehicle to supervisor.

---

### 3.2 Journey B: Station Safety Supervisor (Exception & Override Handling)
1. **Alert Notification:** Station Manager console alerts on an active `HOLD` incident.
2. **Inspection Review:** Supervisor inspects the live event in the portal:
   - Inspects vehicle ingress camera photo.
   - Inspects VAHAN vehicle record and registered chassis number.
   - Inspects PESO cylinder testing history and certificate records.
3. **Driver Dispute Resolution:** Driver claims cylinder was recently tested and shows a physical paper certificate:
   - Supervisor cross-checks certificate QR code against national PESO database.
   - If the certificate is genuine but pending government portal synchronization:
     - Supervisor clicks **Initiate Emergency Manual Override**.
     - System prompts for: Mandatory Reason Code, Justification Notes, Photo upload of physical certificate, and Supervisor Digital PIN / Aadhaar OTP.
   - System unlocks dispenser for a single 15-minute dispensing session and issues an immediate critical alert to the Central CGD Safety Auditor.

---

### 3.3 Journey C: Central CGD Safety Auditor & PESO Regulator
1. **National Overview:** Accesses high-level analytics dashboard at `/analytics`:
   - Total vehicles scanned today across national CGD network.
   - Compliance Rate (% Approved vs % Rejected).
   - Top rejection causes (RC Not Endorsed vs Hydrotest Expired vs Blacklisted).
2. **Station Safety Ranking:** Views stations with highest violation attempts or abnormal supervisor override frequencies.
3. **Blacklist Propagation:** Adds a known counterfeit cylinder serial or stolen vehicle plate to the National Blacklist; all 6,500+ edge gateways synchronize the blacklist within 60 seconds.
4. **Audit Export:** Generates official statutory compliance report PDF for Ministry submission.

---

## 4. Edge-Cases & Fallback Error Workflows

| Operational Edge Case | Root Cause | Automated System Handling | Fail-Safe State |
| :--- | :--- | :--- | :--- |
| **Complete Network Outage** | Fiber cut / Telecom 4G failure at rural station. | Edge gateway automatically switches to **Local Station Offline Cache**. Vehicles scanned in last 30 days are validated locally. Uncached vehicles show `UNDER REVIEW`. | Failsafe: Dispenser remains locked for uncached cars until supervisor approves. |
| **Muddy / Damaged Plate** | Road dirt or damaged physical number plate. | ANPR confidence drops below 85%. Island display shows `AMBER: MANUAL VERIFICATION`. Attendant types confirmed plate into tablet. | Interlock remains LOCKED until operator confirms correct plate. |
| **Multi-Cylinder Vehicle (e.g., Bus / Dual Tank Car)** | Commercial buses or modern dual-tank cars have 2 to 4 cylinders. | System verifies **every individual cylinder serial**. If Cylinder 1 is valid until 2028 but Cylinder 2 expired yesterday, outcome is strictly `HOLD`. | LOCKED (All cylinders must pass). |
| **Plate Swapping Fraud** | Stolen/valid plate affixed onto an uncertified car. | Ingress snapshot is compared against registered make/model/color in VAHAN database. If plate belongs to a Maruti WagonR but camera detects a Hyundai Creta, system triggers `FLAG: MAKE_MODEL_MISMATCH`. | HOLD / FRAUD ALERT. |
| **Two-Wheeler Enters Bay** | Motorcycle cuts across CNG dispensing bay. | AI vehicle-type classifier detects motorcycle/scooter class. Discards trigger without creating a false vehicle entry log. | Ignored (Dispenser not energized). |
| **Dispenser Solenoid Tampering** | Station operator manually jumps electrical relay. | SmartFuel edge sensor monitors nozzle flowmeter pulse lines. If gas flow is detected while SmartFuel state is `HOLD`, system sounds loud on-site siren and sends instant tamper alert to CGD Head Office. | TAMPER ALARM FIRED. |
