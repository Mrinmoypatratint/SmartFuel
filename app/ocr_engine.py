"""Local OCR via OpenCV + Tesseract. No remote or government API calls."""
import os
import re
import shutil
from pathlib import Path
import cv2
import numpy as np
import pytesseract
from pytesseract import Output
from PIL import Image, ImageOps, UnidentifiedImageError
import io

RE_PLATE = re.compile(r"[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}")
RE_BH = re.compile(r"[0-9]{2}BH[0-9]{4}[A-Z]{1,2}")

def configure_tesseract():
    configured = os.environ.get("TESSERACT_PATH", "").strip()
    paths = [configured, shutil.which("tesseract"), r"C:\Program Files\Tesseract-OCR\tesseract.exe",r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"]
    for p in paths:
        if p and Path(p).is_file():
            pytesseract.pytesseract.tesseract_cmd = str(p)
            return str(p)
    return None

TESSERACT_BINARY = configure_tesseract()

def valid_candidates(string):
    text = re.sub(r"[^A-Z0-9]", "", string.upper())
    patterns = [RE_PLATE, RE_BH]
    candidates = []
    for p in patterns:
        for match in p.finditer(text):
            candidates.append(match.group(0))
    # OCR confuses certain letters with numbers. Try only structure-specific substitutions.
    if not candidates:
        for i in range(max(1,len(text)-8)):
            sub = text[i:i+10]
            if len(sub) < 9 or len(sub) > 10: continue
            if not re.match(r"^[A-Z0-9]{9,10}$",sub): continue
            # Standard 10-character Indian plate, e.g. DL00DE0002.
            if len(sub) == 10:
                chars = list(sub)
                letter_conv = str.maketrans("0185", "OIBS")
                digit_conv = str.maketrans("OIQSB", "01058")
                for j in (0,1,4,5): chars[j] = chars[j].translate(letter_conv)
                for j in (2,3,6,7,8,9): chars[j] = chars[j].translate(digit_conv)
                normalized = "".join(chars)
                if RE_PLATE.fullmatch(normalized): candidates.append(normalized)
    return list(dict.fromkeys(candidates))

def read_image(image_bytes):
    if len(image_bytes) > 8*1024*1024:
        raise ValueError("Image exceeds the 8 MB size limit")
    try:
        with Image.open(io.BytesIO(image_bytes)) as im:
            im = ImageOps.exif_transpose(im)
            if im.width * im.height > 24000000:
                raise ValueError("Image resolution exceeds the 24 MP safety limit")
            im.load()
            im = im.convert("RGB")
            if max(im.size) > 2400:
                im.thumbnail((2400,2400))
            arr = np.array(im)
    except (UnidentifiedImageError,OSError,Image.DecompressionBombError) as e:
        raise ValueError("Invalid image. Please upload JPG, PNG or WEBP") from e
    return cv2.cvtColor(arr,cv2.COLOR_RGB2BGR)

def possible_regions(bgr):
    h,w = bgr.shape[:2]
    regions = [(bgr,"full image")]
    if min(w,h)<80: return regions
    gray = cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY)
    blur = cv2.bilateralFilter(gray,7,60,60)
    grad = cv2.morphologyEx(blur,cv2.MORPH_GRADIENT,cv2.getStructuringElement(cv2.MORPH_RECT,(13,3)))
    _,binary = cv2.threshold(grad,0,255,cv2.THRESH_BINARY|cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT,(15,4))
    binary = cv2.morphologyEx(binary,cv2.MORPH_CLOSE,kernel,iterations=2)
    contours,_=cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    boxes=[]
    for c in contours:
        x,y,bw,bh = cv2.boundingRect(c)
        ratio = bw/max(1,bh)
        if 1.5 < ratio < 8.5 and w*.10 < bw < w*.98 and bh > max(14,h*.025):
            pad_x=int(bw*.08);pad_y=int(bh*.22)
            ax=max(0,x-pad_x);ay=max(0,y-pad_y)
            bx=min(w,x+bw+pad_x);by=min(h,y+bh+pad_y)
            boxes.append((bw*bh,(ax,ay,bx,by)))
    for _,(ax,ay,bx,by) in sorted(boxes,reverse=True)[:8]:
        region=bgr[ay:by,ax:bx]
        if region.size: regions.append((region,f"detected region ({ax},{ay})"))
    # Lower area is common in front view vehicle photos, while full image remains fallback.
    if h>240:
        regions.append((bgr[int(h*.45):],"lower image"))
    return regions

def ocr_plate(image_bytes):
    if not configure_tesseract():
        raise RuntimeError("Tesseract OCR is not installed. Install it and restart the software; see README.")
    bgr = read_image(image_bytes)
    found=[]
    texts=[]
    for region,where in possible_regions(bgr):
        gray=cv2.cvtColor(region,cv2.COLOR_BGR2GRAY)
        if gray.shape[1]<500:
            scale=min(4,max(1,round(700/max(gray.shape[1],1))))
            gray=cv2.resize(gray,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
        variants=[gray,cv2.threshold(gray,0,255,cv2.THRESH_BINARY+cv2.THRESH_OTSU)[1]]
        # For major plate region we try adaptive threshold too.
        if where != "full image":
            variants.append(cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,31,11))
        for n,variant in enumerate(variants):
            for psm in ([7,6] if where!="full image" else [11,6]):
                config=f"--oem 3 --psm {psm} -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                try:
                    d=pytesseract.image_to_data(variant,config=config,output_type=Output.DICT)
                    tokens=[]
                    confidences=[]
                    for token,c in zip(d["text"],d["conf"]):
                        if token.strip():
                            tokens.append(token.strip().upper())
                            try: confidences.append(max(0,float(c)))
                            except (TypeError,ValueError): pass
                    joined="".join(tokens)
                    spaced=" ".join(tokens)
                    if joined: texts.append(spaced[:180])
                    for candidate in valid_candidates(joined):
                        conf=round(sum(confidences)/max(1,len(confidences)),1) if confidences else 0
                        score=conf+(22 if where.startswith("detected region") else 8)+(3 if psm==7 else 0)
                        found.append((score,candidate,conf,where))
                except pytesseract.TesseractError as e:
                    raise RuntimeError(f"OCR engine error: {e}") from e
    found.sort(reverse=True)
    if not found:
        return {"plate":"","confidence":0,"method":"OCR","raw_text":" | ".join(texts[:6]),"candidates":[],"hint":"No number plate confidently identified. Try a sharper frontal image or enter the plate manually."}
    best=found[0]
    best_per_plate={}
    for _,plate,conf,region in found:
        if plate not in best_per_plate:
            best_per_plate[plate]={"plate":plate,"confidence":conf,"region":region}
    return {"plate":best[1],"confidence":best[2],"method":"OCR","raw_text":" | ".join(texts[:6]),"candidates":list(best_per_plate.values())[:5]}
