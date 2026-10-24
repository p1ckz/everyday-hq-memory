// Synthetic interaction audit. No runtime dependency and no live diary access.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),checked=new Set(),errors=[];
const wait=async fn=>{for(let n=0;n<300;n++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('Audit timed out')};
let allow=true,exported,exportCount=0,spoke=[],paused=0,resumed=0;
const dom=new JSDOM(html,{url:'https://p1ckz.github.io/everyday-hq-memory/?layout-test=1',runScripts:'dangerously',virtualConsole:new VirtualConsole().on('jsdomError',e=>errors.push(e.message)),beforeParse(w){
 w.indexedDB=new IDBFactory();w.structuredClone=structuredClone;w.scrollTo=()=>{};w.confirm=()=>allow;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.speechSynthesis={getVoices:()=>[{lang:'en-GB',localService:true}],addEventListener(){},speak:u=>{spoke.push(u);u.onstart?.()},cancel(){},pause(){paused++},resume(){resumed++}};w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
}});
const w=dom.window,d=w.document,$=id=>d.getElementById(id),state=()=>w.eval('structuredClone(state)');
const settle=()=>wait(()=>!w.eval('busy'));
async function click(id){checked.add(id);$(id).click();await settle()}
function input(id,value,type='input'){checked.add(id);$(id).value=value;$(id).dispatchEvent(new w.Event(type,{bubbles:true}))}
async function submit(id){checked.add(id);$(id).click();await settle()}
function summary(selector){const el=d.querySelector(selector);checked.add(selector);const before=el.parentElement.open;el.click();assert.equal(el.parentElement.open,!before);el.click();assert.equal(el.parentElement.open,before)}
async function action(selector){const el=d.querySelector(selector);assert(el,selector);checked.add('action:'+el.dataset.action);el.click();await settle()}
(async()=>{
 await wait(()=>$('boot').hidden);assert($('fatal').hidden);assert.deepEqual(errors,[]);
 for(const b of d.querySelectorAll('[data-page]')){b.click();await settle();assert(!$('page-'+b.dataset.page).hidden);checked.add(b.id||'hub:'+b.dataset.hub)}
 d.querySelector('[data-hub=memory]').click();
 summary('#whenDetails summary');input('memoryText','SYNTHETIC Ann: I need to arrange a sample meeting.');input('occurredAt','2026-10-24T12:00');await submit('saveBtn');assert.equal(state().items.length,1);assert($('saveStatus').textContent.includes('Memory saved on this device'));
 const id=state().items[0].id;await click('editRecent');assert($('editDialog').open);input('editText','SYNTHETIC Ann: I need to arrange a sample meeting. Edited.');input('editOccurred','2026-10-23T12:00');await submit('confirmEdit');assert(!$('editDialog').open);assert.equal(state().items[0].text,$('editText').value);
 await click('editRecent');await click('cancelEdit');assert(!$('editDialog').open);
 await click('editRecent');input('editText','SYNTHETIC dirty edit');allow=false;await click('cancelEdit');assert($('editDialog').open);const cancel=new w.Event('cancel',{cancelable:true});$('editDialog').dispatchEvent(cancel);assert(cancel.defaultPrevented);assert($('editDialog').open);allow=true;await click('cancelEdit');assert(!$('editDialog').open);
 // An unfinished edit is exposed through Settings and recovered by its real button.
 await click('editRecent');input('editText','SYNTHETIC recoverable edit');$('editDialog').close();await click('settingsOpen');assert(!$('editRecovery').hidden);await click('recoverEdit');assert($('editDialog').open);await submit('confirmEdit');await click('settingsClose');
 await click('todayAll');await click('showAll');summary('#recapPanel summary');
 await action('#dayList [data-action=pin]');assert(state().items[0].pinned);await action('#dayList [data-action=followup]');assert(state().items[0].followUp);
 await action('#dayList [data-action=edit]');assert($('editDialog').open);await click('cancelEdit');
 for(const key of ['showToday','showYesterday','showWeek','showAll'])await click(key);
 input('dayPicker','2026-10-23','change');assert.equal($('dayList').querySelectorAll('article').length,1);assert($('recapCount').textContent.includes('1 memory'));
 const recapButton=$('recapList').querySelector('button');assert(recapButton);checked.add('recap:read');recapButton.click();assert(!$('page-vision').hidden);
 await click('readerBack');input('visionText','SYNTHETIC reading sample. '.repeat(100));await click('openReader');assert(!$('visionReaderPanel').hidden);summary('#visionReaderPanel details summary');
 for(const [id,value]of [['readerSize','80'],['readerLine','2.4'],['readerSpacing','6']]){input(id,value);input(id,value,'change');await settle()}
 checked.add('readerFocus');$('readerFocus').checked=true;$('readerFocus').dispatchEvent(new w.Event('input'));$('readerFocus').dispatchEvent(new w.Event('change'));await settle();assert(!$('focusControls').hidden);await click('focusNext');assert($('focusPosition').textContent.includes('Part 2'));await click('focusPrevious');assert($('focusPosition').textContent.includes('Part 1'));
 // Hold an actual save pending while later slider changes arrive.
 const originalPersist=w.persist;let release;const gate=new Promise(resolve=>release=resolve);let held=true;
 w.persist=async next=>{if(held){held=false;await gate}return originalPersist(next)};
 input('readerSize','72');input('readerSize','72','change');assert(w.eval('busy'));
 input('readerLine','2.0');input('readerLine','2.0','change');input('readerSpacing','2');input('readerSpacing','2','change');release();
 await wait(()=>!w.eval('busy')&&!w.eval('savingVision')&&!w.eval('pendingVision'));w.persist=originalPersist;
 assert.equal(state().preferences.vision.font,72);assert.equal(state().preferences.vision.line,2);assert.equal(state().preferences.vision.spacing,2);assert.equal($('readerText').style.lineHeight,'2');
 await click('speakBtn');assert(spoke.length);await click('pauseSpeech');assert.equal(paused,1);await click('pauseSpeech');assert.equal(resumed,1);await click('stopSpeech');assert.equal($('speechStatus').textContent,'Stopped.');await click('readerBack');
 d.querySelector('[data-hub=assistant]').click();assert.equal($('pinnedList').querySelectorAll('article').length,1);assert.equal($('followupList').querySelectorAll('article').length,1);assert.equal($('plansList').querySelectorAll('article').length,0); // edited text has no inferred commitment
 d.querySelector('[data-hub=memory]').click();await click('nav-find');input('searchInput','recoverable');assert($('findCount').textContent.startsWith('1 matching'));input('searchInput','"recoverable edit"');assert($('findCount').textContent.startsWith('1 matching'));
 checked.add('wholeNames');$('wholeNames').checked=true;$('wholeNames').dispatchEvent(new w.Event('change'));assert.equal($('searchList').querySelectorAll('mark').length,1);
 assert($('dateFields').hidden);await click('toggleDates');assert(!$('dateFields').hidden);assert.equal($('toggleDates').getAttribute('aria-expanded'),'true');input('searchFrom','2026-10-23','change');input('searchTo','2026-10-23','change');assert($('findCount').textContent.startsWith('1 matching'));await click('toggleDates');assert($('dateFields').hidden);assert($('findCount').textContent.includes('Dates: 2026-10-23 to 2026-10-23'));await click('toggleDates');input('searchFrom','2026-10-24','change');assert($('findCount').textContent.includes('From date'));await click('clearSearch');assert.equal($('searchFrom').value,'');assert.equal($('searchTo').value,'');assert.equal($('searchInput').value,'');assert(!$('wholeNames').checked);
 await click('settingsOpen');for(const b of d.querySelectorAll('[data-scale]')){checked.add('scale:'+b.dataset.scale);b.click();await settle();assert.equal(state().preferences.scale,Number(b.dataset.scale));assert.equal(b.getAttribute('aria-pressed'),'true')}
 w.saveFile=(name,body)=>{exported=JSON.parse(body);exportCount++};await click('exportBtn');await wait(()=>exportCount===1);assert.equal(exported.schema,'everydayHQ.v2');assert.equal(exported.items.length,1);assert($('backupSettingsStatus').textContent.includes('not verified'));
 const count=state().items.length,importedBackup={...exported,items:[...exported.items,{...exported.items[0],id:'audit-import',text:'SYNTHETIC file import sample',occurredAt:'2026-10-22T12:00:00Z'}]};checked.add('importFile');Object.defineProperty($('importFile'),'files',{configurable:true,value:[{size:200,text:async()=>JSON.stringify(importedBackup)}]});$('importFile').dispatchEvent(new w.Event('change'));await wait(()=>$('toast').textContent.includes('Imported'));await settle();assert.equal(state().items.length,count+1);
 await click('settingsClose');assert(!$('page-find').hidden);await click('nav-write');await click('quickBackup');await wait(()=>exportCount===2);assert(exported.items.some(x=>x.id===id));
 await click('nav-days');await click('showAll');await action('#dayList [data-action=read]');assert(!$('page-vision').hidden);d.querySelector('[data-hub=memory]').click();await click('nav-days');await click('showAll');allow=false;await action('#dayList [data-action=delete]');assert(!state().items[0].deletedAt);allow=true;await action('#dayList [data-action=delete]');assert(state().items[0].deletedAt);await click('settingsOpen');await action('#deletedList [data-action=restore]');assert(!state().items[0].deletedAt);
 checked.add('skip:#main');assert.equal(d.querySelector('.skip').getAttribute('href'),'#main');assert.equal(d.querySelector('#toggleDates').getAttribute('type'),'button');assert.equal(d.querySelector('#toggleDates').getAttribute('aria-controls'),'dateFields');
 const staticControls=[...d.querySelectorAll('button[id],input[id],textarea[id]')].map(x=>x.id);const workerOnly=['applyUpdate'];assert.deepEqual(staticControls.filter(id=>!checked.has(id)&&!workerOnly.includes(id)),[],'Every static interactive id must be exercised');
 assert.deepEqual(errors,[]);console.log('PASS: '+checked.size+' control paths, all static button/input IDs, every navigation tab; details, dates, edits, cancel/Escape, recovery, flags, recap reader, all reader controls and mocked speech; backup buttons/file import; delete cancel/restore; explicit date disclosure and collapsed active-date feedback. Update guards and real worker lifecycle are covered by test-next.cjs.');
 w.eval('db.close()');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
