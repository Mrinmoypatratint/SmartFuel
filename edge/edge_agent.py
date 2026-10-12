#!/usr/bin/env python3
"""Optional on-site RTSP/USB camera sampler for an authorized demo station.

This process should run ON THE STATION PC, not on the hosted VPS. It samples
frames, sends only JPEG snapshots via HTTPS, and never accesses official data.
Requires `pip install opencv-python` (headless if no preview). Environment:
EDGE_SERVER_URL, EDGE_DEVICE_TOKEN, EDGE_CAMERA_SOURCE, EDGE_INTERVAL.
"""
import os, time, json, base64, ssl, sys, urllib.request
import cv2

URL=os.environ.get('EDGE_SERVER_URL','').rstrip('/')
TOKEN=os.environ.get('EDGE_DEVICE_TOKEN','')
SOURCE=os.environ.get('EDGE_CAMERA_SOURCE','0')
INTERVAL=max(2.0,float(os.environ.get('EDGE_INTERVAL','4')))
if not URL.startswith('https://') or len(TOKEN)<50 or '.' not in TOKEN:
    raise SystemExit('Configure HTTPS EDGE_SERVER_URL and a private EDGE_DEVICE_TOKEN first.')
cap=cv2.VideoCapture(int(SOURCE) if SOURCE.isdecimal() else SOURCE)
if not cap.isOpened():raise SystemExit('Cannot open camera. Check RTSP/USB input and station permissions.')
cap.set(cv2.CAP_PROP_FRAME_WIDTH,1280);cap.set(cv2.CAP_PROP_FRAME_HEIGHT,720)
print('SmartFuel edge sampler active; sample interval:',INTERVAL,'seconds. Press Ctrl+C to stop.')
try:
 while True:
  okay,frame=cap.read()
  if not okay:
   print('Camera frame unavailable, reconnecting…',flush=True)
   cap.release();time.sleep(5);cap=cv2.VideoCapture(int(SOURCE) if SOURCE.isdecimal() else SOURCE);continue
  height,width=frame.shape[:2]
  if width>1280:frame=cv2.resize(frame,(1280,int(height*1280/width)))
  encoded=cv2.imencode('.jpg',frame,[int(cv2.IMWRITE_JPEG_QUALITY),80])
  if not encoded[0]:time.sleep(INTERVAL);continue
  payload=json.dumps({'image_base64':'data:image/jpeg;base64,'+base64.b64encode(encoded[1].tobytes()).decode()}).encode()
  req=urllib.request.Request(URL+'/api/edge/scan',payload,headers={'Content-Type':'application/json','X-Device-Token':TOKEN},method='POST')
  try:
   with urllib.request.urlopen(req,timeout=20,context=ssl.create_default_context()) as response:
    data=json.loads(response.read().decode())
    print('Scan:',data.get('plate','—'),'recorded:',data.get('accepted',False),'status:',data.get('status','review/duplicate'),flush=True)
  except Exception as exc:print('Unable to submit frame:',type(exc).__name__,str(exc)[:160],flush=True)
  time.sleep(INTERVAL)
except KeyboardInterrupt:print('Stopped')
finally:cap.release()
