import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {renderHtml,resolveAsset,validateDeck,flowPaths,maxSlideStep,presentationState,presentationOpacity,mediaIsVisible} from '../src/scene.mjs';
import {appendSlides} from '../src/editable.mjs';
import {buildHtml} from '../scripts/build-html.mjs';
const example=JSON.parse(await fs.readFile(new URL('../examples/fictional.deck.json',import.meta.url),'utf8'));
const flowExample=()=>({title:'Fictional signal route',slides:[{id:'route',title:'A lamp responds',elements:[{type:'flow',x:100,y:200,w:300,h:140,points:[[10,20],[280,20],[280,120]],width:3,color:'#0877D1',step:1,ghost:true,focusStep:2}]}]});
test('generated browser program parses as JavaScript',()=>{const html=renderHtml(example);const js=html.split('<script>')[1].split('</script>')[0];assert.doesNotThrow(()=>new vm.Script(js))});
test('fictional example builds outside the repository without research files',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'research-talk-test-'));
 try{await fs.writeFile(path.join(p,'deck.json'),JSON.stringify(example));const r=await buildHtml(p,path.join(p,'dist'));assert.equal(r.slides,2);assert.match(await fs.readFile(r.path,'utf8'),/SYNTHETIC EXAMPLE/)}finally{await fs.rm(p,{recursive:true,force:true})}
});
test('escapes literal text and notes instead of evaluating markup',()=>{
 const d=structuredClone(example);d.title="Lumen's \"demo\" </script>";d.slides[0].elements[0].text='<img onerror="alert(1)">';d.slides[0].notes='</script><script>alert(1)</script>';const html=renderHtml(d);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('</script><script>alert(1)'));assert.doesNotThrow(()=>new vm.Script(html.split('<script>')[1].split('</script>')[0]));
});
test('rejects inconsistent chart data and out-of-canvas geometry',()=>{
 const d=structuredClone(example);d.slides[1].elements[1].series[0].values=[1];assert.throws(()=>validateDeck(d),/matching/);const g=structuredClone(example);g.slides[0].elements[0].x=-1;assert.throws(()=>validateDeck(g),/bounds/);
});
test('rejects traversal and symlinked assets outside a project',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'research-talk-test-'));
 try{await fs.mkdir(path.join(p,'project'));await fs.writeFile(path.join(p,'secret'),'private');await fs.symlink(path.join(p,'secret'),path.join(p,'project','link'));await assert.rejects(resolveAsset(path.join(p,'project'),'../secret'),/escapes/);await assert.rejects(resolveAsset(path.join(p,'project'),'link'),/escapes/)}finally{await fs.rm(p,{recursive:true,force:true})}
});
test('refuses output outside the project and repository-local projects',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'research-talk-test-'));
 try{await assert.rejects(buildHtml(p,path.dirname(p)),/child/);const repo=fileURLToPath(new URL('..',import.meta.url));await assert.rejects(buildHtml(repo,path.join(repo,'dist')),/outside/)}finally{await fs.rm(p,{recursive:true,force:true})}
});

test('refuses preexisting output symlinks without changing their targets',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'research-talk-test-'));
 try{const project=path.join(p,'project');await fs.mkdir(path.join(project,'dist'),{recursive:true});await fs.writeFile(path.join(project,'deck.json'),JSON.stringify(example));await fs.writeFile(path.join(p,'target'),'unchanged');await fs.symlink(path.join(p,'target'),path.join(project,'dist','index.html'));await assert.rejects(buildHtml(project,path.join(project,'dist')),/symlink/);assert.equal(await fs.readFile(path.join(p,'target'),'utf8'),'unchanged')}finally{await fs.rm(p,{recursive:true,force:true})}
});

