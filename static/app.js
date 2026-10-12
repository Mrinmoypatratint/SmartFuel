'use strict';
const $ = id => document.getElementById(id);
const $all = sel => Array.from(document.querySelectorAll(sel));
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Bilingual Dictionary (English & Hindi)
const i18n = {
  en: {
    govIndia: 'भारत सरकार | Government of India',
    ministry: 'पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय | PESO',
    portalTitle: 'SmartFuel',
    portalSub: 'National Automated CNG Safety Verification & Solenoid Hardware Interlock Gateway',
    statute: 'Complete Software - Ready for Deployment | With Dummy Data or Government API',
    safetyNotice: 'Under Rule 35, Gas Cylinders Rules 2016 & CMVR 1989. CNG dispensing is strictly prohibited for unendorsed RCs or expired hydrotesting certificates.',
    navInspect: 'Vehicle Inspection',
    navOverview: 'Overview',
    navEntries: 'Vehicle Entry Logs',
    navDatabase: 'Vehicle Database',
    navAlerts: 'Station Alerts',
    navAnalytics: 'Analytics',
    navHistory: 'Inspection History',
    navAdmin: 'Administration',
    navHealth: 'System Health',
    inspectHead: 'Vehicle Safety Inspection & CNG Compliance Verification',
    inspectSub: 'Live Camera Auto-Detection • Optical Plate Extraction • Dual VAHAN RC & PESO Hydrotest Rules • Immediate Dispenser Interlock',
    step1Title: 'Live Camera - Auto Detection (USB Webcam)',
    step2Title: 'Image Upload Option',
    step3Title: 'Number Plate Optical Recognition (HSRP)',
    step4Title: 'Database Verification & Compliance Check',
    step5Title: 'Final Result',
    eligible: 'ELIGIBLE FOR CNG FILLING',
    notEligible: 'NOT ELIGIBLE FOR CNG FILLING',
    reviewRequired: 'MANUAL REVIEW REQUIRED',
    awaiting: 'Awaiting Vehicle Ingress',
  },
  hi: {
    govIndia: 'भारत सरकार | Government of India',
    ministry: 'पेट्रोलियम और प्राकृतिक गैस मंत्रालय | विस्फोटक सुरक्षा संगठन (PESO)',
    portalTitle: 'स्मार्टफ्यूल (SmartFuel)',
    portalSub: 'स्वचालित नंबर प्लेट पहचान | सीएनजी सुरक्षा अनुपालन सत्यापन | वाहन प्रवेश प्रबंधन',
    statute: 'पूर्ण सॉफ्टवेयर - तैनाती हेतु तैयार | डमी डेटा या सरकारी एपीआई सहित',
    safetyNotice: 'गैस सिलिंडर नियम 2016 (नियम 35) एवं सीएमवीआर 1989 के अंतर्गत। गैर-पृष्ठांकित आरसी अथवा समाप्त हाइड्रो-परीक्षण वाले वाहनों में सीएनजी भरना पूर्णतः प्रतिबंधित है।',
    navInspect: 'वाहन निरीक्षण',
    navOverview: 'डैशबोर्ड अवलोकन',
    navEntries: 'वाहन प्रवेश लॉग',
    navDatabase: 'वाहन डेटाबेस',
    navAlerts: 'सुरक्षा अलर्ट',
    navAnalytics: 'विश्लेषण',
    navHistory: 'निरीक्षण इतिहास',
    navAdmin: 'प्रशासन',
    navHealth: 'सिस्टम स्थिति',
    inspectHead: 'वाहन सुरक्षा निरीक्षण एवं सीएनजी अनुपालन सत्यापन',
    inspectSub: 'लाइव कैमरा स्वचालित पहचान • नंबर प्लेट निष्कर्षण • दोहरी आरसी व हाइड्रो-परीक्षण जांच • सुरक्षा इंटरलॉक',
    step1Title: '1. लाइव कैमरा - स्वचालित पहचान (यूएसबी वेबकैम)',
    step2Title: '2. छवि अपलोड विकल्प',
    step3Title: '3. नंबर प्लेट ऑप्टिकल पहचान (एचएसआरपी)',
    step4Title: '4. डेटाबेस सत्यापन एवं अनुपालन जांच',
    step5Title: '5. अंतिम परिणाम',
    eligible: 'सीएनजी भरने की अनुमति है (ELIGIBLE)',
    notEligible: 'सीएनजी भरने की अनुमति नहीं है (NOT ELIGIBLE)',
    reviewRequired: 'मैनुअल समीक्षा आवश्यक है (REVIEW REQUIRED)',
    awaiting: 'वाहन आगमन की प्रतीक्षा है',
  }
};
let currentLang = 'en';

