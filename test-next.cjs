const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),workerCode=fs.readFileSync(__dirname+'/sw.js','utf8');
const RELEASE=workerCode.match(/const VERSION='([^']+)'/)[1];
const wait=async(fn)=>{for(let n=0;n<300;n++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out')};
const idb=new IDBFactory();
async function open(storage={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://p1ckz.github.io/everyday-hq-memory/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.indexedDB=idb;w.structuredClone=structuredClone;w.confirm=()=>true;w.scrollTo=()=>{};for(const[k,v]of Object.entries(storage))w.localStorage.setItem(k,v);w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false}}});
 await wait(()=>dom.window.document.getElementById('boot').hidden);assert.equal(dom.window.document.getElementById('fatal').hidden,true);assert.deepEqual(errors,[]);return dom;
}
const state=w=>w.eval('structuredClone(state)');
const storage=w=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
const close=dom=>{dom.window.eval('db.close()');dom.window.close()};
function field(w,id,value){const e=w.document.getElementById(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}))}
function submit(w,id){w.document.getElementById(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}))}
function workerHarness({badShell=false}={}){
 const handlers={},stores=new Map(),deleted=[],messages=[];let network=true,fetches=0,skipped=0,claimed=0;
 const cacheApi={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{put:async(key,response)=>map.set(key,response.clone()),match:async key=>map.get(key)?.clone()}},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name)}};
 const self={location:{href:'https://p1ckz.github.io/everyday-hq-memory/sw.js'},clients:{claim:async()=>claimed++},skipWaiting:async()=>skipped++,addEventListener:(type,fn)=>handlers[type]=fn};
 vm.runInNewContext(workerCode,{self,caches:cacheApi,URL,Request,fetch:async()=>{fetches++;if(!network)throw Error('Synthetic offline');return new Response(badShell?'Old release':html,{headers:{'content-type':'text/html'}})}});
 async function event(type,extra={}){let pending;handlers[type]({waitUntil:p=>pending=p,respondWith:p=>pending=p,...extra});return await pending}
 return{event,stores,deleted,messages,get skipped(){return skipped},get claimed(){return claimed},get fetches(){return fetches},offline:()=>network=false};
}
(async()=>{
 // Stage 1: real service-worker source under simulated cache/network lifecycles.
 const sw=workerHarness();await sw.event('install');assert.equal(sw.skipped,0);assert.equal(sw.fetches,1);
 sw.stores.set('everyday-hq-shell-/everyday-hq-memory/-old',new Map());sw.stores.set('unrelated-user-cache',new Map());
 await sw.event('activate');assert.equal(sw.claimed,1);assert(sw.deleted.includes('everyday-hq-shell-/everyday-hq-memory/-old'));assert(sw.stores.has('unrelated-user-cache'));
 sw.offline();const response=await sw.event('fetch',{request:{method:'GET',mode:'navigate',url:'https://p1ckz.github.io/everyday-hq-memory/?layout-test=1'}});assert((await response.text()).includes('Everyday HQ version '+RELEASE));assert.equal(sw.fetches,1);
 assert.equal(await sw.event('fetch',{request:{method:'GET',mode:'cors',url:'https://elsewhere.invalid/private'}}),undefined);assert.equal(sw.fetches,1);
 let ready;await sw.event('message',{data:{type:'OFFLINE_STATUS'},ports:[{postMessage:x=>ready=x}]});assert(ready.ready);assert.equal(ready.version,RELEASE);
 await sw.event('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(sw.skipped,1);
 const bad=workerHarness({badShell:true});await assert.rejects(bad.event('install'));assert.equal(bad.stores.size,0);
 // Stage 2: new app functionality with the existing IndexedDB schema.
 let dom=await open(),w=dom.window,d=w.document;
 const now=new Date(),stamp=now.toISOString(),row=(id,text,date=stamp)=>({id,text,occurredAt:date,createdAt:stamp,updatedAt:stamp,deletedAt:null});
 await w.update(next=>next.items.push(row('sample','SYNTHETIC Sam: discuss the garden appointment.'),row('literal','SYNTHETIC C++ [sample] <img src=x onerror=bad()>')));
 assert.equal(w.searchMemories(state(w).items,'sam garden').length,1);assert.equal(w.searchMemories(state(w).items,'"garden appointment"').length,1);assert.equal(w.searchMemories(state(w).items,'"appointment garden"').length,0);assert.equal(w.searchMemories(state(w).items,'“garden appointment”').length,1);
 w.navigate('find');field(w,'searchInput','C++ [sample]');assert.equal(d.querySelectorAll('#searchList mark').length,2);assert.equal(d.querySelectorAll('#searchList img').length,0);
 d.getElementById('searchFrom').value=w.eval('dayKey(nowISO())');d.getElementById('searchTo').value=w.eval('dayKey(nowISO())');w.render();assert(d.getElementById('findCount').textContent.startsWith('1 matching'));
 d.getElementById('searchFrom').value='2099-01-01';w.render();assert(d.getElementById('findCount').textContent.includes('From date'));d.getElementById('clearSearch').click();assert.equal(d.getElementById('searchTo').value,'');
 const fixed=new Date('2026-10-26T12:00:00Z'),bounds=w.sevenDayBounds(fixed);assert.equal(bounds.from,'2026-10-20');assert.equal(bounds.to,'2026-10-26');
 assert.equal(w.weekMemories([row('a','A','2026-10-20T12:00:00Z'),row('b','B','2026-10-19T12:00:00Z'),row('c','C','2026-10-27T12:00:00Z')],fixed).length,1);
 w.navigate('days');d.getElementById('showWeek').click();assert.equal(d.getElementById('dayPicker').disabled,true);assert(d.getElementById('dayModeStatus').textContent.includes('2 saved memories'));
 w.navigate('write');d.querySelector('#todayList [data-action=followup]').click();await wait(()=>!w.eval('busy'));assert(state(w).items.find(x=>x.id==='sample').followUp);assert.equal(d.querySelectorAll('#followupList article').length,1);
 let exported;w.saveFile=(name,body)=>exported=JSON.parse(body);await w.backup();assert(exported.items.some(x=>x.followUp));assert(d.getElementById('backupSummary').textContent.includes('export requested'));assert(d.getElementById('backupSummary').textContent.includes('not verified'));
 const metadata=w.localStorage.getItem('everydayHQ.backupStatus.v1');w.saveFile=()=>{throw Error('Synthetic download failure')};await w.backup();assert.equal(w.localStorage.getItem('everydayHQ.backupStatus.v1'),metadata);
 await w.update(next=>next.items.find(x=>x.id==='sample').followUp=false);await w.restoreBackup({size:200,text:async()=>JSON.stringify(exported)});assert.equal(state(w).items.length,2);assert(state(w).items.find(x=>x.id==='sample').followUp);
 // An export from a stale window must include newer committed memories.
 const stale=await open();await w.update(next=>next.items.push(row('newer','SYNTHETIC newer window entry')));let latest;stale.window.saveFile=(name,body)=>latest=JSON.parse(body);await stale.window.backup();assert.equal(latest.items.length,3);close(stale);
 w.selectEdit('sample');field(w,'editText','SYNTHETIC unfinished edit');field(w,'editOccurred',w.eval('localTimeInput(nowISO())'));const savedDrafts=storage(w);close(dom);
 dom=await open(savedDrafts);w=dom.window;d=w.document;assert.equal(d.getElementById('editRecovery').hidden,false);w.recoverEdit();assert.equal(d.getElementById('editText').value,'SYNTHETIC unfinished edit');assert(d.getElementById('editDialog').open);
 submit(w,'editForm');await wait(()=>!w.eval('busy'));assert.equal(w.editDraft(),null);assert.equal(state(w).items.find(x=>x.id==='sample').text,'SYNTHETIC unfinished edit');
 // If the original changes, recovery becomes a new draft instead of overwriting it.
 w.selectEdit('sample');field(w,'editText','SYNTHETIC second recovered edit');d.getElementById('editDialog').close();await w.update(next=>{const item=next.items.find(x=>x.id==='sample');item.text='SYNTHETIC changed elsewhere';item.updatedAt='2099-01-01T00:00:00Z'});w.recoverEdit();assert.equal(d.getElementById('memoryText').value,'SYNTHETIC second recovered edit');assert.equal(state(w).items.find(x=>x.id==='sample').text,'SYNTHETIC changed elsewhere');
 // Updates require consent, preserve drafts, and refuse a reload on failed storage.
 let activation=0;w.eval('appRegistration={waiting:{postMessage:()=>window.activateTest()}}');w.activateTest=()=>activation++;w.applyAppUpdate();assert.equal(activation,1);assert.equal(w.localStorage.getItem('everydayHQ.draft.v1'),'SYNTHETIC second recovered edit');
 const realSet=w.Storage.prototype.setItem;w.Storage.prototype.setItem=()=>{throw Error('Synthetic full storage')};w.applyAppUpdate();assert.equal(activation,1);w.Storage.prototype.setItem=realSet;
 assert.equal(w.localStorage.getItem('everydayHQ.backupStatus.v1'),metadata);close(dom);
 console.log('PASS: offline cached navigation without network; no private/external fetch interception; version-checked install; explicit update activation; scoped cache cleanup; multiword/phrase/literal highlighted search; date ranges; seven calendar days; follow-up persistence/import; latest-state backup and truthful export metadata; failed-export handling; unfinished-edit recovery; stale-original preservation; draft-safe update guards.');
})().catch(error=>{console.error(error);process.exitCode=1});
