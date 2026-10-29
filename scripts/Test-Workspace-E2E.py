"""Real browser + Lightning + Java Longo + local SMTP, all on isolated test data.

No request interception, fake authentication or application seed data. SMTP mail
is delivered only to the in-process test mailbox, never to an external address.
"""
import email
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socketserver
import subprocess
import threading
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent
RUN=ROOT/'.cache'/'workspace-e2e'
RUN.mkdir(parents=True,exist_ok=True)
DATA=RUN/('run-'+secrets.token_hex(6))
DATA.mkdir()
MAIL=[]
class Mailbox(socketserver.StreamRequestHandler):
    def handle(self):
        def reply(value):self.wfile.write((value+'\r\n').encode());self.wfile.flush()
        reply('220 localhost isolated test SMTP')
        while True:
            try:raw=self.rfile.readline()
            except (ConnectionError,OSError):return
            if not raw:return
            command=raw.decode(errors='replace').strip().upper()
            if command.startswith(('EHLO','HELO')):reply('250-localhost\r\n250 OK')
            elif command.startswith('AUTH LOGIN'):
                reply('334 VXNlcm5hbWU6');self.rfile.readline();reply('334 UGFzc3dvcmQ6');self.rfile.readline();reply('235 Authenticated')
            elif command.startswith('AUTH PLAIN'):reply('235 Authenticated')
            elif command=='DATA':
                reply('354 Send data');lines=[]
                while True:
                    line=self.rfile.readline()
                    if not line or line==b'.\r\n':break
                    lines.append(line[1:] if line.startswith(b'..') else line)
                MAIL.append(email.message_from_bytes(b''.join(lines)));reply('250 Accepted by isolated test mailbox')
            elif command=='QUIT':reply('221 Bye');return
            else:reply('250 OK')

def ready(url,process):
    for _ in range(150):
        if process.poll() is not None:raise RuntimeError('Test process exited; see isolated logs under '+str(DATA))
        try:
            with urllib.request.urlopen(url,timeout=1) as response:
                if response.status==200:return
        except Exception:time.sleep(.15)
    raise RuntimeError('Readiness timeout: '+url)

def token_for(address):
    for _ in range(100):
        for message in reversed(MAIL):
            if address.lower() not in str(message.get('To','')).lower():continue
            text='\n'.join(part.get_payload(decode=True).decode(errors='replace') for part in message.walk() if part.get_content_type()=='text/plain')
            found=re.search(r'#verify=([A-Fa-f0-9]{64})',text)
            if found:return found.group(1)
        time.sleep(.1)
    raise AssertionError('Verification mail not received in isolated mailbox')

