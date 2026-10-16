# Technical Requirements Document (TRD)

**Project Name:** SmartFuel — Commercial Enterprise CNG Dispensing & Safety Management Automation Platform  
**Developer & Provider:** SmartFuel Technologies Pvt. Ltd.  
**System Architecture:** Edge-Cloud Hybrid with Hardware Interlock & Traefik Dynamic Ingress  
**Document Reference:** SF-ENT-TRD-2026-V4.0  
**Status:** Production Deployed (`https://fuel.cscsetu.com`)  
**Classification:** Proprietary / Commercial B2B  
**Changelog:** V4.0 adds GPT-4o Mini Vision API double verification for AI-powered plate number confirmation. V3.0 incorporated CNG Connect Complete Vehicle Recognition & Queue Management Logic (Version 1.0, 15 Oct 2026).

---

## 1. System Architecture Overview

The SmartFuel platform is engineered as an **Edge-Cloud Hybrid System** designed to achieve sub-second verification latency while guaranteeing operational continuity during remote network outages at fuel retail outlets.

### 1.1 Layered Architecture

| Layer | Responsibility |
| :--- | :--- |
| **Camera / Capture** | Continuous camera frames and candidate vehicle/plate detection. |
| **Tracking** | Determine whether an observation belongs to an existing vehicle or a new vehicle. Assign unique event IDs. |
| **Frame Selection** | Choose useful frames via quality gate; avoid unnecessary repeated recognition calls. |
| **OCR / Vision** | Extract candidate registration characters from best frames (Stage 1: Local OCR) and double-verify via AI (Stage 2: GPT-4o Mini Vision API). Multi-frame and cross-engine comparison. |
| **Validation** | Check image quality, applicable plate format, and cross-frame consistency. |
| **Verification** | Look up the vehicle in the configured trusted data source (RC + cylinder records). |
| **Queue Manager** | Maintain ACTIVE, QUEUED, COMPLETED, and exception states in the backend. |
| **Operator UI** | Display one ACTIVE vehicle plus upcoming queued vehicles. Done button for atomic transitions. |
| **Audit Database** | Store event IDs, timestamps, images, OCR attempts, and state transitions. |

```
+----------------------------------------------------------------------------------------------------+
|                                    STATION EDGE SUBSYSTEM                                          |
|                                                                                                    |
|  [IP Camera (RTSP)]  --->  [Station Edge Gateway]  --->  [Forecourt Display (/cng-display)]        |
|  (2-4 MP / WDR / IR)       - Continuous Vehicle Detection     - High-Contrast Status Board         |
|                            - Vehicle Tracking & Event IDs                                          |
|                            - Quality Gate & Best-Frame Select                                      |
|                            - Stage 1: Local OCR (3-5 frames)                                       |
|                            - Stage 2: GPT-4o Mini Double Verify  [Dispenser Safety Interlock]      |
|                            - Cross-Verification & Agreement   - 24V Solenoid Power Cut Relay       |
|                            - Local SQLite / Cache            - Queue State Cache                   |
|                            - Relay Controller (MODBUS)                                             |
+----------------------------------------------------------------------------------------------------+
                                      |                   ^                  |
                     Secure TLS 1.3   |                   |  Offline Sync    | Base64 Frames
                     REST / WebSocket |                   |  & Config        v (3-5 Images)
                                      v                   |          +-------------------------------+
+--------------------------------------------------------------------+ |  OPENAI GPT-4o MINI API       |
|                             CENTRAL CLOUD PLATFORM TIER (LIVE)     | |  - Multi-image plate reading  |
|                                                                    | |  - Character disambiguation   |
|  [Reverse Proxy & Ingress] ---> [ASGI Application Server]          | |  - Sub-second JSON response   |
|  - Traefik 3.x Proxy           - FastAPI (Python 3.12)             | +-------------------------------+
|  - Dynamic Route Configuration - Systemd Managed Daemon (Port 8765)|                  |
|  - Let's Encrypt TLS 1.3       - Rules & Compliance Engine         |                  | AI Plate
|  - Zero Multi-Host Disruption  - Vehicle Queue Manager (ACTIVE/Q)  |<-----------------+ & Confidence
|                                - Done Transaction Handler          |
|                                - Data Layer: Postgres 16 & Redis 7 |
+--------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
|                       ENTERPRISE VERIFICATION & TELEMETRY ADAPTERS                                 |
|                                                                                                    |
|  [Authorized Vehicle Record Adapter]              [Hydrotest Agency Federation Registry]           |
|  - Fuel Endorsement & RC Status Verification       - Cylinder Serial Numbers & Hydrotest Expiries  |
|  - High-Speed REST / mTLS Enterprise Gateway      - Testing Center Accreditations                  |
|  - Sub-800ms SLA with Local Cache Fallback        - Synthetic Resiliency Engine for Standalone Demo|
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Production Deployment & Live Infrastructure Specifications

The central platform is deployed in active production at `https://fuel.cscsetu.com`.

