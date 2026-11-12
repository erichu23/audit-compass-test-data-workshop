(function(g){
'use strict';
const D=g.docx,theme=g.AuditReport.theme;
const pageWidth=15704;
const font={ascii:'Microsoft YaHei',hAnsi:'Microsoft YaHei',eastAsia:'微软雅黑',cs:'Microsoft YaHei'};
class ReportTableOfContents extends D.TableOfContents {
 getTabStopsForLevel(level){return super.getTabStopsForLevel(level,pageWidth);}
}
let headingBookmarks=new WeakMap(),reportTocEntries=[];
const border={style:D.BorderStyle.SINGLE,size:4,color:theme.border};
const borders={top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border};
function legendHex(value){
 const color=String(value||'').trim();if(/^#[0-9a-f]{6}$/i.test(color))return color.slice(1).toUpperCase();
 if(/^#[0-9a-f]{3}$/i.test(color))return color.slice(1).split('').map(c=>c+c).join('').toUpperCase();
 const parts=color.match(/[\d.]+/g)?.map(Number)||[];
 let rgb;
 if(/^hsl/i.test(color)&&parts.length>=3){const [h,s,l]=[parts[0]/360,parts[1]/100,parts[2]/100];const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};rgb=[f(0),f(8),f(4)].map(v=>Math.round(v*255));}
 else if(/^rgb/i.test(color)&&parts.length>=3)rgb=parts.slice(0,3);
 return rgb?rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase():theme.heading;
}
function wordContents(){
 const entries=reportTocEntries.map(entry=>new D.Paragraph({
  style:'TOC'+entry.level,tabStops:[{type:D.TabStopType.RIGHT,position:pageWidth,leader:D.LeaderType.DOT}],
  children:[new D.InternalHyperlink({anchor:entry.href,children:[new D.TextRun({text:entry.title,font,size:24,bold:entry.level===1,color:theme.ink})]}),new D.TextRun({text:'\t',font}),new D.SimpleField('PAGEREF '+entry.href+' \\h','待更新')]
 }));
 return new ReportTableOfContents('报告目录',{hyperlink:true,headingStyleRange:'1-2',contentChildren:entries,beginDirty:true});
}
function paragraph(text,{heading,align,bold=false,color=theme.ink,size=18,bookmark,runs}={}){
 return new D.Paragraph({
  ...(heading?{heading}:{}),
  alignment:align,spacing:{after:65,line:240},keepNext:!!heading,
  children:bookmark?[new D.Bookmark({id:bookmark,children:[new D.TextRun({text:String(text??''),font,size,bold,color})]})]:(runs||[new D.TextRun({text:String(text??''),font,size,bold,color})])
 });
}
async function svgImage(svg,width){
 const clone=svg.cloneNode(true),box=svg.viewBox.baseVal;
 const aspect=(box.width||Number(svg.getAttribute('width'))||330)/(box.height||Number(svg.getAttribute('height'))||181);
 const pixels=Math.min(1050,width/15),height=pixels/aspect;
 clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
 clone.setAttribute('width',String(pixels*2));clone.setAttribute('height',String(height*2));
 const style=document.createElementNS('http://www.w3.org/2000/svg','style');
 style.textContent='text{font:9px "Microsoft YaHei","微软雅黑",sans-serif;fill:#435976}';clone.prepend(style);
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
 try{
  const image=new Image();
  image.src=url;
  await image.decode();
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(pixels*2);canvas.height=Math.ceil(height*2);
  const context=canvas.getContext('2d');
  if(!context)throw Error('浏览器无法绘制报告图表。');
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!png)throw Error('报告图表转换失败。');
  return new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[
   new D.ImageRun({type:'png',data:new Uint8Array(await png.arrayBuffer()),transformation:{width:pixels,height}})
  ]});
 }finally{URL.revokeObjectURL(url);}
}
function text(node){return (node.innerText||node.textContent||'').replace(/\s+/g,' ').trim();}
async function grid(children,width,weights){
 const sum=weights.reduce((a,b)=>a+b,0),sizes=weights.map(n=>Math.floor(width*n/sum));
 return new D.Table({
  layout:D.TableLayoutType.FIXED,width:{size:width,type:D.WidthType.DXA},columnWidths:sizes,borders,
  rows:[new D.TableRow({children:await Promise.all(children.map(async (node,i)=>new D.TableCell({
   width:{size:sizes[i],type:D.WidthType.DXA},margins:{top:65,bottom:65,left:75,right:75},
   children:await blocks(node,Math.max(200,sizes[i]-160))
  })))})]
 });
}
async function table(node,width){
 const rows=[...node.rows],columns=Math.max(...rows.map(row=>[...row.cells].reduce((n,c)=>n+c.colSpan,0)));
 const unit=Math.floor(width/columns);
 const customWidths=node.classList.contains('report-cover-grid')?[.23,.77]:node.classList.contains('report-cover-status')?[.40,.22,.38]:null;
 const widths=customWidths?customWidths.map(n=>Math.floor(width*n)):Array(columns).fill(unit);
 return new D.Table({
  layout:D.TableLayoutType.FIXED,width:{size:width,type:D.WidthType.DXA},columnWidths:widths,borders,
  rows:await Promise.all(rows.map(async row=>new D.TableRow({
   tableHeader:row.parentElement.tagName==='THEAD',cantSplit:true,
   children:await Promise.all([...row.cells].map(async (cell,i)=>{
    const header=cell.tagName==='TH',total=row.classList.contains('report-total');
    const statusElement=cell.querySelector('.report-status');
    const status=statusElement?.closest('td,th')===cell?theme.statuses[statusElement.dataset.status]:undefined;
    return new D.TableCell({
     width:{size:customWidths?widths[i]:unit*cell.colSpan,type:D.WidthType.DXA},columnSpan:cell.colSpan,rowSpan:cell.rowSpan,
     margins:{top:45,bottom:45,left:55,right:55},
     shading:status?{fill:status.fill}:header||total?{fill:header?theme.fill:theme.total}:undefined,
     children:await blocks(cell,Math.max(200,(customWidths?widths[i]:unit*cell.colSpan)-120),{cell:true,bold:header||total||!!status,color:status?.text||(header?theme.heading:theme.ink),align:status||node.classList.contains('report-cover-status')&&i>0?D.AlignmentType.CENTER:undefined})
    });
   }))
  })))
 });
}
async function blocks(node,width,context={}){
 const out=[];
 for(const child of node.childNodes){
  if(child.nodeType===3){
   if(child.textContent.trim())out.push(paragraph(child.textContent.trim(),{bold:context.bold,color:context.color,align:context.align,size:context.cell?15:18}));
   continue;
  }
  if(child.nodeType!==1)continue;
  const tag=child.tagName.toLowerCase();
  if(['script','style','button','input','select','form','summary'].includes(tag)||child.matches('.pagination,.report-sheet-header,.report-sheet-footer,.report-calculation-note'))continue;
  if(tag==='details'||child.matches('.report-extra'))continue;
  if(child.matches('.report-toc')){
   out.push(paragraph('报告目录',{bold:true,color:theme.navy,size:32}));
   out.push(wordContents());
   continue;
  }
  if(tag==='svg'){out.push(await svgImage(child,width));continue;}
  if(tag==='table'){out.push(await table(child,width));continue;}
  if(child.matches('.report-panes')){
   const panes=[...child.children];
   if(panes.length)out.push(await grid(panes,width,panes.map(()=>1)));
   continue;
  }
  if(child.matches('.report-direction')){
   out.push(await grid([...child.children],width,[.04,.24,.72]));continue;
  }
  if(child.matches('.report-masthead')){
   out.push(new D.Paragraph({shading:{fill:theme.navy},spacing:{before:0,after:120,line:300},children:[new D.TextRun({text:' ',size:2})]}));
   out.push(paragraph(text(child),{bold:true,color:theme.accent,size:27}));continue;
  }
  if(/^h[1-4]$/.test(tag)){
   const toc=!!child.closest('.report-toc');
   const main=tag==='h2',level=headingBookmarks.has(child)?(main?D.HeadingLevel.HEADING_1:D.HeadingLevel.HEADING_2):undefined;
   out.push(paragraph(text(child),{heading:child.textContent.includes('综合分析报告（年审适用）')?D.HeadingLevel.TITLE:level,bold:true,color:toc?theme.navy:theme.ink,size:main?32:23,bookmark:headingBookmarks.get(child)}));
   if(toc)out.push(new D.Table({
    layout:D.TableLayoutType.FIXED,width:{size:width,type:D.WidthType.DXA},columnWidths:[Math.floor(width*.12),Math.ceil(width*.88)],
    borders:Object.fromEntries(Object.keys(borders).map(key=>[key,{style:D.BorderStyle.NONE,size:0,color:'FFFFFF'}])),
    rows:[new D.TableRow({children:[theme.accent,theme.fill].map(fill=>new D.TableCell({
     shading:{fill},margins:{top:0,bottom:0,left:0,right:0},children:[new D.Paragraph({spacing:{before:0,after:0,line:80},children:[new D.TextRun({text:' ',size:2})]})]
    }))})]
   }));
   continue;
  }
  if(tag==='ul'){
   if(child.matches('.report-stack-legend,.report-legend')){
    const runs=[];
    for(const item of child.children){const icons=[...item.querySelectorAll('i')];
     icons.forEach((icon,i)=>{runs.push(new D.TextRun({text:'■',font,size:18,color:legendHex(icon.style.backgroundColor||icon.style.background)}));if(icons.length===2)runs.push(new D.TextRun({text:i?'流出 ':'流入 ',font,size:14,color:theme.muted}));});
     runs.push(new D.TextRun({text:' '+text(item)+'   ',font,size:15,color:theme.ink}));
    }
    out.push(paragraph('',{runs,size:15}));
   }else out.push(paragraph([...child.children].map(text).join(' · '),{size:context.cell?14:17}));
   continue;
  }
  if(tag==='ol'){
   for(const li of child.children)out.push(paragraph(text(li),{bold:li.classList.contains('toc-chapter'),color:theme.link,size:context.cell?14:17}));
   continue;
  }
  if(['p','strong','span','small','dt','dd','figcaption','label','b'].includes(tag)){
   const lines=(child.innerHTML||'').split(/<br\s*\/?\s*>/i);
   for(const line of lines){
    const temp=document.createElement('div');temp.innerHTML=line;
    const value=text(temp);
    if(value){
     const bold=context.bold||['b','strong','figcaption'].includes(tag),size=context.cell?15:18;
     if(child.matches('.report-detail-summary')){
      const runs=[];
      const visit=(node,heavy=false)=>{if(node.nodeType===3){runs.push(new D.TextRun({text:node.textContent,font,size,bold:!!bold||heavy,color:context.color||theme.ink}));return;}for(const part of node.childNodes)visit(part,heavy||['STRONG','B'].includes(node.tagName));};
      visit(temp);out.push(paragraph('',{runs,color:context.color,align:context.align,size}));
     }else out.push(paragraph(value,{bold,color:context.color,align:context.align,size}));
    }
   }
   continue;
  }
  out.push(...await blocks(child,width,context));
 }
 return out.length?out:[paragraph('')];
}
async function report(model){
 const container=document.createElement('div');
 container.innerHTML=g.AuditReport.render(model,{allRows:true,forExport:true});
 const pages=[...container.querySelectorAll('.report-sheet-content')];
 headingBookmarks=new WeakMap();reportTocEntries=[];
 pages.forEach((page,i)=>page.querySelectorAll('.report-chapter,.report-section > h3').forEach(node=>{
  const id='ReportHeading'+(reportTocEntries.length+1);headingBookmarks.set(node,id);
  reportTocEntries.push({title:text(node),level:node.matches('.report-chapter')?1:2,href:id});
 }));
 const run=t=>new D.TextRun({text:t,font,size:15,color:theme.muted});
 const header=new D.Header({children:[new D.Paragraph({
  spacing:{after:60},tabStops:[{type:D.TabStopType.RIGHT,position:pageWidth}],
  border:{bottom:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},
  children:[run('毕马威审计罗盘'),run('\t综合分析报告（年审适用）')]
 })]});
 const footer=new D.Footer({children:[new D.Paragraph({
  spacing:{before:60},tabStops:[{type:D.TabStopType.CENTER,position:Math.floor(pageWidth/2)},{type:D.TabStopType.RIGHT,position:pageWidth}],
  border:{top:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},
  children:[run('审计项目资料'),run('\t'+model.from+' ～ '+model.to),run('\t第 '),
   new D.TextRun({children:[D.PageNumber.CURRENT],font,size:15,color:theme.muted}),run(' 页')]
 })]});
 const frontFooter=new D.Footer({children:[new D.Paragraph({spacing:{before:60},tabStops:[{type:D.TabStopType.CENTER,position:Math.floor(pageWidth/2)}],border:{top:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},children:[run('审计项目资料'),run('\t'+model.from+' ～ '+model.to)]})]});
 const sections=[];let bodyStarted=false;
 for(const page of pages){
  const front=page.dataset?.reportFront==='true'||!!page.querySelector?.('#report-cover,.report-toc');
  const restart=!front&&!bodyStarted;if(!front)bodyStarted=true;
  sections.push({
   properties:{type:D.SectionType.NEXT_PAGE,page:{size:{width:11906,height:16838,orientation:D.PageOrientation.LANDSCAPE},pageNumbers:restart?{start:1}:{},margin:{top:850,right:567,bottom:850,left:567,header:300,footer:300}}},
   headers:{default:header},footers:{default:front?frontFooter:footer},children:[...await blocks(page,pageWidth),new D.Paragraph({spacing:{before:0,after:0,line:20},children:[new D.TextRun({text:'',size:2})]})]
  });
 }
 const wordDocument=new D.Document({
  features:{updateFields:true},creator:'Audit Compass',title:'综合分析报告（年审适用）',
  styles:{default:{document:{run:{font,size:18},paragraph:{spacing:{after:65}}}},paragraphStyles:[{id:'TOC1',name:'toc 1',basedOn:'Normal',run:{font,size:24,bold:true,color:theme.ink},paragraph:{spacing:{before:100,after:120,line:320}}},{id:'TOC2',name:'toc 2',basedOn:'Normal',run:{font,size:24,color:theme.ink},paragraph:{indent:{left:240},spacing:{after:120,line:320}}}]},
  sections
 });
 return D.Packer.toBlob(wordDocument);
}
g.AuditWord={report};
})(globalThis);