def main():
    config=json.loads((ROOT/'ports.json').read_text(encoding='utf-8-sig'))
    for name,port in [('longo',4150),('rehaconnect-api',4151),('lightning-spp',4152),('frontend',4153)]:
        config['services'][name]={'host':'127.0.0.1','port':port,'url':f'http://127.0.0.1:{port}'}
    path=DATA/'ports.json';path.write_text(json.dumps(config),encoding='utf-8')
    env=os.environ.copy()
    # Never inherit production billing/email credentials into a test runtime.
    for key in list(env):
        if key.startswith(('STRIPE_','SMTP_','RESEND_','LSPP_')) or key in ['DOTNET_ENVIRONMENT','ASPNETCORE_ENVIRONMENT']:env.pop(key,None)
    env.update(LONGO_HOST='127.0.0.1',LONGO_PORT='4150',LONGO_STORAGE_PATH=str(DATA/'accounts.bin'),LONGO_URL='http://127.0.0.1:4150',
        LSPP_BIND_HOST='127.0.0.1',LSPP_DATA_DIR=str(DATA/'lightning'),LSPP_PUBLIC_ORIGIN='http://127.0.0.1:4153',
        LIGHTNING_INTERNAL_URL='http://127.0.0.1:4152',REHACONNECT_PUBLIC_URL='http://127.0.0.1:4153',
        REHACONNECT_STORAGE_PATH=str(DATA/'clinics.bin'),REHACONNECT_PRODUCTION='false',
        SMTP_HOST='127.0.0.1',SMTP_PORT='4154',SMTP_USER='isolated-test',SMTP_PASSWORD=secrets.token_urlsafe(24),SMTP_FROM='test@example.test',SMTP_USE_SSL='false',
        LSPP_LICENSE_SIGNING_KEY=secrets.token_urlsafe(48))
    processes=[];logs=[];mailbox=socketserver.ThreadingTCPServer(('127.0.0.1',4154),Mailbox)
    mailbox.daemon_threads=True;threading.Thread(target=mailbox.serve_forever,daemon=True).start()
    def start(name,args,cwd=ROOT):
        log=open(DATA/(name+'.log'),'w',encoding='utf-8');logs.append(log)
        process=subprocess.Popen([str(arg) for arg in args],cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
        processes.append(process);return process
    browser=None
    try:
        longo=start('longo',['java','--add-modules','jdk.httpserver','-cp',ROOT/'.cache/longo-classes','com.clisonix.longo.LongoServer']);ready('http://127.0.0.1:4150/health',longo)
        source=ROOT/'services/lightning-spp-3.14/source'
        lightning=start('lightning',[ROOT/'.cache/dotnet/dotnet.exe',source/'bin/Debug/net10.0/wwwmmm.dll','serve','4152'],source);ready('http://127.0.0.1:4152/api/health',lightning)
        api=start('api',['java','-jar',ROOT/'backend/rehaconnect-api/target/rehaconnect-api-1.0.0.jar','--server.port=4151','--debug=false','--logging.level.root=WARN']);ready('http://127.0.0.1:4151/',api)
        frontend=start('frontend',['node',ROOT/'frontend/rehaconnect-ui/server.cjs',path]);ready('http://127.0.0.1:4153/',frontend)
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True,executable_path=playwright.chromium.executable_path)
            errors=[]
            owner_context=browser.new_context();owner_page=owner_context.new_page();owner_page.on('pageerror',lambda error:errors.append(str(error)))
            password=secrets.token_urlsafe(24)
            def signup(page,address):
                page.goto('http://127.0.0.1:4153/#account');page.locator('#account-form').wait_for()
                page.locator('[name=email]').fill(address);page.locator('[name=password]').fill(password)
                with page.expect_response(lambda response:response.url.endswith('/api/account/register')) as registration:
                    page.get_by_role('button',name='Create account',exact=True).click()
                if registration.value.status>=400:raise AssertionError('Registration failed: '+str(registration.value.status)+' '+registration.value.text())
                page.get_by_text('Check your email for the next step.',exact=False).wait_for()
                token=token_for(address)
                page.goto('http://127.0.0.1:4153/account#verify='+token)
                page.locator('[name=token]').wait_for();page.get_by_role('button',name='Verify email',exact=True).click()
                page.get_by_text('Email verified. Sign in with your password.',exact=True).wait_for()
                page.locator('[name=email]').fill(address);page.locator('[name=password]').fill(password)
                page.get_by_role('button',name='Sign in',exact=True).click();page.get_by_role('button',name='Sign out',exact=True).wait_for()
            owner_email='owner-'+secrets.token_hex(5)+'@example.test';patient_email='patient-'+secrets.token_hex(5)+'@example.test'
            signup(owner_page,owner_email)
            owner_page.goto('http://127.0.0.1:4153/#dashboard')
            owner_page.get_by_role('button',name='Create clinic',exact=True).click()
            owner_page.locator('#clinic-form [name=name]').fill('Isolated browser test clinic')
            owner_page.locator('#clinic-form [name=address]').fill('Isolated test address')
            owner_page.get_by_role('button',name='Save clinic',exact=True).click()
            owner_page.get_by_text('The clinic service confirmed your request.',exact=True).wait_for()
            owner_page.locator('#close-dialog').click()
            owner_page.get_by_role('heading',name='Clinic workspace',exact=True).wait_for()
            print('PASS real signup, SMTP verification, login and clinic creation')
            def create_record(page,module,title,fields):
                page.goto('http://127.0.0.1:4153/#'+module)
                page.get_by_role('button',name='Add',exact=True).click()
                form=page.locator('.record-dialog form');form.locator('[name=title]').fill(title)
                for key,value in fields.items():
                    locator=form.locator('[name='+key+']')
                    if key=='patient_id':locator.select_option(label=value)
                    elif key=='file':locator.set_input_files(value)
                    else:locator.fill(value)
                form.locator('[name=status]').select_option('published')
                form.get_by_role('button',name='Save',exact=True).click()
                page.locator('.record-dialog').wait_for(state='detached')
                page.get_by_role('heading',name=title,exact=True).wait_for()
            create_record(owner_page,'patients','Isolated patient',{'email':patient_email})
            create_record(owner_page,'messages','Browser test announcement',{'body':'Created by a real form in an isolated test.'})
            create_record(owner_page,'appointments','Browser test appointment',{'patient_id':'Isolated patient','starts_at':'2030-01-01T10:00','ends_at':'2030-01-01T11:00','location':'Isolated test room'})
            with owner_page.expect_download() as calendar_download:owner_page.get_by_role('button',name='Export calendar',exact=True).click()
            assert 'Browser test appointment' in Path(calendar_download.value.path()).read_text(encoding='utf-8')
            create_record(owner_page,'meals','Browser test meal',{'date':'2030-01-01','body':'Isolated meal content'})
            create_record(owner_page,'medications','Clinic-provided test plan',{'patient_id':'Isolated patient','time':'08:00','dose':'Isolated test entry, not a prescription'})
            create_record(owner_page,'events','Browser test event',{'starts_at':'2030-01-02T10:00','ends_at':'2030-01-02T11:00'})
            create_record(owner_page,'rooms','Browser test room',{'category':'Isolated resource','capacity':'2'})
            pdf=DATA/'fixture.pdf';pdf.write_bytes(b'%PDF-1.4\n% isolated test fixture\n%%EOF')
            create_record(owner_page,'documents','Browser test PDF',{'file':str(pdf)})
            print('PASS browser forms for patient, announcement, appointment, meal, medication, event and PDF')
            owner_page.goto('http://127.0.0.1:4153/#settings');owner_page.locator('.member-form input').fill(patient_email)
            owner_page.locator('.member-form select').select_option('patient');owner_page.get_by_role('button',name='Assign role',exact=True).click()
            owner_page.get_by_text(patient_email,exact=True).first.wait_for()
            owner_page.locator('.clinic-profile [name=address]').fill('Updated isolated test address')
            with owner_page.expect_response(lambda response:response.request.method=='PUT' and '/api/clinics/' in response.url) as profile_response:
                owner_page.locator('.clinic-profile').get_by_role('button',name='Save',exact=True).click()
            assert profile_response.value.status==200,profile_response.value.status
            patient_context=browser.new_context();patient_page=patient_context.new_page();patient_page.on('pageerror',lambda error:errors.append(str(error)))
            signup(patient_page,patient_email)
            patient_page.goto('http://127.0.0.1:4153/#appointments');patient_page.get_by_role('heading',name='Browser test appointment',exact=True).wait_for()
            assert patient_page.get_by_role('button',name='Add',exact=True).count()==0
            patient_page.goto('http://127.0.0.1:4153/#events');patient_page.get_by_role('button',name='Join event',exact=True).click();patient_page.get_by_role('button',name='Leave event',exact=True).wait_for()
            patient_page.goto('http://127.0.0.1:4153/#medications');patient_page.get_by_role('button',name='Record intake',exact=True).click();patient_page.get_by_text('Intake recorded:',exact=False).wait_for()
            patient_page.goto('http://127.0.0.1:4153/#feedback');patient_page.locator('.feedback-form textarea').fill('Isolated patient feedback');patient_page.get_by_role('button',name='Send feedback',exact=True).click();patient_page.get_by_text('Feedback sent.',exact=True).wait_for()
            patient_page.goto('http://127.0.0.1:4153/#documents');patient_page.get_by_role('link',name='Download PDF',exact=True).wait_for()
            with patient_page.expect_download() as download_info:patient_page.get_by_role('link',name='Download PDF',exact=True).click()
            assert Path(download_info.value.path()).read_bytes()==pdf.read_bytes()
            patient_page.locator('#language').select_option('de');patient_page.get_by_role('link',name='PDF herunterladen',exact=True).wait_for()
            print('PASS patient role, event registration, intake, feedback, exact PDF download and German UI')
            owner_page.goto('http://127.0.0.1:4153/#messages');owner_page.get_by_role('button',name='Edit',exact=True).click();owner_page.locator('.record-dialog [name=title]').fill('Updated browser announcement');owner_page.locator('.record-dialog').get_by_role('button',name='Save',exact=True).click();owner_page.get_by_role('heading',name='Updated browser announcement',exact=True).wait_for()
            owner_page.once('dialog',lambda dialog:dialog.accept());owner_page.get_by_role('button',name='Archive',exact=True).click();owner_page.locator('.record-card .pill').filter(has_text='Archived').wait_for()
            patient_page.locator('#language').select_option('en');patient_page.goto('http://127.0.0.1:4153/#messages');patient_page.get_by_text('No entries yet.',exact=True).wait_for()
            assert not errors,errors
            print('PASS edit, archive, patient publication filtering; no browser JavaScript errors')
            owner_page.screenshot(path=str(DATA/'owner-desktop.png'),full_page=True)
            patient_page.set_viewport_size({'width':390,'height':844});patient_page.screenshot(path=str(DATA/'patient-mobile.png'),full_page=True)
            patient_page.goto('http://127.0.0.1:4153/#account');patient_page.get_by_role('button',name='Sign out',exact=True).click();patient_page.locator('#account-form').wait_for()
            result=patient_page.evaluate("async()=>{const response=await fetch('/api/clinics');return response.status}")
            assert result==401,result
            print('PASS real logout immediately revokes clinic access')
            browser.close();browser=None
        (DATA/'result.json').write_text(json.dumps({'passed':True,'isolated_data':True,'production_accounts_changed':False}),encoding='utf-8')
        print('E2E PASS. Isolated artifacts:',DATA)
    finally:
        if browser:
            try:browser.close()
            except Exception:pass
        for process in reversed(processes):
            if process.poll() is None:process.terminate()
        for process in processes:
            try:process.wait(timeout=10)
            except subprocess.TimeoutExpired:process.kill();process.wait()
        mailbox.shutdown();mailbox.server_close()
        for log in logs:log.close()

if __name__=='__main__':main()
