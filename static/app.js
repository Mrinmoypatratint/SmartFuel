'use strict';
const $=id=>document.getElementById(id);
const $all=sel=>Array.from(document.querySelectorAll(sel));
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cap=s=>String(s||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const ST={valid:'Demo valid',expired:'Expired',missing:'Missing certificate',not_cng:'Not CNG',unverified:'Not verified',not_registered:'Not registered'};
const badge=s=>`<span class="pill ${safe(s)}">${safe(ST[s]||cap(s))}</span>`;
let currentPage='overview',selectedFile=null,webcam=null,latest=null,editingPlate=null,lookedUpPlate=null;
let isScanning=false;let csrfToken='',currentUser=null;
let autoEnabled=false,autoTimer=null,autoBusy=false,autoGeneration=0,autoCandidate='',autoMatches=0,autoSeenAt=0,autoRecent=new Map();
let cameraSession='web-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID().replaceAll('-',''):Math.random().toString(36).slice(2)+Date.now());
async function api(url,opts={}){
 const res=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.method&&opts.method!=='GET'?{'X-CSRF-Token':csrfToken}:{}),...(opts.headers||{})},...opts});
 if(res.status===401){location.href='/login';throw Error('Session expired');}
 let data=await res.json().catch(()=>({error:'Unexpected response'}));
 if(!res.ok)throw Error(data.error || data.detail || `HTTP ${res.status}`);
 return data;
}
function toast(msg,bad=false){let t=$('toast');t.textContent=msg;t.className=(bad?'error ':'')+'show';setTimeout(()=>t.className='',4200);}
function showPage(page){
 currentPage=page;
 $all('.page').forEach(e=>e.classList.toggle('active',e.id===page));
 $all('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.page===page));
 $('topTitle').textContent={overview:'Overview',inspect:'AI Inspection',database:'Vehicle Database',history:'Inspection History',health:'System Health',admin:'Administration',alerts:'Station Alerts',analytics:'Analytics',entries:'Vehicle Entry Logs'}[page]||page;
 if(page==='entries')refreshEntries();if(page==='analytics')refreshAnalytics();if(page==='overview')refreshOverview();if(page==='database')refreshVehicles();if(page==='history')refreshHistory();if(page==='health')refreshHealth();if(page==='admin')refreshAdmin();if(page==='alerts')refreshAlerts();
 if(page!=='inspect')stopCamera();window.scrollTo({top:0,behavior:'auto'});
}
$all('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$all('[data-open]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.open)));
async function refreshOverview(){try{
 const s=await api('/api/summary');
 const cards=[['Registered Demo Vehicles',s.total_vehicles,'▦','Local sample registry'],['Demo Valid',s.counts.valid,'✓','Based on stored expiry dates'],['Requires Attention',s.counts.expired+s.counts.missing,'!','Expired or missing certificates'],['Total Inspections',s.total_scans,'⌗','OCR scans and manual checks']];
 $('stats').innerHTML=cards.map((c,i)=>`<div class="stat"><span class="iconstat">${c[2]}</span><div class="stat-name">${c[0]}</div><div class="stat-num">${c[1]}</div><div class="stat-foot ${i===1?'positive':i===2?'negative':''}">${c[3]}</div></div>`).join('');
 $('overviewScans').innerHTML=s.recent_scans.length?s.recent_scans.map(x=>`<tr><td><strong>${safe(x.checked_plate||'UNREADABLE')}</strong></td><td>${safe(x.method)}</td><td>${badge(x.status)}</td><td>${safe(x.scanned_at.replace('T',' ').slice(0,19))}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-small">No inspections yet. Try the example number-plate images.</td></tr>';
}catch(e){toast(e.message,true)}}
function switchTab(tab){$all('.input-tab').forEach(e=>e.classList.toggle('active',e.dataset.tab===tab));$('uploadTab').hidden=tab!=='upload';$('cameraTab').hidden=tab!=='camera';if(tab!=='camera')stopCamera();}
$all('.input-tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
function pickFile(file){if(!file)return;if(!file.type.startsWith('image/')){toast('Please choose a JPG, PNG or WEBP image.',true);return}if(file.size>8*1024*1024){toast('Maximum image size is 8 MB.',true);return}selectedFile=file;$('uploadName').textContent=file.name;$('uploadPreview').src=URL.createObjectURL(file);$('uploadPreviewWrap').hidden=false;$('analyzeUpload').disabled=false;}
$('imageFile').addEventListener('change',e=>pickFile(e.target.files[0]));
async function loadDemoSampleGallery(){
 try{
  const records=await api('/api/demo-samples');
  $('sampleImageCount').textContent=records.length+' images';
  $('sampleGallery').innerHTML=records.length?records.map(r=>`<button type="button" class="sample-tile" data-sample-file="${safe(r.filename)}" title="Load synthetic plate ${safe(r.plate)}"><img src="/api/demo-samples/${encodeURIComponent(r.filename)}" loading="lazy" alt="Fictional ${safe(r.image_type)} for ${safe(r.plate)}"><strong>${safe(r.plate)}</strong><small>${safe(r.expected_case).replaceAll('_',' ')}</small></button>`).join(''):'<span class="tiny">No demo images bundled.</span>';
  $all('[data-sample-file]').forEach(btn=>btn.addEventListener('click',async()=>{
   try{
    const name=btn.dataset.sampleFile;
    const resp=await fetch('/api/demo-samples/'+encodeURIComponent(name),{credentials:'same-origin'});
    if(!resp.ok)throw Error('Cannot load sample image');
    const blob=await resp.blob();
    pickFile(new File([blob],name,{type:'image/png'}));
    toast('Sample image loaded. Click Analyze Image to run the actual OCR engine.');
   }catch(e){toast(e.message,true)}
  }));
 }catch(e){$('sampleImageCount').textContent='Unavailable';$('sampleGallery').textContent='Demo library could not load: '+e.message;}
}
loadDemoSampleGallery();

$('clearUpload').addEventListener('click',()=>{$('imageFile').value='';selectedFile=null;$('uploadPreviewWrap').hidden=true;$('analyzeUpload').disabled=true;});
$('dropZone').addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('dragging')});
$('dropZone').addEventListener('dragleave',e=>e.currentTarget.classList.remove('dragging'));
$('dropZone').addEventListener('drop',e=>{e.preventDefault();e.currentTarget.classList.remove('dragging');pickFile(e.dataTransfer.files[0])});
const readDataUrl=file=>new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Cannot read selected photo'));r.readAsDataURL(file)});
function selectedStation(){return Number($('inspectionStation').value||0)||null;}
async function analyze(dataUrl,method){
 if(isScanning)return;isScanning=true;$('scanLoading').hidden=false;$('scanError').hidden=true;$('analyzeUpload').disabled=true;$('captureCamera').disabled=true;
 try {const r=await api('/api/scan',{method:'POST',body:JSON.stringify({image_base64:dataUrl,method,station_id:selectedStation()})});showResult(r);toast('Inspection completed using your protected demo database');}
 catch(e){$('scanError').textContent=`Could not finish inspection: ${e.message}`;$('scanError').hidden=false;toast(e.message,true)}
 finally{isScanning=false;$('scanLoading').hidden=true;$('analyzeUpload').disabled=!selectedFile;$('captureCamera').disabled=!webcam;}
}
$('analyzeUpload').addEventListener('click',async()=>{if(selectedFile)analyze(await readDataUrl(selectedFile),'Image upload')});
async function refreshCameras(){
 try{const before=$('cameraSelect').value;const devices=await navigator.mediaDevices.enumerateDevices();const list=devices.filter(d=>d.kind==='videoinput');
 $('cameraSelect').innerHTML='<option value="">Default webcam</option>'+list.map((d,i)=>`<option value="${safe(d.deviceId)}">${safe(d.label||'Camera '+(i+1))}</option>`).join('');
 if(list.some(d=>d.deviceId===before))$('cameraSelect').value=before;
 }catch(e){console.warn('Video device list unavailable:',e.message)}
}
function monitorState(label,plate=''){
 $('autoStatus').textContent=label;$('detectedPlate').textContent=plate||'Waiting for a plate';
}
function stopAuto(){autoEnabled=false;autoGeneration++;clearTimeout(autoTimer);autoTimer=null;autoBusy=false;autoCandidate='';autoMatches=0;}
function previewFrame(width=960){
 const v=$('cameraVideo');if(!webcam||v.readyState<2||!v.videoWidth)return null;
 const canvas=document.createElement('canvas');const sc=Math.min(1,width/v.videoWidth);
 canvas.width=Math.max(1,Math.round(v.videoWidth*sc));canvas.height=Math.max(1,Math.round(v.videoHeight*sc));
 canvas.getContext('2d').drawImage(v,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.78);
}
function startAuto(){
 stopAuto();if(!webcam||!$('autoScanToggle').checked||currentUser?.role==='viewer')return;
 autoEnabled=true;const gen=autoGeneration;monitorState('Automatic recognition running');
 autoTimer=setTimeout(()=>autoTick(gen),750);
}
async function autoTick(gen){
 if(!autoEnabled||gen!==autoGeneration||!webcam||currentPage!=='inspect'||$('cameraTab').hidden||!$('autoScanToggle').checked)return;
 if(document.hidden){autoTimer=setTimeout(()=>autoTick(gen),1600);return;}
 const dataUrl=previewFrame(960);
 if(!dataUrl){autoTimer=setTimeout(()=>autoTick(gen),1000);return;}
 autoBusy=true;
 try{
   const candidate=await api('/api/camera/preview',{method:'POST',body:JSON.stringify({image_base64:dataUrl,station_id:selectedStation()})});
   if(!autoEnabled||gen!==autoGeneration)return;
   const p=candidate.plate||'';
   if(p){
     if(p===autoCandidate&&Date.now()-autoSeenAt<18000)autoMatches++;else{autoCandidate=p;autoMatches=1;}
     autoSeenAt=Date.now();
     monitorState('OCR reading confirmed '+autoMatches+'/3 · '+candidate.confidence+'% confidence',p);
     if(autoMatches>=3){
       autoMatches=0;autoCandidate='';
       if(Date.now()-(autoRecent.get(p)||0)<180000){monitorState('Already recorded recently · monitoring continues',p)}
       else{
         monitorState('Saving automatic entry and preparing report…',p);
         const frame=previewFrame(1120)||dataUrl;
         const res=await api('/api/camera/entry',{method:'POST',body:JSON.stringify({image_base64:frame,expected_plate:p,camera_session:cameraSession,station_id:selectedStation()})});
         if(!autoEnabled||gen!==autoGeneration)return;
         if(res.accepted){
           autoRecent.set(p,Date.now());showResult(res);
           $('resultsPanelHighlight')?.classList.add('auto-success');setTimeout(()=>$('resultsPanelHighlight')?.classList.remove('auto-success'),2200);
           monitorState(res.recognition.needs_review?'Entry saved — confirm low-confidence OCR':'Entry saved • report ready',p);
           addAutoEntry(res);toast('Vehicle entry saved with server timestamp. '+(res.recognition.needs_review?'Check OCR before relying on result.':'Report is ready.'));
         }else if(res.duplicate){autoRecent.set(p,Date.now());monitorState('Duplicate entry suppressed',p)}
         else{monitorState(res.message||'Review plate and try again',p)}
       }
     }
   }else{autoCandidate='';autoMatches=0;monitorState('Live monitoring · no readable plate detected');}
 }catch(e){if(gen===autoGeneration)monitorState('Monitoring error: '+e.message)}
 finally{autoBusy=false;if(autoEnabled&&gen===autoGeneration)autoTimer=setTimeout(()=>autoTick(gen),1400)}
}
function addAutoEntry(r){
 const box=$('autoEntryFeed');if(box.querySelector('.empty-small'))box.innerHTML='';
 const div=document.createElement('div');div.className='auto-entry-item';
 div.innerHTML=`<span><b>${safe(r.result?.plate||r.recognition?.plate||'UNREADABLE')}</b><small>Recorded ${safe(new Date(r.entry_at).toLocaleString())} · Event #${safe(r.entry_id)}</small></span>${badge(r.result.status)}<a href="/api/reports/${r.id}" target="_blank" rel="noopener">Report ↗</a>`;
 box.prepend(div);while(box.children.length>8)box.lastChild.remove();
}
async function startCamera(){
 if(!navigator.mediaDevices?.getUserMedia){toast('A secure HTTPS/localhost browser with webcam permission is required.',true);return}
 const id=$('cameraSelect').value;
 stopCamera();
 try{
   webcam=await navigator.mediaDevices.getUserMedia({video:id?{deviceId:{exact:id},width:{ideal:1280},height:{ideal:720}}:{width:{ideal:1280},height:{ideal:720}},audio:false});
   const v=$('cameraVideo');v.srcObject=webcam;await v.play();
   $('cameraPlaceholder').hidden=true;$('captureCamera').disabled=false;
   $('cameraLiveBadge').textContent='● LIVE CAMERA';$('cameraLiveBadge').classList.add('online');
   await refreshCameras();monitorState('Camera online');
   webcam.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(webcam)stopCamera()}));
   if($('autoScanToggle').checked)startAuto();
   toast('Live camera connected. Automatic ANPR '+($('autoScanToggle').checked?'started.':'is off.'));
 }catch(e){webcam=null;stopCamera();toast('Camera could not start: '+e.message,true)}
}
function stopCamera(){
 stopAuto();if(webcam)webcam.getTracks().forEach(t=>t.stop());webcam=null;
 $('cameraVideo').srcObject=null;$('cameraPlaceholder').hidden=false;$('captureCamera').disabled=true;
 $('cameraLiveBadge').textContent='● CAMERA OFFLINE';$('cameraLiveBadge').classList.remove('online');
 monitorState('Camera is offline');
}
$('startCamera').addEventListener('click',startCamera);$('stopCamera').addEventListener('click',stopCamera);
$('cameraSelect').addEventListener('change',()=>{if(webcam)startCamera()});
$('autoScanToggle').addEventListener('change',()=>{if($('autoScanToggle').checked)startAuto();else{stopAuto();monitorState(webcam?'Automatic mode paused':'Camera is offline')}});
$('captureCamera').addEventListener('click',()=>{let frame=previewFrame(1600);if(!frame){toast('Camera is not ready.',true);return;}stopAuto();analyze(frame,'USB / webcam').finally(()=>{if(webcam&&$('autoScanToggle').checked)startAuto()})});
setInterval(()=>{$('cameraClock').textContent=new Date().toLocaleTimeString()},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){autoCandidate='';autoMatches=0}});

