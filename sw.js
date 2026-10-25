'use strict';
// Cache public application HTML only. Never read, cache or send diary data.
const VERSION='1.12.1';
const ROOT=new URL('./',self.location.href);
const SHELL=new URL('index.html',ROOT).href;
const PREFIX='everyday-hq-shell-'+ROOT.pathname+'-';
const CACHE=PREFIX+VERSION;
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  try{
   const response=await fetch(new Request(SHELL,{cache:'reload',credentials:'same-origin'}));
   if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html')||!(await response.clone().text()).includes('Everyday HQ version '+VERSION+' —'))throw Error('Incomplete app release');
   const cache=await caches.open(CACHE);await cache.put(SHELL,response);
   // Deliberately do not skipWaiting: an open diary must not update mid-edit.
  }catch(error){await caches.delete(CACHE);throw error}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  // Only app-shell caches belonging to this exact path may be removed.
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==ROOT.origin||![ROOT.pathname,new URL(SHELL).pathname].includes(url.pathname))return;
 event.respondWith((async()=>{
  const cached=await (await caches.open(CACHE)).match(SHELL);
  if(cached)return cached;
  // Cache eviction is possible. A working network can still reopen the app.
  return fetch(event.request);
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return}
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const ready=Boolean(await (await caches.open(CACHE)).match(SHELL));
  event.ports?.[0]?.postMessage({version:VERSION,ready});
 })());
});
