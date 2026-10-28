'use strict';
window.rehaCsrf = '';
let recoveryToken='';
const recoveryMatch=location.hash.match(/^#(?:verify|reset)=([^&]+)$/);
if(recoveryMatch){try{recoveryToken=decodeURIComponent(recoveryMatch[1]);}catch{}history.replaceState(null,'',location.pathname+'#account');}
else if(location.pathname==='/account'&&!location.hash)history.replaceState(null,'','/account#account');
else if(location.pathname==='/dashboard'&&new URLSearchParams(location.search).has('purchase'))history.replaceState(null,'','/dashboard#billing');
let accountData = null;
let accountLoading = false;
let clinicRows = [];
let accountRequest = 0;
const integrationText = {
 en:{account:'Account',billing:'Billing',email:'Email address',password:'Password',login:'Sign in',register:'Create account',logout:'Sign out',recover:'Reset password',resend:'Resend verification email',verify:'Verify email',reset:'Set new password',token:'Recovery or verification token',accountIntro:'Sign in with your account. New accounts require email verification.',billingIntro:'Subscriptions and payments are managed securely through Stripe.',signedIn:'Signed in',signedOut:'Sign in to continue',serviceError:'The service is unavailable. Your request was not confirmed.',invalid:'Your request could not be accepted. Check your details or recovery link.',emailNotice:'Check your email for the next step. Delivery depends on the configured email service.',loginFailed:'Sign-in failed. Check your credentials and verify your email.',noClinic:'Create a clinic before starting billing.',chooseClinic:'Clinic',plans:'Available plans',noPlans:'No purchase plans are configured.',subscribe:'Continue to Stripe',manageBilling:'Manage billing in Stripe',entitlements:'Your subscriptions',noEntitlements:'No subscription has been reported for this account.',expires:'Valid until',working:'Please wait…',accountReady:'Your account is connected.',refresh:'Refresh',pendingPayment:'Returning from Stripe does not confirm payment. Subscription status is reported by the server.',clinicSaved:'Clinic saved.',clinicIntro:'Sign in before creating a clinic. Your clinic is saved in Longo and linked to your account.'},
 de:{account:'Konto',billing:'Abrechnung',email:'E-Mail-Adresse',password:'Passwort',login:'Anmelden',register:'Konto erstellen',logout:'Abmelden',recover:'Passwort zurücksetzen',resend:'Bestätigungs-E-Mail erneut senden',verify:'E-Mail bestätigen',reset:'Neues Passwort festlegen',token:'Wiederherstellungs- oder Bestätigungstoken',accountIntro:'Melden Sie sich mit Ihrem Konto an. Neue Konten erfordern eine E-Mail-Bestätigung.',billingIntro:'Abonnements und Zahlungen werden sicher über Stripe verwaltet.',signedIn:'Angemeldet',signedOut:'Melden Sie sich an, um fortzufahren',serviceError:'Der Dienst ist nicht verfügbar. Ihre Anfrage wurde nicht bestätigt.',invalid:'Ihre Anfrage wurde nicht angenommen. Prüfen Sie Ihre Angaben oder den Wiederherstellungslink.',emailNotice:'Prüfen Sie Ihre E-Mails für den nächsten Schritt. Die Zustellung hängt vom eingerichteten E-Mail-Dienst ab.',loginFailed:'Anmeldung fehlgeschlagen. Prüfen Sie Ihre Zugangsdaten und bestätigen Sie Ihre E-Mail.',noClinic:'Erstellen Sie vor der Abrechnung eine Klinik.',chooseClinic:'Klinik',plans:'Verfügbare Tarife',noPlans:'Es sind keine Tarife zum Kauf eingerichtet.',subscribe:'Weiter zu Stripe',manageBilling:'Abrechnung bei Stripe verwalten',entitlements:'Ihre Abonnements',noEntitlements:'Für dieses Konto wurde kein Abonnement gemeldet.',expires:'Gültig bis',working:'Bitte warten…',accountReady:'Ihr Konto ist verbunden.',refresh:'Aktualisieren',pendingPayment:'Die Rückkehr von Stripe bestätigt keine Zahlung. Der Abonnementstatus wird vom Server gemeldet.',clinicSaved:'Klinik gespeichert.',clinicIntro:'Melden Sie sich an, bevor Sie eine Klinik erstellen. Ihre Klinik wird in Longo gespeichert und mit Ihrem Konto verknüpft.'}
};
const it = key => integrationText[language][key] || key;
Object.assign(integrationText.en,{emailUnavailable:'Your account was saved, but the verification email could not be sent. Configure the email service, then request a new verification email. Sign-in remains blocked.',emailUnverified:'Your email is not verified. Use the verification link or request a new verification email.'});
Object.assign(integrationText.de,{emailUnavailable:'Ihr Konto wurde gespeichert, aber die Bestätigungs-E-Mail konnte nicht gesendet werden. Richten Sie den E-Mail-Dienst ein und fordern Sie eine neue Bestätigungs-E-Mail an. Die Anmeldung bleibt gesperrt.',emailUnverified:'Ihre E-Mail ist nicht bestätigt. Verwenden Sie den Bestätigungslink oder fordern Sie eine neue Bestätigungs-E-Mail an.'});
async function accountFetch(path, body) {
  const options = {credentials:'same-origin',signal:AbortSignal.timeout(30000),headers:{}};
  if(body !== undefined) {
    const csrfResponse = await fetch('/api/account/csrf',{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    if(!csrfResponse.ok)throw new Error('serviceError');
    const csrf = await csrfResponse.json();
    options.method='POST'; options.headers={'Content-Type':'application/json','X-CSRF-Token':csrf.csrfToken};options.body=JSON.stringify(body);
  }
  const response = await fetch(path,options);
  if(!response.ok){
    const error=await response.json().catch(()=>({}));
    if(error.code==='verification_email_unavailable')throw new Error('emailUnavailable');
    if(error.code==='email_not_verified')throw new Error('emailUnverified');
    throw new Error(response.status===401 ? 'loginFailed' : response.status===400||response.status===403 ? 'invalid' : 'serviceError');
  }
  return response.json();
}
async function loadAccount() {
  if(accountLoading)return;
  accountLoading=true;
  try {
    const response=await fetch('/api/account',{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    if(response.status===401){accountData=null;window.rehaCsrf='';clinicRows=[];return;}
    if(!response.ok)throw new Error('serviceError');
    accountData=await response.json();
    const identity=await fetch('/api/auth/me',{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    if(!identity.ok)throw new Error('serviceError');
    window.rehaCsrf=(await identity.json()).csrfToken;
    const clinics=await fetch('/api/clinics',{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
    if(!clinics.ok)throw new Error('serviceError');
    clinicRows=await clinics.json();
  } finally {accountLoading=false;}
}
window.refreshRehaAccount = async () => {await loadAccount();render();};
window.renderIntegration = page => {
  if(!['account','billing'].includes(page))return;
  const content=document.querySelector('#content');
  content.innerHTML=heading(it(page),it(page==='account'?'accountIntro':'billingIntro'))+`<section class="panel integration-panel"><div id="integration-body"></div><p id="integration-status" role="status" aria-live="polite"></p></section>`;
  const host=document.querySelector('#integration-body');
  const status=document.querySelector('#integration-status');
  if(accountLoading){status.textContent=it('working');return;}
  if(page==='account')renderAccount(host,status);
  else renderBilling(host,status);
};
function renderAccount(host,status) {
  if(accountData) {
    const title=document.createElement('h2');title.textContent=it('signedIn');host.append(title);
    const email=document.createElement('p');email.textContent=accountData.email;host.append(email);
    const logout=document.createElement('button');logout.className='primary';logout.textContent=it('logout');host.append(logout);
    logout.addEventListener('click',async()=>{logout.disabled=true;try{await accountFetch('/api/account/logout',{});accountData=null;clinicRows=[];window.rehaCsrf='';render();}catch{status.textContent=it('serviceError');logout.disabled=false;}});
    return;
  }
  host.innerHTML=`<form id="account-form"><label>${it('email')}<input name="email" type="email" autocomplete="username" maxlength="320" required></label><label>${it('password')}<input name="password" type="password" autocomplete="current-password" maxlength="128" required></label><div class="integration-actions"><button class="primary" type="submit">${it('login')}</button><button type="button" data-action="register">${it('register')}</button><button type="button" data-action="request-reset">${it('recover')}</button><button type="button" data-action="request-verification">${it('resend')}</button></div><label>${it('token')}<input name="token" autocomplete="off" maxlength="512"></label><div class="integration-actions"><button type="button" data-action="verify">${it('verify')}</button><button type="button" data-action="reset">${it('reset')}</button></div></form>`;
  const form=host.querySelector('form');
  if(recoveryToken){form.elements.token.value=recoveryToken;recoveryToken='';}
  async function submit(action) {
    const email=form.elements.email.value.trim(),password=form.elements.password.value,token=form.elements.token.value.trim();
    if(['login','register','request-reset','request-verification'].includes(action)&&(!email||!form.elements.email.checkValidity())){form.elements.email.reportValidity();return;}
    if(['login','register','reset'].includes(action)&&!password){form.elements.password.reportValidity();return;}
    if(['verify','reset'].includes(action)&&!token){status.textContent=it('invalid');return;}
    form.querySelectorAll('button').forEach(button=>button.disabled=true);status.textContent=it('working');
    try {
      await accountFetch('/api/account/'+action,{email,password,token});
      form.elements.password.value='';form.elements.token.value='';
      if(action==='login'){await loadAccount();render();}
      else status.textContent=it(['register','request-reset','request-verification'].includes(action)?'emailNotice':'accountReady');
    } catch(error){status.textContent=it(error.message in integrationText[language]?error.message:'serviceError');}
    finally {form.querySelectorAll('button').forEach(button=>button.disabled=false);}
  }
  form.addEventListener('submit',event=>{event.preventDefault();submit('login');});
  form.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.action)));
}
function renderBilling(host,status) {
  if(!accountData){host.innerHTML=`<p>${it('signedOut')}</p><a class="primary" href="#account">${it('login')}</a>`;return;}
  const note=document.createElement('p');note.textContent=it('pendingPayment');host.append(note);
  const title=document.createElement('h2');title.textContent=it('entitlements');host.append(title);
  const entries=accountData.entitlements||[];
  if(!entries.length){const empty=document.createElement('p');empty.textContent=it('noEntitlements');host.append(empty);}
  for(const entry of entries){
    const row=document.createElement('article');row.className='billing-row';
    const tier=document.createElement('strong');tier.textContent=entry.tier||'';
    const state=document.createElement('p');state.textContent=entry.state||entry.subscriptionStatus||'';
    const expires=document.createElement('p');expires.textContent=it('expires')+': '+new Intl.DateTimeFormat(language==='de'?'de-DE':'en-GB').format(new Date(entry.expires*1000));
    row.append(tier,state,expires);host.append(row);
  }
  const plansTitle=document.createElement('h2');plansTitle.textContent=it('plans');host.append(plansTitle);
  if(!clinicRows.length){const noClinic=document.createElement('p');noClinic.textContent=it('noClinic');host.append(noClinic);}
  const plans=accountData.plans||[];
  if(!plans.length){const empty=document.createElement('p');empty.textContent=it('noPlans');host.append(empty);}
  for(const plan of plans){
    const row=document.createElement('article');row.className='billing-row';const title=document.createElement('strong');title.textContent=plan.tier;row.append(title);
    const buy=document.createElement('button');buy.className='primary';buy.textContent=it('subscribe');buy.disabled=!clinicRows.length||accountData.canPurchase===false;
    buy.addEventListener('click',()=>redirectStripe('/api/account/checkout',{priceId:plan.priceId},'checkout.stripe.com',buy,status));row.append(buy);host.append(row);
  }
  const manage=document.createElement('button');manage.textContent=it('manageBilling');manage.className='primary';
  manage.addEventListener('click',()=>redirectStripe('/api/account/billing',{},'billing.stripe.com',manage,status));host.append(manage);
  const refresh=document.createElement('button');refresh.textContent=it('refresh');host.append(refresh);
  refresh.addEventListener('click',async()=>{refresh.disabled=true;try{await loadAccount();render();}catch{status.textContent=it('serviceError');refresh.disabled=false;}});
}
async function redirectStripe(path,body,expectedHost,button,status) {
  button.disabled=true;status.textContent=it('working');
  try {const result=await accountFetch(path,body);const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!==expectedHost)throw new Error();location.assign(url.href);}
  catch{status.textContent=it('serviceError');button.disabled=false;}
}
window.addEventListener('DOMContentLoaded',async()=>{const version=++accountRequest;try{await loadAccount();if(version===accountRequest)render();}catch{if(['account','billing'].includes(currentPage()))document.querySelector('#integration-status').textContent=it('serviceError');}});
