"""Tests for OpenAI GPT-4o Mini Vision API double verification layer."""
import os
import json
import pytest
from unittest.mock import patch, MagicMock
from app.ai_verifier import clean_plate_string, prepare_image_payload, verify_plate_with_ai


def test_clean_plate_string():
    assert clean_plate_string("wb 42 av 8012") == "WB42AV8012"
    assert clean_plate_string("INDDL01AB1234") == "DL01AB1234"
    # Positional character-digit repair for 10-char Indian plates
    # Position 4 should be letter (e.g. 8 -> B)
    assert clean_plate_string("DL01A81234") == "DL01AB1234"
    # Position 2 and 3 should be digits (e.g. O -> 0, I -> 1)
    assert clean_plate_string("DLOIAB1234") == "DL01AB1234"


def test_verify_plate_skipped_when_no_api_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "")
    res = verify_plate_with_ai(b"dummy_bytes", local_plate="WB42AV8012", local_confidence=92.0)
    assert res["final_plate"] == "WB42AV8012"
    assert res["dual_confirmed"] is False
    assert res["status"] == "SKIPPED_NO_KEY"
    assert res["ai_plate"] is None


def test_verify_plate_dual_confirmed(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-mock-test-key-12345")
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "plate_number": "WB42AV8012",
                        "confidence": 0.99,
                        "state_code": "WB",
                        "plate_type": "HSRP_STANDARD",
                        "notes": "Sharp, clear front plate"
                    })
                }
            }
        ]
    }

    # Dummy 10x10 white jpeg
    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="white").save(buf, format="JPEG")
    dummy_jpg = buf.getvalue()

    with patch("httpx.Client.post", return_value=mock_response):
        res = verify_plate_with_ai(dummy_jpg, local_plate="WB42AV8012", local_confidence=91.0)
        assert res["final_plate"] == "WB42AV8012"
        assert res["dual_confirmed"] is True
        assert res["ai_override"] is False
        assert res["status"] == "DUAL_CONFIRMED"
        assert res["ai_confidence"] == 99.0


def test_verify_plate_ai_override_optical_misread(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-mock-test-key-12345")
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "plate_number": "DL01AB1234",
                        "confidence": 0.98,
                        "state_code": "DL",
                        "plate_type": "HSRP_STANDARD",
                        "notes": "Character B was slightly dusty, resolved from context."
                    })
                }
            }
        ]
    }

    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="white").save(buf, format="JPEG")
    dummy_jpg = buf.getvalue()

    with patch("httpx.Client.post", return_value=mock_response):
        # Local OCR misread B as 8 -> DL01AC1234 vs DL01AB1234
        res = verify_plate_with_ai(dummy_jpg, local_plate="DL01AC1234", local_confidence=74.0)
        assert res["final_plate"] == "DL01AB1234"
        assert res["dual_confirmed"] is False
        assert res["ai_override"] is True
        assert res["status"] == "AI_OVERRIDE"


def test_verify_plate_api_timeout_fallback(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-mock-test-key-12345")
    import httpx

    import io
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (100, 100), color="white").save(buf, format="JPEG")
    dummy_jpg = buf.getvalue()

    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Read timed out")):
        res = verify_plate_with_ai(dummy_jpg, local_plate="WB42AV8012", local_confidence=88.0)
        assert res["final_plate"] == "WB42AV8012"
        assert res["status"] == "TIMEOUT"
        assert res["dual_confirmed"] is False