### 2.1 Live Production Environment Architecture
* **Production Host:** Ubuntu 24.04 LTS VPS (`187.126.118.87`).
* **Reverse Proxy:** Dockerized Traefik 3.x with dynamic configuration located at `/docker/traefik/dynamic/fuel.yml`.
* **Application Daemon:** Dedicated systemd service `smartfuel.service` running as the `deploy` user in `/opt/apps/fuel`.
* **Process Manager:** Python 3.12 venv with Uvicorn ASGI server binding to loopback `127.0.0.1:8765`.
* **SSL/TLS Certificate:** Automated Let's Encrypt ACME TLS 1.3 issuance managed seamlessly by Traefik.
* **Co-Existence & Multi-Tenant Isolation:** Guaranteed zero disruption to co-hosted production domains:
  - `cscsetu.com` running on Apache (port 8080).
  - `services.cscsetu.com` running in Docker container (port 3000).

```yaml
# Traefik Dynamic Router Configuration (/docker/traefik/dynamic/fuel.yml)
http:
  routers:
    smartfuel-secure:
      rule: "Host(`fuel.cscsetu.com`)"
      entryPoints:
        - websecure
      service: smartfuel-service
      tls:
        certResolver: letsencrypt
    smartfuel-http:
      rule: "Host(`fuel.cscsetu.com`)"
      entryPoints:
        - web
      middlewares:
        - redirect-to-https
      service: smartfuel-service

  services:
    smartfuel-service:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8765"
```

---

## 3. Technology Stack & Framework Specifications

| Tier | Component / Technology | Version / Standard | Technical Rationale & Function |
| :--- | :--- | :--- | :--- |
| **Edge Hardware** | Industrial Edge Mini-PC | Fanless, x86_64, Intel i5/i7 or ARM RK3588 | High MTBF, 24/7 operating range (-10°C to 60°C), dual Gigabit LAN, RS-485 / GPIO. |
| **Edge Vision** | OpenCV + Tesseract / PaddleOCR | OpenCV 4.10+, Tesseract 5.4+ | Continuous vehicle detection, vehicle tracking, quality gate, best-frame selection, initial multi-frame OCR. |
| **AI Double Verification** | OpenAI GPT-4o Mini Vision API | `gpt-4o-mini` | Secondary AI double verification; receives 3–5 best captured plate images, reads exact registration characters, disambiguates optical errors, sub-1.0s turnaround. |
| **Reverse Proxy** | Traefik Dynamic Proxy | Traefik 3.1+ | Automatic Let's Encrypt TLS 1.3 issuance, HTTP/2, dynamic file-based routing without restart. |
| **Backend Services** | Python / FastAPI | Python 3.12+, FastAPI 0.115+ | High-throughput asynchronous ASGI web framework; native typing with Pydantic v2. Vehicle queue management, atomic Done transaction handler. |
| **Relational Database** | PostgreSQL Server | PostgreSQL 16.3+ | ACID compliance, JSONB support, row-level locking, robust indexing. Stores vehicle events, queue state, OCR observations, AI verification logs, and audit ledger. |
| **In-Memory Cache** | Redis | Redis 7.2+ | Sub-millisecond session state caching, rate limiting, real-time Pub/Sub broker, and vehicle queue state broadcasting. |
| **Frontend UI Engine** | Semantic HTML5, CSS3, Vanilla JS | Modern ES2023 | Lightweight, responsive, zero-framework overhead; includes ACTIVE vehicle card, queue list, Done button, auto-sliding carousels and ticker. |
| **Hardware Controller**| MODBUS RTU / TCP Relay | pymodbus 3.6+ / RS-485 | Sub-100ms cut-off signal to dispenser solenoid valves. |

