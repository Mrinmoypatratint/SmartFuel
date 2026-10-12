# Functional acceptance matrix — source vs live validation

| Client requirement | Delivered in v2 software | Must verify on live KVM2 / with client |
|---|---|---|
| AI reads vehicle registration | Image upload, OpenCV/Tesseract OCR | Real-angle, night/rain/glare accuracy; 2MP camera model |
| Webcam/USB capture | Browser getUserMedia + frame upload | Operator workstation over HTTPS, camera permission |
| Invalid/no certificate alarm | Expired/missing alert wall and inspection results | Physical station display, correct client alarm workflow |
| CNG RC endorsement | Sample field in own database | Actual official agency-authorised data integration (absent) |
| Count cylinders | Stored per-vehicle cylinder records | True installation evidence unavailable without authorised sources |
| Each cylinder hydrotest | Stored test/expiry dates + rule evaluation | Actual verification with issuers unavailable; dates are simulated |
| Display/download certificate | Watermarked demonstration PDF, optional sample attachment | Actual authorised certificate download not implemented |
| Web dashboard | Full responsive HTML web application | Browser/role/HTTPS tests on client workstations |
| Mobile application dashboard | Responsive web can open on mobile browser | Separate native app not included |
| Inspection report | PDF download/print, CSV export | Client format/signatures/legal sign-off |
| Role-based access | Admin, Operator, Viewer, cookie login, CSRF, station restrictions | Client admin-user acceptance & penetration testing |
| Maintenance and support | Health API, logs, storage/backups instructions | Support team, SLA, camera repair, 24x7 operations not delivered by code |
| Network provisioning | Deployment guide and HTTPS reverse proxy | Vendor must procure/configure connectivity and power at stations |

**Scope note:** Government record authentication cannot be truthfully simulated as "verified"; generated data displays "DEMONSTRATION". Physical field setup and 24x7 service are future obligations for a contract rollout.
