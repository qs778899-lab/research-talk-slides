import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {renderHtml,resolveAsset,validateDeck,flowPaths} from '../src/scene.mjs';
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
 assert.match(html,/<polyline points="10,20 280,20 280,120"/);
 assert.equal((html.match(/<polyline /g)||[]).length,2);
 assert.match(html,/class="el flow ghost" data-step="1" data-focus-step="2"/);
 assert.match(html,/@media print[\s\S]*\.el\.pending,\.el\.focus-dim,\.el\.pending\.ghost\{opacity:1;transform:none\}/);
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