---

## 4. Hardware & Network Specifications

### 4.1 ANPR Ingress Camera Requirements
- **Resolution:** 2MP (1920×1080) minimum, 4MP (2560×1440) recommended.
- **Sensor:** 1/2.8" or 1/1.8" Progressive Scan CMOS with Wide Dynamic Range ($\ge 120\text{ dB WDR}$) to prevent headlight wash-out at night.
- **Lens:** Motorized varifocal (5.3 mm – 64 mm) with auto-focus, calibrated for vehicle approach distance (3 m to 10 m).
- **Illumination:** Integrated Dual-light (IR 850 nm array + Warm White LED), automatic twilight switching.
- **Ingress Protection:** IP67 environmental rating, IK10 vandal resistance, operating temperature up to 60°C.
- **Interface:** 10/100 Mbps RJ45 PoE (Power over Ethernet IEEE 802.3af/at), ONVIF Profile S/G compliant, RTSP output.
- **Continuous Operation:** Camera must support uninterrupted 24/7 RTSP streaming at 25 FPS for continuous vehicle detection.

### 4.2 Dispenser Safety Interlock Subsystem
- **Mechanism:** Solid State Relay (SSR) or Industrial DIN-rail Relay Module controlled via Station Edge PC GPIO or MODBUS RTU over RS-485.
- **Relay Rating:** 24V DC / 230V AC, 10A, optically isolated (isolation voltage $\ge 2,500\text{ V RMS}$).
- **Fail-Safe Logic:** Default-De-energized (Normally Open). The electrical circuit supplying the CNG dispenser dispensing solenoid is **CUT (LOCKED)** until the SmartFuel Edge controller asserts an active, verified `APPROVED` signal.
- **Heartbeat & Safety Trip:** If the Edge PC reboots, crashes, or loses power, the relay immediately opens (dispenser locks).

### 4.3 Attendant & Island Displays
- **Panel:** 21.5" or 24" High-Brightness Industrial TFT Monitor (Daylight readable $\ge 1,000\text{ nits}$).
- **Housing:** IP65 weatherproof enclosure with anti-glare toughened glass.
- **Connectivity:** HDMI over CAT6 extender or direct Edge PC video output displaying `/cng-display`.

---

## 5. Continuous Vehicle Detection & Tracking Subsystem

### 5.1 Detection Pipeline

The camera service runs continuously — it does **not** pause while the operator handles the current ACTIVE vehicle.

```
[Camera Frame (25 FPS RTSP)]
         |
         v
[Vehicle & Plate Candidate Detection]
         |
         v
[Match against existing vehicle tracks]
         |
    +----+----+
    |         |
    v         v
[Existing  [New vehicle]
 track]    Create unique Event ID
    |         |
    v         v
[Update    [Add to Queue or
 event]     make ACTIVE]
    |         |
    v         v
[Save useful observation under event]
         |
         v
[Run recognition asynchronously]
```

### 5.2 Duplicate Protection Rules

- Keep **one event ID** while the same vehicle remains tracked.
- Store individual OCR observations **under that event**.
- Use vehicle tracking (visual tracking / bounding box overlap) plus an **exit/timeout rule** to determine when a vehicle has left.
- Do **not** rely on plate text alone for deduplication because OCR can temporarily change between frames.

---

## 6. Multi-Frame OCR & GPT-4o Mini Dual-Engine Recognition Pipeline

### 6.1 Dual-Engine Recognition Architecture

