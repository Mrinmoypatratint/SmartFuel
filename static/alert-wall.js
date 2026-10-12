'use strict';
const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){
 try {
   let response=await fetch('/api/alerts',{credentials:'same-origin',cache:'no-store'});
   if(response.status===401){window.location.href='/login';return;}
   if(!response.ok)throw Error('Server unavailable (HTTP '+response.status+')');
   let events=await response.json();
   $('cards').innerHTML=events.length?events.map(x=>`<article class="wall-card ${safe(x.status)}"><div class="pill ${safe(x.status)}">${safe(x.status).toUpperCase()}</div><div class="wall-plate">${safe(x.checked_plate||'UNREADABLE')}</div><div class="date">Inspection #${x.id} · ${safe(x.scanned_at)} UTC</div><p>Source: ${safe(x.method)}</p><a class="btn outline" target="_blank" rel="noopener" href="/api/reports/${x.id}">View sample report</a></article>`).join(''):'<div class="wall-empty">No expired, missing or unverified demo inspections recorded yet.</div>';
   $('sync').textContent='Last refreshed: '+new Date().toLocaleTimeString()+' · Auto-refresh every 10 seconds';
 }catch(err){$('sync').textContent='Connection error: '+err.message;}
}
$('refresh').addEventListener('click',refresh);refresh();setInterval(()=>{if(!document.hidden)refresh()},10000);
