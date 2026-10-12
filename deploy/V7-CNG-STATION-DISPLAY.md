# v7 — Separate CNG Station Operator Decision Display

## What was added
- `/cng-display`: separate, full-screen, green/white/blue CNG status board, requires a logged-in user.
- `/api/cng-display/latest?station_id=<id>`: authenticated, station-scoped, polls recent saved inspections.
- For each registered vehicle: separately evaluates demonstration RC CNG endorsement and each cylinder's stored expiry/evidence. Shows exact reasons to hold/review the case.
- Automatic updates every 3 seconds from image upload, manual check, webcam automatic entries and station edge scans.
- A prominent link inside AI Inspection and Station Alerts opens the display on a second monitor.
- No vehicle owner identity is exposed on the station screen. The current demo database contains no verified owner identity; names are intentionally not fabricated.

## Demonstration examples
- `KA00DE0004`: CNG endorsement not shown on sample RC → HOLD.
- `WB00DE0001`: expired cylinder record → HOLD.
- `MH00DE0003`: missing certificate/test info → REVIEW.
- `TN00DE0005`: unknown endorsement → REVIEW.
- `UP00DE0006`: stored demo checks passed. NOT a legal filling authorization.
- Unknown plate: no demo record → REVIEW.
- Low-confidence OCR: manually confirm the vehicle number before trusting lookup.

## Operating on a secondary screen
1. Sign in to the same secure SmartFuel system as a station operator.
2. Open `/cng-display` in a separate browser window, select your station, select Full screen and move the window to the customer-facing or station attendant monitor.
3. Keep the AI Inspection page open on a separate computer or tab. Scan a sample plate via image upload or USB webcam.
4. The display updates after the saved inspection; notes the source and does not label photo uploads as real entries.
5. This demo screen **does not make real-world CNG dispensing decisions**. Follow authorized station policy and official records before any actual dispensing.

## Deployment
After backing up your database/files, deploy this ZIP using the existing `deploy/HOSTINGER-KVM2.md` and `docker compose up -d --build`. Do not discard the `.env` values or persistent Docker volumes.