function showResult(data){
 latest=data;lookedUpPlate=data.result?.plate||null;$('resultId').textContent='#'+data.id;$('resultEmpty').hidden=true;$('resultDisplay').hidden=false;
 const rec=data.recognition||{};const r=data.result||{};const v=r.vehicle;const plate=r.plate||rec.plate||'NOT READ';
 $('recognizedPlate').textContent=plate;$('ocrConfidence').textContent=rec.manual?'Manual lookup':(rec.plate?(Number(rec.confidence||0)<35?`Low confidence (${rec.confidence||0}%) — verify plate`:`${rec.confidence||0}% OCR confidence`):'OCR could not read');
 $('correctionPlate').value=r.plate||'';$('resultStatus').className='status-hero '+(r.status||'');$('resultStatus').innerHTML=`<strong>${safe(ST[r.status]||cap(r.status))}</strong><p>${safe(r.explanation||'')} — Demo record only.</p>`;
 $('rModel').textContent=v?.model||'Not registered';$('rCNG').textContent=v?{yes:'Yes',no:'No',unknown:'Unknown'}[v.cng_endorsed]:'Unknown';$('rCount').textContent=v?.cylinders?.length??'—';
 $('cylinderResult').innerHTML=(v?.cylinders?.length)?v.cylinders.map(c=>`<div class="cyl-card"><div><b>${safe(c.serial)}</b><small>Last test: ${safe(c.last_test||'Not recorded')}<br>Expiry: ${safe(c.expiry||'Not recorded')}<br>Sample certificate ref: ${safe(c.certificate_ref||'Missing')}<br>Document evidence: ${safe(c.evidence==='sample_attachment'?'Sample file attached':c.evidence==='reference_only'?'Reference only — no file':'Missing')}</small>${c.certificate_ref?`<a class="certlink" href="/api/certificates/${c.id}" target="_blank" rel="noopener">View sample certificate</a>`:''}${c.certificate_file?`<br><a class="certlink" href="/api/certificate-files/${c.id}" target="_blank" rel="noopener">Open attached sample document</a>`:''}<br><button class="cert-upload" data-cert="${c.id}">↑ Attach demo certificate</button></div>${badge(c.status)}</div>`).join(''):'<div class="empty-small">No cylinder records available for this vehicle.</div>';
 $('printReport').href=`/api/reports/${data.id}`;
 const needsHold=r.status!=='valid';
 $('cngDecisionSummary').hidden=false;
 $('cngDecisionSummary').className='cng-decision-summary '+(needsHold?'attention':'clear');
 $('cngDecisionSummary').innerHTML=needsHold?
  `<strong>Station display: CNG filling on hold / review</strong><p>${safe(r.explanation||'Incomplete demonstration record.')} Open the station screen for exact reasons.</p>`:
  `<strong>Station display: demo checks passed</strong><p>Sample RC and hydrotest dates passed. This is not legal authorization to supply CNG.</p>`;
 $('showVehicleRecord').disabled=!v;
 $all('[data-cert]').forEach(btn=>{btn.hidden=currentUser?.role!=='admin';btn.addEventListener('click',()=>uploadCertificate(btn.dataset.cert))});
}
async function uploadCertificate(cylinderId){
 let input=document.createElement('input');input.type='file';input.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>5*1024*1024){toast('Certificate attachment must be smaller than 5 MB.',true);return;}
  try{
   await api('/api/certificates/attach',{method:'POST',body:JSON.stringify({cylinder_id:Number(cylinderId),filename:file.name,file_base64:await readDataUrl(file)})});
   toast('Sample certificate attached securely.');
   if(latest?.result?.plate){const v=await api('/api/vehicles/'+encodeURIComponent(latest.result.plate));latest.result=v;showResult(latest);}
  }catch(e){toast(e.message,true)}
 });input.click();
}

