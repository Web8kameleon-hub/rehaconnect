"""Publish reviewed wiki sources without putting credentials in Git URLs."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parent.parent
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository',required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',args.repository):
        parser.error('Invalid repository name')
    if not os.environ.get('WIKI_TOKEN'):
        raise SystemExit('Wiki publication blocked: configure dedicated WIKI_WRITE_TOKEN; sources remain in docs/wiki.')
    with tempfile.TemporaryDirectory(prefix='rehaconnect-wiki-') as temp:
        temp=Path(temp)
        askpass=temp/'askpass.sh'
        askpass.write_text('#!/bin/sh\ncase "$1" in *Username*) printf "%s\\n" x-access-token;; *) printf "%s\\n" "$WIKI_TOKEN";; esac\n',encoding='utf-8')
        askpass.chmod(0o700)
        env={**os.environ,'GIT_ASKPASS':str(askpass),'GIT_TERMINAL_PROMPT':'0'}
        checkout=temp/'wiki'
        def git(*command):
            return subprocess.run(['git',*command],env=env,check=True,text=True,capture_output=True)
        try:
            git('clone',f'https://github.com/{args.repository}.wiki.git',str(checkout))
        except subprocess.CalledProcessError:
            raise SystemExit('Wiki clone failed. Create the initial Wiki page on GitHub and verify the dedicated token has wiki access.')
        for source in (ROOT/'docs/wiki').glob('*.md'):
            shutil.copyfile(source,checkout/source.name)
        benchmark=ROOT/'.cache/benchmarks/benchmark.md'
        if benchmark.exists():shutil.copyfile(benchmark,checkout/'Latest-Benchmark.md')
        git('-C',str(checkout),'config','user.name','RehaConnect automation')
        git('-C',str(checkout),'config','user.email','41898282+github-actions[bot]@users.noreply.github.com')
        git('-C',str(checkout),'add','--','*.md')
        changed=subprocess.run(['git','-C',str(checkout),'diff','--cached','--quiet'],env=env)
        if changed.returncode==0:
            print('Wiki already matches reviewed sources');return
        if changed.returncode!=1:raise SystemExit('Cannot inspect wiki changes')
        sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
        git('-C',str(checkout),'commit','-m','Update verified deployment documentation '+sha[:12])
        git('-C',str(checkout),'push','origin','HEAD')
        print('Published wiki documentation for '+sha)

if __name__=='__main__':main()
