const CACHE='saigon-guide-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/icon.svg','/manifest.webmanifest'])));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||r.headers.has('Authorization')||u.pathname.startsWith('/admin')||u.pathname.startsWith('/api/admin')||u.pathname.startsWith('/api/auth')||u.pathname.startsWith('/api/locations/nearby')||u.pathname==='/health')return;
 const publicApi=u.pathname==='/api/languages'||u.pathname==='/api/locations'||/^\/api\/locations\/\d+\/narration$/.test(u.pathname);
 if(u.pathname.startsWith('/api/')&&!publicApi)return;
 event.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)))}return res}).catch(async()=>{const cached=await caches.match(r);if(cached)return cached;if(r.mode==='navigate')return caches.match('/');return new Response(JSON.stringify({message:'Nội dung chưa được lưu để dùng ngoại tuyến'}),{status:503,headers:{'Content-Type':'application/json'}})}));
});