test('flow validates finite geometry and keeps arrowheads within its box',()=>{
 const d=flowExample();assert.doesNotThrow(()=>validateDeck(d));
 const paths=flowPaths(d.slides[0].elements[0]);assert.equal(paths.length,2);assert.deepEqual(paths[1][1],[280,120]);
 for(const p of paths.flat())assert.ok(p[0]>=0&&p[0]<=300&&p[1]>=0&&p[1]<=140);
 const edge={...d.slides[0].elements[0],points:[[0,0],[300,0]]};assert.doesNotThrow(()=>validateDeck({...d,slides:[{...d.slides[0],elements:[edge]}]}));
 for(const p of flowPaths(edge).flat())assert.ok(p[0]>=0&&p[0]<=300&&p[1]>=0&&p[1]<=140);
 assert.equal(flowPaths({...edge,arrow:false}).length,1);
 for(const edit of [{points:[[0,0]]},{points:[[0,0],[301,20]]},{points:[[0,0],[-1,20]]},{points:[[0,0],[10,Infinity]]},{points:[[0,0],[10,NaN]]},{points:[[0,0],[0,0]]},{width:0},{width:Infinity},{arrow:'yes'},{w:0},{focusStep:-1},{focusStep:1.5},{ghost:1}]){
  const broken=flowExample();Object.assign(broken.slides[0].elements[0],edit);assert.throws(()=>validateDeck(broken));
 }
});

test('flow and focus HTML preserve a parseable offline program and print all content',()=>{
 const d=flowExample(),html=renderHtml(d);
 assert.match(html,/<polyline[^>]* points="10,20 280,20 280,120"/);
 assert.equal((html.match(/<polyline /g)||[]).length,2);
 assert.match(html,/class="el flow ghost" data-key="s0e0" data-step="1" data-focus-step="2"/);
 assert.match(html,/@media print[\s\S]*\.el\.expired\{opacity:1!important;transform:none!important;visibility:visible!important\}/);
 assert.doesNotThrow(()=>new vm.Script(html.split('<script>')[1].split('</script>')[0]));
 d.slides[0].elements[0].arrow=false;assert.equal((renderHtml(d).match(/<polyline /g)||[]).length,1);
});

test('editable flow output uses native open paths and ignores presentation opacity',async()=>{
 const shapes=[],slide={background:{},speakerNotes:{},shapes:{add(config){shapes.push(config);let text={};return {get text(){return text},set text(value){text={value}}}}}};
 const presentation={slides:{add(){return slide}}};await appendSlides(presentation,flowExample());
 const flow=shapes.find(s=>s.geometry==='custom');assert.ok(flow);assert.equal(flow.fill,'none');assert.equal(flow.line.fill,'#0877D1');assert.equal(flow.customPaths.length,2);
 assert.deepEqual(flow.customPaths[0].commands,[{moveTo:{x:10,y:20}},{lineTo:{x:280,y:20}},{lineTo:{x:280,y:120}}]);
 assert.ok(flow.customPaths.every(p=>p.commands.every(c=>!('close'in c))));assert.ok(!('opacity'in flow));assert.ok(!('ghost'in flow));
});


const motionExample=()=>({title:'Fictional lamp experiment',slides:[{id:'builds',title:'One change at a time',builds:[{label:'Observe',note:'A fictional lamp is off.'},{label:'Connect',note:'The wire is illustrative.'},{label:'Compare',note:'Synthetic data only.'}],elements:[
 {type:'text',text:'SYNTHETIC EXAMPLE',x:80,y:80,w:600,h:80,color:'#101214',step:0,focusSteps:[0,2],states:[{step:1,x:140,color:'#0877D1',opacity:.8},{step:2,w:700,bold:true}]},
 {type:'rect',x:100,y:300,w:200,h:100,fill:'#ABCDEF',step:1,until:1,static:false},
 {type:'chart',x:500,y:300,w:800,h:400,step:0,categories:['Lamp A','Lamp B'],series:[{name:'Trial',values:[30,60]}],categorySteps:[0,1],seriesSteps:[2],max:100},
 {type:'table',x:100,y:710,w:900,h:100,values:[['Lamp','Value'],['A',30]],rowSteps:[0,2]},
]}]});

