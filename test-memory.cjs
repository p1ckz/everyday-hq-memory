const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
for(const tag of ['script','style']){
 const body=html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))[1];
 assert(html.includes(`${tag}-src 'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`));
 if(tag==='script')new (require('vm').Script)(body);
}
const idb=new IDBFactory(),errors=[];
const delay=()=>new Promise(r=>setTimeout(r,10));
async function wait(fn){for(let n=0;n<200;n++){if(fn())return;await delay()}throw Error('timed out')}
async function open(storage={},factory=idb){
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://p1ckz.github.io/everyday-hq-memory/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  w.indexedDB=factory;w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  Object.entries(storage).forEach(([k,v])=>w.localStorage.setItem(k,v));
 }});
 await wait(()=>dom.window.document.getElementById('boot').hidden);
 return dom;
}
function form(w,id){w.document.getElementById(id).dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}))}
function input(w,id,value){const e=w.document.getElementById(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}))}
function saved(w){return w.eval('structuredClone(state)')}
function ls(w){return Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))}
async function settle(w){await wait(()=>!w.eval('busy'))}
function close(dom){dom.window.eval('db?.close()');dom.window.close()}
(async()=>{
 let dom=await open(),w=dom.window,d=w.document;
 assert.equal(d.getElementById('app').hidden,false);assert.equal(d.getElementById('fatal').hidden,true);
 input(w,'memoryText','SYNTHETIC draft');input(w,'occurredAt','2026-10-18T14:30');
 let storage=ls(w);close(dom);dom=await open(storage);w=dom.window;d=w.document;
 assert.equal(d.getElementById('memoryText').value,'SYNTHETIC draft');assert.equal(d.getElementById('occurredAt').value,'2026-10-18T14:30');
 form(w,'addForm');await settle(w);let state=saved(w);assert.equal(state.items.length,1);assert.equal(state.items[0].text,'SYNTHETIC draft');assert.equal(w.localStorage.getItem('everydayHQ.draft.v1'),null);
 assert.equal(state.items[0].occurredAt,new Date('2026-10-18T14:30').toISOString());
 input(w,'memoryText','SYNTHETIC today');form(w,'addForm');await settle(w);
 state=saved(w);assert.equal(state.items.length,2);assert(Date.now()-Date.parse(state.items[1].occurredAt)<5000);
 storage=ls(w);close(dom);dom=await open(storage);w=dom.window;d=w.document;assert.equal(saved(w).items.length,2);
 w.navigate('find');input(w,'searchInput','sYnThEtIc');assert(d.getElementById('findCount').textContent.includes('2 matching'));
 w.selectEdit(saved(w).items[0].id);input(w,'editText','SYNTHETIC edited');input(w,'editOccurred','2026-10-17T09:00');form(w,'editForm');await settle(w);
 assert.equal(saved(w).items[0].text,'SYNTHETIC edited');assert.equal(saved(w).items[0].occurredAt,new Date('2026-10-17T09:00').toISOString());
 w.navigate('days');d.getElementById('showAll').click();assert.equal(d.querySelectorAll('#dayList .day-heading').length,2);
 d.getElementById('dayPicker').value='2026-10-17';d.getElementById('dayPicker').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('#dayList article').length,1);
 d.querySelector('#dayList [data-action=delete]').click();await settle(w);assert(saved(w).items[0].deletedAt);assert.equal(d.querySelectorAll('#dayList article').length,0);
 w.navigate('settings');d.querySelector('#deletedList button').click();await settle(w);assert.equal(saved(w).items[0].deletedAt,null);
 d.querySelector('[data-scale="1.4"]').click();await settle(w);assert.equal(d.documentElement.style.getPropertyValue('--scale'),'1.4');
 let exported;w.saveFile=(name,body)=>{exported=JSON.parse(body)};await w.backup();assert.equal(exported.items.length,2);assert.equal(exported.schema,'everydayHQ.v2');
 const file=items=>({size:100,text:async()=>JSON.stringify({...exported,items})});
 await w.restoreBackup(file(exported.items));assert.equal(saved(w).items.length,2);
 const changed=structuredClone(exported.items);changed[0].text='SYNTHETIC imported version';
 await w.restoreBackup(file(changed));assert.equal(saved(w).items.length,3);await w.restoreBackup(file(changed));assert.equal(saved(w).items.length,3);
 const before=JSON.stringify(saved(w));await w.restoreBackup({size:10,text:async()=>'{broken'});assert.equal(JSON.stringify(saved(w)),before);
 // Genuine transaction conflict between two independently opened app sessions.
 const other=await open();await w.update(next=>next.items.push({...next.items[0],id:'synthetic-concurrency'}));
 const ok=await other.window.update(next=>next.preferences.scale=1);assert.equal(ok,false);assert(other.window.document.getElementById('saveStatus').textContent.includes('NOT SAVED'));close(other);
 // All deleted entries remain reachable, including numbers beyond the old cap.
 await w.update(next=>{for(let i=0;i<25;i++)next.items.push({...next.items[0],id:'synthetic-deleted-'+i,deletedAt:new Date().toISOString()})});
 assert.equal(d.querySelectorAll('#deletedList button').length,25);
 // Preserve newly typed text if input changes during the asynchronous commit.
 w.navigate('write');input(w,'memoryText','SYNTHETIC saving');form(w,'addForm');input(w,'memoryText','SYNTHETIC next draft');await settle(w);assert.equal(d.getElementById('memoryText').value,'SYNTHETIC next draft');assert.equal(w.localStorage.getItem('everydayHQ.draft.v1'),'SYNTHETIC next draft');
 // Stored malformed data must fail closed without a write or empty reset.
 const broken=new IDBFactory();await new Promise((resolve,reject)=>{const r=broken.open('EverydayHQ_v13',1);r.onupgradeneeded=()=>r.result.createObjectStore('storage');r.onsuccess=()=>{const tx=r.result.transaction('storage','readwrite');tx.objectStore('storage').put({schema:'unknown',items:['preserve-me']},'state');tx.oncomplete=()=>{r.result.close();resolve()}};r.onerror=()=>reject(r.error)});
 const bad=await open({},broken);assert.equal(bad.window.document.getElementById('app').hidden,true);assert.equal(bad.window.document.getElementById('fatal').hidden,false);bad.window.close();
 close(dom);assert.deepEqual(errors,[]);console.log('PASS: CSP hashes/syntax; DOM-ready startup; save; restart persistence; legacy-compatible schema; text/date draft recovery; automatic/custom timestamps; edit; search; day grouping/date filter; soft delete/restore; Huge preference; backup serialization/import/dedup/conflicts/invalid input; concurrent-write protection; >20 deleted recovery; in-flight input retention; corrupt storage fails closed.');
})().catch(e=>{console.error(e);process.exitCode=1});