```
[Vehicle Event Created]
         |
         v
[Quality Gate] → Reject: blurred, tiny, blocked, poorly illuminated frames
         |
         v
[Best-Frame Ranking] → Select 3–5 clearest useful frames
         |
    +----+----------------------------------+
    |                                       |
    v                                       v
[STAGE 1: Local OCR Engine]         [STAGE 2: GPT-4o Mini Vision API]
Tesseract 5.4+ / PaddleOCR          Base64-encoded 3–5 images transmitted
Run on each frame independently     Prompt: Extract exact Indian plate text
    |                                       |
    v                                       v
[Local OCR Candidate List]          [AI Verified Plate & Confidence]
(e.g., Frame 1: WB02AB1234,         (e.g., WB02AB1234,
 Frame 2: WB02AB1234,                confidence: 0.98,
 Frame 3: WB02A81234)                reasoning: "clear HSRP plate")
    |                                       |
    +-------------------+-------------------+
                        |
                        v
         [CROSS-VERIFICATION ENGINE]
         Compare Local OCR Consensus vs GPT-4o Mini Output:
         • Dual Match (Local == AI) → HIGH CONFIDENCE VERIFIED
         • Disagreement → GPT-4o Mini Preferred (superior visual reasoning)
         • AI Timeout / Unavailable → Fallback to Local OCR Majority
                        |
                        v
         [Plate Normalization & Positional Disambiguation]
                        |
                        v
         [Indian Plate Format Validation (Regex Filter)]
                        |
                   +----+----+
                   |         |
                   v         v
              [VALID]     [INVALID / UNREADABLE]
                   |         |
                   v         v
              [VERIFIED]  [REVIEW_REQUIRED / RETRY]
```

### 6.2 GPT-4o Mini Vision API Specification

#### Request Payload Specification
The edge gateway or backend cloud dispatches the 3–5 best-quality cropped images to the OpenAI endpoint:

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a specialized High-Security Registration Plate (HSRP) recognition engine for Indian motor vehicles. Analyze the provided 3 to 5 plate images captured from an ingress camera. Identify and return the exact vehicle registration number. Disambiguate common optical errors (e.g. 8 vs B, 0 vs O, 1 vs I) based on standard Indian plate layout rules (State Code + District Code + Series Characters + 4 Digits or BH Series format). Return ONLY valid JSON."
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Extract the exact registration plate number from these candidate vehicle images:"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...", "detail": "high"}},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...", "detail": "high"}},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,...", "detail": "high"}}
      ]
    }
  ],
  "response_format": {"type": "json_object"},
  "temperature": 0.0,
  "max_tokens": 150
}
```

#### Expected AI Output Schema
```json
{
  "plate_number": "WB02AB1234",
  "confidence": 0.98,
  "state_code": "WB",
  "series": "AB",
  "digits": "1234",
  "plate_type": "HSRP_STANDARD",
  "condition_notes": "Slight dust on character B resolved successfully."
}
```

### 6.3 Edge Plate Normalization Rules

```python
def normalize_indian_plate(raw_string: str) -> str:
    """
    Cleans raw OCR / AI output, resolves common optical ambiguities,
    and enforces Indian Motor Vehicles Act registration structures.
    """
    clean = re.sub(r"[^A-Z0-9]", "", raw_string.upper())
    
    # Resolves character-digit optical confusion based on position
    # E.g., DL 00 DE 0002 -> Characters at pos (0,1,4,5), Digits at (2,3,6,7,8,9)
    if len(clean) == 10:
        chars = list(clean)
        char_map = str.maketrans("0185", "OIBS")
        digit_map = str.maketrans("OIQSB", "01058")
        
        # Enforce State Code + Series characters
        for idx in (0, 1, 4, 5):
            chars[idx] = chars[idx].translate(char_map)
        # Enforce District + Number digits
        for idx in (2, 3, 6, 7, 8, 9):
            chars[idx] = chars[idx].translate(digit_map)
        return "".join(chars)
    return clean
