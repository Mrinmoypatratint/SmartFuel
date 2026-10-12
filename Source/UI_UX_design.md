# UI/UX Design System & Indian Government Interface Standards

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System  
**Standard Compliance:** Guidelines for Indian Government Websites (GIGW 3.0), STQC & WCAG 2.1 AA  
**Design Reference:** SF-GOV-UIUX-2026-V1.0  
**Aesthetic Style:** Clean, Authoritative, Official Indian Government Portal (No AI-Generated / Sci-Fi Tropes)  
**Classification:** Official / Public Standard  

---

## 1. Design Philosophy & Aesthetic Directive

The user interface of the SmartFuel system is designed to convey **statutory authority, clarity, reliability, and institutional trust**. 

### 1.1 Strict Prohibition of AI-Generated / Sci-Fi Aesthetics
- **NO** dark cyberpunk neon grids, glowing futuristic holograms, or pulsing purple/cyan gradients.
- **NO** glassy neomorphism with excessive backdrop-blur or illegible floating text.
- **NO** playful, decorative, or casual fonts.
- **NO** distracting decorative animations that degrade performance on low-spec government hardware.

### 1.2 Core Tenets of the Indian Government Theme
- **Clean Utilitarian Structure:** Clear visual hierarchy, solid borders, high contrast, predictable layouts, and generous tabular readability.
- **Bilingual & Multi-Regional:** Dual English and Hindi (`हिन्दी`) labeling by default, with architectural support for state regional languages.
- **Accessibility by Mandate:** Conforms strictly to **GIGW 3.0** and **WCAG 2.1 Level AA** standards (minimum 4.5:1 text contrast ratio, keyboard focus visibility, screen-reader compatibility).
- **Physical Environment Optimization:** The CNG Station Island Display (`/cng-display`) is engineered for outdoor readability under direct, glaring Indian sunlight from 5 to 10 meters away.

---

## 2. Official Color Palette & Theming Tokens

The palette is derived from Indian national symbolism, administrative portals (Digital India / NIC / MoRTH), and industrial safety color conventions.

```
+----------------------------------------------------------------------------------------------------+
|                                    OFFICIAL COLOR SYSTEM                                           |
|                                                                                                    |
|  [National Deep Navy]      [Ashoka Saffron]        [Tiranga Green]         [Safety Alert Red]      |
|  #0C2340 / #16325C         #FF9933 / #D97706       #138808 / #15803D       #C0392B / #B91C1C       |
|  Primary Header & Masthead Notification & Accents  Approved & Compliant    Hold & Expired Safety   |
|                                                                                                    |
|  [Portal Light Canvas]     [Card Surface White]    [Institutional Border]  [Primary Ink Text]      |
|  #F4F6F9                   #FFFFFF                 #D1D5DB / #CBD5E1       #1F2937                 |
|  Govt Background           Clean Card Surface      1px Solid Grid Lines    High Contrast Text      |
+----------------------------------------------------------------------------------------------------+
```

### 2.1 Palette Tokens Table

| Token Name | Hex Code | Semantic Role & UI Application |
| :--- | :--- | :--- |
| `--gov-navy-dark` | `#0C2340` | Official top navigation masthead, administrative brand header. |
| `--gov-navy-primary` | `#16325C` | Primary buttons, active tab underlines, table header backgrounds. |
| `--gov-saffron` | `#D97706` | National accent stripes, portal highlights, warning notices (`समीक्षा`). |
| `--gov-green-safe` | `#138808` | Tiranga Green; indicates verified compliance (`अनुमत / APPROVED`). |
| `--gov-red-danger` | `#C0392B` | Universal safety red; indicates non-compliance (`रोका गया / HOLD`). |
| `--gov-amber-review`| `#B45309` | Low confidence or pending review status (`समीक्षाधीन / REVIEW`). |
| `--gov-bg-canvas` | `#F4F6F9` | Portal background canvas; clean, matte, non-reflective government grey-white. |
| `--gov-surface` | `#FFFFFF` | Form cards, inspection panels, official tables, modal dialogs. |
| `--gov-border` | `#D1D5DB` | Crisp 1px solid container borders and table divider lines. |
| `--gov-text-primary` | `#111827` | Headings, plate numbers, certificate numbers (contrast 12.8:1). |
| `--gov-text-muted` | `#4B5563` | Subtitles, field hints, metadata timestamps, statutory notices. |

---

## 3. Typography Hierarchy & Multilingual Standards

Typography uses system-standard, open-source fonts widely deployed across Indian government portals to ensure instant loading without external font-CDN latency.

- **Primary Latin Font:** `Roboto`, `Inter`, `Segoe UI`, Arial, sans-serif
- **Devanagari (Hindi) Font:** `Mukta`, `Noto Sans Devanagari`, Arial Unicode MS
- **Monospace (Numbers & Serials):** `Consolas`, `Monaco`, `Courier New`, monospace