async function lookup(plate,recognized='',confidence=0){
 if(!plate.trim()){toast('Enter a demonstration registration number.',true);return}
 try{let endpoint=(latest?.entry_id&&recognized)?'/api/entries/'+latest.entry_id+'/confirm':'/api/lookup';let r=await api(endpoint,{method:'POST',body:JSON.stringify({plate,recognized_plate:recognized||plate,confidence,station_id:selectedStation()})});showResult(r);showPage('inspect');toast('Database lookup complete');}
 catch(e){toast(e.message,true)}
}
$('manualLookup').addEventListener('click',()=>lookup($('manualPlate').value));
$('manualPlate').addEventListener('keydown',e=>{if(e.key==='Enter')lookup(e.target.value)});
$('correctLookup').addEventListener('click',()=>lookup($('correctionPlate').value,latest?.recognition?.plate||'',latest?.recognition?.confidence||0));
$('showVehicleRecord').addEventListener('click',()=>{if(lookedUpPlate){showPage('database');$('vehicleSearch').value=lookedUpPlate;refreshVehicles()}});
async function refreshVehicles(){try{
 let vehicles=await api('/api/vehicles?q='+encodeURIComponent($('vehicleSearch').value||''));$('vehicleCount').textContent=vehicles.length+' sample vehicles';
 $('vehicleRows').innerHTML=vehicles.length?vehicles.map(({plate,vehicle:v,status})=>`<tr><td><strong>${safe(plate)}</strong></td><td>${safe(v.model||'—')}</td><td>${safe(cap(v.cng_endorsed))}</td><td>${v.cylinders.length}</td><td>${badge(status)}</td><td><div class="action-links"><button data-edit="${safe(plate)}">Edit</button><button class="danger" data-delete="${safe(plate)}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="empty-small">No vehicle records match.</td></tr>';
 $all('[data-edit]').forEach(b=>{b.hidden=currentUser?.role!=='admin';b.addEventListener('click',()=>editVehicle(b.dataset.edit))});
 $all('[data-delete]').forEach(b=>{b.hidden=currentUser?.role!=='admin';b.addEventListener('click',()=>removeVehicle(b.dataset.delete))});
}catch(e){toast(e.message,true)}}
$('vehicleSearch').addEventListener('input',()=>refreshVehicles());
function addCylinderRow(c={}){if($all('.cyl-form').length>=12){toast('Maximum 12 sample cylinders.',true);return}let row=document.createElement('div');row.className='cyl-form';row.innerHTML=`<label>Serial<input name="serial" required maxlength="75" value="${safe(c.serial||'')}" placeholder="DEMO-CYL-001"></label><label>Last test<input type="date" name="last_test" value="${safe(c.last_test||'')}"></label><label>Expiry<input type="date" name="expiry" value="${safe(c.expiry||'')}"></label><label>Sample certificate ref<input name="certificate_ref" maxlength="100" value="${safe(c.certificate_ref||'')}" placeholder="DEMO-CERT-001"></label><button title="Remove cylinder" type="button">×</button>`;row.querySelector('button').addEventListener('click',()=>row.remove());$('cylinderForms').appendChild(row)}
$('addCylinder').addEventListener('click',()=>addCylinderRow());
function openVehicleDialog(v){editingPlate=v?.plate||null;$('dialogTitle').textContent=v?'Edit demonstration vehicle':'Add demonstration vehicle';$('vehicleForm').reset();$('vPlate').value=v?.plate||'';$('vPlate').readOnly=!!v;$('vModel').value=v?.model||'';$('vOwner').value=v?.owner_name||'';$('vCNG').value=v?.cng_endorsed||'yes';$('vNotes').value=v?.notes||'';$('cylinderForms').innerHTML='';(v?.cylinders||[]).forEach(addCylinderRow);$('vehicleDialog').showModal();api('/api/stations').then(list=>{$('vStation').innerHTML=list.map(a=>`<option value="${a.id}">${safe(a.name)}</option>`).join('');$('vStation').value=v?.station_id||1}).catch(e=>toast(e.message,true))}
$('addVehicle').addEventListener('click',()=>openVehicleDialog());
$('closeDialog').addEventListener('click',()=>$('vehicleDialog').close());
$('cancelDialog').addEventListener('click',()=>$('vehicleDialog').close());
async function editVehicle(plate){try{const r=await api('/api/vehicles/'+encodeURIComponent(plate));openVehicleDialog(r.vehicle)}catch(e){toast(e.message,true)}}
async function removeVehicle(plate){if(!confirm(`Delete demonstration record ${plate}? Associated cylinder records will be deleted. Inspection history remains.`))return;try{await api('/api/vehicles/'+encodeURIComponent(plate),{method:'DELETE'});toast('Vehicle removed');refreshVehicles();}catch(e){toast(e.message,true)}}
$('vehicleForm').addEventListener('submit',async e=>{e.preventDefault();let cylinders=$all('.cyl-form').map(row=>Object.fromEntries(['serial','last_test','expiry','certificate_ref'].map(name=>[name,row.querySelector(`[name="${name}"]`).value])));let record={plate:$('vPlate').value,model:$('vModel').value,owner_name:$('vOwner').value,cng_endorsed:$('vCNG').value,notes:$('vNotes').value,station_id:Number($('vStation').value||1),cylinders};try{await api('/api/vehicles',{method:'POST',body:JSON.stringify(record)});$('vehicleDialog').close();toast('Demonstration vehicle record saved');refreshVehicles()}catch(err){toast(err.message,true)}});
async function refreshHistory(){try{let list=await api('/api/scans');$('historyRows').innerHTML=list.length?list.map(s=>`<tr><td>#${s.id}</td><td>${safe(s.scanned_at.replace('T',' ').slice(0,19))}</td><td><strong>${safe(s.recognized_plate||'UNREADABLE')}</strong></td><td><strong>${safe(s.checked_plate||'—')}</strong></td><td>${safe(s.method)}</td><td>${s.confidence}%</td><td>${badge(s.status)}</td><td><a class="text-btn" href="/api/reports/${s.id}" target="_blank" rel="noopener">View / Print ↗</a></td></tr>`).join(''):'<tr><td colspan="8" class="empty-small">No recorded inspections yet.</td></tr>'}catch(e){toast(e.message,true)}}
async function refreshHealth(){try{const s=await api('/api/status');const rows=[['Backend API','Online','valid'],['Database',s.database,'valid'],['OCR engine',s.tesseract_ready?'Tesseract detected':'Tesseract NOT FOUND',s.tesseract_ready?'valid':'expired'],['Vehicle data','Synthetic demonstration only','missing'],['External government API','Not connected (by design)','unverified'],['USB camera','Available with browser permission over HTTPS','valid']];$('healthItems').innerHTML='<div class="panel-head"><div><h2>Component diagnostics</h2><p>Live local backend status</p></div></div>'+rows.map(([name,value,state])=>`<div class="health-row"><strong>${safe(name)}</strong><span>${badge(state)} &nbsp; ${safe(value)}</span></div>`).join('')+`<div class="health-note"><b>OCR engine location</b><p>${safe(s.tesseract_path)}</p></div>`;}catch(e){toast(e.message,true)}}
initApp();

async function initApp(){
 try{const resp=await fetch('/api/me',{credentials:'same-origin'});if(!resp.ok){location.href='/login';return;}currentUser=await resp.json();csrfToken=currentUser.csrf;$('sessionUser').textContent=`${currentUser.name||currentUser.email} · ${currentUser.role}`;
 const canEdit=currentUser.role==='admin';
 $('adminNav').hidden=!canEdit;$('addVehicle').hidden=!canEdit;
 if(!canEdit)$all('.cert-upload').forEach(b=>b.hidden=true);
 if(currentUser.role==='viewer'){$('manualLookup').disabled=true;$('analyzeUpload').disabled=true;$('startCamera').disabled=true;}
 await refreshStationSelectors();refreshOverview();loadEntryStations();}
 catch(err){toast(err.message,true)}
}
$('logoutBtn').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST',body:'{}'})}finally{location.href='/login'}});
async function refreshAdmin(){
 if(currentUser?.role!=='admin')return;
 try{const [stations,users,events]=await Promise.all([api('/api/stations'),api('/api/users'),api('/api/audit')]);
 $('stationList').innerHTML=stations.map(s=>`<div class="health-row"><b>${safe(s.name)}</b><span>${safe(s.city)} · #${s.id}</span></div>`).join('');
 $('userList').innerHTML=users.map(u=>`<div class="health-row"><b>${safe(u.name||u.email)}</b><span>${safe(u.role)} · ${safe(u.email)} · ${u.active?'Enabled':'Disabled'} &nbsp; ${u.id!==currentUser.id?`<button data-user-id="${u.id}" data-active="${u.active}" class="text-btn">${u.active?'Disable':'Enable'}</button>`:''}</span></div>`).join('');
 $all('[data-user-id]').forEach(b=>b.addEventListener('click',()=>toggleUser(b.dataset.userId,b.dataset.active==='true')));
 $('newStation').innerHTML='<option value="">All stations</option>'+stations.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');
 refreshRegisteredDevices();$('auditRows').innerHTML=events.map(e=>`<tr><td>${safe(e.time)}</td><td>${safe(e.action)}</td><td>${safe(e.subject)}</td><td>#${safe(e.actor_id)}</td></tr>`).join('')||'<tr><td colspan="4">No events</td></tr>';
 }catch(e){toast(e.message,true)}
}

async function refreshStationSelectors(){
 try{
   const stations=await api('/api/stations');
   const target=$('inspectionStation');
   target.innerHTML=stations.map(s=>`<option value="${s.id}">${safe(s.name)} — ${safe(s.city||'Unknown city')}</option>`).join('');
   if(currentUser?.station_id){target.value=String(currentUser.station_id);target.disabled=true;}
   else if(stations.length===1)target.value=String(stations[0].id);
   else target.insertAdjacentHTML('afterbegin','<option value="" selected>Choose station for inspection</option>');
   const filter=$('analyticsStation');filter.innerHTML='<option value="">All stations</option>'+stations.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');
   if(currentUser?.station_id){filter.value=String(currentUser.station_id);filter.disabled=true;}
   if(currentUser?.role==='admin'){$('deviceStation').innerHTML='<option value="">Select station</option>'+stations.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');}
 }catch(e){toast('Cannot load station selectors: '+e.message,true)}
}
async function refreshAnalytics(){
 try{
  const days=Number($('analyticsDays').value||30);const station=$('analyticsStation').value;
  const data=await api('/api/analytics?days='+days+(station?'&station_id='+encodeURIComponent(station):''));
  const entries=[['Total inspections',data.total],['Requires attention',data.attention],['Demo valid',data.statuses.valid||0],['Expired certificates',data.statuses.expired||0]];
  $('analyticsStats').innerHTML=entries.map(([name,val])=>`<div class="stat"><div class="stat-name">${safe(name)}</div><div class="stat-num">${val}</div><div class="stat-foot">Selected ${days}-day window</div></div>`).join('');
  const groups=[['valid','Demo Valid'],['expired','Expired'],['missing','Missing'],['unverified','Unverified'],['not_registered','Not Registered'],['not_cng','Not CNG']];
  $('analyticsBreakdown').innerHTML=groups.map(([key,label])=>`<div class="breakdown-row"><span>${safe(label)}</span><div class="break-track"><i style="width:${data.total?((data.statuses[key]||0)/data.total*100):0}%"></i></div><b>${data.statuses[key]||0}</b></div>`).join('');
  const last=data.daily.slice(-28);const max=Math.max(1,...last.map(x=>x.count));
  $('analyticsChart').innerHTML=last.length?last.map(x=>`<div class="chart-col" title="${safe(x.date)}: ${x.count} inspections"><div class="chart-num">${x.count}</div><div class="chart-bar" style="height:${Math.max(7,x.count/max*160)}px"></div><span>${safe(x.date.slice(5))}</span></div>`).join(''):'<div class="empty-small">No inspections in selected period. Scan a demo plate to populate analytics.</div>';
 }catch(e){toast(e.message,true)}
}
$('refreshAnalytics').addEventListener('click',refreshAnalytics);
$('analyticsDays').addEventListener('change',refreshAnalytics);
$('analyticsStation').addEventListener('change',refreshAnalytics);
async function refreshRegisteredDevices(){
 if(currentUser?.role!=='admin')return;
 try{let list=await api('/api/cameras');$('cameraList').innerHTML=list.length?list.map(d=>`<div class="health-row"><div><b>${safe(d.name)}</b><div class="tiny">Station #${d.station_id} · Last check-in: ${safe(d.last_seen||'Never')}</div></div><span>${d.enabled?'<span class="pill valid">Enabled</span>':'<span class="pill muted">Disabled</span>'} ${d.enabled?`<button class="text-btn" data-device-disable="${d.id}">Disable</button>`:''}</span></div>`).join(''):'<p class="tiny">No station IP/edge cameras registered. Use USB webcam for browser scans.</p>';
 $all('[data-device-disable]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Disable device token? The edge agent will stop working.'))return;try{await api('/api/cameras/'+b.dataset.deviceDisable+'/disable',{method:'POST',body:'{}'});refreshRegisteredDevices()}catch(e){toast(e.message,true)}}));
 }catch(e){toast(e.message,true)}
}
$('cameraForm').addEventListener('submit',async e=>{
 e.preventDefault();try{const res=await api('/api/cameras',{method:'POST',body:JSON.stringify({name:$('deviceName').value,station_id:Number($('deviceStation').value)})});$('deviceTokenDisplay').hidden=false;
 $('deviceTokenDisplay').textContent='SAVE THIS DEVICE TOKEN NOW (shown only once): '+res.device_token+' — Store it in the edge PC environment, never in public code or screenshots.';
 $('cameraForm').reset();await refreshRegisteredDevices();}catch(e){toast(e.message,true)}
});

