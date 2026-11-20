#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const args=process.argv.slice(2),denypath=args.includes('--denylist')?args[args.indexOf('--denylist')+1]:null;
const deny=denypath?JSON.parse(await fs.readFile(denypath,'utf8')):[];
const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const errors=[];
for(const file of files){
 const p=path.join(root,file),stat=await fs.lstat(p);
 if(stat.isSymbolicLink()){errors.push(`${file}: symlinks are not accepted in the public source tree`);continue}
 if(/\.(mp4|mov|pdf|pptx|png|jpg|jpeg|zip|csv|parquet)$/i.test(file))errors.push(`${file}: review binary or data artifact before publication`);
 const text=await fs.readFile(p,'utf8');
 for(const word of deny)if(word&&text.toLowerCase().includes(word.toLowerCase()))errors.push(`${file}: private denylist match`);
 if(/\/(Users|home)\/[a-z0-9_.-]+\//i.test(text))errors.push(`${file}: machine-specific user path`);
 if(/(?:ghp_|github_pat_|sk-proj-)[A-Za-z0-9_]{20,}/.test(text))errors.push(`${file}: possible credential`);
}
console.log(JSON.stringify({files:files.length,errors},null,2));
if(errors.length)process.exitCode=1;
