import fs from 'node:fs/promises';
import path from 'node:path';

export const theme = { ink: '#101214', blue: '#0877D1', gray: '#747A80', light: '#E6E9EB', paper: '#FFFFFF' };
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types = new Set(['text','image','video','line','rect','flow','chart','table']);
export function isInside(root, candidate) {
  const r = path.relative(root, candidate);
  return r === '' || (!r.startsWith(`..${path.sep}`) && r !== '..' && !path.isAbsolute(r));
}
export async function resolveAsset(project, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || /^[a-z]+:/i.test(relative)) throw new Error('Assets must use project-relative paths');
  const root = await fs.realpath(project);
  const target = await fs.realpath(path.resolve(root, relative));
  if (!isInside(root, target)) throw new Error('Asset escapes the private project');
  if (!(await fs.stat(target)).isFile()) throw new Error('Asset must be a file');
  return target;
}
export function validateDeck(deck) {
  if (!deck || typeof deck.title !== 'string' || !Array.isArray(deck.slides) || !deck.slides.length) throw new Error('A deck needs a title and slides');
  const width=deck.width ?? 1600, height=deck.height ?? 900;
  const ids=new Set();
  for (const s of deck.slides) {
    if (!s.id || ids.has(s.id)) throw new Error('Slide IDs must be unique');
    ids.add(s.id);
    if (!Array.isArray(s.elements)) throw new Error('Slide elements must be an array');
    for (const e of s.elements) {
      if (!types.has(e.type)) throw new Error(`Unsupported element: ${e.type}`);
      for (const k of ['x','y','w','h']) if (!Number.isFinite(e[k])) throw new Error(`Invalid ${k} in ${s.id}`);
      if (e.x<0 || e.y<0 || e.w<=0 || e.h<=0 || e.x+e.w>width+1 || e.y+e.h>height+1) throw new Error(`Out-of-bounds element in ${s.id}`);
      if (e.step != null && (!Number.isInteger(e.step)||e.step<0)) throw new Error('Invalid reveal step');
      if (e.focusStep != null && (!Number.isInteger(e.focusStep)||e.focusStep<0)) throw new Error('Invalid focus step');
      if (e.ghost != null && typeof e.ghost!=='boolean') throw new Error('Ghost must be boolean');
      if (e.type==='flow') {
        if (!Array.isArray(e.points)||e.points.length<2) throw new Error('Flow requires at least two points');
        if (e.width!=null&&(!Number.isFinite(e.width)||e.width<=0)) throw new Error('Invalid flow line width');
        if (e.arrow!=null&&typeof e.arrow!=='boolean') throw new Error('Flow arrow must be boolean');
        for (let j=0;j<e.points.length;j++) {
          const p=e.points[j];
          if (!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[1]<0||p[0]>e.w||p[1]>e.h) throw new Error('Flow points must be finite and inside its bounds');
          if (j&&p[0]===e.points[j-1][0]&&p[1]===e.points[j-1][1]) throw new Error('Flow consecutive points must differ');
        }
      }
      if (e.type==='chart') {
        if (!e.categories?.length || !e.series?.length) throw new Error('Chart data missing');
        for (const ser of e.series) if (ser.values.length!==e.categories.length || ser.values.some(v=>!Number.isFinite(v)||v<0)) throw new Error('Chart requires matching nonnegative values');
      }
      if (e.type==='table' && (!e.values?.length || e.values.some(row=>row.length!==e.values[0].length))) throw new Error('Table rows must have matching columns');
      if (e.href && !/^https:\/\//.test(e.href)) throw new Error('Media links must use HTTPS');
    }
  }
  return {width,height,slides:deck.slides.length};
}
export function assetReferences(deck) {
  return [...new Set(deck.slides.flatMap(s=>s.elements.flatMap(e=>['image','video'].includes(e.type)?[e.src,e.poster].filter(Boolean):[])))];
}
// Both renderers use the same path geometry. Leave room around the endpoint
// for a symmetric head; head points are bounded by the supplied viewport.
export function flowPaths(e) {
  const paths=[e.points];
  if(e.arrow!==false){
    const [a,b]=e.points.slice(-2),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const size=Math.min(14,Math.max(8,(e.width??3)*3),length*.6),ux=dx/length,uy=dy/length;
    const point=side=>[Math.max(0,Math.min(e.w,b[0]-ux*size-uy*size*.5*side)),Math.max(0,Math.min(e.h,b[1]-uy*size+ux*size*.5*side))];
    paths.push([point(1),b,point(-1)]);
  }
  return paths;
}
function flowHtml(e) {
  const paths=flowPaths(e).map(points=>`<polyline points="${points.map(p=>p.join(',')).join(' ')}"/>`).join('');
  return `<svg viewBox="0 0 ${e.w} ${e.h}" role="img" aria-label="${escape(e.alt||'Flow connection')}" fill="none" stroke="${escape(e.color??theme.gray)}" stroke-width="${e.width??3}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
function chartHtml(e) {
  const max=e.max ?? Math.max(...e.series.flatMap(s=>s.values))*1.15;
  const n=e.categories.length, groupH=(e.h-72)/n, labelW=e.labelWidth??235;
  const plotW=e.w-labelW-80, barH=Math.min(36,(groupH-20)/e.series.length);
  let svg=`<svg viewBox="0 0 ${e.w} ${e.h}" role="img" aria-label="${escape(e.label||'Data chart')}">`;
  for(let i=0;i<=4;i++){const x=labelW+plotW*i/4;svg+=`<line x1="${x}" y1="25" x2="${x}" y2="${e.h-38}" stroke="#E6E9EB"/><text x="${x}" y="${e.h-8}" text-anchor="middle" fill="#747A80" font-size="19">${+(max*i/4).toFixed(1)}</text>`;}
  e.categories.forEach((cat,i)=>{
    const y=32+i*groupH;
    svg+=`<text x="${labelW-20}" y="${y+(e.series.length*barH)/2+7}" text-anchor="end" font-size="${e.labelSize??25}" fill="#101214">${escape(cat)}</text>`;
    e.series.forEach((ser,j)=>{
      const value=ser.values[i], fill=e.highlight===i?theme.blue:(ser.fill??'#B9C0C5'), bw=plotW*value/max, yy=y+j*(barH+3);
      svg+=`<rect x="${labelW}" y="${yy}" width="${bw}" height="${barH}" fill="${escape(fill)}"/><text x="${labelW+bw+10}" y="${yy+barH*.76}" font-size="${e.valueSize??23}" font-weight="600" fill="${escape(fill===theme.blue?fill:theme.ink)}">${escape(value)}${escape(e.suffix??'')}</text>`;
    });
  });
  return svg+'</svg>';
}
function elementHtml(e) {
  let style=`left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`;
  let inner='';
  if(e.type==='text') {style+=`font-size:${e.size??32}px;font-weight:${e.bold?700:400};color:${e.color??theme.ink};line-height:${e.lineHeight??1.22};text-align:${e.align??'left'};`;inner=escape(e.text).replace(/\n/g,'<br>');}
  if(e.type==='image') inner=`<img src="${escape(e.src)}" alt="${escape(e.alt||'')}" style="object-fit:${e.fit??'contain'}">`;
  if(e.type==='video') inner=`<video muted loop playsinline preload="metadata" poster="${escape(e.poster)}" aria-label="${escape(e.alt||'Demonstration')}" style="object-fit:${e.fit??'contain'}"><source src="${escape(e.src)}" type="video/mp4"></video><button class="play" aria-label="Play or pause video">▶</button>`;
  if(e.type==='rect') style+=`background:${e.fill??'#F2F5F7'};${e.stroke?`border:2px solid ${e.stroke};`:''}`;
  if(e.type==='line') style+=`background:${e.color??theme.light};`;
  if(e.type==='flow') inner=flowHtml(e);
  if(e.type==='chart') inner=chartHtml(e);
  if(e.type==='table') inner=`<table style="font-size:${e.size??24}px">${e.values.map((row,r)=>`<tr${r===e.highlightRow?' class="highlight"':''}>${row.map(v=>`<${r?'td':'th'}>${escape(v)}</${r?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;
  if(e.href&&e.type!=='video') inner=`<a href="${escape(e.href)}" target="_blank" rel="noopener">${inner}</a>`;
  return `<div class="el ${e.type}${e.ghost?' ghost':''}" data-step="${e.step??0}"${e.focusStep!=null?` data-focus-step="${e.focusStep}"`:''} style="${style}">${inner}</div>`;
}
export function renderHtml(deck) {
  const {width,height}=validateDeck(deck);
  const pages=deck.slides.map((s,i)=>`<section class="slide" id="${escape(s.id)}" data-index="${i}" aria-label="${escape(s.title)}" style="background:${s.background??'#fff'}">${s.elements.map(elementHtml).join('')}<div class="page">${String(i+1).padStart(2,'0')}${s.appendix?' / 备份':''}</div></section>`).join('\n');
  const notes=JSON.stringify(deck.slides.map(s=>({title:s.title,notes:s.notes??'',sources:s.sources??[]}))).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="${escape(deck.language??'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(deck.title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#E7E9EB;color:#101214;font-family:${escape(deck.fontFamily??'Arial')},'PingFang SC','Noto Sans CJK SC',sans-serif}#stage{position:absolute;width:${width}px;height:${height}px;transform-origin:0 0;background:white;box-shadow:0 12px 80px #0002}.slide{position:absolute;inset:0;visibility:hidden;opacity:0;transition:opacity 180ms ease}.slide.active{visibility:visible;opacity:1}.el{position:absolute;transition:opacity 240ms ease,transform 240ms ease;white-space:normal;overflow:visible}.el.focus-dim{opacity:.25;transform:none}.el.pending{opacity:0;transform:translateY(7px);pointer-events:none}.el.pending.ghost{opacity:.14;transform:none}.el img,.el video{display:block;width:100%;height:100%;border:0}.el a{color:inherit;text-decoration:none;display:block;width:100%;height:100%}.video .play{position:absolute;right:12px;bottom:12px;width:34px;height:34px;border:0;border-radius:50%;background:#fffD;color:#111;cursor:pointer;opacity:.55}.video:hover .play{opacity:1}.page{position:absolute;right:48px;bottom:22px;font-size:16px;color:#9CA3A9}.chart svg{width:100%;height:100%;font-family:inherit}.flow svg{display:block;width:100%;height:100%;overflow:visible}.table table{border-collapse:collapse;width:100%;height:100%;table-layout:auto}.table th,.table td{text-align:left;padding:10px 12px;border-bottom:1px solid #E3E7EA}.table th{font-weight:600;border-top:2px solid #101214;border-bottom:2px solid #101214}.table .highlight{color:#0877D1;font-weight:700}#controls{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:7px 12px;background:#fffE;border:1px solid #DCE1E5;border-radius:30px;font-size:13px;opacity:0;transition:opacity .2s}body:hover #controls, #controls:focus-within{opacity:1}#controls button{background:none;border:0;color:#41464C;font:inherit;cursor:pointer;padding:4px 8px}#counter{min-width:56px;text-align:center;color:#747A80}#progress{position:fixed;height:3px;bottom:0;left:0;background:#0877D1;transition:width .2s}#notes{display:none;position:fixed;right:20px;bottom:60px;width:min(600px,90vw);max-height:70vh;overflow:auto;background:#fff;border:1px solid #DCE1E5;padding:24px;box-shadow:0 8px 40px #0002;font-size:16px;line-height:1.65}#notes.open{display:block}#overview{display:none;position:fixed;inset:0;background:#F4F6F8;overflow:auto;padding:40px;grid-template-columns:repeat(3,1fr);gap:16px}#overview.open{display:grid}#overview button{border:1px solid #DCE1E5;background:white;text-align:left;padding:24px;font:inherit;cursor:pointer;color:#101214;font-size:19px}#overview button.current{border:2px solid #0877D1}#notes a{color:#0877D1;overflow-wrap:anywhere}body.blackout #stage{visibility:hidden}body.blackout{background:black} @media(prefers-reduced-motion:reduce){*{transition:none!important}}@media print{@page{size:${width}px ${height}px;margin:0}html,body{overflow:visible;background:white;height:auto}#stage{position:static;transform:none!important;box-shadow:none}section.slide{position:relative;visibility:visible;opacity:1;width:${width}px;height:${height}px;break-after:page}.el.pending,.el.focus-dim,.el.pending.ghost{opacity:1;transform:none}video{visibility:hidden}.video{background:var(--poster) center/contain no-repeat}.play,#controls,#progress,#notes,#overview{display:none!important}}
</style></head><body><main id="stage">${pages}</main><nav id="controls" aria-label="Presentation controls"><button id="prev" title="Previous">←</button><span id="counter"></span><button id="next" title="Next">→</button><button id="overviewButton">总览 O</button><button id="notesButton">备注 N</button><button id="fullscreenButton">全屏 F</button></nav><div id="progress"></div><aside id="notes"></aside><div id="overview"></div><script>
const notes=${notes};const deckTitle=${JSON.stringify(deck.title).replace(/</g,'\\u003c')};const slides=[...document.querySelectorAll('.slide')];let index=0,step=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const stage=document.querySelector('#stage');
function resize(){const s=Math.min(innerWidth/${width},innerHeight/${height});stage.style.transform='translate('+((innerWidth-${width}*s)/2)+'px,'+((innerHeight-${height}*s)/2)+'px) scale('+s+')'}addEventListener('resize',resize);resize();
function maxStep(){return Math.max(0,...[...slides[index].querySelectorAll('.el')].map(x=>Math.max(+x.dataset.step,+(x.dataset.focusStep??0))))}
function syncMedia(){slides.forEach((s,i)=>s.querySelectorAll('video').forEach(v=>{const active=i===index&&+v.parentElement.dataset.step<=step;v.parentElement.style.setProperty('--poster','url("'+v.poster+'")');if(active&&!reduced){v.play().then(()=>v.nextElementSibling.textContent='Ⅱ').catch(()=>{v.nextElementSibling.textContent='▶';v.controls=true})}else{v.pause();v.nextElementSibling.textContent='▶'}}))}
function update(){slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',i===index?'false':'true');s.querySelectorAll('.el').forEach(e=>{e.classList.toggle('pending',+e.dataset.step>step);e.classList.toggle('focus-dim',e.dataset.focusStep!==undefined&&+e.dataset.focusStep!==step)})});document.querySelector('#counter').textContent=(index+1)+' / '+slides.length;document.querySelector('#progress').style.width=((index+1)/slides.length*100)+'%';history.replaceState(null,'','#'+(index+1)+'.'+step);document.title=notes[index].title===deckTitle?deckTitle:notes[index].title+' · '+deckTitle;const n=document.querySelector('#notes');n.replaceChildren();const h=document.createElement('strong');h.textContent=notes[index].title;n.append(h);const p=document.createElement('p');p.textContent=notes[index].notes;n.append(p);notes[index].sources.forEach(src=>{const d=document.createElement('p');if(src.startsWith('https://')){const a=document.createElement('a');a.href=src;a.target='_blank';a.rel='noopener';a.textContent=src;d.append(a)}else d.textContent=src;n.append(d)});syncMedia()}
function next(skip=false){if(!skip&&step<maxStep())step++;else if(index<slides.length-1){index++;step=0}update()}
function prev(){if(step>0)step--;else if(index>0){index--;step=maxStep()}update()}
function jump(i){index=Math.max(0,Math.min(slides.length-1,i));step=0;update()}
function fullscreen(){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{})}
function overview(){const el=document.querySelector('#overview');el.classList.toggle('open');if(el.classList.contains('open')){el.replaceChildren();notes.forEach((n,i)=>{const b=document.createElement('button');b.textContent=String(i+1).padStart(2,'0')+'  '+n.title;b.className=i===index?'current':'';b.onclick=()=>{el.classList.remove('open');jump(i)};el.append(b)})}}
document.querySelector('#next').onclick=()=>next();document.querySelector('#prev').onclick=prev;document.querySelector('#notesButton').onclick=()=>document.querySelector('#notes').classList.toggle('open');document.querySelector('#overviewButton').onclick=overview;document.querySelector('#fullscreenButton').onclick=fullscreen;
document.querySelectorAll('.video').forEach(el=>{el.querySelector('.play').onclick=()=>{const v=el.querySelector('video');if(v.paused)v.play().then(()=>el.querySelector('.play').textContent='Ⅱ').catch(()=>v.controls=true);else{v.pause();el.querySelector('.play').textContent='▶'}}});
addEventListener('keydown',e=>{if(['ArrowRight',' ','PageDown','ArrowLeft','PageUp','Home','End'].includes(e.key))e.preventDefault();if(['ArrowRight',' ','PageDown'].includes(e.key))next(e.shiftKey);else if(['ArrowLeft','PageUp'].includes(e.key))prev();else if(e.key==='Home')jump(0);else if(e.key==='End')jump(slides.length-1);else if(e.key.toLowerCase()==='n')document.querySelector('#notes').classList.toggle('open');else if(e.key.toLowerCase()==='o')overview();else if(e.key.toLowerCase()==='f')fullscreen();else if(e.key.toLowerCase()==='b')document.body.classList.toggle('blackout');else if(e.key==='Escape'){document.querySelector('#overview').classList.remove('open');document.querySelector('#notes').classList.remove('open')}});
const hash=location.hash.slice(1).split('.').map(Number);if(hash[0]){index=Math.max(0,Math.min(slides.length-1,hash[0]-1));step=Math.max(0,Math.min(maxStep(),hash[1]||0))}update();
</script></body></html>`;
}
