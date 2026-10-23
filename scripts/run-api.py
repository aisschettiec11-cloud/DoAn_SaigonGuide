#!/usr/bin/env python3
"""Native development runner; Docker Compose remains the recommended entry point."""
from pathlib import Path
import os
root=Path(__file__).resolve().parents[1]
config={}
for line in (root/'.env').read_text().splitlines():
    if line and not line.startswith('#') and '=' in line:
        k,v=line.split('=',1);config[k]=v
runtime={**os.environ,**config,'DB_CONNECTION':f"Server=127.0.0.1;Port=3306;Database=saigon_audio_guide;User=guide;Password={config['MYSQL_PASSWORD']}",'ASPNETCORE_URLS':'http://127.0.0.1:5080','MEDIA_PATH':str(root/'media')}
os.chdir(root)
dotnet=os.environ.get('DOTNET_EXE','dotnet')
os.execvpe(dotnet,[dotnet,'run','--project','backend/AudioGuide.Api','--no-launch-profile'],runtime)
