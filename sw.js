/* PDF Fer PWA — shell precache + runtime cache for libraries. HTTPS required. */
const VERSION='pdf-fer-v2.1.1';
const CACHE=`${VERSION}-assets`;
const SCOPE=new URL('./',self.location.href);
const ASSETS=['./','./index.html','./tailwind-local.css','./brand.css','./editor.css','./editor.js','./icons.js','./pwa.js','./logo.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const CORE=[
 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
   const cache=await caches.open(CACHE);
   await cache.addAll(ASSETS);
   await Promise.allSettled(CORE.map(async url=>{
     try{const response=await fetch(url,{mode:'no-cors'});if(response.type==='opaque'||response.ok)await cache.put(url,response);}catch{}
   }));
   await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('pdf-fer-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||!req.url.startsWith('http'))return;
 const url=new URL(req.url);
 if(req.mode==='navigate'){
   event.respondWith((async()=>{
     try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone());}return response;}
     catch{return await caches.match(req)||await caches.match(new URL('./index.html',SCOPE))||Response.error();}
   })());return;
 }
 event.respondWith((async()=>{
   const cached=await caches.match(req);
   if(cached)return cached;
   try{
     const response=await fetch(req);
     if(response.ok||response.type==='opaque'){
       const cache=await caches.open(CACHE);
       // Limit third-party caching to static/asset requests; avoid caching sensitive content.
       if(url.origin===SCOPE.origin||/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|esm\.sh|huggingface\.co|hf\.co|unpkg\.com/.test(url.hostname))cache.put(req,response.clone()).catch(()=>{});
     }
     return response;
   }catch{return Response.error();}
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
