#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetReferences,isInside,renderHtml,resolveAsset,validateDeck} from '../src/scene.mjs';

export async function buildHtml(projectDir, outputDir) {
  const repo=await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
  const project=await fs.realpath(projectDir);
  if(isInside(repo,project)) throw new Error('Real projects must live outside the skill repository');
  const requested=path.resolve(outputDir);
  // Canonicalize an existing ancestor so platform aliases such as /tmp work,
  // while output symlinks cannot escape the project.
  let ancestor=requested,output;
  while(true){try{const actual=await fs.realpath(ancestor);output=path.join(actual,path.relative(ancestor,requested));break}catch(e){if(e.code!=='ENOENT')throw e;ancestor=path.dirname(ancestor)}}
  if(!isInside(project,output)||output===project||isInside(repo,output)) throw new Error('Output must be a child of the private project');
  const deck=JSON.parse(await fs.readFile(path.join(project,'deck.json'),'utf8'));
  validateDeck(deck);
  const resolved=await Promise.all(assetReferences(deck).map(async r=>[r,await resolveAsset(project,r)]));
  await fs.mkdir(output,{recursive:true});
  const safeWrite=async filename=>{const parent=await fs.realpath(path.dirname(filename));if(!isInside(project,parent))throw new Error('Output symlink escapes project');try{if((await fs.lstat(filename)).isSymbolicLink())throw new Error('Output file cannot be a symlink')}catch(e){if(e.code!=='ENOENT')throw e}};
  const mapped=new Map();let n=0;
  for(const [r,src] of resolved){const dest=`media/${String(++n).padStart(3,'0')}${path.extname(src)}`;await fs.mkdir(path.join(output,'media'),{recursive:true});await safeWrite(path.join(output,dest));await fs.copyFile(src,path.join(output,dest));mapped.set(r,dest)}
  const outDeck=structuredClone(deck);
  for(const s of outDeck.slides)for(const e of s.elements)for(const key of ['src','poster'])if(mapped.has(e[key]))e[key]=mapped.get(e[key]);
  await safeWrite(path.join(output,'index.html'));
  await fs.writeFile(path.join(output,'index.html'),renderHtml(outDeck));
  return {slides:deck.slides.length,assets:resolved.length,path:path.join(output,'index.html')};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);const arg=k=>args[args.indexOf(k)+1];
  if(!args.includes('--project')||!args.includes('--out'))throw new Error('Usage: --project ABSOLUTE_PROJECT --out PROJECT_OUTPUT');
  console.log(JSON.stringify(await buildHtml(arg('--project'),arg('--out'))));
}
