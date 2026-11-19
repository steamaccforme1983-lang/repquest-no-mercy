const CACHE='repquest-no-mercy-shell-1';
const files=['./','./index.html','./styles.css?v=nm1','./app.mjs?v=nm1','./engine.mjs','./life.mjs','./life-ui.mjs','./visuals.mjs','./manifest.webmanifest','./mark.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('repquest-no-mercy-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  const isShell=files.some(file=>new URL(file,self.registration.scope).href===req.url);
  if(req.mode==='navigate')e.respondWith(fetch(req).catch(()=>caches.match(new URL('./',self.registration.scope))));
  else if(isShell)e.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});