$('stationForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/stations',{method:'POST',body:JSON.stringify({name:$('stationName').value,city:$('stationCity').value})});$('stationForm').reset();toast('Station created');refreshAdmin();refreshStationSelectors()}catch(x){toast(x.message,true)}});
$('userForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/users',{method:'POST',body:JSON.stringify({name:$('newName').value,email:$('newEmail').value,password:$('newPassword').value,role:$('newRole').value,station_id:$('newStation').value||null})});$('userForm').reset();toast('User created');refreshAdmin()}catch(x){toast(x.message,true)}});

async function refreshAlerts(){
 try{let items=await api('/api/alerts');const e={expired:items.filter(x=>x.status==='expired').length,missing:items.filter(x=>x.status==='missing').length,unverified:items.filter(x=>x.status==='unverified'||x.status==='not_registered').length};
 $('alertStats').innerHTML=`<div class="stat"><div class="stat-name">Expired inspections</div><div class="stat-num">${e.expired}</div></div><div class="stat"><div class="stat-name">Missing certificate</div><div class="stat-num">${e.missing}</div></div><div class="stat"><div class="stat-name">Requires review</div><div class="stat-num">${e.unverified}</div></div>`;
 $('alertCards').innerHTML=items.length?items.map(x=>`<div class="panel"><div class="panel-head"><h2>${safe(x.checked_plate||'PLATE NOT READ')}</h2>${badge(x.status)}</div><div class="info-list"><div><span>Inspection ID</span><b>#${safe(x.id)}</b></div><div><span>Checked at (UTC)</span><b>${safe(x.scanned_at)}</b></div><div><span>Source</span><b>${safe(x.method)}</b></div></div><a class="btn outline" target="_blank" rel="noopener" href="/api/reports/${x.id}">View Report ↗</a></div>`).join(''):'<div class="panel">No expired/missing/unverified inspections recorded yet. Scan the expired or missing sample plate to demonstrate alerts.</div>';
 }catch(e){toast(e.message,true)}
}
$('refreshAlerts').addEventListener('click',refreshAlerts);
setInterval(()=>{if(currentPage==='alerts')refreshAlerts()},15000);