```

### 6.4 AI Confidence Rule

An AI model's self-reported confidence is **one signal, not ground truth**. The true verification decision is a composite:

```
Local OCR results + GPT-4o Mini AI verification + image quality + cross-frame agreement + format validation + trusted vehicle-record lookup = verification decision
```

### 6.5 Retry Strategy

1. Try the best available original frame.
2. If uncertain, use another frame from the same vehicle track.
3. If useful, apply controlled crop/resize/contrast/sharpening.
4. Run recognition again.
5. Compare the new result with earlier observations.
6. Stop after a configured retry limit and mark `REVIEW_REQUIRED` or `UNREADABLE` if evidence remains insufficient.

### 6.6 Multi-Frame & AI Agreement Matrix

| Source / Observation | Reading | Engine / Method | Result / Action |
| :--- | :--- | :--- | :--- |
| Frame 1 | WB02AB1234 | Tesseract (conf: 95%) | Candidate 1 |
| Frame 2 | WB02AB1234 | Tesseract (conf: 93%) | Candidate 2 |
| Frame 3 | WB02A81234 | Tesseract (conf: 79%) | Conflicting (misread B→8) |
| **GPT-4o Mini** | **WB02AB1234** | **AI Vision (conf: 98%)** | **AI confirms correct plate from image batch** |
| **Cross-Verification** | **WB02AB1234** | **Composite Engine** | **Dual Confirmed (OCR majority + AI agree) → VERIFIED** |

| Operational Scenario | Local OCR Consensus | GPT-4o Mini Output | Final Resolved Plate | Verification State |
| :--- | :--- | :--- | :--- | :--- |
| **Consensus Match** | DL01AB1234 | DL01AB1234 | DL01AB1234 | VERIFIED (Dual Confirmed) |
| **OCR Ambiguity Override**| DL01A81234 | DL01AB1234 | DL01AB1234 | VERIFIED (AI Context Override) |
| **API Timeout / Offline** | DL01AB1234 | *(Unavailable)* | DL01AB1234 | VERIFIED (OCR-Only Fallback) |
| **Irreconcilable Conflict**| DL01AB1234 | HR26DQ9999 | *(None)* | REVIEW_REQUIRED |
| **Severe Occlusion/Mud** | *(Unreadable)* | *(Unreadable)* | *(None)* | UNREADABLE |

---

## 7. Vehicle Queue Management Technical Specification

### 7.1 Queue States

| State | Meaning | Next States |
| :--- | :--- | :--- |
| DETECTED | New vehicle candidate found. | CAPTURING / DUPLICATE |
| CAPTURING | Useful frames being collected. | OCR_PROCESSING / FAILED |
| OCR_PROCESSING | Recognition running. | RECOGNIZED / RETRY / UNREADABLE |
| RECOGNIZED | Candidate plate obtained. | VALIDATING |
| VALIDATING | Format and consistency checks. | VERIFIED / REVIEW_REQUIRED |
| VERIFIED | Configured verification criteria satisfied. | ACTIVE / QUEUED |
| REVIEW_REQUIRED | Evidence is insufficient or contradictory. | REVIEW / CLOSED |
| ACTIVE | Single vehicle handled by operator. | COMPLETED / REVIEW |
| QUEUED | Waiting behind ACTIVE vehicle. | ACTIVE / EXPIRED |
| COMPLETED | Operator workflow finished. | ARCHIVED |

### 7.2 Done Button — Atomic Backend Transaction

```
CHECK ACTIVE EVENT ID
    ↓
Confirm completion conditions
    ↓
Save completion timestamp and final status
    ↓
Mark current event COMPLETED
    ↓
Select oldest eligible QUEUED event
    ↓
Promote it to ACTIVE
    ↓
Return the new ACTIVE event to dashboard
```

The operation **must be atomic** so that double-clicks, refreshes, or multiple screens cannot create two ACTIVE vehicles.

### 7.3 Core Backend Pseudologic

```python
def on_frame(frame):
    candidates = detect_vehicles_and_plates(frame)
    for candidate in candidates:
        event = match_existing_track(candidate)
        if event is None:
            event = create_vehicle_event()
            add_to_queue_or_make_active(event)
        update_track(event, candidate)
        save_useful_observation(event, candidate)
        run_recognition_when_ready(event)

def on_done(active_event_id):
    with transaction:
        verify_event_is_currently_active(active_event_id)
        complete_event(active_event_id)
        next_event = oldest_eligible_queued_event()
        if next_event:
            promote_to_active(next_event)
        return current_active_event()