test('semantic builds and internal data reveal steps contribute to navigation',()=>{
 const d=motionExample();validateDeck(d);assert.equal(maxSlideStep(d.slides[0]),2);
 d.slides[0].builds.push({label:'Pause'},{label:'Reflect'});assert.equal(maxSlideStep(d.slides[0]),4);
 d.slides[0].elements[2].seriesSteps=[5];assert.equal(maxSlideStep(d.slides[0]),5);
 d.slides[0].elements[3].rowSteps=[0,6];assert.equal(maxSlideStep(d.slides[0]),6);
});

test('cumulative visual states rewind from the immutable base',()=>{
 const d=motionExample(),e=d.slides[0].elements[0],before=JSON.stringify(d);
 assert.deepEqual(presentationState(e,0),{opacity:1});
 assert.deepEqual(presentationState(e,2),{opacity:.8,x:140,color:'#0877D1',w:700,bold:true});
 assert.deepEqual(presentationState(e,1),{opacity:.8,x:140,color:'#0877D1'});
 assert.deepEqual(presentationState(e,0),{opacity:1});assert.equal(JSON.stringify(d),before);
 assert.equal(presentationOpacity(e,0),1);assert.equal(presentationOpacity(e,1),.2);assert.equal(presentationOpacity(e,2),.8);
 assert.equal(presentationOpacity({step:2,ghost:true,focusSteps:[3]},1),.14);
 assert.equal(presentationOpacity({step:0,until:1},2),0);
 assert.equal(mediaIsVisible({step:1,until:2},0),false);assert.equal(mediaIsVisible({step:1,until:2},2),true);assert.equal(mediaIsVisible({step:1,until:2},3),false);
 assert.equal(mediaIsVisible({states:[{step:0,opacity:0}]},0),false);
});

test('rejects invalid build descriptors, state types, cumulative geometry, and data dimensions',()=>{
 for(const builds of [[],null,[{label:1}],[{note:{}}],[{label:'x',script:'alert(1)'}]]){const d=motionExample();d.slides[0].builds=builds;assert.throws(()=>validateDeck(d));}
 for(const edit of [{until:-1},{step:2,until:1},{static:'false'},{focusSteps:[]},{focusSteps:[1.2]},{states:null},{states:[{step:0,opacity:Infinity}]},{states:[{step:0,opacity:-.1}]},{states:[{step:0,opacity:1.1}]},{states:[{step:0,bold:1}]},{states:[{step:0,color:1}]},{states:[{step:0,fill:'red;position:fixed'}]},{states:[{step:0,stroke:'url(secret)'}]},{states:[{step:1,x:900},{step:2,w:900}]},{states:[{step:0,w:0}]},{states:[{step:0,y:NaN}]},{states:[{step:2},{step:1}]},{states:[{step:1},{step:1}]},{states:[{step:1,text:'new content'}]},{rowSteps:[1]}]){
  const d=motionExample();Object.assign(d.slides[0].elements[0],edit);assert.throws(()=>validateDeck(d),JSON.stringify(edit));
 }
 for(const edit of [{categorySteps:[0]},{seriesSteps:[0,1]},{categorySteps:[0,-1]},{max:40}]){const d=motionExample();Object.assign(d.slides[0].elements[2],edit);assert.throws(()=>validateDeck(d));}
 const d=motionExample();d.slides[0].elements[3].rowSteps=[0];assert.throws(()=>validateDeck(d));
});

