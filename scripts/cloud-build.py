#!/usr/bin/env python3
"""Optional cloud/corporate-proxy build. Normal localhost: docker compose up -d --build.
Preserves TLS and package checksums; never stores proxy credentials or CA in runtime images.
"""
from pathlib import Path
import os,socket,subprocess,sys,urllib.parse
root=Path(__file__).resolve().parents[1]
runtime=os.environ.copy()
runtime.setdefault('DOCKER_CONFIG','/workspace/.tools/docker-config' if Path('/workspace').exists() else str(Path.home()/'.docker'))
subprocess.run([sys.executable,str(root/'scripts/init-env.py')],cwd=root,check=True)
args=[]
proxy_hosts=set()
for name in ['HTTPS_PROXY','HTTP_PROXY','NO_PROXY']:
    if runtime.get(name):args+=['--build-arg',name]
    if name!='NO_PROXY' and runtime.get(name):
        host=urllib.parse.urlparse(runtime[name]).hostname
        if host:proxy_hosts.add(host)
if proxy_hosts:
    args+=['--network','host']
    for host in sorted(proxy_hosts):
        # BuildKit does not inherit the cloud machine's synthetic host entries.
        ip=socket.gethostbyname(host)
        args+=['--add-host',f'{host}:{ip}']
    ca=Path(runtime.get('SSL_CERT_FILE','/etc/ssl/certs/ca-certificates.crt'))
    if ca.is_file():args+=['--secret',f'id=build_ca,src={ca}']
for image,context,dockerfile in [('saigon-guide-api','.', 'backend/Dockerfile'),('saigon-guide-web','frontend','frontend/Dockerfile')]:
    subprocess.run(['docker','build',*args,'-f',dockerfile,'-t',image,context],cwd=root,env=runtime,check=True)
print('Docker images built with TLS verification enabled. Start with docker compose up -d --no-build.')
