"""Register through real Lightning auth; never mark an unverified email verified."""
import getpass
import http.cookiejar
import json
import sys
import urllib.error
import urllib.request

origin = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:4800'
email = input('Account email: ').strip()
password = getpass.getpass('Account password (hidden): ')
if not 12 <= len(password) <= 128:
    raise SystemExit('Lightning requires a password between 12 and 128 characters.')
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
with client.open(origin + '/api/account/csrf', timeout=15) as response:
    csrf = json.load(response)['csrfToken']
request = urllib.request.Request(origin + '/api/account/register',
    data=json.dumps({'email': email, 'password': password}).encode(),
    headers={'Content-Type': 'application/json', 'Origin': origin, 'X-CSRF-Token': csrf})
try:
    with client.open(request, timeout=30) as response:
        result = json.load(response)
        print(json.dumps({'status': response.status, 'message': result.get('message'),
                          'email_verified': False, 'login_requires_email_verification': True}))
except urllib.error.HTTPError as error:
    result = json.load(error)
    print(json.dumps({'status': error.code, 'code': result.get('code'),
                      'next_action': result.get('nextAction'),
                      'account_saved': result.get('code') == 'verification_email_unavailable',
                      'email_verified': False}))
    raise SystemExit(1)
