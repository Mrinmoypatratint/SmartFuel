# Technical Requirements Document (TRD)

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System  
**System Architecture:** Edge-Cloud Hybrid with Hardware Interlock  
**Document Reference:** SF-GOV-TRD-2026-V1.0  
**Status:** Approved for Engineering Architecture  
**Classification:** Official / Restricted  

---

## 1. System Architecture Overview

The SmartFuel platform is engineered as an **Edge-Cloud Hybrid System** designed to achieve sub-second verification latency while guaranteeing operational continuity during remote network outages at fuel retail outlets.

```
+----------------------------------------------------------------------------------------------------+
|                                    STATION EDGE SUBSYSTEM                                          |
|                                                                                                    |
|  [IP Camera (RTSP)]  --->  [Station Edge Gateway]  --->  [Display Monitor (/cng-display)]         |
|  (2-4 MP / WDR / IR)       - Plate Detection (YOLO)      - Full-Screen Status Board                |
|                            - OCR (Tesseract / Engine)                                              |
|                            - Local SQLite / Cache        [Dispenser Safety Interlock]              |
|                            - Relay Controller (MODBUS) -> - 24V Solenoid Power Cut Relay           |
+----------------------------------------------------------------------------------------------------+
                                      |                   ^
                     Secure TLS 1.3   |                   |  Offline Cache Sync &
                     REST / WebSocket |                   |  Config Updates
                                      v                   |
+----------------------------------------------------------------------------------------------------+
|                                 CENTRAL CLOUD PLATFORM TIER                                        |
|                                                                                                    |
|  [Reverse Proxy & TLS]  --->  [API Application Server]  --->  [Data & Cache Layer]                 |
|  - Caddy / Nginx              - FastAPI (Python 3.12)          - PostgreSQL 16 (Relational DB)     |
|  - Strict TLS 1.3             - Async ASGI / Uvicorn           - Redis 7 (Cache & PubSub)          |
|  - CERT-In Hardened           - Rules & Compliance Engine      - Encrypted Object Store            |
+----------------------------------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
|                                EXTERNAL GOVERNMENT GATEWAYS                                        |
|                                                                                                    |
|  [MoRTH VAHAN 4.0 Gateway]                         [PESO National Cylinder Registry]               |
|  - RC Status & Fuel Endorsement                    - Cylinder Serials & Hydrotest Expiries         |
|  - Secured VPN / NIC Bharat Interface              - Accredited Testing Station License Status     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Technology Stack & Framework Specifications

| Tier | Component / Technology | Version / Standard | Technical Rationale & Function |
| :--- | :--- | :--- | :--- |
| **Edge Hardware** | Industrial Edge Mini-PC | Fanless, x86_64, Intel i5/i7 or ARM RK3588 | High MTBF, 24/7 operating range (-10°C to 60°C), dual Gigabit LAN, RS-485 / GPIO. |
| **Edge Vision** | OpenCV + Tesseract / PaddleOCR | OpenCV 4.10+, Tesseract 5.4+ | Low-power on-device plate localization, deskewing, and character recognition. |
| **Web Server / Proxy** | Caddy Server / Nginx | Caddy 2.8+ / Nginx 1.26+ | Automatic TLS 1.3 issuance, HTTP/2 & HTTP/3, reverse proxying, strict security headers. |
| **Backend Services** | Python / FastAPI | Python 3.12+, FastAPI 0.115+ | High-throughput asynchronous ASGI web framework; native typing with Pydantic v2. |
| **Relational Database** | PostgreSQL Server | PostgreSQL 16.3+ | ACID compliance, JSONB support, row-level locking, robust indexing (B-Tree & GiST). |
| **In-Memory Cache** | Redis | Redis 7.2+ | Sub-millisecond session state caching, rate limiting, and real-time Pub/Sub broker. |
| **Object Storage** | MinIO / S3 Encrypted Storage | S3 API Compliant | AES-256 encrypted storage of vehicle entry snapshots and generated PDF certificates. |
| **Frontend UI** | Semantic HTML5, Vanilla CSS, JS | ECMAScript 2023 | Zero bloated dependencies; instantaneous rendering; full GIGW 3.0 & WCAG 2.1 AA compliance. |

---

## 3. Hardware & Network Specifications

### 3.1 ANPR Ingress Camera Requirements
- **Resolution:** 2MP (1920×1080) minimum, 4MP (2560×1440) recommended.
- **Sensor:** 1/2.8" or 1/1.8" Progressive Scan CMOS with Wide Dynamic Range ($\ge 120\text{ dB WDR}$) to prevent headlight wash-out at night.
- **Lens:** Motorized varifocal (5.3 mm – 64 mm) with auto-focus, calibrated for vehicle approach distance (3 m to 10 m).
- **Illumination:** Integrated Dual-light (IR 850 nm array + Warm White LED), automatic twilight switching.
- **Ingress Protection:** IP67 environmental rating, IK10 vandal resistance, operating temperature up to 60°C.
- **Interface:** 10/100 Mbps RJ45 PoE (Power over Ethernet IEEE 802.3af/at), ONVIF Profile S/G compliant, RTSP output.

### 3.2 Dispenser Safety Interlock Subsystem
- **Mechanism:** Solid State Relay (SSR) or Industrial DIN-rail Relay Module controlled via Station Edge PC GPIO or MODBUS RTU over RS-485.
- **Relay Rating:** 24V DC / 230V AC, 10A, optically isolated (isolation voltage $\ge 2,500\text{ V RMS}$).
- **Fail-Safe Logic:** Default-De-energized (Normally Open). The electrical circuit supplying the CNG dispenser dispensing solenoid is **CUT (LOCKED)** until the SmartFuel Edge controller asserts an active, verified `APPROVED` signal.
- **Heartbeat & Safety Trip:** If the Edge PC reboots, crashes, or loses power, the relay immediately opens (dispenser locks).

### 3.3 Attendant & Island Displays
- **Panel:** 21.5" or 24" High-Brightness Industrial TFT Monitor (Daylight readable $\ge 1,000\text{ nits}$).
- **Housing:** IP65 weatherproof enclosure with anti-glare toughened glass.
- **Connectivity:** HDMI over CAT6 extender or direct Edge PC video output.

---

## 4. Subsystem Interactions & Interface Protocols

### 4.1 Ingress Detection & OCR Processing Pipeline

```
[Vehicle Approaches Bay]
         |
         v
