"use strict";

const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let recent = [], station = '', selectedId = null, lastNewest = null;

function updateActiveStatus(row) {
  const d = row?.decision || {};
  const state = d.state || 'waiting';
  const bar = $('activeStatusBar');
  const badge = $('activeStatusBadge');
  const desc = $('activeProcessDesc');

  if (bar) bar.className = 'active-status-bar ' + state;

  if (!badge || !desc) return;

  if (state === 'demo_pass') {
    badge.textContent = 'ACTIVE: ELIGIBLE • FUELING PERMITTED';
    badge.className = 'active-badge pass';
    desc.textContent = 'All statutory checks passed. Dual RC & PESO verification active. Dispenser solenoid relay clear.';
  } else if (state === 'hold') {
    badge.textContent = 'ACTIVE: INTERLOCK LOCKED (HOLD)';
    badge.className = 'active-badge hold';
    desc.textContent = 'Non-compliant hydrotest or RC status detected: Dispenser nozzle cutoff engaged. Dispensing prohibited.';
  } else if (state === 'review') {
    badge.textContent = 'ACTIVE: MANUAL REVIEW REQUIRED';
    badge.className = 'active-badge review';
    desc.textContent = 'Safety record discrepancy. Attendant must inspect physical cylinder hydrotest brass plate before nozzle release.';
  } else {
    badge.textContent = 'ACTIVE: AWAITING VEHICLE';
    badge.className = 'active-badge waiting';
    desc.textContent = 'Forecourt sensor active at Bay 1 — awaiting vehicle arrival for optical plate verification...';
  }
}

function updateVehiclePhoto(row) {
  const img = $('vehicleCaptureImg');
  const ph = $('photoPlaceholder');
  const overlayPlate = $('overlayPlateNum');
  const overlayBadge = $('plateOverlayBadge');

  const plateText = row?.plate || '— — — —';
  if (overlayPlate) overlayPlate.textContent = plateText;

  if (!img || !ph) return;

  if (row?.image_url) {
    img.src = row.image_url;
    img.style.display = 'block';
    ph.style.display = 'none';
    if (overlayBadge) overlayBadge.style.display = 'flex';
  } else {
    img.style.display = 'none';
    ph.style.display = 'flex';
    if (overlayBadge) {
      overlayBadge.style.display = (plateText && plateText !== '— — — —') ? 'flex' : 'none';
    }
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

  if ($('totalScanned')) $('totalScanned').textContent = scanned;
  if ($('totalPassed')) $('totalPassed').textContent = passed;
}

function decisionView(row) {
  if (!row) return;
  const d = row.decision || {};

  if ($('hero')) $('hero').className = 'kiosk-panel-left decision-hero ' + (d.state || 'waiting');
  if ($('decisionTag')) $('decisionTag').textContent = { hold: 'HOLD FOR REVIEW', review: 'VERIFY DOCUMENTS', demo_pass: 'DEMO CHECKS PASSED' }[d.state] || 'PENDING';
  if ($('lastTime')) $('lastTime').textContent = row.observed_at ? new Date(row.observed_at).toLocaleTimeString() : '—';
  if ($('plate')) $('plate').textContent = row.plate || 'NOT READ';
  if ($('ownerName')) $('ownerName').textContent = 'Sample owner: ' + (row.owner_name || 'Not recorded in demo database');
  if ($('headline')) $('headline').textContent = d.headline || 'Waiting for a vehicle scan';
  if ($('instruction')) $('instruction').textContent = d.instruction || 'Vehicle scan on the AI Inspection page will immediately transmit the safety decision here.';
  if ($('inspectionRef')) $('inspectionRef').textContent = 'INSPECTION #' + (row.inspection_id || '—');

  // Update 7.2 Active Process Status
  updateActiveStatus(row);

  // Update 7.3 Photo of the current vehicle with number plate
  updateVehiclePhoto(row);

  // Statutory checks list
  if ($('checks')) {
    const checks = d.checks || [];
    $('checks').innerHTML = checks.length ? checks.map(c => `
      <div class="check-row">
        <div>
          <strong>${safe(c.name)}</strong>
          <p>${safe(c.detail)}</p>
        </div>
        <span class="check-state ${safe(c.state)}">${safe((c.state || '').toUpperCase())}</span>
      </div>
    `).join('') : '<div class="empty-state">No saved checks available.</div>';
  }

  // Reason box
  const reasons = d.reasons || [];
  if ($('reasonBox')) $('reasonBox').hidden = !reasons.length;
  if ($('reasons')) $('reasons').innerHTML = reasons.map(t => `<li>${safe(t)}</li>`).join('');

  if ($('source')) $('source').textContent = `${row.event_type === 'entry' ? 'Camera entry observation' : 'Manual/uploaded image check'} · ${row.source || 'Station bay'}`;
  if ($('reportLink')) {
    if (row.report_url) {
      $('reportLink').href = row.report_url;
      $('reportLink').hidden = false;
    } else {
      $('reportLink').hidden = true;
    }
  }
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

    // Update Live Forecourt Metrics
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

    if ($('recent')) {
      $('recent').innerHTML = recent.length ? recent.slice(0, 6).map(r => `
        <button type="button" class="recent-item ${safe(r.decision?.state || '')} ${r.inspection_id === selectedId ? 'active' : ''}" data-id="${r.inspection_id}">
          <span>${safe(new Date(r.observed_at).toLocaleTimeString())} · ${safe(r.source || 'Bay')}</span>
          <strong class="recent-plate">${safe(r.plate || 'UNKNOWN')}</strong>
          <small>${safe(r.decision?.headline || '')}</small>
        </button>
      `).join('') : '<div class="empty-state">No saved inspections for this station yet.</div>';

      document.querySelectorAll('[data-id]').forEach(b => {
        b.addEventListener('click', () => {
          selectedId = Number(b.dataset.id);
          let item = recent.find(x => x.inspection_id === selectedId);
          if (item) decisionView(item);
          document.querySelectorAll('[data-id]').forEach(v => v.classList.toggle('active', v.dataset.id === b.dataset.id));
        });
      });
    }

    if ($('connection')) {
      $('connection').textContent = 'Active Telemetry Stream · ' + new Date().toLocaleTimeString();
    }
  } catch (e) {
    if ($('connection')) $('connection').textContent = 'Telemetry Sync: ' + e.message;
  }
}

async function init() {
  if ($('clock')) $('clock').textContent = new Date().toLocaleTimeString();
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

setInterval(() => {
  if ($('clock')) $('clock').textContent = new Date().toLocaleTimeString();
}, 1000);

init();
