"""Browser regression checks using explicit UI fixtures, not production evidence."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent.parent

def main():
    config=json.loads((ROOT/'ports.json').read_text(encoding='utf-8-sig'))
    for name,port in [('frontend',4186),('rehaconnect-api',4187),('lightning-spp',4188),('longo',4189)]:
        config['services'][name]={'host':'127.0.0.1','port':port,'url':f'http://127.0.0.1:{port}'}
    with tempfile.TemporaryDirectory(prefix='rehaconnect-ui-') as temp:
        path=Path(temp)/'ports.json';path.write_text(json.dumps(config),encoding='utf-8')
        with (Path(temp)/'frontend.log').open('w') as log:
            process=subprocess.Popen(['node',str(ROOT/'frontend/rehaconnect-ui/server.cjs'),str(path)],
                                     stdout=log,stderr=subprocess.STDOUT,
                                     creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            try:
                deadline=time.monotonic()+20
                while True:
                    if process.poll() is not None:raise RuntimeError('UI fixture server exited')
                    try:
                        with urllib.request.urlopen('http://127.0.0.1:4186/',timeout=1) as response:
                            if response.status==200:break
                    except (OSError,urllib.error.URLError):pass
                    if time.monotonic()>deadline:raise RuntimeError('UI readiness timed out')
                    time.sleep(.1)
                with sync_playwright() as p:
                    browser=p.chromium.launch(headless=True)
                    try:
                        page=browser.new_page(viewport={'width':390,'height':844})
                        errors=[];pending=[]
                        page.on('pageerror',lambda error:errors.append(str(error)))
                        # Fixtures stay inside this test browser; no real account or model is created.
                        page.route('**/api/**',lambda route:route.fulfill(status=401,json={'error':'UI fixture: signed out'}))
                        page.route('**/api/assistant',lambda route:route.fulfill(json={
                            'csrfToken':'ui-fixture-only','models':[{'id':'fixture','model':'UI fixture model'}]}))
                        page.route('**/api/assistant/conversation',lambda route:pending.append(route))
                        page.goto('http://127.0.0.1:4186/')
                        page.get_by_role('button',name='Open assistant',exact=True).click()
                        page.get_by_text('Connected to Lightning',exact=True).wait_for()
                        page.evaluate("() => {window.__spoken=0; window.speechSynthesis.speak=()=>{window.__spoken++};}")
                        page.locator('.ra-speech input').check()
                        page.locator('#ra-response-language').select_option('sq')
                        page.locator('#ra-input').fill('UI fixture message')
                        with page.expect_request('**/api/assistant/conversation'):
                            page.get_by_role('button',name='Send',exact=True).click()
                        page.get_by_role('button',name='Close assistant',exact=True).click()
                        assert page.locator('#ra-panel').is_hidden(),'Close must hide the assistant before the pending reply'
                        assert len(pending)==1
                        assert pending[0].request.post_data_json['responseLanguage']=='sq'
                        pending[0].fulfill(json={'text':'UI fixture reply <script>window.__injected=true</script>',
                                                 'identity':{'model':'UI fixture model'}})
                        page.locator('.ra-reply small').wait_for(state='attached')
                        assert page.evaluate('window.__spoken')==0,'Closed assistant must not start speaking'
                        assert page.evaluate('window.__injected') is None,'Reply must be plain text'
                        assert page.locator('#ra-panel').is_hidden()
                        page.get_by_role('button',name='Open assistant',exact=True).click()
                        page.locator('#view').select_option('patient')
                        assert page.locator('.ra-launch').is_visible()
                        page.locator('#language').select_option('de')
                        page.get_by_role('button',name='Assistent schließen',exact=True).wait_for()
                        box=page.locator('#ra-panel').bounding_box()
                        assert box['x']>=0 and box['x']+box['width']<=391
                        page.keyboard.press('Escape')
                        assert page.locator('.ra-launch').evaluate('(el)=>el===document.activeElement')
                        assert not errors,errors
                        print('PASS UI fixtures: late reply stays silent after close, text escaping, language metadata, mobile and both views')
                    finally:browser.close()
            finally:
                process.terminate()
                try:process.wait(timeout=10)
                except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)

if __name__=='__main__':main()
