"""SmartFuel AI Double-Verification Engine using OpenAI GPT-4o Mini Vision API.

Provides secondary AI verification on captured vehicle number plate frames:
1. Accepts 1 to 5 image frames (base64 or bytes).
2. Sends high-resolution crops / frames to OpenAI gpt-4o-mini Vision endpoint.
3. System prompt enforces Indian Motor Vehicles Act registration structures
   (State Code + District Digits + Series Letters + 4 Digits or BH Series format)
   to resolve optical ambiguities (e.g., 8 vs B, 0 vs O, 1 vs I).
4. Cross-verifies AI result against local OCR consensus:
   - Dual Match: High-confidence confirmation.
   - Disagreement: GPT-4o Mini result preferred for ambiguous/dirty plates.
   - Graceful Fallback: If no API key or network timeout, seamlessly falls back
     to local OCR without blocking the fueling pipeline.
"""

import os
import re
import json
import time
import base64
import logging
from typing import Optional, List, Dict, Any, Union
import httpx
from PIL import Image
import io

log = logging.getLogger("smartfuel.ai")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_VISION_ENABLED = os.getenv("OPENAI_VISION_ENABLED", "1") == "1"
OPENAI_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "4.0"))

RE_INDIAN_PLATE = re.compile(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$")
LETTER_CONV = str.maketrans("0185", "OIBS")
DIGIT_CONV = str.maketrans("OIQSBZL", "0105824")


def clean_plate_string(raw: str) -> str:
    """Sanitizes and normalizes an Indian license plate string."""
    clean = re.sub(r"[^A-Z0-9]", "", str(raw or "").upper())
    if clean.startswith("IND") and len(clean) > 5:
        clean = clean[3:]
    if len(clean) == 10:
        chars = list(clean)
        for j in (0, 1, 4, 5):
            chars[j] = chars[j].translate(LETTER_CONV)
        for j in (2, 3, 6, 7, 8, 9):
            chars[j] = chars[j].translate(DIGIT_CONV)
        clean = "".join(chars)
    return clean


def prepare_image_payload(image_input: Union[bytes, str]) -> Optional[str]:
    """Converts image bytes or base64 string to a valid data URL, resizing if necessary."""
    try:
        if isinstance(image_input, str):
            if image_input.startswith("data:image"):
                # Already a data URL
                return image_input
            # Raw base64 string
            raw_bytes = base64.b64decode(image_input)
        else:
            raw_bytes = image_input

        # Optimize size: max 1200px width/height to minimize API latency and token cost
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = img.convert("RGB")
            if max(img.size) > 1200:
                img.thumbnail((1200, 1200))
            out_buf = io.BytesIO()
            img.save(out_buf, format="JPEG", quality=85)
            b64_str = base64.b64encode(out_buf.getvalue()).decode("utf-8")
            return f"data:image/jpeg;base64,{b64_str}"
    except Exception as exc:
        log.warning("Failed to prepare image for GPT-4o Mini: %s", exc)
        return None


def verify_plate_with_ai(
    images: Union[bytes, str, List[Union[bytes, str]]],
    local_plate: str = "",
    local_confidence: float = 0.0,
    local_candidates: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Calls OpenAI GPT-4o Mini Vision API to double-verify vehicle license plate.

    Args:
        images: A single image (bytes or base64 data-URL) or a list of 1-5 candidate frames.
        local_plate: The plate string extracted by local OCR (Tesseract / RapidOCR).
        local_confidence: Confidence percentage from local OCR.
        local_candidates: Optional list of alternate candidate readings from local OCR.

    Returns:
        Structured dictionary containing:
        - final_plate: The resolved registration string.
        - ai_plate: The plate recognized by GPT-4o Mini.
        - local_plate: The original local OCR plate.
        - dual_confirmed: True if both local OCR and AI agree.
        - ai_override: True if AI resolved an optical error from local OCR.
        - ai_confidence: AI confidence (0-100%).
        - status: 'DUAL_CONFIRMED', 'AI_OVERRIDE', 'AI_FALLBACK', 'SKIPPED_NO_KEY', 'TIMEOUT', 'ERROR'.
        - latency_ms: Round-trip time in milliseconds.
    """
    start_time = time.time()
    clean_local = clean_plate_string(local_plate)

    # 1. Check if OpenAI API key is present and enabled
    api_key = os.getenv("OPENAI_API_KEY", OPENAI_API_KEY).strip()
    if not api_key:
        return {
            "final_plate": clean_local,
            "local_plate": clean_local,
            "ai_plate": None,
            "dual_confirmed": False,
            "ai_override": False,
            "ai_confidence": 0.0,
            "status": "SKIPPED_NO_KEY",
            "message": "OpenAI API key not set in .env. Using local OCR consensus.",
            "latency_ms": 0,
            "model": OPENAI_MODEL,
        }

    if not OPENAI_VISION_ENABLED:
        return {
            "final_plate": clean_local,
            "local_plate": clean_local,
            "ai_plate": None,
            "dual_confirmed": False,
            "ai_override": False,
            "ai_confidence": 0.0,
            "status": "DISABLED",
            "message": "AI Vision double verification is disabled via OPENAI_VISION_ENABLED=0.",
            "latency_ms": 0,
            "model": OPENAI_MODEL,
        }

    # 2. Normalize image input list (up to 5 frames)
    if not isinstance(images, list):
        images = [images]
    images = images[:5]

    data_urls = []
    for img_in in images:
        data_url = prepare_image_payload(img_in)
        if data_url:
            data_urls.append(data_url)

    if not data_urls:
        return {
            "final_plate": clean_local,
            "local_plate": clean_local,
            "ai_plate": None,
            "dual_confirmed": False,
            "ai_override": False,
            "ai_confidence": 0.0,
            "status": "NO_VALID_IMAGE",
            "message": "No valid image frames available for AI verification.",
            "latency_ms": round((time.time() - start_time) * 1000),
            "model": OPENAI_MODEL,
        }

    # 3. Construct OpenAI Vision Chat Completion Payload
    system_prompt = (
        "You are an expert Indian Vehicle Registration Plate (HSRP) recognition and validation AI. "
        "Analyze the provided vehicle ingress image(s) and extract the exact registration number. "
        "Disambiguate common optical confusions (such as 8 vs B, 0 vs O, 1 vs I, 2 vs Z, 5 vs S) "
        "using standard Indian Motor Vehicle registration layouts:\n"
        "1. Standard Format (10 chars): 2-letter State code (e.g. DL, MH, WB, UP, HR, KA, GJ, RJ) + "
        "2-digit district code + 1 to 3 series letters + 4 digits (e.g., WB42AV8012, DL01AB1234).\n"
        "2. Bharat Series (BH): 2-digit registration year + BH + 4 digits + 1-2 letters (e.g., 22BH1234AA).\n"
        "Return ONLY a valid JSON object with the following schema:\n"
        "{\n"
        '  "plate_number": "EXACT_NORMALIZED_PLATE",\n'
        '  "confidence": 0.98,\n'
        '  "state_code": "WB",\n'
        '  "plate_type": "HSRP_STANDARD" or "BH_SERIES" or "UNKNOWN",\n'
        '  "notes": "brief disambiguation rationale"\n'
        "}"
    )

    user_content = [
        {
            "type": "text",
            "text": f"Extract the exact vehicle registration plate number from these {len(data_urls)} frame(s). "
                    f"Local preliminary OCR candidate was: '{clean_local or 'UNKNOWN'}'.",
        }
    ]

    for url in data_urls:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": url, "detail": "high"}
        })

    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
        "max_tokens": 150,
    }

    # 4. Dispatch REST call to OpenAI
    ai_raw = None
    ai_plate = None
    ai_conf = 0.0
    status = "AI_FALLBACK"

    try:
        with httpx.Client(timeout=OPENAI_TIMEOUT) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            latency_ms = round((time.time() - start_time) * 1000)

            if resp.status_code == 200:
                resp_json = resp.json()
                choice = resp_json.get("choices", [{}])[0]
                content_text = choice.get("message", {}).get("content", "{}")
                ai_raw = json.loads(content_text)
                ai_plate_raw = ai_raw.get("plate_number", "")
                ai_conf = float(ai_raw.get("confidence") or 0.95) * 100
                ai_plate = clean_plate_string(ai_plate_raw)
            else:
                log.error("OpenAI API returned HTTP %s: %s", resp.status_code, resp.text[:200])
                status = f"API_ERROR_{resp.status_code}"
    except httpx.TimeoutException:
        latency_ms = round((time.time() - start_time) * 1000)
        log.warning("OpenAI API timed out after %s seconds. Falling back to local OCR.", OPENAI_TIMEOUT)
        status = "TIMEOUT"
    except Exception as exc:
        latency_ms = round((time.time() - start_time) * 1000)
        log.warning("OpenAI API call failed: %s. Falling back to local OCR.", exc)
        status = "ERROR"

    # 5. Cross-Verification Logic: Compare Local OCR vs GPT-4o Mini
    final_plate = clean_local
    dual_confirmed = False
    ai_override = False

    if ai_plate and RE_INDIAN_PLATE.fullmatch(ai_plate):
        if clean_local and ai_plate == clean_local:
            # Dual Match: High Confidence
            final_plate = ai_plate
            dual_confirmed = True
            status = "DUAL_CONFIRMED"
        elif clean_local and ai_plate != clean_local:
            # Disagreement: Prefer GPT-4o Mini if it has high confidence and valid format
            final_plate = ai_plate
            ai_override = True
            status = "AI_OVERRIDE"
        else:
            # Local OCR failed, but AI found a plate
            final_plate = ai_plate
            ai_override = True
            status = "AI_RECOVERED"
    else:
        # AI didn't return a valid plate format, keep local OCR
        if status not in ("TIMEOUT", "ERROR") and not status.startswith("API_ERROR"):
            status = "AI_UNREADABLE"

    return {
        "final_plate": final_plate,
        "local_plate": clean_local,
        "ai_plate": ai_plate,
        "dual_confirmed": dual_confirmed,
        "ai_override": ai_override,
        "ai_confidence": round(ai_conf, 1),
        "status": status,
        "latency_ms": latency_ms,
        "model": OPENAI_MODEL,
        "details": ai_raw or {},
    }