async function toggleUser(id,isActive){if(!confirm(`${isActive?'Disable':'Enable'} this user?`))return;try{await api(`/api/users/${id}/status`,{method:'POST',body:JSON.stringify({active:!isActive})});toast('User status updated');refreshAdmin()}catch(e){toast(e.message,true)}}
$('passwordForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/change-password',{method:'POST',body:JSON.stringify({current_password:$('oldPassword').value,new_password:$('newPasswordSecure').value})});$('passwordForm').reset();toast('Password updated successfully')}catch(err){toast(err.message,true)}});


function formatEventTime(iso){
 if(!iso)return '—';const dt=new Date(iso);
 return isNaN(dt.getTime())?'—':dt.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
}
async function refreshEntries(){
 try{
  const q=$('entrySearch').value.trim();const sid=$('entryStation').value;
  let url='/api/entries?limit=500&q='+encodeURIComponent(q)+(sid?'&station_id='+encodeURIComponent(sid):'');
  const [rows,summary]=await Promise.all([api(url),api('/api/entries/summary'+(sid?'?station_id='+encodeURIComponent(sid):''))]);
  $('entrySummary').innerHTML=[['All logged checks',summary.total_events],['Camera entries today (UTC)',summary.camera_entries_today],['Need OCR review',summary.pending_review],['Attention today (UTC)',summary.attention_today]].map(([label,val])=>`<div class="stat"><div class="stat-name">${safe(label)}</div><div class="stat-num">${safe(val)}</div></div>`).join('');
  $('entryCount').textContent=rows.length+' recorded vehicle events';
  $('entryRows').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>#${safe(x.id)}</strong></td><td>${safe(formatEventTime(x.entry_at))}</td><td><strong>${safe(x.plate||'UNREADABLE')}</strong></td><td>${safe(x.station_name)}</td><td>${x.event_type==='entry'?'<span class="pill valid">Camera entry</span>':'<span class="pill muted">Inspection only</span>'}</td><td>${badge(x.status)}${x.needs_review?' <small>Review OCR</small>':''}</td><td>${safe(x.confidence)}%</td><td><button class="text-btn" data-entry="${x.id}">View details</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty-small">No matching vehicle observations recorded.</td></tr>';
  $all('[data-entry]').forEach(b=>b.addEventListener('click',()=>showEntryDetail(Number(b.dataset.entry))));
 }catch(e){toast(e.message,true)}
}
async function showEntryDetail(id){
 try{
  const r=await api('/api/entries/'+id);const e=r.event,v=r.result?.vehicle||null;
  $('entryDetailPanel').hidden=false;
  $('entryDetailContent').innerHTML=`<div class="entry-detail-grid"><div><div class="plate-number">${safe(e.plate||'UNREADABLE')}</div><p><strong>${safe(e.station_name)}</strong> · ${safe(formatEventTime(e.entry_at))}</p><p>${badge(e.status)} ${e.needs_review?'OCR confirmation required':''}</p><p><b>Observation:</b> ${e.event_type==='entry'?'Automatic camera entry':'Manual or uploaded-image inspection'}</p><p><b>Vehicle:</b> ${safe(v?.model||'Not in demonstration database')}</p><p><b>Cylinders:</b> ${safe(v?.cylinders?.length??'Unknown')}</p><p><b>Source:</b> ${safe(e.source)}</p><p><b>Confidence:</b> ${safe(e.confidence)}%</p><a class="btn secondary" href="${e.report_url}" target="_blank" rel="noopener">Open Inspection PDF</a></div>${e.image_url?`<img src="${e.image_url}" alt="Saved camera image of vehicle plate"/>`:'<div class="empty-small">No photo attached to manual inspection</div>'}</div>`;
  $('entryDetailPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){toast(e.message,true)}
}
$('closeEntryDetail').addEventListener('click',()=>$('entryDetailPanel').hidden=true);
$('entrySearch').addEventListener('input',()=>refreshEntries());
$('entryStation').addEventListener('change',refreshEntries);
$('refreshEntries').addEventListener('click',refreshEntries);
$('exportEntries').addEventListener('click',()=>{
 const q=$('entrySearch').value.trim();const sid=$('entryStation').value;
 const qs='?q='+encodeURIComponent(q)+(sid?'&station_id='+encodeURIComponent(sid):'');
 window.location.href='/api/entries.csv'+qs;
});
async function loadEntryStations(){try{
 const stations=await api('/api/stations');
 $('entryStation').innerHTML='<option value="">All permitted stations</option>'+stations.map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');
}catch(e){console.warn('Cannot load entry station filter',e)}}

$('inspectionStation').addEventListener('change',()=>{if(webcam&&autoEnabled)startAuto();});