```
+--------------------------------------------------------------------------------------+
| Element               | Size / Weight         | Line Height | Example Text           |
+--------------------------------------------------------------------------------------+
| National Portal Title | 20px / Bold (700)     | 28px        | भारत सरकार | MoPNG     |
| Main Page Heading     | 24px / Semi-Bold (600)| 32px        | वाहन निरीक्षण सारांश   |
| Island Display Plate  | 56px / Bold (700)     | 64px        | DL 01 AB 1234          |
| Island Status Banner  | 36px / Bold (700)     | 44px        | अनुमत / APPROVED       |
| Table Headers         | 13px / Bold (700)     | 18px        | पंजीकरण संख्या / PLATE |
| Body Copy             | 14px / Regular (400)  | 20px        | सिलिंडर परीक्षण वैध है |
| Captions & Metadata   | 12px / Regular (400)  | 16px        | अद्यतन: 12-10-2026     |
+--------------------------------------------------------------------------------------+
```

---

## 4. Layout Architecture & Component Specifications

### 4.1 Official Government Portal Header Structure
The top masthead follows standard National Informatics Centre (NIC) layout guidelines:

```
+----------------------------------------------------------------------------------------------------+
| [Tiranga Flag] भारत सरकार | Government of India   [A- | A | A+] [High Contrast] [English / हिन्दी]  |
+----------------------------------------------------------------------------------------------------+
| [Emblem] पेट्रोलियम और प्राकृतिक गैस मंत्रालय | PESO                  स्मार्टफ्यूल राष्ट्रीय सीएनजी पोर्टल   |
|          Ministry of Petroleum and Natural Gas                       National CNG Safety Portal    |
+----------------------------------------------------------------------------------------------------+
| [Home]  [Live Ingress]  [CNG Display]  [Vehicle Registry]  [Alert Wall]  [Reports]  [Audit] [User] |
+----------------------------------------------------------------------------------------------------+
```

1. **Utility Tier (Top 32px):**
   - National Flag icon on left.
   - Text: `भारत सरकार | Government of India`.
   - Right utility bar: Text size adjusters (`A-`, `A`, `A+`), High Contrast Mode toggle button, Language selector toggle (`English` / `हिन्दी`).
2. **Ministry Brand Tier (Middle 68px):**
   - Left: State Emblem of India (Ashoka Lion Capital) emblem placeholder + Ministry title in bilingual format.
   - Right: National Portal Name and official badge (`Ver. 8.0 - PESO & MoRTH Compliant`).
3. **Primary Navigation Bar (Bottom 44px):**
   - Solid Deep Navy (`#0C2340`) background.
   - Clean rectangular menu items with 2px saffron bottom border on active hover/selected state.

---

### 4.2 High-Visibility CNG Island Dispenser Display (`/cng-display`)

The island monitor operates in full-screen mode on outdoor dispenser monitors. Attendants must comprehend the status within 200 milliseconds from distance under daylight.

```
+------------------------------------------------------------------------------------+
| STATION: Demo IGL CNG Station (Durgapur)            ISLAND: 02  |  BAY: B          |
+------------------------------------------------------------------------------------+
|                                                                                    |
|                           वाहन पंजीकरण संख्या / REGISTRATION                        |
|                                                                                    |
|                                 DL 01 AB 1234                                      |
|                                                                                    |
+------------------------------------------------------------------------------------+
|                                                                                    |
|                       STATUS: अनुमत / APPROVED                                     |
|                                                                                    |
|              ✓ आरसी सीएनजी पृष्ठांकन सत्यापित (RC CNG Endorsed)                     |
|              ✓ सभी सिलिंडर हाइड्रो-परीक्षण वैध (All Cylinders Valid)               |
|                                                                                    |
+------------------------------------------------------------------------------------+
| सिलिंडर संख्या: 1/1 वैध  |  अगला परीक्षण देय: 08-अप्रैल-2027  |  डिस्पेंसर: चालू (ON) |
+------------------------------------------------------------------------------------+
```

#### Color Rules for Island Display
- **APPROVED (GREEN):**
  - Background: Solid Tiranga Green (`#138808`), Text: `#FFFFFF`.
  - Icon: Solid official checkmark (`✓`).
  - Clear message: `अनुमत / APPROVED — ईंधन भरने की अनुमति है (Permitted to Fuel)`.
- **HOLD / REJECTED (RED):**
  - Background: Solid Safety Red (`#C0392B`), Text: `#FFFFFF`.
  - Icon: Solid warning stop sign (`✕`).
  - Clear message: `रोका गया / HOLD — सीएनजी न भरें (DO NOT FUEL)`.
  - Sub-reason in high-contrast box: `कारण: सिलिंडर हाइड्रो-परीक्षण समाप्त (Cylinder Hydrotest Expired)`.