test('HTML reveals whole chart groups and table rows without changing base data or scale',()=>{
 const d=motionExample(),html=renderHtml(d),chart=html.match(/<svg viewBox="0 0 800 400"[\s\S]*?<\/svg>/)[0];
 assert.equal((chart.match(/class="build-group"/g)||[]).length,4);
 assert.equal((chart.match(/data-reveal-step="2"/g)||[]).length,2);
 assert.match(chart,/>30<\/text>/);assert.match(chart,/>60<\/text>/);assert.match(chart,/>100<\/text>/);
 assert.match(html,/<tr class="build-group" data-reveal-step="2"><td>A<\/td><td>30<\/td>/);
 assert.match(html,/<style id="motionStyles" media="screen"><\/style>/);
 assert.match(html,/data-key="s0e0"[^>]*style="left:80px;top:80px;width:600px;height:80px;/);
 assert.match(html,/\.el\.ephemeral\{display:none!important\}/);
 assert.match(html,/\.build-group\.build-pending\{visibility:visible!important;opacity:1!important\}/);
 assert.doesNotThrow(()=>new vm.Script(html.split('<script>')[1].split('</script>')[0]));
});

test('literal build labels and notes survive serialization without executing markup',()=>{
 const d=motionExample();d.title='A </script> title';d.slides[0].builds[0]={label:'<img src=x>',note:'</script><script>danger()</script>'};
 const html=renderHtml(d),js=html.split('<script>')[1].split('</script>')[0];assert.doesNotThrow(()=>new vm.Script(js));assert.ok(!html.includes('</script><script>danger()'));
 const values=JSON.parse(vm.runInNewContext(js.split('\n')[1]+';JSON.stringify({deckTitle,beat:notes[0].builds[0]})'));
 assert.equal(values.deckTitle,d.title);assert.deepEqual(values.beat,d.slides[0].builds[0]);
});

test('native output keeps base text, geometry, all data, and omits ephemeral media',async()=>{
 const d=motionExample();d.slides[0].elements.push({type:'video',src:'fictional.mp4',poster:'fictional.jpg',x:100,y:300,w:300,h:200,static:false});
 const shapes=[],charts=[],tables=[];const slide={background:{},speakerNotes:{},shapes:{add(config){shapes.push(config);let text={};return {get text(){return text},set text(value){text={value}}}}},charts:{add(type,config){charts.push(config)}},tables:{add(config){tables.push(config);return {borders:{assign(){}},getCell(){return {text:{}}}}}},images:{add(){throw new Error('An ephemeral image must not be exported')}}};
 await appendSlides({slides:{add(){return slide}}},d,{loadAsset(){throw new Error('An ephemeral asset must not be loaded')}});
 const text=shapes.find(s=>s.name==='builds-text');assert.equal(text.position.left,80);assert.equal(text.position.width,600);assert.equal(shapes.filter(s=>s.geometry==='rect').length,0);
 assert.deepEqual(charts[0].series[0].values,[60,30]);assert.equal(charts[0].yAxis.max,100);assert.equal(tables[0].rows,2);assert.deepEqual(tables[0].values,d.slides[0].elements[3].values);
 assert.match(slide.speakerNotes.text,/Build 2: Connect/);assert.ok(!slide.speakerNotes.text.includes('fictional.mp4'));
});

// This tiny DOM stub executes our generated program as a unit test. It does not
// automate a browser; interactive rendering remains a separate visual review.
function runProgram(deck,{hash='',reduced=false}={}) {
 const listeners={},controls={},videos=[];
 const node=(dataset={})=>{const classes=new Set();return {dataset,style:{setProperty(){}},children:[],textContent:'',classList:{contains:k=>classes.has(k),toggle(k,on){const use=on??!classes.has(k);use?classes.add(k):classes.delete(k);return use},remove:k=>classes.delete(k)},setAttribute(){},append(v){this.children.push(v)},replaceChildren(){this.children=[]},querySelector(){return null},querySelectorAll(){return []}}};
 const slides=deck.slides.map((slide,i)=>{const el=node(),elements=slide.elements.map((meta,j)=>{const element=node({key:`s${i}e${j}`});if(meta.type==='video'){const button=node(),v={paused:true,plays:0,pauses:0,poster:'fixture.jpg',nextElementSibling:button,play(){this.paused=false;this.plays++;return Promise.resolve()},pause(){this.paused=true;this.pauses++}};element.querySelector=selector=>selector==='video'?v:selector==='.play'?button:null;videos.push({v,button,element});}return element});el.querySelectorAll=selector=>selector==='.el'?elements:[];return el});
 for(const key of ['stage','overview','motionStyles','counter','progress','notes','next','prev','notesButton','overviewButton','fullscreenButton'])controls[key]=node();
 const document={hidden:false,title:'',body:node(),querySelectorAll:selector=>selector==='.slide'?slides:selector==='.video'?videos.map(v=>v.element):[],querySelector:selector=>controls[selector.slice(1)],createElement:()=>node(),addEventListener:(name,fn)=>listeners[name]=fn};
 const location={hash};const context=vm.createContext({document,location,history:{replaceState(a,b,next){location.hash=next}},innerWidth:1600,innerHeight:900,matchMedia:()=>({matches:reduced,addEventListener(){}}),addEventListener:(name,fn)=>listeners[name]=fn});
 vm.runInContext(renderHtml(deck).split('<script>')[1].split('</script>')[0],context);
 return {context,controls,videos,location,listeners};
}

test('generated navigation rewinds state, reads hashes, and exposes the current beat',()=>{
 const run=runProgram(motionExample(),{hash:'#1.2'});assert.match(run.controls.motionStyles.textContent,/left:140px/);assert.match(run.controls.motionStyles.textContent,/width:700px/);assert.equal(run.controls.counter.textContent,'1 / 1 · 3 / 3');
 run.context.prev();assert.equal(run.location.hash,'#1.1');assert.match(run.controls.motionStyles.textContent,/left:140px/);assert.ok(!run.controls.motionStyles.textContent.includes('width:700px'));
 run.context.prev();assert.ok(!run.controls.motionStyles.textContent.includes('left:140px'));assert.equal(run.controls.notes.children[1].textContent,'步骤 1 / 3 · Observe');
 run.location.hash='#1.2';run.listeners.hashchange();assert.equal(run.controls.counter.textContent,'1 / 1 · 3 / 3');
 run.location.hash='#999.999';run.listeners.hashchange();assert.equal(run.location.hash,'#1.2');
});

test('manual media pause survives builds, expiry pauses, and reduced motion needs an explicit play',async()=>{
 const d={title:'Fictional loop',slides:[{id:'loop',title:'Lamp loop',builds:[{label:'A'},{label:'B'},{label:'C'}],elements:[{type:'video',src:'fictional.mp4',poster:'fictional.jpg',x:0,y:0,w:400,h:300,until:1}]}]};
 const run=runProgram(d),{v,button}=run.videos[0];await Promise.resolve();assert.equal(v.plays,1);button.onclick();assert.equal(v.paused,true);run.context.next();assert.equal(v.plays,1);assert.equal(v.paused,true);
 button.onclick();await Promise.resolve();assert.equal(v.plays,2);run.context.next();assert.equal(v.paused,true);run.context.prev();await Promise.resolve();assert.equal(v.plays,3);
 const quiet=runProgram(d,{reduced:true});assert.equal(quiet.videos[0].v.plays,0);quiet.videos[0].button.onclick();await Promise.resolve();assert.equal(quiet.videos[0].v.plays,1);
 run.listeners.beforeprint();assert.equal(v.paused,true);run.listeners.afterprint();await Promise.resolve();assert.equal(v.paused,false);
});

test('flow draw traces a normalized path, delays its head, and retains instant static fallbacks',async()=>{
 const d=flowExample();d.slides[0].elements[0].draw=true;const html=renderHtml(d);
 assert.match(html,/<polyline class="flow-stroke" pathLength="1"/);assert.match(html,/<polyline class="flow-head"/);assert.match(html,/trace-flow 600ms/);assert.match(html,/show-flow-head 60ms linear 540ms/);
 assert.match(html,/@media\(prefers-reduced-motion:reduce\)[\s\S]*stroke-dashoffset:0!important/);assert.match(html,/@media print[\s\S]*stroke-dasharray:none!important/);
 assert.match(html,/\.draw:not\(\.pending\):not\(\.expired\):not\(\.state-hidden\)/);
 assert.doesNotThrow(()=>new vm.Script(html.split('<script>')[1].split('</script>')[0]));
 const wrong=motionExample();wrong.slides[0].elements[0].draw=true;assert.throws(()=>validateDeck(wrong),/Draw/);d.slides[0].elements[0].draw='yes';assert.throws(()=>validateDeck(d),/Draw/);
});