```

---

## 8. API Interface Contracts & Protocol Specifications

### 8.1 Vehicle Ingress Scan Ingestion API
- **Endpoint:** `POST /api/v1/edge/scan`
- **Security:** Mutual TLS (mTLS) or `X-Device-Token` with SHA-256 HMAC signature.

#### Request Payload
```json
{
  "station_id": 104,
  "bay_number": 2,
  "device_id": "EDGE-DL-IGL-104-02",
  "event_id": "EVT-2026-10-12-DL104-0042",
  "timestamp": "2026-10-12T14:30:15.120Z",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "recognized_plate": "DL01AB1234",
  "ocr_confidence": 94.6,
  "ocr_observations": [
    {"frame_id": 1, "text": "DL01AB1234", "confidence": 96.2, "quality_score": 0.91},
    {"frame_id": 2, "text": "DL01AB1234", "confidence": 94.6, "quality_score": 0.88},
    {"frame_id": 3, "text": "DL01A81234", "confidence": 82.1, "quality_score": 0.72}
  ],
  "gpt4o_mini_verification": {
    "enabled": true,
    "ai_verified_plate": "DL01AB1234",
    "ai_confidence": 0.98,
    "ai_latency_ms": 780,
    "dual_verification_match": true,
    "model": "gpt-4o-mini"
  },
  "cross_frame_agreement": 0.67,
  "capture_mode": "automatic_camera",
  "vehicle_track_id": "TRK-DL104-20261012-0042"
}
```

#### Response Payload (`200 OK`)
```json
{
  "inspection_id": 89421,
  "event_id": "EVT-2026-10-12-DL104-0042",
  "plate": "DL01AB1234",
  "ai_verified": true,
  "decision": "APPROVED",
  "decision_code": "COMPLIANT_ACTIVE",
  "reason": "All checks passed. Dual-verified plate DL01AB1234. RC endorsed & cylinders verified valid.",
  "queue_state": "ACTIVE",
  "queue_position": 0,
  "interlock_command": "UNLOCK_SOLENOID",
  "interlock_duration_seconds": 600,
  "checks": {
    "vehicle_rc": {
      "status": "PASS",
      "fuel_type": "CNG",
      "owner_masked": "R*** K***",
      "endorsement_date": "2023-04-10"
    },
    "cylinder_hydrotest": {
      "status": "PASS",
      "cylinders_installed": 1,
      "cylinders_valid": 1,
      "earliest_expiry": "2027-04-08",
      "details": [
        {
          "cylinder_serial": "CYL-DL-98214",
          "last_test": "2024-04-09",
          "expiry": "2027-04-08",
          "testing_station_id": "TS-DL-042",
          "status": "VALID"
        }
      ]
    }
  },
  "timestamp": "2026-10-12T14:30:15.480Z"
}
```

### 8.2 Done / Complete Active Vehicle API
- **Endpoint:** `POST /api/v1/queue/done`
- **Security:** Authenticated operator session.

#### Request Payload
```json
{
  "event_id": "EVT-2026-10-12-DL104-0042",
  "station_id": 104,
  "operator_id": 15,
  "completion_notes": ""
}
```

#### Response Payload (`200 OK`)
```json
{
  "completed_event_id": "EVT-2026-10-12-DL104-0042",
  "completed_at": "2026-10-12T14:35:22.180Z",
  "next_active_event": {
    "event_id": "EVT-2026-10-12-DL104-0043",
    "plate": "WB26AC5678",
    "decision": "HOLD",
    "decision_code": "HYDROTEST_EXPIRED",
    "queue_state": "ACTIVE",
    "recognized_at": "2026-10-12T14:32:10.300Z"
  },
  "remaining_queued": 1
}
```

### 8.3 Queue State API
- **Endpoint:** `GET /api/v1/queue/state?station_id=104&bay_number=2`
- **Purpose:** Returns the current ACTIVE event and ordered QUEUED events for state restoration on browser refresh.

### 8.4 Forecourt Decision Display Feed (Real-Time SSE)
- **Endpoint:** `GET /api/v1/cng-display/stream?station_id=104&bay_number=2`
- **Protocol:** Server-Sent Events (SSE) / WebSocket
- **Payload:** Broadcasts immediate inspection outcomes with ultra-low latency, including queue state changes.

---

## 9. Verification & Compliance Data Separation

### 9.1 Critical Data Separation Principle

OCR answers **what characters appear to be on the plate**. It does not, by itself, prove that the vehicle is authorized, compliant, or present in the trusted station database. Verification is a separate, distinct step.

| Check | Purpose |
| :--- | :--- |
| **Plate recognition** | Obtain candidate registration text. |
| **Format validation** | Reject obviously malformed output. |
| **Vehicle lookup** | Find the corresponding vehicle record in the configured data source. |
| **Cylinder / hydrotest data** | Display and evaluate applicable stored verification information according to station policy. |
| **Record availability** | Distinguish NO_RECORD_FOUND from OCR failure. |
| **Mismatch** | Retain evidence and mark the event appropriately; never silently guess. |

### 9.2 Authorized Vehicle Record Adapter
- **Interface:** REST over high-speed HTTPS / Mutual TLS.
- **Authentication:** OAuth 2.0 Bearer token with HMAC request signing.
- **Validation Rules:** Verifies that the vehicle's registered fuel type contains `CNG` and registration status is active.
- **Fallback Policy:** If upstream verification times out (> 800 ms), the system falls back to the station's local cache. Uncached vehicles are safely flagged as `UNDER REVIEW`.

### 9.3 Hydrotest Agency Federation Registry
- **Interface:** REST / JSON Web Services connecting accredited cylinder testing agencies.
- **Payload Verification:** Validates Cylinder Water Capacity (Liters), Working Pressure (200–250 bar), Test Pressure (300 bar), and Accredited Testing Agency License ID.
- **Synthetic Resiliency Engine:** When operating in standalone pilot or demonstration mode, the platform utilizes high-fidelity synthetic compliance records covering all statutory scenarios (valid, expired, missing, blacklisted).

---

## 10. Security, Cryptography & Enterprise Data Protection

### 10.1 Data Protection & Privacy Compliance
- **Data at Rest:** AES-256-GCM encryption for sensitive fields in the database (chassis numbers, owner identifiers, supervisor credentials).
- **Data in Transit:** Enforce TLS 1.3 with forward secrecy (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
- **Data Minimization:** Forecourt island monitors show only masked registration numbers (`DL**DE****`), compliance state, and safety reasons.

### 10.2 Tamper-Evident Audit Ledger (Cryptographic Hash Chaining)
Every administrative event, manual supervisor override, and safety trip generates a ledger entry containing:
$$H_n = \text{SHA-256}(H_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{Payload})$$
Any retroactive modification of audit records invalidates the cryptographic hash chain, immediately alerting central security auditors.

### 10.3 Safety Boundary

> **Critical Rule:** Unreadable plates, missing records, expired verification, or contradictory information should create defined exception states. Recognition software should not become a safety bypass. Any actual CNG dispensing authorization must remain under the station's approved control and safety architecture.

---

## 11. Exception Handling Technical Requirements

| Exception | System Response |
| :--- | :--- |
| **Camera disconnected** | Show CAMERA_OFFLINE, retry connection, and preserve the queue. |
| **Local OCR API unavailable** | Keep event pending/retry; never delete the event. |
| **GPT-4o Mini API timeout / down** | Fall back to local OCR consensus with reduced confidence; flag record as `OCR_ONLY`. |
| **GPT-4o Mini API rate limit** | Queue request with exponential backoff; fallback if timeout exceeds 1500 ms. |
| **OCR vs GPT-4o Mini Disagreement** | Prefer GPT-4o Mini reading; if AI confidence is marginal, mark `REVIEW_REQUIRED`. |
| **Plate unreadable by both engines** | Preserve evidence and mark UNREADABLE / REVIEW_REQUIRED. |
| **OCR disagreement across frames** | Capture another useful frame or secondary check. |
| **No vehicle record** | Show NO_RECORD_FOUND distinctly from OCR failure. |
| **Verification data unavailable** | Show DATA_UNAVAILABLE; missing data is not automatic success. |
| **Duplicate detection** | Attach observation to existing event. |
| **Two Done clicks** | Only first valid backend state transition succeeds. |
| **Browser refresh** | Restore ACTIVE and QUEUED state from backend. |

---

## 12. Deployment, High Availability & Scalability Sizing

| Metric | Sizing Specification | Architectural Strategy |
| :--- | :--- | :--- |
| **National Stations** | 6,500+ CGD Stations | Edge compute at stations; centralized analytics. |
| **Concurrent Requests** | 3,000 requests/second peak | FastAPI asynchronous workers behind Traefik reverse proxy. |
| **Database Transactions**| ~20 million inspections/month | PostgreSQL partition tables by month (`partition by range(scanned_at)`). |
| **Edge Storage** | 128 GB SSD per Station Edge PC | Stores 90 days of local telemetry, multi-frame evidence images, and queue state. |
| **Cloud Object Storage** | ~40 TB per annum | Tiered S3 storage; lifecycle policy moves to Glacier after 365 days. |
| **Vehicle Queue Depth** | Up to 20 concurrent QUEUED events per bay | Redis-backed queue state with PostgreSQL persistence. |
