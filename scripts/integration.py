#!/usr/bin/env python3
"""Integration against running API + real MySQL. Creates tagged test records, never resets DB."""
import json,os,uuid,urllib.request,urllib.error,time,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
config=dict(line.split('=',1) for line in (ROOT/'.env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
BASE=os.environ.get('API_BASE','http://127.0.0.1:5080')
count=0

def call(method,path,data=None,token=None,status=200):
    global count
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=20) as res:
            code=res.status;body=res.read()
    except urllib.error.HTTPError as e:
        code=e.code;body=e.read()
    assert code==status, f'{method} {path}: expected {status}, got {code}: {body.decode()[:250]}'
    count+=1
    return json.loads(body) if body else None

call('GET','/health')
languages=call('GET','/api/languages');assert len(languages)>=6
places=call('GET','/api/locations?lang=vi');assert len(places)==6
for l in languages:
    data=call('GET','/api/locations?lang='+l['code']);assert len(data)==6
    assert all(x['languageCode']==l['code'] and not x['fallback'] for x in data)
n=call('GET','/api/locations/1/narration?lang=fr');assert n['languageCode']=='en' and n['fallback']
assert call('GET','/api/locations/nearby?lat=10.7799&lng=106.6999&acc=5')[0]['id']==1
assert call('GET','/api/locations/nearby?lat=10.7799&lng=106.6999&acc=51')==[]
call('GET','/api/locations/nearby?lat=91&lng=0&acc=5',status=400)
call('GET','/api/admin/locations',status=401)
call('POST','/api/auth/login',{'username':config['ADMIN_USERNAME'],'password':'incorrect'},status=401)
auth=call('POST','/api/auth/login',{'username':config['ADMIN_USERNAME'],'password':config['ADMIN_PASSWORD']})
token=auth['token']
suffix=uuid.uuid4().hex[:10]
user='test-editor-'+suffix
password=uuid.uuid4().hex
call('POST','/api/admin/users',{'username':user,'password':password,'fullName':'Integration test','role':'Editor'},token)
editor=call('POST','/api/auth/login',{'username':user,'password':password})['token']
call('POST','/api/admin/users',{'username':'not-allowed','password':password,'role':'Admin','fullName':''},editor,status=403)
loc=call('POST','/api/admin/locations',{'slug':'integration-'+suffix,'latitude':10.7,'longitude':106.7,'radiusM':80,'address':'Integration','isActive':True},token)
lid=loc['id']
translation={'locationId':lid,'languageId':next(x['id'] for x in languages if x['code']=='en'),'name':'Integration place','shortDescription':'Test','narrationText':'Integration narration','historyText':'History','status':'Published'}
call('POST','/api/admin/translations',translation,editor,status=403)
translation['status']='Draft';tr=call('POST','/api/admin/translations',translation,editor)
call('GET',f'/api/locations/{lid}/narration?lang=en',status=404)
translation['status']='Published';call('PUT',f"/api/admin/translations/{tr['id']}",translation,token)
assert call('GET',f'/api/locations/{lid}/narration?lang=ja')['fallback']
# Real multipart upload and audio serving, followed by text-change invalidation.
import io,wave
buffer=io.BytesIO()
with wave.open(buffer,'wb') as audio:
    audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(8000);audio.writeframes(b'\x00\x00'*800)
content=buffer.getvalue();boundary='guide-'+suffix
body=(f'--{boundary}\r\nContent-Disposition: form-data; name="translationId"\r\n\r\n{tr["id"]}\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode())
req=urllib.request.Request(BASE+'/api/admin/audio/upload',data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
with urllib.request.urlopen(req,timeout=20) as response:
    uploaded=json.load(response)['url'];count+=1
with urllib.request.urlopen(BASE+uploaded,timeout=20) as response:
    assert response.read()==content;count+=1
assert call('GET',f'/api/locations/{lid}/narration?lang=en')['audioUrl']==uploaded
translation['narrationText']='Changed narration invalidates old audio'
call('PUT',f"/api/admin/translations/{tr['id']}",translation,token)
assert call('GET',f'/api/locations/{lid}/narration?lang=en')['audioUrl'] is None

call('POST','/api/admin/translations',translation,token,status=409)
call('DELETE',f'/api/admin/locations/{lid}',token=token,status=409)
call('DELETE',f"/api/admin/translations/{tr['id']}",token=token,status=204)
call('DELETE',f'/api/admin/locations/{lid}',token=token,status=204)
newlang={'code':'fr','name':'French','nativeName':'Français','ttsVoiceCode':'fr-FR','isActive':True}
# Preserve any user-added French language when rerunning.
existing=call('GET','/api/admin/languages',token=token)
if not any(l['code']=='fr' for l in existing):
    l=call('POST','/api/admin/languages',newlang,token)
    call('DELETE',f"/api/admin/languages/{l['id']}",token=token,status=204)
call('POST','/api/admin/languages',newlang,editor,status=403)
session=str(uuid.uuid4());vi=next(x['id'] for x in languages if x['code']=='vi')
log=call('POST','/api/playlogs',{'sessionId':session,'locationId':1,'languageId':vi,'triggerType':'Manual'})
call('PUT',f"/api/playlogs/{log['id']}/complete",{'sessionId':str(uuid.uuid4())},status=404)
call('PUT',f"/api/playlogs/{log['id']}/complete",{'sessionId':session},status=204)
call('POST','/api/feedbacks',{'locationId':1,'languageId':vi,'rating':5,'comment':'Integration smoke test'},status=201)
call('POST','/api/feedbacks',{'locationId':1,'languageId':vi,'rating':9,'comment':''},status=400)
st=call('GET','/api/admin/statistics',token=token);assert st['total']>=1 and st['completed']>=1
assert call('GET','/api/admin/logs',token=token)
# Sequential local smoke benchmark; not a production/4G performance certification.
latencies=[]
for _ in range(20):
    begin=time.perf_counter();call('GET','/api/locations?lang=en');latencies.append((time.perf_counter()-begin)*1000)
print(f'PASS: {count} HTTP assertions against real MySQL; locations/languages, geofence, JWT/RBAC, draft/publish, CRUD, feedback, logs. Local p95: {sorted(latencies)[18]:.1f} ms.')
print('Test admin/editor accounts and anonymous play/feedback records remain tagged as tests; no existing data was reset.')
