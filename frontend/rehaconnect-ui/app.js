'use strict';
const translations = {
  en: {
    tagline:'CONNECTED CARE. EVERY DAY.', workspace:'Your clinic workspace', setupRequired:'Setup required', workspaceLabel:'Workspace', dashboard:'Overview', appointments:'Appointments', patients:'Patients', medications:'Medication plan', events:'Events', documents:'Documents', information:'Clinic information', settings:'Settings', clinicView:'Clinic portal', patientView:'Patient view', footer:'A clearer view of your rehabilitation journey.', overviewTitle:'A good day starts with clarity.', overviewIntro:'Your clinic, your schedules, and your information — together in one place.', patientTitle:'Your day, at a glance.', patientIntro:'Appointments, clinic updates, and useful information for your stay.', welcomeTitle:'Welcome to RehaConnect', welcomeIntro:'Set up your clinic to begin connecting your team and patients. Your workspace starts with your own information.', setupBadge:'Let’s get started', createClinic:'Create your clinic', patientCount:'Active patients', appointmentCount:'Today’s appointments', eventCount:'Upcoming events', messageCount:'Clinic updates', noSource:'Not connected', todaySchedule:'Today’s schedule', noAppointments:'Your schedule will appear here', noAppointmentsIntro:'No schedule source is connected. Appointments will be shown once a clinic and patient account are connected.', firstSteps:'Your first steps', step1:'Create your clinic', step1Intro:'Add the clinic name, address, and time zone.', step2:'Connect your team', step2Intro:'Staff access requires the authentication integration.', step3:'Bring your day together', step3Intro:'Connect scheduling to share appointments with patients.', privacyNote:'Only information entered by your clinic or returned by connected services will appear here.', clinicIntro:'Clinic creation is currently unavailable. Storage, authentication, and compliance integrations must be completed before this form can save.', clinicName:'Clinic name', address:'Address', timezone:'Time zone', saveClinic:'Save clinic', saving:'Saving…', saveSuccess:'The clinic service confirmed your request.', saveError:'The clinic could not be saved. Check the service configuration and try again.', unavailable:'This module is not connected yet', unavailableIntro:'This view is ready for a service integration. No records are available until the clinic, identity, and data services are connected.', returnOverview:'Back to overview', settingsTitle:'Workspace settings', settingsIntro:'Choose your language and portal view using the controls above.', patientSetup:'Your clinic connection is pending', patientSetupIntro:'Your personal schedule and information will become available after your clinic connects your account.', pending:'Connection pending', unavailableMetric:'Unavailable', formInvalid:'Complete all fields with valid clinic information.', requestTimeout:'The service did not respond in time. Saving could not be confirmed; check before trying again.'
  },
  de: {
    tagline:'VERBUNDEN. JEDEN TAG.', workspace:'Ihr Klinikbereich', setupRequired:'Einrichtung erforderlich', workspaceLabel:'Arbeitsbereich', dashboard:'Übersicht', appointments:'Termine', patients:'Patienten', medications:'Medikamentenplan', events:'Veranstaltungen', documents:'Dokumente', information:'Klinikinformationen', settings:'Einstellungen', clinicView:'Klinikportal', patientView:'Patientenansicht', footer:'Mehr Überblick für Ihre Rehabilitation.', overviewTitle:'Ein guter Tag beginnt mit Klarheit.', overviewIntro:'Ihre Klinik, Ihre Termine und Ihre Informationen — an einem Ort.', patientTitle:'Ihr Tag auf einen Blick.', patientIntro:'Termine, Klinikmitteilungen und hilfreiche Informationen für Ihren Aufenthalt.', welcomeTitle:'Willkommen bei RehaConnect', welcomeIntro:'Richten Sie Ihre Klinik ein, um Ihr Team und Ihre Patienten zu verbinden. Ihr Arbeitsbereich beginnt mit Ihren eigenen Informationen.', setupBadge:'Die ersten Schritte', createClinic:'Klinik erstellen', patientCount:'Aktive Patienten', appointmentCount:'Heutige Termine', eventCount:'Kommende Veranstaltungen', messageCount:'Klinikmitteilungen', noSource:'Nicht verbunden', todaySchedule:'Heutiger Tagesplan', noAppointments:'Hier erscheint Ihr Tagesplan', noAppointmentsIntro:'Es ist keine Terminquelle verbunden. Termine werden angezeigt, sobald eine Klinik und ein Patientenkonto verbunden sind.', firstSteps:'Ihre ersten Schritte', step1:'Klinik erstellen', step1Intro:'Ergänzen Sie Klinikname, Adresse und Zeitzone.', step2:'Team verbinden', step2Intro:'Der Mitarbeiterzugang erfordert die Anbindung der Authentifizierung.', step3:'Den Tag gemeinsam planen', step3Intro:'Verbinden Sie die Terminplanung, um Termine mit Patienten zu teilen.', privacyNote:'Hier erscheinen ausschließlich Angaben Ihrer Klinik oder Daten angebundener Dienste.', clinicIntro:'Das Erstellen einer Klinik ist derzeit nicht verfügbar. Speicher-, Authentifizierungs- und Compliance-Anbindungen müssen vor dem Speichern fertiggestellt werden.', clinicName:'Klinikname', address:'Adresse', timezone:'Zeitzone', saveClinic:'Klinik speichern', saving:'Wird gespeichert…', saveSuccess:'Der Klinikdienst hat Ihre Anfrage bestätigt.', saveError:'Die Klinik konnte nicht gespeichert werden. Prüfen Sie die Dienstkonfiguration und versuchen Sie es erneut.', unavailable:'Dieses Modul ist noch nicht verbunden', unavailableIntro:'Diese Ansicht ist für eine Dienstanbindung vorbereitet. Daten sind erst verfügbar, wenn Klinik-, Identitäts- und Datendienste verbunden sind.', returnOverview:'Zurück zur Übersicht', settingsTitle:'Einstellungen des Arbeitsbereichs', settingsIntro:'Wählen Sie oben Ihre Sprache und die Portalansicht.', patientSetup:'Ihre Klinikverbindung steht noch aus', patientSetupIntro:'Ihr persönlicher Tagesplan und Ihre Informationen werden verfügbar, sobald Ihre Klinik Ihr Konto verbindet.', pending:'Verbindung ausstehend', unavailableMetric:'Nicht verfügbar', formInvalid:'Füllen Sie alle Felder mit gültigen Klinikangaben aus.', requestTimeout:'Der Dienst hat nicht rechtzeitig geantwortet. Das Speichern konnte nicht bestätigt werden; prüfen Sie dies vor einem erneuten Versuch.'
  }
};
Object.assign(translations.en,{account:'Account',billing:'Billing',meals:'Meal plan',messages:'Announcements',clinicIntro:'Sign in before creating a clinic. Your clinic is saved in Longo and linked to your account.'});
Object.assign(translations.de,{account:'Konto',billing:'Abrechnung',meals:'Speiseplan',messages:'Mitteilungen',clinicIntro:'Melden Sie sich an, bevor Sie eine Klinik erstellen. Ihre Klinik wird in Longo gespeichert und mit Ihrem Konto verknüpft.'});
let language = 'en';
try { language = localStorage.getItem('rehaconnect.language') || 'en'; } catch {}
if (!translations[language]) language = 'en';
let portal = 'clinic';
const modules = [['dashboard','▦'],['appointments','▤'],['patients','♙'],['medications','⊕'],['events','♧'],['documents','▱'],['information','ⓘ'],['settings','⚙']];
const t = key => translations[language][key] || key;
modules.push(['meals','▤'],['messages','▧'],['account','♙'],['billing','€']);
const content = document.querySelector('#content');
const dialog = document.querySelector('#clinic-dialog');
const formStatus = document.querySelector('#form-status');
let busy = false;
let statusKey = '';
function currentPage() {
  const page = location.hash.slice(1);
  return modules.some(([key]) => key === page) && !(portal === 'patient' && page === 'patients') ? page : 'dashboard';
}
function heading(title, intro) {
  return `<p class="eyebrow">${t(portal === 'clinic' ? 'clinicView' : 'patientView')}</p><div class="page-heading"><div><h1>${title}</h1><p>${intro}</p></div><span class="date">${new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}</span></div>`;
}
function render() {
  document.documentElement.lang = language;
  document.querySelector('#language').value = language;
  document.querySelector('#view').innerHTML = `<option value="clinic">${t('clinicView')}</option><option value="patient">${t('patientView')}</option>`;
  document.querySelector('#view').value = portal;
  const page = currentPage();
  document.querySelector('#breadcrumb').textContent = t(page);
  document.querySelector('#navigation').setAttribute('aria-label', t('workspaceLabel'));
  document.querySelector('#navigation').innerHTML = modules.filter(([key]) => !(portal === 'patient' && key === 'patients')).map(([key,icon]) => `<a href="#${key}" ${key === page ? 'class="active" aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span>${t(key)}</a>`).join('');
  if (page === 'dashboard') {
    content.innerHTML = heading(t(portal === 'clinic' ? 'overviewTitle' : 'patientTitle'),t(portal === 'clinic' ? 'overviewIntro' : 'patientIntro')) +
    `<section class="welcome"><div><span class="pill">${t(portal === 'clinic' ? 'setupBadge' : 'pending')}</span><h2>${t(portal === 'clinic' ? 'welcomeTitle' : 'patientSetup')}</h2><p>${t(portal === 'clinic' ? 'welcomeIntro' : 'patientSetupIntro')}</p></div><div class="welcome-art" aria-hidden="true">✳</div></section>` +
    `<section class="cards">${[['patientCount','♙'],['appointmentCount','▤'],['eventCount','♧'],['messageCount','♧']].filter(([key]) => portal === 'clinic' || key !== 'patientCount').map(([key,icon]) => `<article class="card"><div class="metric-top"><span>${t(key)}</span><span class="metric-icon" aria-hidden="true">${icon}</span></div><div class="metric-value" aria-label="${t('unavailableMetric')}">—</div><span class="metric-note">${t('noSource')}</span></article>`).join('')}</section>` +
    `<div class="grid"><section class="panel"><div class="panel-heading"><h2>${t('todaySchedule')}</h2><span class="subtle">${t('pending')}</span></div><div class="empty"><div class="empty-icon" aria-hidden="true">▤</div><h3>${t('noAppointments')}</h3><p>${t('noAppointmentsIntro')}</p></div></section><section class="panel"><div class="panel-heading"><h2>${t('firstSteps')}</h2></div>${[1,2,3].map(n=>`<div class="step"><span class="step-number">${n}</span><div><strong>${t('step'+n)}</strong><p>${t('step'+n+'Intro')}</p>${n===1 && portal==='clinic' ? `<button class="text-button" id="open-clinic">${t('createClinic')} →</button>` : ''}</div></div>`).join('')}</section></div><div class="notice"><span aria-hidden="true">◇</span><span>${t('privacyNote')}</span></div>`;
  } else {
    content.innerHTML = heading(t(page),t(page === 'settings' ? 'settingsIntro' : 'unavailableIntro')) + `<section class="panel"><div class="empty"><div class="empty-icon" aria-hidden="true">${modules.find(([key])=>key===page)[1]}</div><h3>${t(page==='settings' ? 'settingsTitle' : 'unavailable')}</h3><p>${t(page==='settings' ? 'settingsIntro' : 'unavailableIntro')}</p><a class="primary" href="#dashboard">${t('returnOverview')}</a></div></section>`;
  }
  document.querySelectorAll('[data-i18n]').forEach(el => {el.textContent = t(el.dataset.i18n);});
  document.querySelector('#save-clinic').textContent = t(busy ? 'saving' : 'saveClinic');
  formStatus.textContent = statusKey ? t(statusKey) : '';
  document.querySelector('#open-clinic')?.addEventListener('click', () => {statusKey='';formStatus.textContent='';dialog.showModal();});
  window.renderIntegration?.(page);
}
document.querySelector('#language').addEventListener('change',event => {language=event.target.value;try {localStorage.setItem('rehaconnect.language',language);} catch {}render();});
document.querySelector('#view').addEventListener('change',event => {portal=event.target.value;if(dialog.open)dialog.close();render();});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
window.addEventListener('hashchange',render);
document.querySelector('#clinic-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const form = event.currentTarget;
  const data = Object.fromEntries([...new FormData(form)].map(([key,value])=>[key,value.trim()]));
  if(Object.values(data).some(value=>!value)){statusKey='formInvalid';formStatus.textContent=t(statusKey);return;}
  try {new Intl.DateTimeFormat('en',{timeZone:data.timezone});} catch {statusKey='formInvalid';formStatus.textContent=t(statusKey);return;}
  busy=true;statusKey='';document.querySelector('#save-clinic').disabled=true;render();
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),15000);
  try {
    const response = await fetch('/api/clinics',{method:'POST',headers:{'Content-Type':'application/json','X-Reha-CSRF':window.rehaCsrf||''},body:JSON.stringify(data),signal:controller.signal});
    if(!response.ok) throw new Error('Clinic service rejected request');
    const saved = await response.json();
    if(!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid service response');
    statusKey='saveSuccess';form.reset();
  } catch(error) {statusKey=error.name==='AbortError' ? 'requestTimeout' : 'saveError';}
  finally {clearTimeout(timer);busy=false;document.querySelector('#save-clinic').disabled=false;render();}
});
render();
