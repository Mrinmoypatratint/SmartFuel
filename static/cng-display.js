"use strict";
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let recent=[],station='',selectedId=null,lastNewest=null;
function decisionView(row){
 const d=row.decision;
 $('hero').className='decision-hero '+(d.state||'waiting');
 $('decisionTag').textContent={hold:'HOLD FOR REVIEW',review:'VERIFY DOCUMENTS',demo_pass:'DEMO CHECKS PASSED'}[d.state]||'PENDING';
 $('lastTime').textContent=new Date(row.observed_at).toLocaleString();
 $('plate').textContent=row.plate||'NOT READ'; $('ownerName').textContent='Sample owner: '+(row.owner_name||'Not recorded in demo database');$('headline').textContent=d.headline;$('instruction').textContent=d.instruction;
 $('inspectionRef').textContent='INSPECTION #'+row.inspection_id;
 $('checks').innerHTML=d.checks.map(c=>`<div class="check-row"><div><strong>${safe(c.name)}</strong><p>${safe(c.detail)}</p></div><span class="check-state ${safe(c.state)}">${safe(c.state.toUpperCase())}</span></div>`).join('')||'<div class="empty-state">No saved checks available.</div>';
 $('reasonBox').hidden=!d.reasons.length;
 $('reasons').innerHTML=d.reasons.map(t=>`<li>${safe(t)}</li>`).join('');
 $('source').textContent=`${row.event_type==='entry'?'Camera entry observation':'Manual/uploaded image check'} · ${row.source}`;
 $('reportLink').href=row.report_url;$('reportLink').hidden=false;
}
async function refresh(){
 try{
  let url='/api/cng-display/latest'+(station?'?station_id='+encodeURIComponent(station):'');
  const res=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(res.status===401){location.assign('/login');return}
  if(!res.ok){const er=await res.json().catch(()=>({}));throw Error(er.error||`HTTP ${res.status}`)}
  let data=await res.json();recent=data.recent||[];
  let newest=data.latest?.inspection_id;
  if(newest && newest!==lastNewest){lastNewest=newest;selectedId=newest}
  if(selectedId&&!recent.some(x=>x.inspection_id===selectedId))selectedId=newest||null;
  let row=recent.find(x=>x.inspection_id===selectedId)||data.latest;
  if(row)decisionView(row);
  $('recent').innerHTML=recent.length?recent.map(r=>`<button class="recent-item ${safe(r.decision.state)} ${r.inspection_id===selectedId?'active':''}" data-id="${r.inspection_id}"><span>${safe(new Date(r.observed_at).toLocaleTimeString())} · ${safe(r.source)}</span><strong class="recent-plate">${safe(r.plate)}</strong><small>${safe(r.decision.headline)}</small></button>`).join(''):'<div class="empty-state">No saved inspections for this station yet.</div>';
  document.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>{selectedId=Number(b.dataset.id);let item=recent.find(x=>x.inspection_id===selectedId);if(item)decisionView(item);document.querySelectorAll('[data-id]').forEach(v=>v.classList.toggle('active',v.dataset.id===b.dataset.id))}));
  $('connection').textContent='Connected · Last checked '+new Date().toLocaleTimeString()+' · Refreshes every 3 seconds';
 }catch(e){$('connection').textContent='Connection issue: '+e.message}
}
async function init(){
 $('clock').textContent=new Date().toLocaleTimeString();
 try{let me=await fetch('/api/me',{credentials:'same-origin'});if(!me.ok){location.assign('/login');return}
  let user=await me.json();let r=await fetch('/api/stations',{credentials:'same-origin'});if(!r.ok)throw Error('Could not load stations');let stations=await r.json();
  $('station').innerHTML=stations.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');
  let params=new URLSearchParams(location.search),requested=params.get('station');
  station= user.role==='admin' && requested && stations.some(s=>String(s.id)===requested)?requested:String(user.station_id||stations[0]?.id||'');
  $('station').value=station;
  if(user.role!=='admin')$('station').disabled=true;
  await refresh();
 }catch(e){$('connection').textContent=e.message}
}
$('station').addEventListener('change',()=>{station=$('station').value;selectedId=null;lastNewest=null;refresh()});
$('goFullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.()});
setInterval(()=>{if(!document.hidden)refresh()},3000);setInterval(()=>$('clock').textContent=new Date().toLocaleTimeString(),1000);init();
