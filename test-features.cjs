const {JSDOM,VirtualConsole}=require('jsdom');
const {IDBFactory}=require('fake-indexeddb');
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8'),idb=new IDBFactory();
const pause=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let n=0;n<300;n++){if(fn())return;await pause()}throw Error('Timed out')}
let voices=[{name:'Synthetic local English voice',lang:'en-GB',localService:true}],spoken=[],cancelCount=0,pauseCount=0,resumeCount=0;
async function open(storage={},url='https://p1ckz.github.io/everyday-hq-memory/',brokenSpeech=false){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  w.indexedDB=idb;w.structuredClone=structuredClone;w.confirm=()=>true;w.scrollTo=()=>{};
  w.speechSynthesis={getVoices:()=>voices,speak:u=>{spoken.push(u);u.onstart?.()},cancel:()=>cancelCount++,pause:()=>pauseCount++,resume:()=>resumeCount++,addEventListener:()=>{}};
  if(brokenSpeech)for(const key of ['getVoices','cancel','addEventListener'])w.speechSynthesis[key]=()=>{throw Error('Synthetic unavailable speech API')};
  w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
  for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 }});
 await until(()=>dom.window.document.getElementById('boot').hidden);assert.equal(dom.window.document.getElementById('fatal').hidden,true);assert.deepEqual(errors,[]);return dom;
}
function field(w,id,value){const e=w.document.getElementById(id);e.value=value;e.dispatchEvent(new w.Event('input',{bubbles:true}))}
async function settle(w){await until(()=>!w.eval('busy'))}
function state(w){return w.eval('structuredClone(state)')}
function storage(w){return Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))}
function close(dom){dom.window.eval('db.close()');dom.window.close()}
(async()=>{
 let dom=await open(),w=dom.window,d=w.document;
 const stamp='2026-10-18T10:00:00.000Z';
 const old={schema:'everydayHQ.v2',revision:0,items:[{id:'synthetic-old',text:'SYNTHETIC: I need to prepare the sample.',occurredAt:stamp,createdAt:stamp,updatedAt:stamp,deletedAt:null}],preferences:{scale:1.4}};
 await w.restoreBackup({size:100,text:async()=>JSON.stringify(old)});
 assert.equal(state(w).items.length,1);assert.equal(state(w).items[0].pinned,false);assert.equal(state(w).items[0].text,old.items[0].text);
 w.navigate('assistant');assert.equal(d.querySelectorAll('#plansList article').length,1);assert.equal(d.querySelectorAll('#pinnedList article').length,0);
 d.querySelector('#plansList [data-action=pin]').click();await settle(w);assert.equal(state(w).items[0].pinned,true);assert.equal(d.querySelectorAll('#pinnedList article').length,1);
 await w.restoreBackup({size:100,text:async()=>JSON.stringify(old)});assert.equal(state(w).items.length,1);assert(state(w).items[0].pinned);
 // Importing pins from a new backup adds the pin without duplicating a memory.
 let exported;w.saveFile=(n,b)=>{exported=JSON.parse(b)};await w.backup();assert(exported.items[0].pinned);await w.update(next=>next.items[0].pinned=false);
 await w.restoreBackup({size:100,text:async()=>JSON.stringify(exported)});assert.equal(state(w).items.length,1);assert(state(w).items[0].pinned);
 w.navigate('days');d.getElementById('dayPicker').value='2026-10-18';d.getElementById('dayPicker').dispatchEvent(new w.Event('change'));
 assert(d.getElementById('recapCount').textContent.startsWith('1 memory recorded'));assert(d.getElementById('recapList').textContent.includes(old.items[0].text));
 d.querySelector('#dayList [data-action=delete]').click();await settle(w);assert.equal(d.querySelectorAll('#plansList article').length,0);assert.equal(d.querySelectorAll('#pinnedList article').length,0);assert.equal(d.querySelectorAll('#recapList li').length,0);
 w.navigate('settings');d.querySelector('#deletedList button').click();await settle(w);assert(state(w).items[0].pinned);
 w.navigate('assistant');d.querySelector('#pinnedList [data-action=read]').click();assert.equal(w.eval('page'),'vision');assert.equal(d.getElementById('readerText').textContent,old.items[0].text);assert.equal(d.getElementById('visionReaderPanel').hidden,false);assert.equal(d.getElementById('memoryNav').hidden,false);
 const text='SYNTHETIC reader text. '.repeat(70)+'\nSecond paragraph <script>unsafe()</script>.';
 d.getElementById('readerBack').click();field(w,'visionText',text);d.getElementById('openReader').click();assert.equal(d.getElementById('readerText').textContent,text);assert.equal(d.querySelectorAll('#readerText script').length,0);
 const prefs={readerSize:'80',readerLine:'2.4',readerSpacing:'6'};
 for(const [id,val]of Object.entries(prefs)){field(w,id,val);d.getElementById(id).dispatchEvent(new w.Event('change'));await settle(w)}
 d.getElementById('readerFocus').checked=true;d.getElementById('readerFocus').dispatchEvent(new w.Event('input'));d.getElementById('readerFocus').dispatchEvent(new w.Event('change'));await settle(w);
 assert.equal(d.getElementById('readerText').style.fontSize,'80px');assert.equal(d.getElementById('readerText').style.lineHeight,'2.4');assert.equal(d.getElementById('readerText').style.letterSpacing,'6px');assert(d.getElementById('readerText').textContent.length<text.length);
 const first=d.getElementById('readerText').textContent;d.getElementById('focusNext').click();assert.notEqual(d.getElementById('readerText').textContent,first);assert(d.getElementById('focusPosition').textContent.includes('Part 2'));d.getElementById('focusPrevious').click();assert.equal(d.getElementById('readerText').textContent,first);
 d.getElementById('speakBtn').click();assert(spoken.length>0);assert.equal(spoken[0].voice.localService,true);assert.equal(d.getElementById('speechStatus').textContent,'Reading aloud.');
 d.getElementById('pauseSpeech').click();assert.equal(pauseCount,1);assert.equal(d.getElementById('pauseSpeech').textContent,'Resume');d.getElementById('pauseSpeech').click();assert.equal(resumeCount,1);
 const stale=spoken.at(-1);d.getElementById('stopSpeech').click();const count=spoken.length;stale.onend();assert.equal(spoken.length,count);assert.equal(d.getElementById('speechStatus').textContent,'Stopped.');
 // Complete every utterance and ensure the queue ends cleanly.
 spoken=[];w.speakReadingText();for(let i=0;i<20&&d.getElementById('speechStatus').textContent!=='Finished reading.';i++)spoken.at(-1).onend();assert.equal(d.getElementById('speechStatus').textContent,'Finished reading.');
 w.speakReadingText();spoken.at(-1).onerror();assert(d.getElementById('speechStatus').textContent.startsWith('Could not read aloud.'));
 voices=[{lang:'en-GB',localService:false}];w.updateSpeechAvailability();assert(d.getElementById('speakBtn').disabled);const remoteBefore=spoken.length;w.speakReadingText();assert.equal(spoken.length,remoteBefore);
 voices=[{lang:'en-GB',localService:true}];w.updateSpeechAvailability();w.speakReadingText();w.navigate('write');assert.equal(w.eval('currentUtterance'),null);assert(d.getElementById('speechStatus').textContent==='Stopped.');
 // Editing during a pending commit must retain the newer text and date.
 w.selectEdit(state(w).items[0].id);
 field(w,'editText','SYNTHETIC first edit');field(w,'editOccurred','2026-10-18T11:00');
 d.getElementById('editForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 field(w,'editText','SYNTHETIC newer edit');field(w,'editOccurred','2026-10-18T12:00');
 await settle(w);assert.equal(state(w).items[0].text,'SYNTHETIC first edit');assert.equal(d.getElementById('editText').value,'SYNTHETIC newer edit');assert.equal(d.getElementById('editOccurred').value,'2026-10-18T12:00');assert(d.getElementById('editDialog').open);
 d.getElementById('editForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await settle(w);assert.equal(state(w).items[0].text,'SYNTHETIC newer edit');assert.equal(d.getElementById('editDialog').open,false);
 // A post-commit display error must not undo the saved revision or say NOT SAVED.
 const savedRender=w.render,beforeRevision=state(w).revision;w.render=()=>{throw Error('Synthetic redraw failure')};
 const committed=await w.update(next=>next.preferences.scale=1.2);assert.equal(committed,true);assert.equal(state(w).revision,beforeRevision+1);assert(d.getElementById('saveStatus').textContent.startsWith('Saved on this device.'));w.render=savedRender;
 // A following transaction must use the committed revision successfully.
 assert.equal(await w.update(next=>next.preferences.scale=1.4),true);
 const speechFault=await open({},'https://p1ckz.github.io/everyday-hq-memory/',true);assert.equal(speechFault.window.document.getElementById('app').hidden,false);assert(speechFault.window.document.getElementById('speakBtn').disabled);speechFault.window.navigate('vision');field(speechFault.window,'visionText','SYNTHETIC reading without speech');speechFault.window.openReader();speechFault.window.navigate('write');assert.equal(speechFault.window.eval('page'),'write');close(speechFault);
 const local=storage(w);close(dom);dom=await open(local);w=dom.window;d=w.document;
 assert.equal(d.getElementById('visionText').value,text);assert.equal(state(w).preferences.vision.font,80);assert.equal(state(w).preferences.vision.focus,true);assert(state(w).items[0].pinned);
 // Untrusted backup preferences cannot inject styles or invalidate the layout.
 const badPrefs=w.validated({...old,preferences:{scale:999,vision:{font:'100vw',line:-2,spacing:Infinity,focus:'yes'}}});assert.equal(badPrefs.preferences.vision.font,40);assert.equal(badPrefs.preferences.vision.focus,false);
 const testDom=await open({},'https://p1ckz.github.io/everyday-hq-memory/?layout-test=1');assert.equal(state(testDom.window).items.length,0);assert.equal(testDom.window.document.getElementById('visionText').value,'');assert.equal(testDom.window.document.getElementById('layoutTestNotice').hidden,false);await testDom.window.restoreBackup({size:100,text:async()=>JSON.stringify({...old,items:[{...old.items[0],id:'isolated-test'}]})});assert.equal(state(w).items.length,1);close(testDom);close(dom);console.log('PASS: old backup compatibility; pin/unpin persistence and backup pin merge; exact daily recap; assistant keyword matching and deleted exclusion; reader from memory; safe text rendering; size/line/letter controls; focus navigation; reading draft/preferences reopen; mocked local-only speech, chunk queue, pause/resume/stop/error/cancellation; remote voice refusal; invalid preference defaults; isolated layout data store; edits typed during commit; truthful post-commit redraw failure; speech API failures do not block startup or navigation.');
})().catch(e=>{console.error(e);process.exitCode=1});