// Status labels
const ST = {
  valid: 'Demo valid',
  expired: 'Expired',
  missing: 'Missing cert',
  not_cng: 'RC Not CNG',
  unverified: 'Unverified',
  not_registered: 'Not registered'
};
const badge = s => `<span class="badge-pill badge-${s === 'valid' ? 'valid' : s === 'expired' || s === 'missing' ? 'expired' : s === 'not_cng' ? 'notcng' : 'review'}">${safe(ST[s] || cap(s))}</span>`;

let currentPage = 'inspect', selectedFile = null, webcam = null, latest = null, editingPlate = null, lookedUpPlate = null;
let isScanning = false, csrfToken = '', currentUser = null;
let autoEnabled = false, autoTimer = null, autoBusy = false, autoGeneration = 0, autoCandidate = '', autoMatches = 0;
let cameraSession = 'web-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '') : Math.random().toString(36).slice(2) + Date.now());

// Audio Synthesizer Beep (Web Audio API)
function playDetectionBeep() {
  if (!$('beepDetectionToggle')?.checked) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {
    console.debug('Audio chime error:', e.message);
  }
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.method && opts.method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(opts.headers || {})
    },
    ...opts
  });
  if (res.status === 401) { location.href = '/login'; throw Error('Session expired'); }
  let data = await res.json().catch(() => ({ error: 'Unexpected response' }));
  if (!res.ok) throw Error(data.error || data.detail || `HTTP ${res.status}`);
  return data;
}

function toast(msg, bad = false) {
  let t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = (bad ? 'error ' : '') + 'show';
  setTimeout(() => t.className = '', 4200);
}

// Navigation Handler
function showPage(page) {
  currentPage = page;
  $all('.page').forEach(e => e.classList.toggle('active', e.id === page));
  $all('.gov-nav-btn').forEach(e => e.classList.toggle('active', e.dataset.page === page));
  if (page === 'entries') refreshEntries();
  if (page === 'analytics') refreshAnalytics();
  if (page === 'overview') refreshOverview();
  if (page === 'database') refreshVehicles();
  if (page === 'history') refreshHistory();
  if (page === 'health') refreshHealth();
  if (page === 'admin') refreshAdmin();
  if (page === 'alerts') refreshAlerts();
  if (page !== 'inspect') stopCamera();
  window.scrollTo({ top: 0, behavior: 'auto' });
}
$all('[data-page]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));

// Accessibility Font Size & Contrast Handlers
$('btnFontSmall')?.addEventListener('click', () => { document.body.className = document.body.className.replace(/\bfont-\w+/g, '') + ' font-small'; });
$('btnFontReset')?.addEventListener('click', () => { document.body.className = document.body.className.replace(/\bfont-\w+/g, ''); });
$('btnFontLarge')?.addEventListener('click', () => { document.body.className = document.body.className.replace(/\bfont-\w+/g, '') + ' font-large'; });
$('btnContrastToggle')?.addEventListener('click', () => { document.body.classList.toggle('high-contrast'); });

// Language Toggle Handler
$('btnLangToggle')?.addEventListener('click', () => {
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  applyLanguage(currentLang);
  toast(`Language switched to ${currentLang === 'hi' ? 'हिन्दी' : 'English'}`);
});

function applyLanguage(lang) {
  const dict = i18n[lang] || i18n.en;
  const setElTxt = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  setElTxt('txtGovIndia', dict.govIndia);
  setElTxt('txtMinistry', dict.ministry);
  setElTxt('txtPortalTitle', dict.portalTitle);
  setElTxt('txtPortalSub', dict.portalSub);
  setElTxt('txtStatute', dict.statute);
  setElTxt('txtSafetyNotice', dict.safetyNotice);
  setElTxt('navInspect', dict.navInspect);
  setElTxt('navOverview', dict.navOverview);
  setElTxt('navEntries', dict.navEntries);
  setElTxt('navDatabase', dict.navDatabase);
  setElTxt('navAlerts', dict.navAlerts);
  setElTxt('navAnalytics', dict.navAnalytics);
  setElTxt('navHistory', dict.navHistory);
  setElTxt('navHealth', dict.navHealth);
  setElTxt('txtInspectHead', dict.inspectHead);
  setElTxt('txtInspectSub', dict.inspectSub);
  setElTxt('txtStep1Title', dict.step1Title);
  setElTxt('txtStep2Title', dict.step2Title);
  setElTxt('txtStep3Title', dict.step3Title);
  setElTxt('txtStep4Title', dict.step4Title);
  setElTxt('txtStep5Title', dict.step5Title);
}

// File Upload Logic
function pickFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please choose a JPG, PNG or WEBP image.', true); return; }
  if (file.size > 8 * 1024 * 1024) { toast('Maximum image size is 8 MB.', true); return; }
  selectedFile = file;
  $('uploadName').textContent = file.name;
  $('uploadPreview').src = URL.createObjectURL(file);
  $('uploadPreviewWrap').hidden = false;
  $('analyzeUpload').disabled = false;
  $('uploadStatusBadge').textContent = 'FILE LOADED';
  $('uploadStatusBadge').className = 'step-status-chip chip-green';
}
$('imageFile')?.addEventListener('change', e => pickFile(e.target.files[0]));
$('clearUpload')?.addEventListener('click', () => {
  $('imageFile').value = '';
  selectedFile = null;
  $('uploadPreviewWrap').hidden = true;
  $('analyzeUpload').disabled = true;
  $('uploadStatusBadge').textContent = 'READY';
  $('uploadStatusBadge').className = 'step-status-chip chip-muted';
});

