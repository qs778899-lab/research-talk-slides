import {validateDeck,theme,flowPaths} from './scene.mjs';

export async function appendSlides(presentation, deck, {loadAsset, start=0, end=deck.slides.length}={}) {
  validateDeck(deck);
  const font=deck.fontFamily??'Arial', width=deck.width??1600, height=deck.height??900;
  const noLine={fill:'none',width:0};
  for(let i=start;i<end;i++){
    const page=deck.slides[i],slide=presentation.slides.add({width,height});
    slide.background.fill=page.background??'#FFFFFF';
    const textbox=(e)=>{
      const shape=slide.shapes.add({geometry:'textbox',name:e.name??`${page.id}-text`,position:{left:e.x,top:e.y,width:e.w,height:e.h},fill:'none',line:noLine});
      shape.text=e.text;
      shape.text.style={typeface:font,fontSize:e.size??32,bold:e.bold??false,color:e.color??theme.ink,alignment:e.align??'left',verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0,lineSpacing:e.lineHeight??1.15};
      if(e.href)shape.text.get(e.text).link={uri:e.href,isExternal:true};
      return shape;
    };
    for(const e of page.elements){
      const position={left:e.x,top:e.y,width:e.w,height:e.h};
      if(e.type==='text')textbox(e);
      else if(e.type==='rect'||e.type==='line')slide.shapes.add({geometry:'rect',position,fill:e.fill??e.color??theme.light,line:e.stroke?{fill:e.stroke,width:2}:noLine});
      else if(e.type==='flow')slide.shapes.add({
        geometry:'custom',position,fill:'none',line:{style:'solid',fill:e.color??theme.gray,width:e.width??3},
        customPaths:flowPaths(e).map(points=>({width:e.w,height:e.h,commands:points.map((p,j)=>({[j?'lineTo':'moveTo']:{x:p[0],y:p[1]}}))})),
      });
      else if(e.type==='image'||e.type==='video'){
        const relative=e.type==='video'?e.poster:e.src;
        if(!loadAsset)throw new Error('An asset loader is required');
        const bytes=await loadAsset(relative);
        const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
        slide.images.add({blob:buffer,contentType:/\.png$/i.test(relative)?'image/png':'image/jpeg',alt:e.alt??'',position,fit:e.fit??'contain'});
        if(e.type==='video'&&e.href)textbox({x:e.x+e.w-175,y:e.y+e.h-30,w:165,h:26,text:'▶ 查看演示',size:19,color:theme.blue,href:e.href});
      }else if(e.type==='chart'){
        const max=e.max??Math.max(...e.series.flatMap(s=>s.values))*1.15;
        slide.charts.add('bar',{
          position,categories:[...e.categories].reverse(),
          series:e.series.map(s=>({name:s.name,values:[...s.values].reverse(),fill:s.fill??'#B9C0C5',...(e.highlight!=null?{points:[{idx:e.categories.length-1-e.highlight,fill:theme.blue}]}:{})})),
          barOptions:{direction:'bar',grouping:'clustered',gapWidth:85,overlap:0},
          hasLegend:false,chartFill:'#FFFFFF',plotAreaFill:'#FFFFFF',chartLine:noLine,plotAreaLine:noLine,
          xAxis:{textStyle:{typeface:font,fontSize:e.labelSize??24,fill:theme.ink},line:noLine,majorGridlines:null},
          yAxis:{min:0,max,textStyle:{typeface:font,fontSize:19,fill:theme.gray},line:noLine,majorGridlines:{fill:theme.light,width:1}},
          dataLabels:{showValue:true,position:'outEnd',numberFormatCode:e.numberFormat??'0.00',textStyle:{typeface:font,fontSize:e.valueSize??22,bold:true,fill:theme.ink}},
        });
      }else if(e.type==='table'){
        const table=slide.tables.add({rows:e.values.length,columns:e.values[0].length,left:e.x,top:e.y,width:e.w,height:e.h,values:e.values,...(e.columnWidths?{columnWidths:e.columnWidths}:{})});
        table.styleOptions={headerRow:false,bandedRows:false};
        table.borders.assign({fill:'#E6E9EB',width:0.6});
        for(let r=0;r<e.values.length;r++)for(let c=0;c<e.values[0].length;c++){
          const cell=table.getCell(r,c);cell.fill=r===0?'#F2F5F7':'#FFFFFF';
          cell.text.style={typeface:font,fontSize:e.size??24,bold:r===0||r===e.highlightRow,color:r===e.highlightRow?theme.blue:theme.ink,autoFit:'none',insets:{left:10,right:10,top:8,bottom:8}};
        }
      }
    }
    textbox({x:width-130,y:height-40,w:90,h:22,text:`${String(i+1).padStart(2,'0')}${page.appendix?' / 备份':''}`,size:16,color:'#9CA3A9',align:'right'});
    const media=page.elements.filter(e=>e.type==='video').map(e=>`Video: ${e.src}${e.href?' | '+e.href:''} (HTML plays the clip; this slide uses its poster.)`);
    slide.speakerNotes.text=[page.notes??'',...(page.sources??[]),...media].filter(Boolean).join('\n\n');
  }
  return {start,end,count:end-start};
}
