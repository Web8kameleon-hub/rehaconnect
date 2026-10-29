'use strict';
(() => {
  const words = {
    en: {title:'Your Reha assistant',open:'Open assistant',close:'Close assistant',intro:'Ask about your workspace or rehabilitation documents.',notice:'Clinic documents and legal sources are not connected yet. Answers require review.',send:'Send',input:'Write your message',voice:'Dictate',stop:'Stop dictation',speak:'Read replies aloud',model:'Model',refresh:'Connect / refresh',waiting:'Connecting…',ready:'Connected to Lightning',signin:'Sign in and verify your email to use the assistant.',unavailable:'Assistant unavailable. Check Lightning and your workspace access.',noModels:'No model routes are configured.',thinking:'Preparing a reply…',failure:'No reply was confirmed. Check the connection before retrying.',voiceError:'Voice input is unavailable or permission was denied. You can continue typing.',review:'Model response · check against original sources',account:'Open account',micNotice:'Dictation uses your browser’s speech service, which may send audio to its provider. It starts only when you press Dictate.',context:'Conversation guidance only. No clinic records or authoritative legal sources are attached. Do not claim access to records or completed actions.'},
    de: {title:'Ihr Reha-Assistent',open:'Assistent öffnen',close:'Assistent schließen',intro:'Fragen zu Ihrem Arbeitsbereich oder Ihren Reha-Dokumenten.',notice:'Klinikdokumente und Rechtsquellen sind noch nicht angebunden. Antworten müssen geprüft werden.',send:'Senden',input:'Nachricht schreiben',voice:'Diktieren',stop:'Diktat beenden',speak:'Antworten vorlesen',model:'Modell',refresh:'Verbinden / aktualisieren',waiting:'Verbindung wird hergestellt…',ready:'Mit Lightning verbunden',signin:'Melden Sie sich an und bestätigen Sie Ihre E-Mail, um den Assistenten zu verwenden.',unavailable:'Assistent nicht verfügbar. Prüfen Sie Lightning und Ihren Arbeitsbereichszugang.',noModels:'Keine Modellrouten eingerichtet.',thinking:'Antwort wird vorbereitet…',failure:'Keine Antwort bestätigt. Prüfen Sie vor einem erneuten Versuch die Verbindung.',voiceError:'Spracheingabe nicht verfügbar oder Berechtigung verweigert. Schreiben ist weiterhin möglich.',review:'Modellantwort · anhand der Originalquellen prüfen',account:'Zum Konto',micNotice:'Das Diktat verwendet den Sprachdienst Ihres Browsers, der Audio an seinen Anbieter senden kann. Es startet erst nach Klick auf Diktieren.',context:'Nur Gesprächsorientierung. Keine Klinikakten oder maßgeblichen Rechtsquellen angehängt. Keinen Zugriff auf Akten oder ausgeführte Aktionen behaupten.'}
  };
  const root=document.createElement('aside'); root.className='reha-assistant';
  // Protective hands shelter a person; native vector artwork remains visible without a model.
  root.innerHTML=`<button class="ra-launch" type="button" aria-controls="ra-panel" aria-expanded="false"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 50V31c0-4 5-5 6-1l3 10-2-19c0-4 5-5 6-1l5 21c1 4 4 7 6 10v8H19L7 50Z" fill="#d8eeea" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M57 50V31c0-4-5-5-6-1l-3 10 2-19c0-4-5-5-6-1l-5 21c-1 4-4 7-6 10v8h12l12-9Z" fill="#d8eeea" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="32" cy="19" r="6" fill="currentColor"/><path d="M25 38v-8a7 7 0 0 1 14 0v8l-7 7-7-7Z" fill="currentColor"/><path d="M17 7c8-5 22-5 30 0" fill="none" stroke="#69b7a8" stroke-width="2" stroke-linecap="round"/></svg><span>Reha</span></button><section id="ra-panel" class="ra-panel" hidden><div class="ra-heading"><strong></strong><button type="button" class="ra-close">×</button></div><p class="ra-intro"></p><p class="ra-status" role="status"></p><a class="ra-account" href="#account"></a><div class="ra-settings"><label class="ra-model-label" for="ra-model"></label><select id="ra-model"></select><button type="button" class="ra-refresh"></button></div><label class="ra-response-label" for="ra-response-language">Response language / Antwortsprache</label><select id="ra-response-language"><option value="">Automatic / Automatisch</option><option value="sq">Shqip</option><option value="de">Deutsch</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option><option value="es">Español</option><option value="pt">Português</option><option value="nl">Nederlands</option><option value="pl">Polski</option><option value="tr">Türkçe</option><option value="ar">العربية</option><option value="uk">Українська</option></select><div class="ra-messages" role="log" aria-live="polite" aria-relevant="additions"></div><p class="ra-notice"></p><form class="ra-form"><label class="sr-only" for="ra-input"></label><textarea id="ra-input" maxlength="6000" rows="2" required></textarea><div class="ra-actions"><button type="button" class="ra-mic"></button><button type="submit" class="primary ra-send"></button></div><label class="ra-speech"><input type="checkbox"><span></span></label><small class="ra-mic-notice"></small></form></section>`;
  document.body.append(root);
  const q=s=>root.querySelector(s), panel=q('.ra-panel'), launcher=q('.ra-launch'), input=q('textarea'), models=q('#ra-model'), messages=q('.ra-messages');
  let csrf='', connected=false, busy=false, generation=0, recognition=null, listening=false;
  const w=()=>words[document.documentElement.lang==='de'?'de':'en'];
  function status(key){q('.ra-status').textContent=w()[key];}
  function controls(){input.disabled=busy||!connected; q('.ra-send').disabled=busy||!connected;models.disabled=busy; q('.ra-mic').disabled=busy||!connected||!('SpeechRecognition' in window||'webkitSpeechRecognition' in window);q('.ra-refresh').disabled=busy;}
  function labels(){const t=w();q('strong').textContent=t.title;launcher.setAttribute('aria-label',t.open);q('.ra-close').setAttribute('aria-label',t.close);q('.ra-intro').textContent=t.intro;q('.ra-notice').textContent=t.notice;q('.ra-model-label').textContent=t.model;q('.ra-refresh').textContent=t.refresh;q('.ra-account').textContent=t.account;q('.ra-form label').textContent=t.input;input.placeholder=t.input;q('.ra-mic').textContent=listening?t.stop:t.voice;q('.ra-send').textContent=t.send;q('.ra-speech span').textContent=t.speak;q('.ra-mic-notice').textContent=t.micNotice;}
  async function request(path,body){
    const options={credentials:'same-origin',signal:AbortSignal.timeout(205000)};
    if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-CSRF-Token':csrf};options.body=JSON.stringify(body);}
    const response=await fetch('/api/assistant'+path,options);const data=await response.json().catch(()=>({}));
    if(!response.ok){const e=new Error(data.error||'unavailable');e.key=data.code==='authentication_required'||response.status===401?'signin':'unavailable';throw e;}return data;
  }
  async function connect(){
    const version=++generation;connected=false;csrf='';controls();status('waiting');
    try{const data=await request('');if(version!==generation)return;models.replaceChildren();
      for(const model of data.models||[]){const o=document.createElement('option');o.value=model.id;o.textContent=model.model;models.append(o);}
      csrf=data.csrfToken||'';connected=!!csrf&&models.options.length>0;status(connected?'ready':'noModels');
    }catch(e){if(version===generation)status(e.key||'unavailable');}finally{if(version===generation)controls();}
  }
  function say(text,role){const p=document.createElement('p');p.className='ra-message ra-'+role;p.textContent=text;p.dir='auto';messages.append(p);messages.scrollTop=messages.scrollHeight;return p;}
  function toggle(open){panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));if(open){connect();q('.ra-close').focus();}else{recognition?.stop();window.speechSynthesis?.cancel();launcher.focus();}}
  launcher.addEventListener('click',()=>toggle(panel.hidden));q('.ra-close').addEventListener('click',()=>toggle(false));
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)toggle(false);});
  q('.ra-refresh').addEventListener('click',connect);
  q('form').addEventListener('submit',async e=>{
    e.preventDefault();const goal=input.value.trim();if(!goal||busy||!connected)return;
    recognition?.stop();busy=true;controls();const version=generation;say(goal,'user');input.value='';const pending=say(w().thinking,'reply');
    try{const data=await request('/conversation',{route:models.value,goal:`[RehaConnect; view=${document.querySelector('#view').value}; page=${location.hash.slice(1)||'dashboard'}] ${w().context}\n${goal}`,locale:document.documentElement.lang,...(q('#ra-response-language').value?{responseLanguage:q('#ra-response-language').value}:{}),allowModel:true});
      if(version!==generation){pending.remove();return;}const answer=data.text||data.Text;if(typeof answer!=='string'||!answer.trim())throw new Error('empty');
      pending.textContent=answer;pending.dir='auto';const note=document.createElement('small');note.textContent=w().review+(data.identity?.model?' · '+data.identity.model:'');pending.append(document.createElement('br'),note);
      if(q('.ra-speech input').checked&&'speechSynthesis' in window){window.speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(answer);speech.lang=q('#ra-response-language').value||(document.documentElement.lang==='de'?'de-DE':'en-GB');window.speechSynthesis.speak(speech);}
    }catch{if(version===generation){pending.textContent=w().failure;pending.classList.add('ra-error');}}
    finally{busy=false;controls();}
  });
  q('.ra-mic').addEventListener('click',()=>{
    if(listening){recognition?.stop();return;}const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech)return;
    recognition=new Speech();recognition.lang=q('#ra-response-language').value||(document.documentElement.lang==='de'?'de-DE':'en-GB');recognition.interimResults=false;
    recognition.onresult=e=>{input.value=(input.value+' '+e.results[0][0].transcript).trim().slice(0,6000);};
    recognition.onerror=()=>status('voiceError');recognition.onend=()=>{listening=false;labels();};
    try{recognition.start();listening=true;labels();}catch{status('voiceError');}
  });
  q('.ra-speech input').disabled=!('speechSynthesis' in window);
  q('.ra-speech input').addEventListener('change',e=>{if(!e.target.checked)window.speechSynthesis?.cancel();});
  document.querySelector('#language').addEventListener('change',()=>{recognition?.stop();window.speechSynthesis?.cancel();labels();if(!panel.hidden&&!busy)connect();});
  document.querySelector('#view').addEventListener('change',()=>{generation++;messages.replaceChildren();recognition?.stop();window.speechSynthesis?.cancel();if(!panel.hidden)connect();});
  // Session changes discard the visible transcript and stale response context.
  window.addEventListener('reha-account-changed',()=>{generation++;messages.replaceChildren();if(!panel.hidden)connect();});
  q('#ra-response-language').addEventListener('change',()=>{recognition?.stop();window.speechSynthesis?.cancel();});
  labels();controls();
})();
