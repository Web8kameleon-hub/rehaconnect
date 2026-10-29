"""Generate release changelog from real Git history and measured benchmark files."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parent.parent
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tag',required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    sha=git('rev-parse','HEAD')
    previous=subprocess.run(['git','describe','--tags','--abbrev=0','HEAD^'],cwd=ROOT,text=True,capture_output=True)
    span=previous.stdout.strip()+'..HEAD' if previous.returncode==0 else 'HEAD'
    commits=git('log','--no-merges','--format=- %s (`%h`)',span)
    lines=[f'# RehaConnect {args.tag}','','Commit: `'+sha+'`','','## Changelog','',commits,'',
           '## Verified artifacts','','This release pipeline requires Java tests, isolated HTTP checks and a non-root Docker smoke test before publication.',
           'The attached deployment ZIP, checksum and benchmark report identify this revision.','']
    benchmark=ROOT/'.cache/benchmarks/benchmark.json'
    if benchmark.exists():
        data=json.loads(benchmark.read_text(encoding='utf-8'))
        if data['commit']!=sha:raise SystemExit('Benchmark commit does not match release')
        lines += ['## Measured benchmark','',data['scope'],'',
                  '| Route | Median ms | P95 ms | Samples |','| --- | ---: | ---: | ---: |']
        lines += [f"| `{r['path']}` | {r['median_ms']:.3f} | {r['p95_ms']:.3f} | {r['samples']} |" for r in data['results']]
    lines += ['','## Capability limits','',
              'Prerelease: real-production Lightning origin/session integration, physical voice testing, clinic PDF extraction, authoritative legal/clinical sources, Gemma and Kloud integration remain outstanding.',
              'A published image or successful health check does not establish clinical/legal accuracy or confirm payment processing.','']
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text('\n'.join(lines),encoding='utf-8')

if __name__=='__main__':main()
