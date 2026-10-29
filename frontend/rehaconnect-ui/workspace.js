'use strict';
let selectedClinicId='';
let workspaceVersion=0;
let currentWorkspace=null;
const workspaceText={
 en:{clinic:'Clinic',selectClinic:'Choose a clinic',role:'Role',admin:'Administrator',staff:'Staff',patient:'Patient',new:'Add',edit:'Edit',archive:'Archive',save:'Save',cancel:'Cancel',title:'Title / name',body:'Details',status:'Publication',draft:'Draft',published:'Published',archived:'Archived',empty:'No entries yet.',noClinic:'Create a clinic to get started, or ask your clinic administrator to assign your account.',loginRequired:'Sign in to access your clinic.',create:'Create clinic',loading:'Loading clinic information…',error:'The request failed. Your change was not confirmed.',saved:'Saved.',archivedNotice:'Archived.',confirmArchive:'Archive this entry?',patient_id:'Patient',choosePatient:'Select a patient',general:'All patients in this clinic',email:'Email address',admission_date:'Admission date',discharge_date:'Discharge date',starts_at:'Start (your local time)',ends_at:'End (your local time)',location:'Location',practitioner:'Therapist / staff',dose:'Clinic-provided dosage',time:'Scheduled time (clinic time)',date:'Date',meal:'Meal',breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner',allergens:'Allergens',category:'Category',file:'PDF document (up to 5 MB)',download:'Download PDF',members:'Access and roles',addMember:'Assign role',removeMember:'Remove access',removed:'Access removed.',memberNote:'Access is assigned to this verified email address. No invitation email is sent by this form.',audit:'Change history',actor:'Changed by',at:'Time',action:'Action',timezone:'Clinic time zone',today:'Today',actualData:'Calculated from saved clinic records',countPatients:'Patients',countAppointments:'Appointments today',countEvents:'Upcoming events',countMessages:'Published announcements',register:'Join event',unregister:'Leave event',registered:'Registered',taken:'Record intake',intakeRecorded:'Intake recorded',medicationNote:'This displays the plan entered by your clinic. It does not provide medical advice or change a prescription.',records:'Saved entries',filter:'Filter entries',all:'All',from:'From',until:'Until',export:'Export calendar',feedback:'Feedback',sendFeedback:'Send feedback',feedbackNote:'Feedback is visible to clinic staff.',noChanges:'No changes recorded.',patientHome:'Your clinic information',clinicHome:'Clinic workspace',refresh:'Refresh',filename:'File name',reminders:'Enable reminders while this page is open',reminderActive:'Reminders enabled while this page remains open.',reminderDenied:'Notifications are not permitted in this browser.',feedbackSent:'Feedback sent.',report:'Reports',pdfPlan:'Print medication plan / save as PDF',startDate:'Start date',endDate:'End date',createAction:'Created',updateAction:'Updated',archiveAction:'Archived',membershipAction:'Role changed',intakeAction:'Intake recorded',registerAction:'Event joined',unregisterAction:'Event left'},
 de:{clinic:'Klinik',selectClinic:'Klinik auswählen',role:'Rolle',admin:'Administration',staff:'Mitarbeitende',patient:'Patient/in',new:'Hinzufügen',edit:'Bearbeiten',archive:'Archivieren',save:'Speichern',cancel:'Abbrechen',title:'Titel / Name',body:'Details',status:'Veröffentlichung',draft:'Entwurf',published:'Veröffentlicht',archived:'Archiviert',empty:'Noch keine Einträge vorhanden.',noClinic:'Erstellen Sie eine Klinik oder bitten Sie Ihre Klinikadministration, Ihrem Konto Zugriff zuzuweisen.',loginRequired:'Melden Sie sich an, um Ihre Klinik aufzurufen.',create:'Klinik erstellen',loading:'Klinikinformationen werden geladen…',error:'Die Anfrage ist fehlgeschlagen. Ihre Änderung wurde nicht bestätigt.',saved:'Gespeichert.',archivedNotice:'Archiviert.',confirmArchive:'Diesen Eintrag archivieren?',patient_id:'Patient/in',choosePatient:'Patient/in auswählen',general:'Alle Patienten dieser Klinik',email:'E-Mail-Adresse',admission_date:'Aufnahmedatum',discharge_date:'Entlassdatum',starts_at:'Beginn (Ihre Ortszeit)',ends_at:'Ende (Ihre Ortszeit)',location:'Ort',practitioner:'Therapeut/in / Mitarbeitende',dose:'Von der Klinik angegebene Dosierung',time:'Einnahmezeit (Klinikzeit)',date:'Datum',meal:'Mahlzeit',breakfast:'Frühstück',lunch:'Mittagessen',dinner:'Abendessen',allergens:'Allergene',category:'Kategorie',file:'PDF-Dokument (bis 5 MB)',download:'PDF herunterladen',members:'Zugang und Rollen',addMember:'Rolle zuweisen',removeMember:'Zugang entfernen',removed:'Zugang entfernt.',memberNote:'Der Zugang wird dieser bestätigten E-Mail-Adresse zugewiesen. Dieses Formular versendet keine Einladung.',audit:'Änderungsverlauf',actor:'Geändert von',at:'Zeit',action:'Aktion',timezone:'Zeitzone der Klinik',today:'Heute',actualData:'Aus gespeicherten Klinikdaten berechnet',countPatients:'Patienten',countAppointments:'Heutige Termine',countEvents:'Kommende Veranstaltungen',countMessages:'Veröffentlichte Mitteilungen',register:'Teilnehmen',unregister:'Teilnahme absagen',registered:'Angemeldet',taken:'Einnahme protokollieren',intakeRecorded:'Einnahme protokolliert',medicationNote:'Hier wird der von Ihrer Klinik eingegebene Plan angezeigt. Dies ersetzt keine medizinische Beratung und ändert keine Verordnung.',records:'Gespeicherte Einträge',filter:'Einträge filtern',all:'Alle',from:'Von',until:'Bis',export:'Kalender exportieren',feedback:'Rückmeldung',sendFeedback:'Rückmeldung senden',feedbackNote:'Rückmeldungen sind für Klinikmitarbeitende sichtbar.',noChanges:'Noch keine Änderungen protokolliert.',patientHome:'Ihre Klinikinformationen',clinicHome:'Klinikbereich',refresh:'Aktualisieren',filename:'Dateiname',reminders:'Erinnerungen bei geöffneter Seite aktivieren',reminderActive:'Erinnerungen sind aktiv, solange diese Seite geöffnet bleibt.',reminderDenied:'Benachrichtigungen sind in diesem Browser nicht erlaubt.',feedbackSent:'Rückmeldung gesendet.',report:'Auswertungen',pdfPlan:'Medikamentenplan drucken / als PDF speichern',startDate:'Anfangsdatum',endDate:'Enddatum',createAction:'Erstellt',updateAction:'Aktualisiert',archiveAction:'Archiviert',membershipAction:'Rolle geändert',intakeAction:'Einnahme protokolliert',registerAction:'Teilnahme angemeldet',unregisterAction:'Teilnahme abgesagt'}
};
const wt=key=>workspaceText[language][key]||t(key);
Object.assign(workspaceText.en,{conflict:'The entry changed or conflicts with an existing appointment. Refresh and check the saved information before trying again.'});
Object.assign(workspaceText.de,{conflict:'Der Eintrag wurde geändert oder überschneidet sich mit einem vorhandenen Termin. Aktualisieren und prüfen Sie die gespeicherten Angaben vor einem erneuten Versuch.'});
const definitions={patients:['email','admission_date','discharge_date'],appointments:['patient_id','starts_at','ends_at','location','practitioner'],medications:['patient_id','dose','time'],events:['starts_at','ends_at','location','category'],documents:['patient_id','file'],messages:[],meals:['date','meal','allergens'],information:['category'],rooms:['category','capacity']};
Object.assign(workspaceText.en,{capacity:'Capacity',clinicProfile:'Clinic profile',name:'Clinic name',address:'Address'});Object.assign(workspaceText.de,{capacity:'Kapazität',clinicProfile:'Klinikprofil',name:'Klinikname',address:'Adresse'});
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function button(text,callback,className='primary'){const node=element('button',text,className);node.type='button';node.addEventListener('click',async event=>{const result=callback(event);if(result&&typeof result.then==='function'){node.disabled=true;try{await result;}finally{node.disabled=false;}}});return node;}
function clinicPath(clinic,suffix=''){return '/api/clinics/'+encodeURIComponent(clinic.id)+suffix;}
async function workspaceApi(path,method='GET',body){
 const response=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Reha-CSRF':window.rehaCsrf||''},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error((response.status===409?wt('conflict'):wt('error'))+' (HTTP '+response.status+')');
 return response.status===204||response.headers.get('content-length')==='0'?null:response.text().then(value=>value?JSON.parse(value):null);
}
function localDate(value,zone){if(!value)return '';try{return new Intl.DateTimeFormat(language==='de'?'de-DE':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:zone}).format(new Date(value));}catch{return value;}}
window.renderWorkspace=page=>{
 if(!accountData){selectedClinicId='';currentWorkspace=null;document.querySelector('.workspace strong').textContent=t('workspace');document.querySelector('.workspace small').textContent=t('setupRequired');document.querySelector('.sidebar-bottom span:last-child').textContent=t('setupRequired');document.querySelector('#view').disabled=false;}
 if(['account','billing'].includes(page))return;
 const content=document.querySelector('#content');
 const section=element('section',undefined,'workspace-content');content.replaceChildren(section);
 if(accountLoading){section.append(element('p',wt('loading')));return;}
 if(!accountData){section.append(element('h1',wt('loginRequired')),element('a',it('login'),'primary'));section.lastChild.href='#account';return;}
 const clinic=clinicRows.find(row=>row.id===selectedClinicId)||clinicRows[0];
 const bar=element('div',undefined,'workspace-toolbar');const label=element('label',wt('selectClinic'));const select=element('select');
 for(const row of clinicRows){const option=element('option',row.name);option.value=row.id;select.append(option);}label.append(select);bar.append(label);
 if(!clinic||clinic.role!=='patient')bar.append(button(wt('create'),()=>{formStatus.textContent='';dialog.showModal();}));
 section.append(bar);
 if(!clinic){section.append(element('p',wt('noClinic')));return;}
 selectedClinicId=clinic.id;select.value=clinic.id;
 select.addEventListener('change',()=>{selectedClinicId=select.value;const next=clinicRows.find(c=>c.id===selectedClinicId);portal=next?.role==='patient'?'patient':'clinic';render();});
 portal=clinic.role==='patient'?'patient':'clinic';document.querySelector('#view').value=portal;document.querySelector('#view').disabled=true;
 for(const link of document.querySelectorAll('#navigation a'))if(link.getAttribute('href')==='#patients')link.hidden=clinic.role==='patient';
 document.querySelector('.workspace strong').textContent=clinic.name;
 document.querySelector('.workspace small').textContent=wt(clinic.role);
 document.querySelector('.sidebar-bottom span:last-child').textContent=wt(clinic.role);
 section.append(element('p',wt('role')+': '+wt(clinic.role)+' · '+wt('timezone')+': '+clinic.timezone,'workspace-context'));
 section.append(element('h1',page==='dashboard'?wt(clinic.role==='patient'?'patientHome':'clinicHome'):t(page)));
 const status=element('p','','workspace-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');section.append(status);
 const body=element('div');section.append(body);status.textContent=wt('loading');
 const version=++workspaceVersion;
 loadWorkspace(clinic,page,body,status).then(()=>{if(version===workspaceVersion&&currentPage()===page)status.textContent='';}).catch(error=>{if(version===workspaceVersion)status.textContent=error.message||wt('error');});
};
async function loadWorkspace(clinic,page,body,status){
 if(page==='settings'){await renderSettings(clinic,body,status);return;}
 if(page==='feedback'){
  const entries=await workspaceApi(clinicPath(clinic,'/feedback'));if(clinic.role==='patient')renderFeedback(clinic,body);
  if(!entries.length)body.append(element('p',wt('empty')));
  for(const row of [...entries].reverse()){const card=element('article',undefined,'panel record-card');card.append(element('p',row.body,'record-body'),element('p',(row.author_email||'')+' · '+localDate(row.created_at,clinic.timezone),'subtle'));body.append(card);}return;
 }
 const types=page==='dashboard'?Object.keys(definitions):[page];
 if(!types.every(type=>type in definitions))return;
 let data;
 if(page==='dashboard')data=await workspaceApi(clinicPath(clinic,'/overview'));
 else {const values=await Promise.all(types.map(type=>workspaceApi(clinicPath(clinic,'/records/'+type))));data=Object.fromEntries(types.map((type,index)=>[type,values[index]]));}
 if(!data.patients&&clinic.role!=='patient')data.patients=await workspaceApi(clinicPath(clinic,'/records/patients'));
 currentWorkspace={clinic,data};
 if(page==='dashboard'){renderDashboard(clinic,data,body);return;}
 if(page==='medications')body.append(element('p',wt('medicationNote'),'notice'));
 const controls=element('div',undefined,'workspace-toolbar');
 if(clinic.role!=='patient')controls.append(button(wt('new'),()=>editRecord(clinic,page,null,data.patients||[],status)));
 if(page==='appointments')controls.append(button(wt('export'),()=>exportCalendar(filteredRows().filter(r=>r.status==='published'))));
 if(page==='medications')controls.append(button(wt('pdfPlan'),()=>printMedicationPlan(clinic,filteredRows())));
 if(clinic.role==='patient'&&['appointments','medications'].includes(page))controls.append(button(wt('reminders'),()=>enableReminders(clinic,status)));
 const label=element('label',wt('filter'));const filter=element('input');filter.type='search';label.append(filter);controls.append(label);body.append(controls);
 let patientFilter=null;
 let statusFilter=null,startFilter=null,endFilter=null;
 if(clinic.role!=='patient'){
  const label=element('label',wt('status'));statusFilter=element('select');for(const value of ['all','draft','published','archived']){const option=element('option',wt(value));option.value=value==='all'?'':value;statusFilter.append(option);}label.append(statusFilter);controls.append(label);statusFilter.addEventListener('change',paint);
 }
 if(['appointments','events'].includes(page)){
  for(const key of ['startDate','endDate']){const label=element('label',wt(key));const input=element('input');input.type='date';label.append(input);controls.append(label);if(key==='startDate')startFilter=input;else endFilter=input;input.addEventListener('change',paint);}
 }
 if(clinic.role!=='patient'&&['appointments','medications','documents'].includes(page)){
  const label=element('label',wt('patient_id'));patientFilter=element('select');const all=element('option',wt('all'));all.value='';patientFilter.append(all);
  for(const patient of data.patients||[]){const option=element('option',patient.title);option.value=patient.id;patientFilter.append(option);}label.append(patientFilter);controls.append(label);patientFilter.addEventListener('change',paint);
 }
 const list=element('div',undefined,'record-list');body.append(list);
 function filteredRows(){return data[page].filter(row=>{
  if(patientFilter?.value&&row.patient_id!==patientFilter.value)return false;
  if(statusFilter?.value&&row.status!==statusFilter.value)return false;
  if(row.starts_at){const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:clinic.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(row.starts_at)).map(part=>[part.type,part.value]));const date=parts.year+'-'+parts.month+'-'+parts.day;if(startFilter?.value&&date<startFilter.value)return false;if(endFilter?.value&&date>endFilter.value)return false;}
  return ['title','body','category','location','practitioner','dose','allergens'].map(key=>row[key]||'').join(' ').toLocaleLowerCase().includes(filter.value.toLocaleLowerCase());
 });}
 function paint(){list.replaceChildren();const rows=filteredRows();if(!rows.length)list.append(element('p',wt('empty'),'empty'));for(const row of rows)renderRecord(clinic,page,row,data.patients||[],list,status);}
 filter.addEventListener('input',paint);paint();
}
function renderRecord(clinic,type,row,patients,list,status){
 const card=element('article',undefined,'panel record-card');card.append(element('h2',row.title));
 const chips=element('div',undefined,'record-meta');chips.append(element('span',wt(row.status),'pill'));
 if(row.patient_id&&clinic.role!=='patient'){const patient=patients.find(p=>p.id===row.patient_id);chips.append(element('span',patient?.title||row.patient_id));}
 for(const field of definitions[type]||[]){
  if(['file','patient_id'].includes(field)||!row[field])continue;
  chips.append(element('span',wt(field)+': '+(field.endsWith('_at')?localDate(row[field],clinic.timezone):field==='meal'?wt(row[field]):row[field])));
 }
 card.append(chips);if(row.body)card.append(element('p',row.body,'record-body'));
 const actions=element('div',undefined,'integration-actions');card.append(actions);
 if(type==='documents'){const link=element('a',wt('download'),'primary');link.href=clinicPath(clinic,'/documents/'+encodeURIComponent(row.id)+'/download');actions.append(link);}
 if(clinic.role!=='patient'){
  actions.append(button(wt('edit'),()=>editRecord(clinic,type,row,patients,status)));
  if(row.status!=='archived')actions.append(button(wt('archive'),async()=>{if(!confirm(wt('confirmArchive')))return;try{await workspaceApi(clinicPath(clinic,'/records/'+type+'/'+row.id),'DELETE');render();}catch(error){status.textContent=error.message;}},'secondary'));
 }else{
  if(type==='events'&&row.status==='published'&&(row.registered||new Date(row.ends_at)>new Date()))actions.append(button(wt(row.registered?'unregister':'register'),()=>patientAction(clinic,type,row,row.registered?'unregister':'register',status)));
  if(type==='medications'){
   actions.append(button(wt('taken'),()=>patientAction(clinic,type,row,'taken',status)));
   for(const intake of row.intakes||[])card.append(element('p',wt('intakeRecorded')+': '+localDate(intake.at,clinic.timezone),'subtle'));
  }
 }
 list.append(card);
}
async function patientAction(clinic,type,row,action,status){try{await workspaceApi(clinicPath(clinic,'/records/'+type+'/'+row.id+'/'+action),'POST',{});render();}catch(error){status.textContent=error.message;}}
function editRecord(clinic,type,row,patients,pageStatus){
 const modal=element('dialog',undefined,'record-dialog');const form=element('form');modal.append(form);
 form.append(element('h2',wt(row?'edit':'new')+' · '+t(type)));
 const controls={};
 const fields=['title','body',...definitions[type],'status'];
 if(type==='messages'||type==='information')fields.splice(2,0,'patient_id');
 for(const field of fields){
  const label=element('label',wt(field));let input;
  if(field==='body'){input=element('textarea');input.rows=5;input.maxLength=20000;}
  else if(['status','patient_id','meal'].includes(field)){
   input=element('select');
   const options=field==='status'?[['draft',wt('draft')],['published',wt('published')],['archived',wt('archived')]]:field==='meal'?[['breakfast',wt('breakfast')],['lunch',wt('lunch')],['dinner',wt('dinner')]]:[['',wt(['appointments','medications'].includes(type)?'choosePatient':'general')],...patients.filter(p=>p.status!=='archived'||p.id===row?.patient_id).map(p=>[p.id,p.title])];
   for(const [value,text]of options){const option=element('option',text);option.value=value;input.append(option);}
  }else{
   input=element('input');input.type=field==='file'?'file':field.endsWith('_at')?'datetime-local':field==='time'?'time':field==='date'||field.endsWith('_date')?'date':field==='email'?'email':'text';
   if(field==='file')input.accept='application/pdf';else input.maxLength=field==='title'?200:field==='allergens'?2000:400;
  }
  input.name=field;input.required=field==='title'||field==='status'||field==='email'||field.endsWith('_at')||field==='time'||field==='date'||(field==='file'&&!row)||(field==='patient_id'&&['appointments','medications'].includes(type));
  if(field!=='file')input.value=row?.[field]|| (field==='status'?'draft':field==='meal'?'breakfast':'');
  if(field.endsWith('_at')&&row?.[field]){const date=new Date(row[field]);input.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
  controls[field]=input;label.append(input);form.append(label);
 }
 const status=element('p','','workspace-status');status.setAttribute('role','status');form.append(status);
 const actions=element('div',undefined,'integration-actions');const save=element('button',wt('save'),'primary');save.type='submit';actions.append(save,button(wt('cancel'),()=>modal.close(),'secondary'));form.append(actions);
 form.addEventListener('submit',async event=>{
  event.preventDefault();save.disabled=true;status.textContent=wt('loading');
  try{
   const payload={};for(const[field,input]of Object.entries(controls))if(field!=='file')payload[field]=field.endsWith('_at')?new Date(input.value).toISOString():input.value.trim();
   if(row)payload.version=row.updated_at;
   const file=controls.file?.files[0];
   if(file){if(file.size>5000000)throw new Error(wt('file'));const buffer=new Uint8Array(await file.arrayBuffer());if(new TextDecoder().decode(buffer.slice(0,5))!=='%PDF-')throw new Error(wt('file'));let binary='';for(let start=0;start<buffer.length;start+=8192)binary+=String.fromCharCode(...buffer.subarray(start,start+8192));payload.content_base64=btoa(binary);payload.filename=file.name;}
   await workspaceApi(clinicPath(clinic,'/records/'+type+(row?'/'+row.id:'')),row?'PUT':'POST',payload);modal.close();render();
  }catch(error){status.textContent=error.message||wt('error');save.disabled=false;}
 });
 modal.addEventListener('close',()=>modal.remove());document.body.append(modal);modal.showModal();
}
function renderDashboard(clinic,data,body){
 const now=new Date();const day=new Intl.DateTimeFormat('en-CA',{timeZone:clinic.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const sameDay=value=>new Intl.DateTimeFormat('en-CA',{timeZone:clinic.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))===day;
 const active=type=>(data[type]||[]).filter(r=>r.status==='published');
 const schedule=active('appointments').filter(r=>sameDay(r.starts_at)).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 const cards=element('section',undefined,'cards');
 const metrics=[['countAppointments',schedule.length],['countEvents',active('events').filter(r=>new Date(r.ends_at)>=now).length],['countMessages',active('messages').length]];
 if(clinic.role!=='patient')metrics.unshift(['countPatients',(data.patients||[]).filter(r=>r.status!=='archived').length]);
 for(const[label,count]of metrics){const card=element('article',undefined,'card');card.append(element('p',wt(label)),element('div',String(count),'metric-value'),element('p',wt('actualData'),'metric-note'));cards.append(card);}body.append(cards);
 body.append(element('h2',wt('today')+' · '+t('appointments')));
 const list=element('div',undefined,'record-list');body.append(list);if(!schedule.length)list.append(element('p',wt('empty'),'empty'));for(const row of schedule)renderRecord(clinic,'appointments',row,data.patients,list,element('p'));
 body.append(element('h2',t('messages')));const notices=element('div',undefined,'record-list');body.append(notices);for(const row of active('messages').slice(-5).reverse())renderRecord(clinic,'messages',row,data.patients,notices,element('p'));
 const links=element('div',undefined,'integration-actions');for(const key of ['meals','events','documents','information']){const link=element('a',t(key),'primary');link.href='#'+key;links.append(link);}body.append(links);
 if(clinic.role==='patient')renderFeedback(clinic,body);
}
async function renderSettings(clinic,body,status){
 if(clinic.role!=='admin'){body.append(element('p',wt('role')+': '+wt(clinic.role)));return;}
 const [members,audit]=await Promise.all([workspaceApi(clinicPath(clinic,'/members')),workspaceApi(clinicPath(clinic,'/audit'))]);
 body.append(element('h2',wt('clinicProfile')));const profile=element('form',undefined,'clinic-profile');
 for(const key of ['name','address','timezone']){const label=element('label',wt(key));const input=element('input');input.name=key;input.required=true;input.maxLength=key==='name'?160:key==='address'?300:80;input.value=clinic[key];label.append(input);profile.append(label);}
 const saveProfile=element('button',wt('save'),'primary');saveProfile.type='submit';profile.append(saveProfile);body.append(profile);
 profile.addEventListener('submit',async event=>{event.preventDefault();saveProfile.disabled=true;try{const values=Object.fromEntries(new FormData(profile));values.version=clinic.updated_at;await workspaceApi(clinicPath(clinic),'PUT',values);await loadAccount();render();}catch(error){status.textContent=error.message;saveProfile.disabled=false;}});
 body.append(element('h2',wt('members')),element('p',wt('memberNote')));
 const form=element('form',undefined,'member-form');const emailLabel=element('label',wt('email'));const email=element('input');email.type='email';email.required=true;email.maxLength=254;emailLabel.append(email);form.append(emailLabel);
 const roleLabel=element('label',wt('role'));const select=element('select');for(const value of ['staff','patient','admin']){const option=element('option',wt(value));option.value=value;select.append(option);}roleLabel.append(select);form.append(roleLabel);const save=element('button',wt('addMember'),'primary');save.type='submit';form.append(save);body.append(form);
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{await workspaceApi(clinicPath(clinic,'/members'),'POST',{email:email.value.trim(),role:select.value});await loadAccount();render();}catch(error){status.textContent=error.message;save.disabled=false;}});
 for(const member of members){const row=element('article',undefined,'billing-row');row.append(element('strong',member.email),element('span',wt(member.role)),button(wt('removeMember'),async()=>{try{await workspaceApi(clinicPath(clinic,'/members'),'POST',{email:member.email,role:'removed'});render();}catch(error){status.textContent=error.message;}},'secondary'));body.append(row);}
 body.append(element('h2',wt('audit')));if(!audit.length)body.append(element('p',wt('noChanges')));
 for(const entry of [...audit].reverse().slice(0,100)){const action=entry.action.split(':');const label=({create:'createAction',update:'updateAction',archive:'archiveAction',membership:'membershipAction',taken:'intakeAction',register:'registerAction',unregister:'unregisterAction'})[action[0]];body.append(element('p',localDate(entry.at,clinic.timezone)+' · '+wt(label||'action')+' · '+(action[1] in definitions?t(action[1]):action[1])+' · '+(entry.actor_email||entry.actor_id),'audit-row'));}
}
function exportCalendar(rows){
 const escape=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r/g,'');
 const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RehaConnect//Schedule//EN'];
 for(const row of rows)lines.push('BEGIN:VEVENT','UID:'+row.id+'@rehaconnect','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(row.starts_at),'DTEND:'+stamp(row.ends_at),'SUMMARY:'+escape(row.title),'LOCATION:'+escape(row.location),'DESCRIPTION:'+escape(row.body),'END:VEVENT');lines.push('END:VCALENDAR');
 const url=URL.createObjectURL(new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}));const link=element('a');link.href=url;link.download='rehaconnect.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function printMedicationPlan(clinic,rows){
 const popup=window.open('','_blank');if(!popup)return;popup.opener=null;popup.document.title=t('medications');popup.document.body.append(element('h1',clinic.name),element('h2',t('medications')),element('p',wt('medicationNote')));
 for(const row of rows.filter(r=>r.status==='published')){const patient=currentWorkspace?.data.patients?.find(p=>p.id===row.patient_id);popup.document.body.append(element('h3',[patient?.title,row.title].filter(Boolean).join(' · ')),element('p',[row.dose,row.time,row.body].filter(Boolean).join(' · ')));}
 popup.print();
}
let reminderTimer=null;const reminded=new Set();
async function enableReminders(clinic,status){
 if(!('Notification'in window)||await Notification.requestPermission()!=='granted'){status.textContent=wt('reminderDenied');return;}
 if(reminderTimer)clearInterval(reminderTimer);status.textContent=wt('reminderActive');
 reminderTimer=setInterval(async()=>{
  if(!accountData){clearInterval(reminderTimer);reminderTimer=null;return;}
  try{
   const [appointments,medications]=await Promise.all(['appointments','medications'].map(type=>workspaceApi(clinicPath(clinic,'/records/'+type))));
   const now=Date.now();for(const row of appointments){const delay=new Date(row.starts_at).getTime()-now;if(row.status==='published'&&delay>=0&&delay<=300000&&!reminded.has(row.id)){new Notification(row.title,{body:localDate(row.starts_at,clinic.timezone)});reminded.add(row.id);}}
   const clock=new Intl.DateTimeFormat('en-GB',{timeZone:clinic.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
   const date=new Intl.DateTimeFormat('en-CA',{timeZone:clinic.timezone}).format(new Date());
   for(const row of medications){const key='medication:'+row.id+':'+date;if(row.status==='published'&&row.time?.slice(0,5)===clock&&!reminded.has(key)){new Notification(row.title,{body:row.dose||''});reminded.add(key);}}
  }catch{/* Unavailable data does not generate reminders. */}
 },60000);
}
function renderFeedback(clinic,body){
 const form=element('form',undefined,'feedback-form');form.append(element('h2',wt('feedback')),element('p',wt('feedbackNote')));const input=element('textarea');input.required=true;input.maxLength=5000;input.setAttribute('aria-label',wt('feedback'));form.append(input);const submit=element('button',wt('sendFeedback'),'primary');submit.type='submit';const status=element('p');status.setAttribute('role','status');form.append(submit,status);body.append(form);
 form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await workspaceApi(clinicPath(clinic,'/feedback'),'POST',{body:input.value});input.value='';status.textContent=wt('feedbackSent');}catch(error){status.textContent=error.message;}finally{submit.disabled=false;}});
}