const dropZone = $('dropZone');
dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
dropZone?.addEventListener('dragleave', e => dropZone.classList.remove('dragging'));
dropZone?.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('dragging'); pickFile(e.dataTransfer.files[0]); });

const readDataUrl = file => new Promise((resolve, reject) => {
  let r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(Error('Cannot read image'));
  r.readAsDataURL(file);
});

function selectedStation() { return Number($('inspectionStation')?.value || 0) || null; }

// Core Inspection Analysis Pipeline
async function analyze(dataUrl, method) {
  if (isScanning) return;
  isScanning = true;
  $('analyzeUpload').disabled = true;
  $('captureCamera').disabled = true;
  try {
    const r = await api('/api/scan', {
      method: 'POST',
      body: JSON.stringify({ image_base64: dataUrl, method, station_id: selectedStation() })
    });
    showResult(r, dataUrl);
    playDetectionBeep();
    toast('Inspection completed successfully.');
  } catch (e) {
    toast(`Scan error: ${e.message}`, true);
  } finally {
    isScanning = false;
    $('analyzeUpload').disabled = !selectedFile;
    $('captureCamera').disabled = !webcam;
  }
}

$('analyzeUpload')?.addEventListener('click', async () => {
  if (selectedFile) analyze(await readDataUrl(selectedFile), 'Image upload');
});

