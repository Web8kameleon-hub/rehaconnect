"""Exercise real local account/CSRF proxy without creating users or payments."""
import http.cookiejar
import json
import urllib.error
import urllib.request
from pathlib import Path

config = json.loads((Path(__file__).resolve().parent.parent / 'ports.json').read_text(encoding='utf-8-sig'))
origin = config['services']['frontend']['url']
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
with client.open(origin + '/api/account/csrf', timeout=15) as response:
    token = json.load(response)['csrfToken']
    assert response.status == 200 and token
print('PASS real Lightning CSRF endpoint: 200')
request = urllib.request.Request(origin + '/api/account/login', data=b'{}', headers={
    'Content-Type': 'application/json', 'Origin': origin, 'X-CSRF-Token': token})
try:
    client.open(request, timeout=15)
    raise AssertionError('Empty credentials were accepted')
except urllib.error.HTTPError as error:
    result = json.load(error)
    assert error.code == 401 and result.get('code') == 'invalid_credentials', result
print('PASS valid CSRF reaches credential validation: 401')
request = urllib.request.Request(origin + '/api/account/login', data=b'{}', headers={
    'Content-Type': 'application/json', 'Origin': 'https://invalid.example', 'X-CSRF-Token': token})
try:
    client.open(request, timeout=15)
    raise AssertionError('Foreign origin was accepted')
except urllib.error.HTTPError as error:
    assert error.code == 403
print('PASS foreign origin rejected: 403')
