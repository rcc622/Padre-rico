// Service worker de Padre Rico — cache offline.
// Navegación: red primero (para recibir updates), cae al cache sin internet.
// Recursos: cache primero.
const C='prv5-files-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./manifest.json']).catch(()=>c.add('./'))))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put('./',cp));return r;}).catch(()=>caches.match('./').then(r=>r||caches.match(req))));
  }else{
    e.respondWith(caches.match(req).then(r=>r||fetch(req).catch(()=>new Response(''))));
  }
});