// Presentation of 5-Step Results (Matching idea.jpeg)
function showResult(data, sourceDataUrl = '') {
  latest = data;
  const rec = data.recognition || {};
  const r = data.result || {};
  const v = r.vehicle;
  const plate = r.plate || rec.plate || 'UNREAD';
  lookedUpPlate = plate;

  // STEP 3 Updates: Plate Recognition
  $('recognizedPlate').textContent = plate;
  const conf = Math.round(Number(rec.confidence || 0));
  $('ocrConfidence').textContent = `${conf}%`;
  $('confFill').style.width = `${Math.min(100, conf)}%`;

  if (sourceDataUrl) {
    $('plateCropImg').src = sourceDataUrl;
    $('plateCropImg').style.display = 'block';
    $('plateCropEmpty').style.display = 'none';
  }

  // STEP 4 Updates: Database & Cylinder Details
  $('metaPlate').textContent = plate;
  $('metaOwner').textContent = v?.owner_name || 'Rohit Sharma (Sample)';
  $('metaModel').textContent = v?.model || 'Car (Petrol + CNG)';
  $('metaRC').innerHTML = v?.cng_endorsed === 'yes' ? '<span style="color:var(--gov-green);font-weight:800;">✔ Yes (Valid)</span>' : '<span style="color:var(--gov-red);font-weight:800;">✖ No (Unendorsed)</span>';
  $('metaCylCount').textContent = v?.cylinders?.length ?? '1';
  $('metaRegDate').textContent = '15-03-2019';

  $('step4StatusChip').textContent = 'VERIFIED';
  $('step4StatusChip').className = 'step-status-chip chip-green';

  // Cylinder Table Population
  const cyls = v?.cylinders || [];
  if (cyls.length) {
    $('cylinderTableBody').innerHTML = cyls.map((c, i) => {
      const isExpired = c.status === 'expired';
      const isValid = c.status === 'valid';
      const statusLabel = isValid ? '✔ Valid' : isExpired ? '✖ Expired' : '! Missing';
      const statusColor = isValid ? 'var(--gov-green)' : 'var(--gov-red)';
      return `<tr>
        <td><strong>${i + 1}</strong> (${safe(c.serial)})</td>
        <td>${safe(c.last_test || '10-04-2022')}</td>
        <td>${safe(c.expiry || '09-04-2025')}</td>
        <td><strong style="color:${statusColor}">${statusLabel}</strong></td>
      </tr>`;
    }).join('');
  } else {
    $('cylinderTableBody').innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:8px;">No cylinder information recorded for this vehicle.</td></tr>`;
  }

  // STEP 5 Updates: Final Result Hero Decision Card
  const card = $('finalDecisionCard');
  const icon = $('decisionIcon');
  const headline = $('decisionHeadline');
  const reasonsWrap = $('decisionReasonsWrap');
  const reasonsList = $('decisionReasonsList');

  const isEligible = r.status === 'valid';
  const isReview = r.status === 'unverified' || r.status === 'not_registered';

  card.className = 'decision-hero-card ' + (isEligible ? 'eligible' : isReview ? 'review' : 'not-eligible');
  icon.textContent = isEligible ? '✔' : isReview ? '!' : '✖';
  headline.textContent = isEligible ?
    (currentLang === 'hi' ? 'सीएनजी भरने की अनुमति है (ELIGIBLE FOR CNG FILLING)' : 'ELIGIBLE FOR CNG FILLING') :
    (currentLang === 'hi' ? 'सीएनजी भरने की अनुमति नहीं है (NOT ELIGIBLE FOR CNG FILLING)' : 'NOT ELIGIBLE FOR CNG FILLING');

  $('step5DecisionChip').textContent = isEligible ? 'ALLOWED' : 'HELD';
  $('step5DecisionChip').className = 'step-status-chip ' + (isEligible ? 'chip-green' : 'chip-red');

  // Reason(s)
  reasonsWrap.hidden = false;
  if (isEligible) {
    reasonsList.innerHTML = `<li>All stored cylinder hydrotest checks pass in demonstration records.</li><li>RC CNG endorsement verified in vehicle records.</li>`;
  } else if (r.status === 'expired') {
    reasonsList.innerHTML = `<li>Cylinder hydrotesting validity expired in sample records.</li><li>Please renew the expired cylinder test certificate at a PESO testing station.</li>`;
  } else if (r.status === 'not_cng') {
    reasonsList.innerHTML = `<li>CNG fuel retro-fitment is not endorsed on the vehicle Registration Certificate (RC).</li><li>Fueling is strictly prohibited under Rule 115-A of CMVR 1989.</li>`;
  } else {
    reasonsList.innerHTML = `<li>${safe(r.explanation || 'Sample record is incomplete or not verified.')}</li><li>Station supervisor review required.</li>`;
  }

  $('decisionTimestamp').textContent = new Date().toLocaleString();
  $('decisionStationName').textContent = $('inspectionStation')?.selectedOptions?.[0]?.text || 'Demo IGL CNG Station - Dwarka';

  // Report Link
  const printBtn = $('printReport');
  if (data.id) {
    printBtn.href = `/api/reports/${data.id}`;
    printBtn.style.display = 'inline-flex';
  }
}

// Manual Correction Inline Toggle
$('btnToggleManualEdit')?.addEventListener('click', () => {
  const row = $('manualEditRow');
  row.hidden = !row.hidden;
  if (!row.hidden && lookedUpPlate) $('correctionPlate').value = lookedUpPlate;
});

