import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {renderHtml,resolveAsset,validateDeck} from '../src/scene.mjs';
import {buildHtml} from '../scripts/build-html.mjs';
const example=JSON.parse(await fs.readFile(new URL('../examples/fictional.deck.json',import.meta.url),'utf8'));
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