- **UNDER REVIEW (AMBER):**
  - Background: Solid Amber (`#B45309`), Text: `#FFFFFF`.
  - Clear message: `समीक्षाधीन / REVIEW — कृपया ऑपरेटर टर्मिनल पर जांच करें`.

---

### 4.3 Official Administrative Data Tables
Tables present tabular verification history with clear grid borders, legible font, and no confusing decorative animations:

```
+-------+---------------+--------------------+-----------------+------------------+--------------+------------+
| क्र.सं.| समय (TIME)    | वाहन संख्या (PLATE)| आरसी स्थिति (RC)| सिलिंडर (CYL)     | निर्णय       | कार्रवाई   |
+-------+---------------+--------------------+-----------------+------------------+--------------+------------+
| 01    | 12-10 14:30:12| DL01AB1234         | वैध / ENDORSED  | 1/1 वैध (2027)   | [ APPROVED ] | [देखें PDF]|
| 02    | 12-10 14:28:45| WB00DE0001         | वैध / ENDORSED  | 1/1 समाप्त (2025)| [   HOLD   ] | [विवरण]    |
| 03    | 12-10 14:25:10| KA00DE0004         | अपंजीकृत / NO   | अप्राप्य / N.A.  | [   HOLD   ] | [विवरण]    |
| 04    | 12-10 14:21:02| TN00DE0005         | अज्ञात / REVIEW | 1/1 समीक्षाधीन   | [  REVIEW  ] | [सत्यापित] |
+-------+---------------+--------------------+-----------------+------------------+--------------+------------+
```

- Column headers: Uppercase, bold, neutral grey background (`#E5E7EB`), solid 1px border.
- Alternating rows: Pure white (`#FFFFFF`) and very subtle tint (`#F9FAFB`).
- Action buttons: Clean, bordered rectangular buttons with visible hover state (`#16325C`).

---

### 4.4 Official Verification Slip & Certificate PDF Layout
When a user or auditor clicks **Download Verification Slip**, the generated PDF matches official Ministry standards:

1. **Header Block:**
   - National Emblem centered at top.
   - Text: `भारत सरकार | GOVERNMENT OF INDIA`.
   - `पेट्रोलियम तथा विस्फोटक सुरक्षा संगठन | PETROLEUM AND EXPLOSIVES SAFETY ORGANISATION (PESO)`.
   - Document Title: `वाहन सीएनजी सुरक्षा अनुपालन सत्यापन पर्ची | VEHICLE CNG SAFETY COMPLIANCE VERIFICATION SLIP`.
2. **Key-Value Verification Grid:**
   - Formal two-column bordered table containing: Registration Number, Chassis Number (masked), Make/Model, Testing Station Name & License, Hydrotest Date, Expiry Date, Dispenser Island, Attendant ID, Server Timestamp.
3. **Verification Stamp & QR Code:**
   - Square QR Code encoding the cryptographic verification URL (`https://cngsafety.gov.in/verify?id=...`).
   - Circular official stamp watermark in Tiranga Green or Alert Red.
   - Statutory Notice: *"Generated under Rule 35 of Gas Cylinders Rules, 2016. Any unauthorized tampering is punishable under Indian Law."*

---

### 4.5 Form Controls & Accessibility Specifications

- **Input Fields:** 1px solid border (`#9CA3AF`), 4px border radius, 12px horizontal padding, 14px font. Focus state shows a solid 2px outline in Navy (`#16325C`) with 0 offset.
- **Error States:** Field border turns solid red (`#DC2626`), accompanied by a clear, accessible text message below the input with `aria-live="polite"`.
- **Keyboard Navigation:** Every interactive button, link, and input is reachable via `Tab` key with high-contrast visible focus ring (`outline: 2px solid #FF9933`).

---

### 4.6 Official Portal Footer
Matches standard National Informatics Centre (NIC) and Digital India statutory guidelines:

```
+----------------------------------------------------------------------------------------------------+
| वेबसाइट सामग्री का प्रबंधन: पेट्रोलियम और प्राकृतिक गैस मंत्रालय, भारत सरकार                         |
| Website Content Managed by: Ministry of Petroleum & Natural Gas, Government of India                |
|                                                                                                    |
| डिज़ाइन, विकास एवं होस्टिंग: राष्ट्रीय सूचना विज्ञान केंद्र (NIC) / SmartFuel Platform Team          |
| Designed, Developed and Hosted by: National Informatics Centre (NIC)                               |
|                                                                                                    |
| [नियम व शर्तें | Terms]   [गोपनीयता नीति | Privacy Policy]   [हाइपरलिंक नीति | Hyperlink Policy]     |
| [अभिगम्यता विवरण | Accessibility Statement]   [सहायता | Helpdesk: 1800-XXX-XXXX]                   |
|                                                                                                    |
| अंतिम अद्यतन: 12-अक्टूबर-2026 | Last Updated: 12-Oct-2026                 [Digital India Badge]    |
+----------------------------------------------------------------------------------------------------+
```