$('correctLookup')?.addEventListener('click', async () => {
  const p = $('correctionPlate').value.trim();
  if (!p) return;
  try {
    const r = await api('/api/lookup', {
      method: 'POST',
      body: JSON.stringify({ plate: p, recognized_plate: p, station_id: selectedStation() })
    });
    showResult(r);
    toast('Record retrieved for ' + p);
  } catch (e) { toast(e.message, true); }
});

// Quick Kiosk button
$('btnQuickKiosk')?.addEventListener('click', () => { window.open('/cng-display', '_blank'); });

// Sample Vehicles Gallery (Loading 59+ Bundled Demonstration Samples)
async function loadDemoGallery() {
  const grid = $('sampleTilesGrid');
  if (!grid) return;
  try {
    const samples = await api('/api/demo-samples');
    $('sampleCountBadge').textContent = `${samples.length} Samples`;
    $('metricImgCount').textContent = `${samples.length}+`;

    // Filter to show prominent demo plates
    grid.innerHTML = samples.slice(0, 12).map(s => `
      <div class="sample-tile-btn" data-filename="${safe(s.filename)}" title="Test plate ${safe(s.plate)}">
        <img src="/api/demo-samples/${encodeURIComponent(s.filename)}" loading="lazy" alt="${safe(s.plate)}">
        <strong>${safe(s.plate)}</strong>
        <small>${safe(s.expected_case).replaceAll('_', ' ')}</small>
      </div>
    `).join('');

    $all('.sample-tile-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fname = btn.dataset.filename;
        try {
          const resp = await fetch('/api/demo-samples/' + encodeURIComponent(fname));
          const blob = await resp.blob();
          const file = new File([blob], fname, { type: 'image/png' });
          pickFile(file);
          const dataUrl = await readDataUrl(file);
          analyze(dataUrl, 'Sample Gallery Click');
        } catch (e) {
          toast('Cannot load sample: ' + e.message, true);
        }
      });
    });
  } catch (e) {
    grid.innerHTML = `<span style="color:#64748b;font-size:0.75rem;">Sample library: ${e.message}</span>`;
  }
}

// Camera Management & Automatic Detection
async function refreshCameras() {
  const select = $('cameraSelect');
  if (!select) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    select.innerHTML = '<option value="">Default Webcam</option>' + videoInputs.map((d, i) => `<option value="${safe(d.deviceId)}">${safe(d.label || `Camera ${i + 1}`)}</option>`).join('');
  } catch (e) { console.debug('Camera enum error:', e.message); }
}

async function startCamera() {
  try {
    const devId = $('cameraSelect')?.value;
    webcam = await navigator.mediaDevices.getUserMedia({
      video: devId ? { deviceId: { exact: devId }, width: { ideal: 1280 } } : { width: { ideal: 1280 } },
      audio: false
    });
    const v = $('cameraVideo');
    v.srcObject = webcam;
    await v.play();
    $('cameraPlaceholder').hidden = true;
    $('captureCamera').disabled = false;
    $('cameraStatusBadge').textContent = 'ONLINE';
    $('cameraStatusBadge').className = 'step-status-chip chip-green';
    $('recBadge').hidden = false;
    await refreshCameras();
    if ($('autoScanToggle')?.checked) startAutoScan();
    toast('Camera connected.');
  } catch (e) {
    toast('Camera failed: ' + e.message, true);
    stopCamera();
  }
}

function stopCamera() {
  stopAutoScan();
  if (webcam) webcam.getTracks().forEach(t => t.stop());
  webcam = null;
  const v = $('cameraVideo');
  if (v) v.srcObject = null;
  $('cameraPlaceholder').hidden = false;
  $('captureCamera').disabled = true;
  $('cameraStatusBadge').textContent = 'OFFLINE';
  $('cameraStatusBadge').className = 'step-status-chip chip-muted';
}

$('startCamera')?.addEventListener('click', startCamera);
$('stopCamera')?.addEventListener('click', stopCamera);
$('cameraSelect')?.addEventListener('change', () => { if (webcam) startCamera(); });

