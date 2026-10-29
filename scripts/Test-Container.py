"""Smoke-test one disposable Linux image without real accounts or upstreams."""
import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    args = parser.parse_args()
    name = 'rehaconnect-ci-' + uuid.uuid4().hex[:12]
    def docker(*command):
        return subprocess.check_output(['docker', *command], text=True).strip()
    try:
        docker('run', '-d', '--name', name, '-p', '127.0.0.1::4101', '--read-only', '--cap-drop=ALL',
               '--security-opt=no-new-privileges:true', '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m',
               '--tmpfs', '/app/data:rw,uid=10001,gid=10001,size=32m',
               '-e', 'REHACONNECT_PRODUCTION=true', '-e', 'REHACONNECT_PUBLIC_URL=https://validation.invalid',
               '-e', 'LIGHTNING_INTERNAL_URL=http://127.0.0.1:9', args.image)
        info = json.loads(docker('inspect', name))[0]
        port = info['NetworkSettings']['Ports']['4101/tcp'][0]['HostPort']
        assert info['Config']['User'] == '10001:10001'
        assert info['HostConfig']['ReadonlyRootfs'] is True
        base = 'http://127.0.0.1:' + port
        deadline = time.monotonic() + 90
        while True:
            try:
                with urllib.request.urlopen(base, timeout=2) as response:
                    if response.status == 200:
                        break
            except (OSError, urllib.error.URLError):
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError('Container readiness timed out')
            time.sleep(.25)
        for path, expected in [('/', 200), ('/assistant.js', 200), ('/assistant.css', 200), ('/api/clinics', 401), ('/api/assistant', 503)]:
            try:
                with urllib.request.urlopen(base + path, timeout=10) as response:
                    actual = response.status
            except urllib.error.HTTPError as error:
                actual = error.code
            assert actual == expected, (path, actual, expected)
            print(f'PASS container {path}: {actual}')
        docker('exec', name, 'curl', '--fail', '--silent', 'http://127.0.0.1:4101/')
        print('PASS non-root, read-only filesystem and healthcheck')
    except Exception:
        subprocess.run(['docker', 'logs', name], check=False)
        raise
    finally:
        subprocess.run(['docker', 'rm', '-f', name], check=False)

if __name__ == '__main__':
    main()
