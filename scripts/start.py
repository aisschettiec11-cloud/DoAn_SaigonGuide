#!/usr/bin/env python3
"""Start retained containers and verify functional public endpoints. Never reset volumes."""
from pathlib import Path
import json,os,subprocess,sys,time,urllib.request,urllib.error
root=Path(__file__).resolve().parents[1]
runtime=os.environ.copy()
runtime.setdefault('DOCKER_CONFIG','/workspace/.tools/docker-config' if Path('/workspace').exists() else str(Path.home()/'.docker'))
subprocess.run([sys.executable,str(root/'scripts/init-env.py')],cwd=root,check=True)
for image in ['saigon-guide-api','saigon-guide-web']:
    if subprocess.run(['docker','image','inspect',image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=runtime).returncode:
        subprocess.run([sys.executable,str(root/'scripts/cloud-build.py')],cwd=root,env=runtime,check=True)
        break
subprocess.run(['docker','compose','up','-d','--no-build'],cwd=root,env=runtime,check=True)
last=''
for _ in range(60):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8080/health',timeout=3) as r:assert json.load(r)['status']=='ok'
        with urllib.request.urlopen('http://127.0.0.1:8080/api/languages',timeout=3) as r:assert len(json.load(r))>0
        with urllib.request.urlopen('http://127.0.0.1:8080/api/locations?lang=vi',timeout=3) as r:places=json.load(r);assert len(places)>0
        print(f'Ready: MySQL/API, {len(places)} published places, web 8080, phpMyAdmin 8081 (localhost only).')
        break
    except (OSError,urllib.error.URLError,ValueError,AssertionError) as e:
        last=str(e);time.sleep(2)
else:
    print('Startup failed:',last,file=sys.stderr)
    subprocess.run(['docker','compose','logs','--tail=60','api'],cwd=root,env=runtime)
    sys.exit(1)