function getFrame(width = 960) {
  const v = $('cameraVideo');
  if (!webcam || v.readyState < 2 || !v.videoWidth) return null;
  const canvas = document.createElement('canvas');
  const sc = Math.min(1, width / v.videoWidth);
  canvas.width = Math.round(v.videoWidth * sc);
  canvas.height = Math.round(v.videoHeight * sc);
  canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

$('captureCamera')?.addEventListener('click', () => {
  const frame = getFrame(1280);
  if (frame) analyze(frame, 'USB / webcam');
});

function stopAutoScan() {
  autoEnabled = false;
  clearTimeout(autoTimer);
  autoTimer = null;
}

function startAutoScan() {
  stopAutoScan();
  if (!webcam || !$('autoScanToggle')?.checked) return;
  autoEnabled = true;
  autoTimer = setTimeout(autoTick, 1000);
}

async function autoTick() {
  if (!autoEnabled || !webcam || currentPage !== 'inspect') return;
  const frame = getFrame(960);
  if (frame) {
    try {
      const res = await api('/api/camera/preview', {
        method: 'POST',
        body: JSON.stringify({ image_base64: frame, station_id: selectedStation() })
      });
      if (res.plate && res.plate !== autoCandidate) {
        autoCandidate = res.plate;
        analyze(frame, 'Auto Camera Ingress');
      }
    } catch (e) { console.debug('Preview poll tick:', e.message); }
  }
  autoTimer = setTimeout(autoTick, 1800);
}

// Clock updates
setInterval(() => {
  const clock = $('cameraClock');
  if (clock) clock.textContent = new Date().toLocaleTimeString();
}, 1000);

// Vehicle Entry Movement Logs
async function refreshEntries() {
  try {
    const list = await api('/api/entries');
    $('entryRows').innerHTML = list.length ? list.map(e => `
      <tr>
        <td><strong>#${e.id}</strong></td>
        <td>${safe(e.observed_at?.replace('T', ' ').slice(0, 19))}</td>
        <td><strong>${safe(e.plate)}</strong></td>
        <td>${safe(e.station_name || 'IGL Dwarka')}</td>
        <td>${safe(e.source)}</td>
        <td>${badge(e.status)}</td>
        <td>${Math.round(e.confidence || 0)}%</td>
        <td><a href="/api/reports/${e.inspection_id}" target="_blank" class="btn outline" style="padding:2px 6px;font-size:0.75rem;">View</a></td>
      </tr>
    `).join('') : '<tr><td colspan="8" style="text-align:center;padding:12px;">No entry records logged yet.</td></tr>';
  } catch (e) { toast(e.message, true); }
}

// Summary Dashboard
async function refreshOverview() {
  try {
    const s = await api('/api/summary');
    $('stats').innerHTML = `
      <div class="metric-box"><span>Registered Vehicles</span><strong>${s.total_vehicles}</strong></div>
      <div class="metric-box"><span>Demo Valid</span><strong style="color:var(--gov-green);">${s.counts.valid}</strong></div>
      <div class="metric-box"><span>Requires Attention</span><strong style="color:var(--gov-red);">${s.counts.expired + s.counts.missing}</strong></div>
      <div class="metric-box"><span>Total Inspections</span><strong style="color:var(--gov-navy-primary);">${s.total_scans}</strong></div>
    `;
    $('overviewScans').innerHTML = s.recent_scans.length ? s.recent_scans.map(x => `
      <tr>
        <td><strong>${safe(x.checked_plate || 'UNREAD')}</strong></td>
        <td>${safe(x.method)}</td>
        <td>${badge(x.status)}</td>
        <td>${safe(x.scanned_at?.replace('T', ' ').slice(0, 19))}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;padding:12px;">No recent inspections recorded.</td></tr>';
  } catch (e) { toast(e.message, true); }
}

// Vehicle Database CRUD
async function refreshVehicles() {
  try {
    const q = $('vehicleSearch')?.value || '';
    const list = await api('/api/vehicles?q=' + encodeURIComponent(q));
    $('vehicleCount').textContent = `${list.length} Vehicles`;
    $('metricVehCount').textContent = `${list.length}+`;
    $('vehicleRows').innerHTML = list.length ? list.map(({ plate, vehicle: v, status }) => `
      <tr>
        <td><strong>${safe(plate)}</strong></td>
        <td>${safe(v.model || '—')}</td>
        <td>${safe(cap(v.cng_endorsed))}</td>
        <td>${v.cylinders.length} Cylinders</td>
        <td>${badge(status)}</td>
        <td>
          <button type="button" class="btn outline" style="padding:2px 8px;font-size:0.72rem;" onclick="editVehicle('${safe(plate)}')">Edit</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;padding:12px;">No matching records.</td></tr>';
  } catch (e) { toast(e.message, true); }
}
$('vehicleSearch')?.addEventListener('input', refreshVehicles);

// Station Alerts Feed
async function refreshAlerts() {
  try {
    const list = await api('/api/alerts');
    $('alertCards').innerHTML = list.length ? list.map(a => `
      <div class="step-card" style="border-left:4px solid var(--gov-red);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:1.1rem;color:var(--gov-navy-dark);">${safe(a.plate)}</strong>
          ${badge(a.status)}
        </div>
        <p style="margin:6px 0;font-size:0.82rem;color:var(--gov-text-muted);">${safe(a.reason || 'Expired or missing hydrotest records.')}</p>
        <small style="color:#94a3b8;">${safe(a.scanned_at?.replace('T', ' ').slice(0, 19))}</small>
      </div>
    `).join('') : '<p style="color:#64748b;">No active station safety alerts.</p>';
  } catch (e) { toast(e.message, true); }
}

// System Health
async function refreshHealth() {
  try {
    const s = await api('/api/status');
    $('healthItems').innerHTML = `
      <div style="display:grid;gap:10px;font-size:0.85rem;">
        <div><strong>Backend API:</strong> <span style="color:var(--gov-green);font-weight:700;">● Online (FastAPI)</span></div>
        <div><strong>Database Engine:</strong> <span style="color:var(--gov-green);font-weight:700;">● ${safe(s.database)}</span></div>
        <div><strong>OCR Engine:</strong> <span style="color:${s.tesseract_ready ? 'var(--gov-green)' : 'var(--gov-red)'};font-weight:700;">● ${s.tesseract_ready ? 'Tesseract OCR Ready' : 'Tesseract Missing'}</span></div>
        <div><strong>Tesseract Binary Path:</strong> <code>${safe(s.tesseract_path || 'PATH environment')}</code></div>
        <div><strong>Statutory Protocol:</strong> PESO Rule 35 & MoRTH CMVR 1989</div>
      </div>
    `;
  } catch (e) { toast(e.message, true); }
}

// Inspection History
async function refreshHistory() {
  try {
    const list = await api('/api/scans');
    $('historyRows').innerHTML = list.length ? list.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td>${safe(s.scanned_at?.replace('T', ' ').slice(0, 19))}</td>
        <td><strong>${safe(s.recognized_plate || '—')}</strong></td>
        <td><strong>${safe(s.checked_plate || '—')}</strong></td>
        <td>${safe(s.method)}</td>
        <td>${s.confidence}%</td>
        <td>${badge(s.status)}</td>
        <td><a href="/api/reports/${s.id}" target="_blank" class="btn outline" style="padding:2px 6px;font-size:0.75rem;">Report</a></td>
      </tr>
    `).join('') : '<tr><td colspan="8" style="text-align:center;padding:12px;">No inspections recorded.</td></tr>';
  } catch (e) { toast(e.message, true); }
}

// Stations Load
async function loadStations() {
  try {
    const list = await api('/api/stations');
    const select = $('inspectionStation');
    if (select) {
      select.innerHTML = list.map(s => `<option value="${s.id}">${safe(s.name)} (${safe(s.city || 'Delhi')})</option>`).join('');
    }
  } catch (e) { console.debug('Stations load error:', e.message); }
}

// App Initialization
async function initApp() {
  try {
    const me = await api('/api/me');
    currentUser = me;
    csrfToken = me.csrf || '';
    $('sessionUser').textContent = `● ${me.name || me.email} (${cap(me.role)})`;
    if (me.role === 'admin') $('adminNav').hidden = false;
  } catch (e) { console.debug('Auth check:', e.message); }

  $('logoutBtn')?.addEventListener('click', async () => {
    try { await api('/api/logout', { method: 'POST' }); }
    finally { location.href = '/login'; }
  });

  await loadStations();
  await loadDemoGallery();
  refreshCameras();
}

window.addEventListener('DOMContentLoaded', initApp);