[RTSP Stream (25 FPS)] ---> [OpenCV Frame Grabber & Motion ROI Trigger]
                                      |
                                      v
                         [Bilateral Filter & Edge Gradient]
                                      |
                                      v
                         [Contour Bounding Box Localization]
                                      |
                                      v
                         [Deskew & Adaptive Thresholding (Otsu)]
                                      |
                                      v
                         [Character Extraction (PSM 7/8, Whitelist)]
                                      |
                                      v
                         [Indian Plate Format Normalizer (HSRP & BH)]
                                      |
                                      v
                         [Confidence Scoring & Verification Request]
```

### 4.2 Edge Plate Normalization Rules
```python
def normalize_indian_plate(raw_string: str) -> str:
    """
    Cleans raw OCR output, resolves common optical ambiguities,
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

---

## 5. API Interface Contracts & Protocol Specifications

### 5.1 Vehicle Ingress Scan Ingestion API
- **Endpoint:** `POST /api/v1/edge/scan`
- **Security:** Mutual TLS (mTLS) or `X-Device-Token` with SHA-256 HMAC signature.

#### Request Payload
```json
{
  "station_id": 104,
  "bay_number": 2,
  "device_id": "EDGE-DL-IGL-104-02",
  "timestamp": "2026-10-12T14:30:15.120Z",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "recognized_plate": "DL01AB1234",
  "ocr_confidence": 94.6,
  "capture_mode": "automatic_camera"
}
```

#### Response Payload (`200 OK`)
```json
{
  "inspection_id": 89421,
  "plate": "DL01AB1234",
  "decision": "APPROVED",
  "decision_code": "COMPLIANT_ACTIVE",
  "reason": "All checks passed. RC endorsed & cylinders verified valid.",
  "interlock_command": "UNLOCK_SOLENOID",
  "interlock_duration_seconds": 600,
  "checks": {
    "vahan_rc": {
      "status": "PASS",
      "fuel_type": "CNG",
      "owner_masked": "R*** K***",
      "endorsement_date": "2023-04-10"
    },
    "peso_hydrotest": {
      "status": "PASS",
      "cylinders_installed": 1,
      "cylinders_valid": 1,
      "earliest_expiry": "2027-04-08",
      "details": [
        {
          "cylinder_serial": "CYL-DL-98214",
          "last_test": "2024-04-09",
          "expiry": "2027-04-08",
          "testing_station_peso_id": "PESO/DL/TEST/042",
          "status": "VALID"
        }
      ]
    }
  },
  "timestamp": "2026-10-12T14:30:15.480Z"
}
```

### 5.2 Island Decision Display Feed (Real-Time SSE)
- **Endpoint:** `GET /api/v1/cng-display/stream?station_id=104&bay_number=2`
- **Protocol:** Server-Sent Events (SSE) / WebSocket
- **Payload:** Broadcasts immediate inspection outcomes with low overhead.

---

## 6. Government Gateway Adapter Architecture

### 6.1 MoRTH VAHAN 4.0 Integration Gateway
- **Interface:** REST over National Knowledge Network (NKN) / Secure VPN.
- **Authentication:** OAuth 2.0 Mutual mTLS with Digital Signature (PKI X.509).
- **Fallback Policy:** If the VAHAN gateway times out (> 800 ms), the system queries the local cache. If unrecorded in local cache, vehicle is assigned `UNDER REVIEW`.

### 6.2 PESO Central Cylinder Registry Gateway
- **Interface:** XML/JSON Web Service hosted by NIC for PESO.
- **Payload Verification:** Validates Cylinder Water Capacity (Liters), Working Pressure (200 bar), Test Pressure (300 bar), and Accredited Testing Agency License ID.

---

## 7. Security, Cryptography & CERT-In Guidelines

### 7.1 Data Protection & Privacy (DPDP Act 2023)
- **Data at Rest:** AES-256-GCM encryption for all sensitive fields in PostgreSQL (chassis numbers, owner identifiers, operator credentials).
- **Data in Transit:** Enforce TLS 1.3 with forward secrecy (`TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`).
- **Data Minimization:** Station island monitors show only the masked registration number (`DL**DE****`), compliance state, and reason.

### 7.2 Tamper-Evident Audit Ledger (Cryptographic Hash Chaining)
Every administrative event, manual override, and safety trip generates a ledger entry containing:
$$H_n = \text{SHA-256}(H_{n-1} \parallel \text{Timestamp} \parallel \text{ActorID} \parallel \text{Action} \parallel \text{Payload})$$
Any retroactive modification of audit records invalidates the cryptographic hash chain, immediately alerting central security auditors.

---

## 8. Deployment, High Availability & Scalability Sizing

| Metric | Sizing Specification | Architectural Strategy |
| :--- | :--- | :--- |
| **National Stations** | 6,500+ CGD Stations | Edge compute at stations; centralized analytics. |
| **Concurrent Requests** | 3,000 requests/second peak | FastAPI asynchronous workers behind Caddy / Nginx. |
| **Database Transactions** | ~20 million inspections/month | PostgreSQL partition tables by month (`partition by range(scanned_at)`). |
| **Edge Storage** | 128 GB SSD per Station Edge PC | Stores 90 days of local telemetry and low-res JPEG evidence. |
| **Cloud Object Storage**| ~40 TB per annum | Tiered S3 storage; lifecycle policy moves to Glacier after 365 days. |
