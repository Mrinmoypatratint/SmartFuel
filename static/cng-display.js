"use strict";

const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let recent = [], station = '', selectedId = null, lastNewest = null;

function updateClock() {
  const now = new Date();
  if ($('clockTime')) {
    $('clockTime').textContent = now.toLocaleTimeString('en-US', { hour12: true });
  }
  if ($('clockDate')) {
    $('clockDate').textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function updateActiveStatus(row) {
  const d = row?.decision || {};
  const state = d.state || 'waiting';
  const hero = $('hero');
  const dot = $('activePulseDot');
  const badge = $('activeStatusBadge');
  const descWrap = $('activeProcessDesc');
  const descText = $('activeProcessDescText');
  const subIcon = $('subCheckIcon');

  if (hero) hero.className = 'kiosk-left-panel ' + state;

  if (state === 'demo_pass') {
    if (dot) dot.className = 'status-check-circle pass';
    if (badge) {
      badge.textContent = 'ACTIVE: ELIGIBLE + FUELING PERMITTED';
      badge.className = 'status-badge-pill pass';
    }
    if (descWrap) descWrap.className = 'process-sub-banner pass';
    if (subIcon) subIcon.textContent = '✔';
    if (descText) descText.textContent = 'All statutory checks passed. Dual RC & PESO verification active. Dispenser solenoid relay clear.';
  } else if (state === 'hold') {
    if (dot) dot.className = 'status-check-circle hold';
    if (badge) {
      badge.textContent = 'ACTIVE: INTERLOCK LOCKED (HOLD)';
      badge.className = 'status-badge-pill hold';
    }
    if (descWrap) descWrap.className = 'process-sub-banner hold';
    if (subIcon) subIcon.textContent = '✖';
    if (descText) descText.textContent = 'Non-compliant hydrotest or RC status detected: Dispenser nozzle cutoff engaged. Dispensing prohibited.';
  } else if (state === 'review') {
    if (dot) dot.className = 'status-check-circle review';
    if (badge) {
      badge.textContent = 'ACTIVE: MANUAL REVIEW REQUIRED';
      badge.className = 'status-badge-pill review';
    }
    if (descWrap) descWrap.className = 'process-sub-banner review';
    if (subIcon) subIcon.textContent = '⚠';
    if (descText) descText.textContent = 'Safety record discrepancy. Attendant must inspect physical cylinder hydrotest brass plate before nozzle release.';
  } else {
    if (dot) dot.className = 'status-check-circle waiting';
    if (badge) {
      badge.textContent = 'ACTIVE: AWAITING VEHICLE';
      badge.className = 'status-badge-pill waiting';
    }
    if (descWrap) descWrap.className = 'process-sub-banner waiting';
    if (subIcon) subIcon.textContent = 'ℹ';
    if (descText) descText.textContent = 'Forecourt sensor active at Bay 1 — awaiting vehicle arrival for optical plate verification...';
  }
}

function updateVehiclePhoto(row) {
  const img = $('vehicleCaptureImg');
  const ph = $('photoPlaceholder');
  const overlayPlate = $('overlayPlateNum');
  const overlayBadge = $('plateOverlayBadge');

  const plateText = row?.plate || '— — — —';
  if (overlayPlate) overlayPlate.textContent = plateText;

  if (!img) return;

  const targetSrc = row?.image_url || '/static/assets/car-preview.jpg';

  img.src = targetSrc;
  img.style.display = 'block';
  if (ph) ph.style.display = 'none';

  if (overlayBadge) {
    overlayBadge.style.display = (plateText && plateText !== '— — — —') ? 'flex' : 'none';
  }
}

function updateStats(data) {
  let scanned = 0;
  let passed = 0;

  if (data?.stats) {
    scanned = data.stats.total_scanned ?? 0;
    passed = data.stats.total_passed ?? 0;
  } else if (data?.recent && data.recent.length) {
    scanned = data.recent.length;
    passed = data.recent.filter(r => r.decision?.state === 'demo_pass').length;
  }

  if ($('totalScanned')) $('totalScanned').textContent = scanned || '0';
  if ($('totalPassed')) $('totalPassed').textContent = passed || '0';
}

function renderChecks(checks) {
  if (!$('checks')) return;

  if (!checks || !checks.length) {
    $('checks').innerHTML = '<div class="empty-state">No saved checks available.</div>';
    return;
  }

  $('checks').innerHTML = checks.map((c, idx) => {
    const isRc = (c.name || '').toLowerCase().includes('rc') || (c.name || '').toLowerCase().includes('endorsement');
    const state = c.state || 'review';
    const isPass = state === 'pass';
    const isFail = state === 'fail';

    const tintClass = isPass ? (isRc ? 'blue-tint' : 'green-tint') : (isFail ? 'red-tint' : 'yellow-tint');
    const iconBgClass = isPass ? (isRc ? 'blue-bg' : 'green-bg') : (isFail ? 'red-bg' : 'yellow-bg');
    const statusClass = isPass ? 'pass' : (isFail ? 'fail' : 'review');
    const statusLabel = isPass ? '✔ PASS' : (isFail ? '✖ FAIL' : '⚠ REVIEW');

    const iconSvg = isRc
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`;

    return `
      <div class="check-item-row ${tintClass}">
        <div class="check-item-left">
          <div class="check-badge-icon ${iconBgClass}">
            ${iconSvg}
          </div>
          <div class="check-item-text">
            <span class="check-item-name">${safe(c.name)}</span>
            <span class="check-item-desc">${safe(c.detail)}</span>
          </div>
        </div>
        <span class="check-status-pill ${statusClass}">${statusLabel}</span>
      </div>
    `;
  }).join('');
}

function decisionView(row) {
  if (!row) return;
  const d = row.decision || {};

  // Topline decision tag
  const tagEl = $('decisionTag');
  if (tagEl) {
    const state = d.state || 'waiting';
    tagEl.className = 'decision-tag-pill ' + state;
    tagEl.textContent = {
      hold: 'HOLD FOR REVIEW',
      review: 'VERIFY DOCUMENTS',
      demo_pass: 'DEMO CHECKS PASSED'
    }[state] || 'WAITING FOR VEHICLE';
  }

  // AI Double Verification Pill (GPT-4o Mini)
  const aiPill = $('aiVerifiedPill');
  if (aiPill) {
    const ai = row.ai_verification || d.ai_verification;
    if (ai?.dual_confirmed) {
      aiPill.textContent = '🤖 GPT-4o Mini Dual Confirmed';
      aiPill.className = 'ai-verified-pill dual-pass';
      aiPill.style.display = 'inline-flex';
    } else if (ai?.ai_override) {
      aiPill.textContent = '🤖 GPT-4o Mini Verified';
      aiPill.className = 'ai-verified-pill ai-override';
      aiPill.style.display = 'inline-flex';
    } else {
      aiPill.style.display = 'none';
    }
  }

  // Time & Plate
  if ($('lastTime')) {
    $('lastTime').textContent = row.observed_at ? new Date(row.observed_at).toLocaleTimeString() : '—';
  }
  if ($('plate')) $('plate').textContent = row.plate || '— — — —';
  if ($('ownerName')) {
    $('ownerName').textContent = 'Sample owner: ' + (row.owner_name || 'Registered Owner (Citizen-191)');
  }

  // Bottom Notice
  if ($('headline')) $('headline').textContent = d.headline || 'DEMO CHECKS PASSED';
  if ($('instruction')) {
    $('instruction').textContent = d.instruction || 'Both checks passed against stored sample data only. This is NOT official clearance or authorization to dispense CNG.';
  }

  // Inspection ID Ref
  if ($('inspectionRef')) {
    $('inspectionRef').textContent = 'INSPECTION #' + (row.inspection_id || '122');
  }

  // Update 7.2 Active Process Status
  updateActiveStatus(row);

  // Update 7.3 Photo of the current vehicle with number plate
  updateVehiclePhoto(row);

  // Statutory checks list
  renderChecks(d.checks || []);

  // Reason box
  const reasons = d.reasons || [];
  if ($('reasonBox')) $('reasonBox').hidden = !reasons.length;
  if ($('reasons')) $('reasons').innerHTML = reasons.map(t => `<li>${safe(t)}</li>`).join('');

  // Source & Report Link
  if ($('source')) {
    $('source').textContent = `${row.event_type === 'entry' ? 'Camera entry observation' : 'Manual/uploaded image check'} • ${row.source || 'Image upload'}`;
  }
  if ($('reportLink')) {
    if (row.report_url) {
      $('reportLink').href = row.report_url;
      $('reportLink').hidden = false;
    } else {
      $('reportLink').hidden = true;
    }
  }
}

function renderRecentGrid(items) {
  const container = $('recent');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = '<div class="empty-state">No saved inspections for this station yet.</div>';
    return;
  }

  // Render up to 6 cards in a 2x3 grid
  const displayItems = items.slice(0, 6);

  container.innerHTML = displayItems.map(r => {
    const isSelected = r.inspection_id === selectedId;
    const dState = r.decision?.state || 'waiting';
    const isPass = dState === 'demo_pass';
    const isHold = dState === 'hold';

    const statusClass = isPass ? 'pass' : (isHold ? 'hold' : 'review');
    const statusLabel = isPass
      ? 'DEMO CHECKS PASSED'
      : (isHold ? 'HOLD FOR REVIEW — DEMO' : 'MANUAL REVIEW REQUIRED — DEMO');

    const timeStr = r.observed_at ? new Date(r.observed_at).toLocaleTimeString() : '11:23:24 AM';
    const sourceStr = r.source || (r.event_type === 'entry' ? 'Auto Camera Ingress' : 'Image upload');

    return `
      <div class="recent-ingress-box ${isSelected ? 'active' : ''} ${isPass ? 'pass-item' : ''}" data-id="${r.inspection_id}">
        <div class="recent-box-top">
          <span class="recent-time-source" title="${safe(timeStr)} • ${safe(sourceStr)}">${safe(timeStr)} • ${safe(sourceStr)}</span>
          <span class="recent-car-mini">🚗</span>
        </div>
        <div class="recent-plate-bold">${safe(r.plate || 'UNKNOWN')}</div>
        <div class="recent-status-tag ${statusClass}">${safe(statusLabel)}</div>
      </div>
    `;
  }).join('');

  // Attach click listener to each box
  container.querySelectorAll('[data-id]').forEach(box => {
    box.addEventListener('click', () => {
      selectedId = Number(box.dataset.id);
      const clickedItem = recent.find(x => x.inspection_id === selectedId);
      if (clickedItem) decisionView(clickedItem);

      container.querySelectorAll('.recent-ingress-box').forEach(b => {
        b.classList.toggle('active', b.dataset.id === box.dataset.id);
      });
    });
  });
}

async function refresh() {
  try {
    let url = '/api/cng-display/latest' + (station ? '?station_id=' + encodeURIComponent(station) : '');
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) { location.assign('/login'); return; }
    if (!res.ok) {
      const er = await res.json().catch(() => ({}));
      throw Error(er.error || `HTTP ${res.status}`);
    }

    let data = await res.json();
    recent = data.recent || [];

    // Update Forecourt Metrics (Scanned & Passed)
    updateStats(data);

    let newest = data.latest?.inspection_id;
    if (newest && newest !== lastNewest) {
      lastNewest = newest;
      selectedId = newest;
    }
    if (selectedId && !recent.some(x => x.inspection_id === selectedId)) {
      selectedId = newest || null;
    }

    let row = recent.find(x => x.inspection_id === selectedId) || data.latest;
    if (row) decisionView(row);

    // Render 2x3 recent grid
    renderRecentGrid(recent);

    if ($('connection')) {
      $('connection').textContent = 'Active Telemetry Stream - ' + new Date().toLocaleTimeString();
    }
  } catch (e) {
    if ($('connection')) $('connection').textContent = 'Telemetry Sync: ' + e.message;
  }
}

async function init() {
  updateClock();

  try {
    let me = await fetch('/api/me', { credentials: 'same-origin' });
    if (!me.ok) { location.assign('/login'); return; }
    let user = await me.json();

    let r = await fetch('/api/stations', { credentials: 'same-origin' });
    if (!r.ok) throw Error('Could not load stations');
    let stations = await r.json();

    if ($('station')) {
      $('station').innerHTML = stations.map(s => `<option value="${s.id}">${safe(s.name)}</option>`).join('');
      let params = new URLSearchParams(location.search);
      let requested = params.get('station');
      station = user.role === 'admin' && requested && stations.some(s => String(s.id) === requested)
        ? requested
        : String(user.station_id || stations[0]?.id || '');
      $('station').value = station;
      if (user.role !== 'admin') $('station').disabled = true;
    }

    await refresh();
  } catch (e) {
    if ($('connection')) $('connection').textContent = e.message;
  }
}

$('station')?.addEventListener('change', () => {
  station = $('station').value;
  selectedId = null;
  lastNewest = null;
  refresh();
});

$('goFullscreen')?.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    document.documentElement.requestFullscreen?.();
  }
});

setInterval(() => {
  if (!document.hidden) refresh();
}, 3000);

setInterval(updateClock, 1000);

init();
