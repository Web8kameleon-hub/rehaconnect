"""Measure real isolated HTTP requests; never send clinical data or model prompts."""
import argparse
import json
import math
import os
from pathlib import Path
import platform
import statistics
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent

def fetch(url):
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            status, body = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, body = error.code, error.read()
    return status, len(body), (time.perf_counter() - start) * 1000

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples', type=int, default=100)
    parser.add_argument('--port', type=int, default=4185)
    parser.add_argument('--output', type=Path, default=ROOT / '.cache/benchmarks')
    args = parser.parse_args()
    if not 10 <= args.samples <= 10000 or not 4100 <= args.port <= 4199:
        parser.error('Use 10–10000 samples and a reserved local port.')
    import socket
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', args.port))
    args.output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='rehaconnect-benchmark-') as data:
        env = os.environ.copy()
        env.update(REHACONNECT_PRODUCTION='false')
        command = ['java', '-jar', str(ROOT / 'backend/rehaconnect-api/target/rehaconnect-api-1.0.0.jar'),
                   f'--server.port={args.port}', '--server.address=127.0.0.1', '--lightning.internal-url=',
                   '--logging.level.root=WARN', '--rehaconnect.storage-path=' + str(Path(data) / 'clinics.bin')]
        started = time.perf_counter()
        with (args.output / 'server.log').open('w', encoding='utf-8') as log:
            # Argument vector, shell=False: validated local port and generated temp
            # path are data arguments, never interpreted as shell commands.
            process = subprocess.Popen(command, shell=False, env=env, stdout=log, stderr=subprocess.STDOUT,
                                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            try:
                base = f'http://127.0.0.1:{args.port}'
                deadline = time.monotonic() + 60
                while True:
                    if process.poll() is not None:
                        raise RuntimeError('Benchmark process exited; inspect server.log')
                    try:
                        if fetch(base + '/')[0] == 200:
                            break
                    except (OSError, urllib.error.URLError):
                        pass
                    if time.monotonic() >= deadline:
                        raise RuntimeError('Benchmark readiness timed out')
                    time.sleep(.1)
                startup = time.perf_counter() - started
                results = []
                for path, expected in [('/', 200), ('/assistant.js', 200), ('/api/clinics', 401), ('/api/assistant', 503)]:
                    for _ in range(5):
                        if fetch(base + path)[0] != expected:
                            raise RuntimeError('Unexpected warmup status: ' + path)
                    measured = [fetch(base + path) for _ in range(args.samples)]
                    if any(row[0] != expected for row in measured):
                        raise RuntimeError('Unexpected measured status: ' + path)
                    values = sorted(row[2] for row in measured)
                    results.append(dict(path=path, expected_status=expected, samples=len(values),
                                        mean_ms=statistics.mean(values), median_ms=statistics.median(values),
                                        p95_ms=values[math.ceil(.95 * len(values)) - 1],
                                        min_ms=values[0], max_ms=values[-1]))
                result = dict(schema_version=1, commit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                              measured_utc=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                              platform=platform.platform(), python=platform.python_version(), startup_seconds=startup,
                              scope='Sequential loopback HTTP, isolated storage; no authentication success, model inference, PDF processing or production capacity measured.',
                              results=results)
                (args.output / 'benchmark.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
                lines = ['# Measured HTTP benchmark', '', f"Commit: `{result['commit']}`", '', result['scope'], '',
                         '| Route | Status | Samples | Median ms | P95 ms |', '| --- | ---: | ---: | ---: | ---: |']
                lines += [f"| `{r['path']}` | {r['expected_status']} | {r['samples']} | {r['median_ms']:.3f} | {r['p95_ms']:.3f} |" for r in results]
                (args.output / 'benchmark.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
                print('\n'.join(lines))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill(); process.wait(timeout=5)

if __name__ == '__main__':
    main()
