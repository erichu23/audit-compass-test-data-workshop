(function(g){
'use strict';
const D=g.docx,theme=g.AuditReport.theme;
const headingDepth=node=>Math.min(3,(text(node).match(/^\d+(?:\.\d+)*/)?.[0]||'1').split('.').length);
const pageWidth=15704;
const font={ascii:'Microsoft YaHei',hAnsi:'Microsoft YaHei',eastAsia:'微软雅黑',cs:'Microsoft YaHei'};
class ReportTableOfContents extends D.TableOfContents {
 getTabStopsForLevel(level){return super.getTabStopsForLevel(level,pageWidth);}
}
let headingBookmarks=new WeakMap(),reportTocEntries=[];
const border={style:D.BorderStyle.SINGLE,size:4,color:theme.border};
const borders={top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border};
const statTopBorder={...border,size:12,color:'668DBD'};
function legendHex(value){
 const color=String(value||'').trim();if(/^#[0-9a-f]{6}$/i.test(color))return color.slice(1).toUpperCase();
 if(/^#[0-9a-f]{3}$/i.test(color))return color.slice(1).split('').map(c=>c+c).join('').toUpperCase();
 const parts=color.match(/[\d.]+/g)?.map(Number)||[];
 let rgb;
 if(/^hsl/i.test(color)&&parts.length>=3){const [h,s,l]=[parts[0]/360,parts[1]/100,parts[2]/100];const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return l-a*Math.max(-1,Math.min(k-3,9-k,1));};rgb=[f(0),f(8),f(4)].map(v=>Math.round(v*255));}
 else if(/^rgb/i.test(color)&&parts.length>=3)rgb=parts.slice(0,3);
 return rgb?rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase():theme.heading;
}
function cachedPageReference(entry){
 // Keep a visible baseline page while Word recalculates its final layout.
 const field=new D.XmlComponent('w:fldSimple');
 class PageAttrs extends D.XmlAttributeComponent {
  constructor(){super({instruction:' PAGEREF '+entry.href+' \\h ',dirty:true});this.xmlKeys={instruction:'w:instr',dirty:'w:dirty'};}
 }
 field.root.push(new PageAttrs());
 field.root.push(new D.TextRun({text:String(entry.page),font,size:24,color:theme.ink}));
 return field;
}
function wordContents(compact=false){
 const entries=reportTocEntries.map(entry=>new D.Paragraph({
  style:'TOC'+entry.level,...(compact?{spacing:{before:entry.level===1?60:0,after:70,line:285}}:{}),tabStops:[{type:D.TabStopType.RIGHT,position:pageWidth,leader:D.LeaderType.DOT}],
  children:[new D.InternalHyperlink({anchor:entry.href,children:[new D.TextRun({text:entry.title,font,size:24,bold:entry.level===1,color:theme.ink})]}),new D.TextRun({text:'\t',font}),cachedPageReference(entry)]
 }));
 return new ReportTableOfContents('报告目录',{hyperlink:true,headingStyleRange:'1-3',contentChildren:entries,beginDirty:true});
}
function paragraph(text,{heading,align,bold=false,color=theme.ink,size=18,characterSpacing,bookmark,runs,spacing={after:65,line:240},snapToGrid,pageBreakBefore}={}){
 return new D.Paragraph({
  ...(heading?{heading}:{}),
  alignment:align,spacing,snapToGrid,pageBreakBefore,keepNext:!!heading,
  children:bookmark?[new D.Bookmark({id:bookmark,children:[new D.TextRun({text:String(text??''),font,size,bold,color,characterSpacing})]})]:(runs||[new D.TextRun({text:String(text??''),font,size,bold,color,characterSpacing})])
 });
}
async function svgImage(svg,width,legend,{maxPlotHeight=Infinity,legendWidth=330,legendMarkerSize=5}={}){
 const clone=svg.cloneNode(true),box=svg.viewBox.baseVal;
 const aspect=(box.width||Number(svg.getAttribute('width'))||330)/(box.height||Number(svg.getAttribute('height'))||181);
 const pixels=Math.min(1050,width/15,maxPlotHeight*aspect),height=pixels/aspect;
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
  canvas.width=Math.ceil(pixels*2);
  const context=canvas.getContext('2d');
  if(!context)throw Error('浏览器无法绘制报告图表。');
  const scale=canvas.width/legendWidth,legendFont=8*scale,lineHeight=15*scale,padding=8*scale;
  const marker=legendMarkerSize*scale,markerAdvance=marker+2*scale;
  const items=legend?[...legend.children]:[],layout=[];let x=padding,y=padding;
  context.font=legendFont+'px "Microsoft YaHei","微软雅黑",sans-serif';
  for(const item of items){
   const colors=[...item.querySelectorAll('i')].map(icon=>legendHex(icon.style.backgroundColor||icon.style.background));
   const label=text(item),itemWidth=context.measureText(label).width+colors.length*markerAdvance+10*scale;
   if(x>padding&&x+itemWidth>canvas.width-padding){x=padding;y+=lineHeight;}
   layout.push({x,y,label,colors});x+=itemWidth;
  }
  const legendHeight=layout.length?y+lineHeight:0;
  canvas.height=Math.ceil(height*2+legendHeight);
  context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
  context.font=legendFont+'px "Microsoft YaHei","微软雅黑",sans-serif';context.textBaseline='middle';
  for(const item of layout){let left=item.x;for(const color of item.colors){context.fillStyle='#'+color;context.fillRect(left,item.y+6*scale-marker/2,marker,marker);left+=markerAdvance;}context.fillStyle='#435976';context.fillText(item.label,left+2*scale,item.y+6*scale);}
  context.drawImage(image,0,legendHeight,canvas.width,height*2);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!png)throw Error('报告图表转换失败。');
  return new D.Paragraph({alignment:D.AlignmentType.CENTER,children:[
   new D.ImageRun({type:'png',data:new Uint8Array(await png.arrayBuffer()),transformation:{width:pixels,height:canvas.height/2}})
  ]});
 }finally{URL.revokeObjectURL(url);}
}
function text(node){return (node.innerText||node.textContent||'').replace(/\s+/g,' ').trim();}
async function grid(children,width,weights,{natureGroup=false,compactOverview=false,wordV2=false,sectionFit,statRule=false}={}){
 const sum=weights.reduce((a,b)=>a+b,0),sizes=weights.map(n=>Math.floor(width*n/sum));
 const padding=natureGroup||compactOverview?30:65;
 return new D.Table({
  layout:D.TableLayoutType.FIXED,width:{size:width,type:D.WidthType.DXA},columnWidths:sizes,
  borders:statRule?{...borders,top:statTopBorder}:borders,
  rows:[new D.TableRow({cantSplit:natureGroup||compactOverview,children:await Promise.all(children.map(async (node,i)=>new D.TableCell({
   width:{size:sizes[i],type:D.WidthType.DXA},margins:{top:padding,bottom:padding,left:75,right:75},
   ...(node.querySelector('.report-known-related-summary')?{borders:{top:statTopBorder}}:{}),
   children:await blocks(node,Math.max(200,sizes[i]-160),{natureGroup,compactOverview,wordV2,sectionFit})
  })))})]
 });
}
function coverColumnWidths(width){
 const labelWidth=Math.floor(width*.23);
 return [labelWidth,width-labelWidth];
}
const coverSidePadding=115;
function coverHeadingBlocks(width,heading,spacing){
 const noBorder={style:D.BorderStyle.NONE,size:0,color:'FFFFFF'};
 const stripe=new D.Table({
  layout:D.TableLayoutType.FIXED,width:{size:width,type:D.WidthType.DXA},
  alignment:D.AlignmentType.CENTER,columnWidths:coverColumnWidths(width),
  borders:Object.fromEntries(Object.keys(borders).map(edge=>[edge,noBorder])),
  rows:[new D.TableRow({cantSplit:true,children:[new D.TableCell({
   columnSpan:2,width:{size:width,type:D.WidthType.DXA},shading:{fill:theme.navy},
   margins:{top:0,bottom:0,left:coverSidePadding,right:coverSidePadding},
   children:[new D.Paragraph({
    spacing:{before:0,after:0,line:240,lineRule:D.LineRuleType.EXACT},
    children:[new D.TextRun({text:' ',font,size:2})]
   })]
  })]})]
 });
 return [
  stripe,
  paragraph(heading.brand,{bold:true,color:theme.accent,size:24,spacing:{before:spacing.headingTop,after:40,line:250}}),
  paragraph(heading.title,{heading:D.HeadingLevel.TITLE,bold:true,color:theme.navy,size:38,spacing:{before:0,after:spacing.headingBottom,line:360}})
 ];
}
// Give company names and account numbers enough width for the top-20 detail pages.
const largeDetailWidths=[24,78,83,71,83,83,55,46,30,57,57,44,74].map(n=>n/785);
const v2LargeDetailWidths=[24,96,84,54,105,84,49,42,29,56,56,38,68].map(n=>n/785);
const v2CounterpartyWidths=[27,178,62,73,43,48,39,45,48,39,45,49,43,46].map(n=>n/785);
const sectionRankColumnWeights={
 '排名':27,'对手方名称':120,'客商分类':76,'关联关系':86,'黑名单':48,'个人类型':53,
 '诉讼案件数量':54,'行政处罚数量':54,'失信被执行人':53,'经营天数':45,'所属行业':72,
 '注册资本':61,'社保人数':44,'未识别客商关系':60,'收支重合':51,'说明':43
};
function sectionRankWidths(header){
 const weights=[...header.cells].map(cell=>{
  const title=text(cell);
  return sectionRankColumnWeights[title]||(/金额/.test(title)?76:/占比/.test(title)?56:48);
 });
 const total=weights.reduce((sum,n)=>sum+n,0);
 return weights.map(n=>n/total);
}
async function table(node,width,context){
 const rows=[...node.rows],columns=Math.max(...rows.map(row=>[...row.cells].reduce((n,c)=>n+c.colSpan,0)));
 const cover=!!context?.wordV2&&!!node.closest("#report-cover");
 const largeDetail=node.classList.contains('report-large-detail-table');
 const detailLayout=context.detailLayout;
 const flowSummary=node.classList.contains('report-flow-summary-table');
 // The eight-column analysis tables start with two row-spanning label cells.
 const overviewDistribution=context.compactOverview&&columns===8&&node.tHead?.rows.length===2;
 const narrowDistribution=overviewDistribution&&width<5500;
 const registryResults=context.compactOverview&&!!node.closest('#report-compliance .report-registry-screen');
 const tableWidth=registryResults?Math.floor(width*.94):width;
 const unit=Math.floor(tableWidth/columns);
 const capitalDistribution=narrowDistribution&&text(rows[0].cells[0])==='注册资本';
 const columnWidths=[...node.querySelectorAll(':scope > colgroup > col')].map(col=>parseFloat(col.style.width)/100);
 const spanWidths=flowSummary||overviewDistribution||largeDetail||columnWidths.length===columns;
 const counterpartyRanks=node.classList.contains('report-counterparty-rank-table');
 const relatedRanks=context.wordV2&&!!node.closest('.report-related-ranking');
 const directionPage=context.sectionFit==='counterparties';
 const denseRanks=directionPage&&counterpartyRanks&&rows.filter(row=>text(row.cells[1]).length>24).length>=8;
 const sectionRanks=node.classList.contains('report-section-rank-table');
 const compactRows=largeDetail||counterpartyRanks||sectionRanks;
 const concentrationTable=context.sectionFit==='concentration'&&node.classList.contains('report-concentration');
 const peoplePage=context.sectionFit==='people';
 const peopleSummary=peoplePage&&!sectionRanks;
 const rowPadding=cover
  ?(node.classList.contains('report-cover-status')?context.coverSpacing.status:context.coverSpacing.table)
  :registryResults?24:narrowDistribution?18:detailLayout?detailLayout.padding:concentrationTable?20:peopleSummary?44:directionPage?16:relatedRanks||peoplePage?22:context.sectionFit==='features'?48:context.sectionFit?30:compactRows?23:context?.natureGroup?85:context.compactOverview?27:45;
 const sidePadding=cover?coverSidePadding:narrowDistribution?10:directionPage||relatedRanks||overviewDistribution?30:55;
 const coverFrame=cover&&node.classList.contains('report-cover-grid');
 const natureRowSpan=node.closest('.report-counterparty-summary')&&Number(node.tBodies[0]?.rows[0]?.cells[0]?.rowSpan)>1
  ?node.tBodies[0].rows[0].cells[0].rowSpan:0;
 const alignDataCells=context.wordV2&&!coverFrame;
 const customWidths=node.classList.contains('report-cover-grid')?[.23,.77]
  :node.classList.contains('report-cover-status')?[.40,.22,.38]
  :largeDetail?(detailLayout?v2LargeDetailWidths:largeDetailWidths)
  :flowSummary?[.25,.13,.085,.09,.13,.085,.09,.14]
  :registryResults?[.44,.56]
  :columnWidths.length===columns?columnWidths
  :narrowDistribution?[.103,.127,.162,.116,.107,.162,.116,.107]
  :overviewDistribution?[.114,.117,.145,.11,.129,.145,.11,.13]
  :relatedRanks||directionPage&&counterpartyRanks?v2CounterpartyWidths
  :counterpartyRanks?[.033,.171,.083,.11,.057,.071,.047,.052,.071,.047,.052,.082,.06,.064]
  :sectionRanks?sectionRankWidths(rows[0]):null;
 const widths=coverFrame?coverColumnWidths(width):customWidths?customWidths.map(n=>Math.floor(tableWidth*n)):Array(columns).fill(unit);
 return new D.Table({
  layout:D.TableLayoutType.FIXED,width:registryResults?{size:94,type:D.WidthType.PERCENTAGE}:{size:width,type:D.WidthType.DXA},columnWidths:widths,borders,
  ...(coverFrame?{alignment:D.AlignmentType.CENTER}:{}),
  rows:await Promise.all(rows.map(async (row,rowIndex)=>new D.TableRow({
   tableHeader:row.parentElement.tagName==='THEAD',cantSplit:true,
   ...(registryResults||narrowDistribution||detailLayout||peopleSummary||coverFrame&&rowIndex===0?{height:{
    value:coverFrame?3*230+2*rowPadding:peopleSummary?(row.parentElement.tagName==='THEAD'?330:395):detailLayout?detailLayout.rowHeight:registryResults?(context.sectionFit?295:340):row.parentElement.tagName==='THEAD'?255:context.sectionFit?315:410,rule:D.HeightRule.ATLEAST
   }}:{}),
   children:await Promise.all([...row.cells].map(async (cell,i)=>{
    const header=cell.tagName==='TH',total=row.classList.contains('report-total'),categoryBand=row.classList.contains('report-category-band');
    const cellFontSize=peopleSummary?16:peoplePage||concentrationTable||relatedRanks||directionPage?(denseRanks&&i===1&&!header?13:14):narrowDistribution?(header?12:14):overviewDistribution&&header?14:registryResults?15:detailLayout?detailLayout.fontSize:undefined;
    const rowOffset=header&&row.sectionRowIndex===1&&spanWidths
     ?[...node.tHead.rows[0].cells].findIndex(cell=>cell.rowSpan===1)
     :natureRowSpan&&row.parentElement.tagName==='TBODY'&&row.sectionRowIndex%natureRowSpan!==0?1:0;
    const column=spanWidths?[...row.cells].slice(0,i).reduce((sum,c)=>sum+c.colSpan,rowOffset):i;
    const cellWidth=spanWidths?widths.slice(column,column+cell.colSpan).reduce((sum,w)=>sum+w,0):customWidths?widths[i]:unit*cell.colSpan;
    const statusElement=cell.querySelector('.report-status');
    const unidentified=!!cell.querySelector('.report-unidentified');
    const status=statusElement?.closest('td,th')===cell?theme.statuses[statusElement.dataset.status]:undefined;
    const rangeText=capitalDistribution&&!header&&i===0?text(cell).replace(/百万(?=～)/g,''):undefined;
    let align=status||node.classList.contains('report-cover-status')&&i>0?D.AlignmentType.CENTER:undefined;
    if(alignDataCells){
     align=row.parentElement.tagName==='THEAD'||status?D.AlignmentType.CENTER:D.AlignmentType.LEFT;
    }else if(narrowDistribution||registryResults||detailLayout){
     align=header?D.AlignmentType.CENTER:cell.classList.contains('report-num')||registryResults&&i===1?D.AlignmentType.RIGHT:D.AlignmentType.LEFT;
    }
    return new D.TableCell({
     width:{size:cellWidth,type:D.WidthType.DXA},columnSpan:cell.colSpan,rowSpan:cell.rowSpan,
     margins:{top:rowPadding,bottom:rowPadding,left:sidePadding,right:sidePadding},
     verticalAlign:alignDataCells||narrowDistribution||registryResults||detailLayout?'center':undefined,
     ...(categoryBand?{borders:{top:{...border,color:'91A9C6',size:6}}}:{}),
     shading:status?{fill:status.fill}:categoryBand?{fill:'F1F5F9'}:header||total?{fill:header?theme.fill:theme.total}:narrowDistribution&&rowIndex%2===0?{fill:'F6F9FD'}:undefined,
     children:await blocks(cell,Math.max(200,cellWidth-120),{
      cell:true,wordV2:context?.wordV2,coverSpacing:context?.coverSpacing,compactRows,compactOverview:context.compactOverview,
      registryResults,narrowDistribution,detailLayout,sectionFit:context.sectionFit,cellLine:peopleSummary?235:relatedRanks?210:denseRanks?181:undefined,rangeText,cellFontSize,characterSpacing:narrowDistribution&&header?-8:undefined,
      largeDetail:largeDetail||sectionRanks,bold:header||total||categoryBand||!!status,color:unidentified?'C00000':status?.text||(header||categoryBand?theme.heading:theme.ink),align
     })
    });
   }))
  })))
 });
}
async function blocks(node,width,context={}){
 const out=[];
 const tableLine=context.cellLine??({concentration:190,features:244,people:195,counterparties:190}[context.sectionFit]??214);
 const detailSpacing=(context.detailLayout||context.sectionFit||context.cellLine)&&{
  before:0,after:context.cell?0:42,line:context.cell?(context.detailLayout?.line??tableLine):240,lineRule:D.LineRuleType.EXACT
 };
 for(const child of node.childNodes){
  if(child.nodeType===3){
   if(child.textContent.trim()){
    const cover=context.coverSpacing;
    out.push(paragraph(context.rangeText??child.textContent.trim(),{
     bold:context.bold,color:context.color,align:context.align,characterSpacing:context.characterSpacing,size:context.cell?(context.cellFontSize??cover?.tableSize??(context.largeDetail?14:15)):18,
     snapToGrid:detailSpacing?false:undefined,
     spacing:detailSpacing??(cover&&context.cell?{after:0,line:230,lineRule:D.LineRuleType.EXACT}:context.registryResults||context.narrowDistribution?{after:0,line:205}:context.compactRows?{after:0,line:205}:context.compactOverview?{after:25,line:220}:undefined)
    }));
   }
   continue;
  }
  if(child.nodeType!==1)continue;
  const tag=child.tagName.toLowerCase();
  if(['script','style','button','input','select','form','summary'].includes(tag)||child.matches('.pagination,.report-sheet-header,.report-sheet-footer,.report-calculation-note'))continue;
  if(tag==='details'||child.matches('.report-extra'))continue;
  if(context.coverSpacing&&child.matches('#report-cover')){
   const sourceTable=child.querySelector('.report-cover-grid');
   const coverHeading={brand:text(child.querySelector('.report-masthead')),title:text(child.querySelector('h2'))};
   out.push(...coverHeadingBlocks(width,coverHeading,context.coverSpacing));
   out.push(await table(sourceTable,width,context));
   const notes=child.querySelector('.report-cover-notes');
   out.push(...await blocks(notes,width,context));
   continue;
  }
  if(child.matches('.report-toc')){
   const title=context.wordV2?text(child.querySelector('h2')):'报告目录';
   out.push(paragraph(title,{bold:true,color:theme.navy,size:context.wordV2?38:32,pageBreakBefore:context.tocAfterCover}));
   if(context.wordV2){
    const accent=Math.floor(width*.12);
    const fillCells=[theme.accent,theme.fill].map((fill,i)=>new D.TableCell({
     width:{size:i?width-accent:accent,type:D.WidthType.DXA},
     shading:{fill},margins:{top:0,bottom:0,left:0,right:0},
     children:[new D.Paragraph({spacing:{before:0,after:0,line:90},children:[new D.TextRun({text:' ',size:2})]})]
    }));
    out.push(new D.Table({width:{size:width,type:D.WidthType.DXA},columnWidths:[accent,width-accent],
     borders:Object.fromEntries(Object.keys(borders).map(key=>[key,{style:D.BorderStyle.NONE,size:0,color:'FFFFFF'}])),
     rows:[new D.TableRow({children:fillCells})]}));
   }
   out.push(wordContents(context.wordV2));
   continue;
  }
  if(child.matches('.report-chart')&&child.querySelector('svg')){
   const caption=child.querySelector('figcaption');
   if(caption){
    const emphasized=caption.matches('.report-large-chart-title');
    out.push(paragraph(text(caption),{bold:true,color:emphasized?theme.accent:context.natureGroup?'000000':theme.heading,size:context.natureGroup?20:emphasized?22:16,spacing:context.natureGroup?{after:20,line:220}:undefined}));
   }
   const chartLayout=child.matches('.report-concentration-chart')?{maxPlotHeight:context.sectionFit==='concentration'?154:245,legendWidth:680,
    legendMarkerSize:context.sectionFit==='concentration'?9:5}
    :context.sectionFit==='features'?{maxPlotHeight:195}
    :context.sectionFit==='compliance'?{maxPlotHeight:151}
    :child.closest('.report-counterparty-summary')?{maxPlotHeight:context.sectionFit==='counterparties'?115:225}
    :child.closest('#report-compliance')?{maxPlotHeight:157}
    :child.closest('#report-follow')?{maxPlotHeight:170}:undefined;
   out.push(await svgImage(child.querySelector('svg'),width,child.querySelector('.report-stack-legend,.report-legend'),chartLayout));
   for(const note of child.querySelectorAll(':scope > p'))out.push(paragraph(text(note),{size:15,color:theme.muted}));
   continue;
  }
  if(tag==='svg'){out.push(await svgImage(child,width));continue;}
  if(tag==='table'){out.push(await table(child,width,context));continue;}
  if(child.matches('.report-large-line')){
   const headline=child.matches('.report-large-tag,.report-large-value');
   const label=child.matches('.report-large-tag,.report-large-condition,.report-large-label');
   const group=child.matches('.report-large-group');
   const runs=[...child.childNodes].map(part=>{
    const element=part.nodeType===1;
    const red=element&&part.matches('.report-large-red');
    const scope=element&&part.matches('.report-large-scope');
    const company=element&&part.matches('.report-large-company');
    const groupTotal=element&&part.matches('.report-nature-group-total');
    return new D.TextRun({
     text:part.textContent,font,size:headline||company?22:red?17:16,
     bold:headline||red||scope||company||groupTotal,
     color:red?'C00000':scope?theme.accent:label&&!headline?theme.muted:theme.ink
    });
   });
   const natureSummaryLayout=context.sectionFit==='features';
   out.push(new D.Paragraph({
    snapToGrid:context.sectionFit?false:undefined,
    spacing:{before:group?(natureSummaryLayout?65:24):0,after:natureSummaryLayout?50:20,
     line:natureSummaryLayout?(headline||group?285:250):215,...(context.sectionFit?{lineRule:D.LineRuleType.EXACT}:{})},
    children:runs
   }));
   continue;
  }
  if(child.matches('.report-nature-reference')){
   out.push(paragraph(text(child),{size:16,color:theme.muted,spacing:{before:30,after:10,line:200}}));
   continue;
  }
  if(child.matches('.report-scope-label,.report-scope-value,.report-scope-detail,.report-scope-reference')){
   const value=child.matches('.report-scope-value'),muted=child.matches('.report-scope-label,.report-scope-reference');
   const compliance=!!child.closest('.report-compliance-card');
   const size=compliance?(value?24:16):value?26:17;
   const runs=[...child.childNodes].map(part=>new D.TextRun({
    text:part.textContent,font,size,bold:value||part.nodeType===1,
    color:part.nodeType===1&&part.matches('.report-scope-red')?'C00000':muted?theme.muted:theme.ink
   }));
   out.push(paragraph('',{runs,spacing:compliance?{before:value?60:0,after:context.sectionFit==='compliance'?35:10,line:context.sectionFit==='compliance'?(value?295:245):220}:undefined}));
   continue;
  }
  if(child.matches('.report-panes')){
   const panes=[...child.children];
   const weights=child.matches('.report-counterparty-summary')?[.38,.62]:child.matches('.report-related-summary')?[2,3]:panes.map(()=>1);
   if(panes.length)out.push(await grid(panes,width,weights,{natureGroup:child.matches('.report-nature-cards,.report-nature-charts'),compactOverview:context.compactOverview,wordV2:context.wordV2,sectionFit:context.sectionFit,statRule:child.classList.contains('report-stat-rule')}));
   continue;
  }
  if(child.matches('.report-direction')){
   out.push(await grid([...child.children],width,[.04,.24,.72],{wordV2:context.wordV2}));continue;
  }
  if(child.matches('.report-masthead')){
   out.push(new D.Paragraph({shading:{fill:theme.navy},spacing:{before:0,after:120,line:300},children:[new D.TextRun({text:' ',size:2})]}));
   out.push(paragraph(text(child),{bold:true,color:theme.accent,size:27}));continue;
  }
  const spaciousCover=!!context.coverSpacing&&!!child.closest('#report-cover');
  if(/^h[1-4]$/.test(tag)){
   const toc=!!child.closest('.report-toc');
   if(context.sectionFit==='concentration'&&child.matches('h4.report-subhead')){
    out.push(paragraph(text(child),{bold:true,color:theme.heading,size:18,snapToGrid:false,spacing:{before:54,after:38,line:215,lineRule:D.LineRuleType.EXACT}}));
    continue;
   }
   const registryFilter=child.matches('#report-compliance .report-registry-screen > h4');
   if(registryFilter){
    out.push(paragraph('筛选条件',{bold:true,size:18,align:D.AlignmentType.LEFT,spacing:{before:105,after:24,line:220}}));
    continue;
   }
   const main=tag==='h2',level=headingBookmarks.has(child)?[D.HeadingLevel.HEADING_1,D.HeadingLevel.HEADING_2,D.HeadingLevel.HEADING_3][headingDepth(child)-1]:undefined;
   const color=child.matches('.report-focus-heading')?'C00000':toc?theme.navy:theme.ink;
   const rankTitle=child.matches('.report-section-rank-title');
   out.push(paragraph(text(child),{heading:child.textContent.includes('综合分析报告（年审适用）')?D.HeadingLevel.TITLE:level,bold:!rankTitle,color,size:main?32:rankTitle?18:23,bookmark:headingBookmarks.get(child),snapToGrid:detailSpacing?false:undefined,spacing:rankTitle?{before:30,after:55,line:240}:detailSpacing?{...detailSpacing,line:main?440:320}:spaciousCover?{before:60,after:145,line:290}:context.compactOverview?{before:0,after:30,line:240}:undefined}));
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
     const bold=context.bold||['b','strong','figcaption'].includes(tag),size=spaciousCover?(context.cell?context.coverSpacing.tableSize:context.coverSpacing.noteSize):context.cell?(context.cellFontSize??15):18;
     if(child.matches('.report-detail-summary,.report-registry-condition')){
      const registry=child.matches('.report-registry-condition');
      const compactRegistry=registry&&!!child.closest('#report-compliance');
      const runs=[],color=context.color||theme.ink;
      const visit=(node,heavy=false)=>{if(node.nodeType===3){runs.push(new D.TextRun({text:node.textContent,font,size:compactRegistry?15:registry?16:size,bold:!!bold||heavy,color}));return;}for(const part of node.childNodes)visit(part,heavy||['STRONG','B'].includes(node.tagName));};
      visit(temp);out.push(paragraph('',{runs,color,align:context.align,size,snapToGrid:detailSpacing?false:undefined,spacing:detailSpacing??(registry?{after:30,line:220}:undefined)}));
     }else out.push(paragraph(value,{bold,color:context.color,align:context.align,size,snapToGrid:detailSpacing?false:undefined,spacing:detailSpacing??(spaciousCover?{before:!context.cell&&bold?context.coverSpacing.noteTop:0,after:context.cell?36:context.coverSpacing.noteAfter,line:context.cell?230:270}:context.compactOverview?{after:25,line:220}:undefined)}));
    }
   }
   continue;
  }
  out.push(...await blocks(child,width,context));
 }
 return out.length?out:[paragraph('',detailSpacing?{snapToGrid:false,spacing:detailSpacing}:undefined)];
}
function limitCoverCompanies(names){
 const charLimit=165;
 const separator='、',suffix=' 等 '+names.length.toLocaleString('zh-CN')+' 家';
 const length=text=>Array.from(text).length;
 const full=names.join(separator);
 if(length(full)<=charLimit)return full;
 const shown=[];
 let remaining=charLimit-length(suffix);
 for(const name of names){
  const cost=length(name)+(shown.length?1:0);
  if(cost>remaining)break;
  shown.push(name);
  remaining-=cost;
 }
 return (shown.length?shown.join(separator):Array.from(names[0]).slice(0,remaining-1).join('')+'…')+suffix;
}
function coverSpacingFor(page){
 const rows=Array.from(page.querySelectorAll('.report-cover-grid > tbody > tr'));
 const longest=rows.reduce((max,row)=>Math.max(max,text(row.cells[1]||row).length),0);
 const companyLength=rows[0]?.cells[1]?text(rows[0].cells[1]).length:0;
 const dense=companyLength>140||longest>450;
 return dense
  ?{table:46,status:37,tableSize:14,noteSize:16,headingTop:90,headingBottom:55,noteTop:50,noteAfter:50}
  :{table:72,status:53,tableSize:16,noteSize:18,headingTop:110,headingBottom:75,noteTop:70,noteAfter:65};
}
async function report(model,template=g.AuditReport){
 const container=document.createElement('div');
 container.innerHTML=template.render(model,{allRows:true,forExport:true});
 const wordV2=template===g.AuditReportV2;
 if(wordV2){
  const related=container.querySelector('#report-concentration');
  const thirdParty=container.querySelector('.report-concentration-third-party');
  if(related&&thirdParty){
   const continuation=thirdParty.closest('.report-sheet');
   related.append(thirdParty);
   continuation.remove();
  }
  for(const summary of container.querySelectorAll('.report-counterparty-summary')){
   const continuation=summary.closest('.report-sheet').nextElementSibling;
   const ranking=continuation?.querySelector('.report-counterparty-ranking');
   if(ranking){
    summary.after(ranking);
    continuation.remove();
   }
  }
  const people=container.querySelector('#report-people');
  const personDetails=container.querySelector('#report-people-detail');
  if(people&&personDetails){
   const continuation=personDetails.closest('.report-sheet');
   people.after(personDetails);
   continuation.remove();
  }
 }
 const pages=[...container.querySelectorAll('.report-sheet-content')];
 const companyNames=wordV2&&model.sections.find(section=>section.id==='cover')?.companyNamesByAmount;
 const companyCell=container.querySelector('#report-cover .report-cover-grid > tbody > tr:first-child > td');
 if(companyCell&&companyNames)companyCell.textContent=limitCoverCompanies(companyNames);
 headingBookmarks=new WeakMap();reportTocEntries=[];
 let bodyPage=0;
 pages.forEach(page=>{
  const front=page.dataset?.reportFront==='true'||!!page.querySelector?.('#report-cover,.report-toc');
  if(!front)bodyPage++;
  page.querySelectorAll(wordV2?'.report-chapter,.report-section > h3,#report-accounts':'.report-chapter,.report-section > h3').forEach(node=>{
  const id='ReportHeading'+(reportTocEntries.length+1);headingBookmarks.set(node,id);
  reportTocEntries.push({title:text(node),level:headingDepth(node),href:id,page:bodyPage});
 });});
 const run=t=>new D.TextRun({text:t,font,size:15,color:theme.muted});
 const footerPeriod=(wordV2?'财务报表期间：':'')+(model.from&&model.to?model.from+' ～ '+model.to:'无流水');
 const header=new D.Header({children:[new D.Paragraph({
  spacing:{after:60},tabStops:[{type:D.TabStopType.RIGHT,position:pageWidth}],
  border:{bottom:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},
  children:[run('毕马威审计罗盘'),run('\t综合分析报告（年审适用）')]
 })]});
 const footer=new D.Footer({children:[new D.Paragraph({
  spacing:{before:60},tabStops:[{type:D.TabStopType.CENTER,position:Math.floor(pageWidth/2)},{type:D.TabStopType.RIGHT,position:pageWidth}],
  border:{top:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},
  children:[run('审计项目资料'),run('\t'+footerPeriod),run('\t第 '),
   new D.TextRun({children:[D.PageNumber.CURRENT],font,size:15,color:theme.muted}),run(' 页')]
 })]});
 const frontFooter=new D.Footer({children:[new D.Paragraph({spacing:{before:60},tabStops:[{type:D.TabStopType.CENTER,position:Math.floor(pageWidth/2)}],border:{top:{style:D.BorderStyle.SINGLE,size:4,color:theme.border}},children:[run('审计项目资料'),run('\t'+footerPeriod)]})]});
 const detailLayouts=[
   ['#report-large-internal',{rowHeight:270,padding:24,fontSize:14,line:204}],
   ['#report-large-external',{rowHeight:265,padding:22,fontSize:14,line:204}],
   ['#report-blank-memo',{rowHeight:260,padding:24,fontSize:15,line:210}]
  ];
 const sections=[];let bodyStarted=false;
 for(const [pageIndex,page] of pages.entries()){
  const front=page.dataset?.reportFront==='true'||!!page.querySelector?.('#report-cover,.report-toc');
  const restart=!front&&!bodyStarted;if(!front)bodyStarted=true;
  const coverSpacing=wordV2&&page.querySelector('#report-cover')?coverSpacingFor(page):undefined;
  const isV2Toc=wordV2&&!!page.querySelector('.report-toc');
  const tocAfterCover=isV2Toc&&!!pages[pageIndex-1]?.querySelector('#report-cover');
  const detailLayout=wordV2?detailLayouts.find(([selector])=>page.querySelector(selector))?.[1]:undefined;
  const compactOverview=wordV2&&!!page.querySelector('#report-compliance,#report-follow');
  const sectionFit=wordV2&&(page.querySelector('.report-counterparty-summary')?'counterparties':
   ['features','concentration','compliance','people'].find(id=>page.querySelector('#report-'+id)));
  const boundedPage=detailLayout||coverSpacing||sectionFit;
  const content=await blocks(page,pageWidth,{wordV2,coverSpacing,compactOverview,detailLayout,sectionFit,tocAfterCover});
  if(tocAfterCover){
   // A single page break avoids a separate cover section ending before the TOC.
   sections.at(-1).children.push(...content);
   continue;
  }
  if(!isV2Toc&&!(coverSpacing&&pages[pageIndex+1]?.querySelector('.report-toc')))content.push(new D.Paragraph({spacing:{before:0,after:0,line:20,...(boundedPage?{lineRule:D.LineRuleType.EXACT}:{})},snapToGrid:boundedPage?false:undefined,children:[new D.TextRun({text:'',size:2})]}));
  sections.push({
   properties:{type:D.SectionType.NEXT_PAGE,...(boundedPage?{grid:{type:D.DocumentGridType.DEFAULT}}:{}),page:{size:{width:11906,height:16838,orientation:D.PageOrientation.LANDSCAPE},pageNumbers:restart?{start:1}:{},margin:{top:coverSpacing?680:detailLayout||sectionFit?660:compactOverview?760:850,right:567,bottom:coverSpacing?650:detailLayout||sectionFit?660:compactOverview?760:850,left:567,header:300,footer:300}}},
   headers:{default:header},footers:{default:front?frontFooter:footer},children:content
  });
 }
 const wordDocument=new D.Document({
  features:{updateFields:true},creator:'Audit Compass',title:'综合分析报告（年审适用）',
  styles:{default:{document:{run:{font,size:18},paragraph:{spacing:{after:65}}}},paragraphStyles:[{id:'TOC3',name:'toc 3',basedOn:'Normal',run:{font,size:24,color:theme.ink},paragraph:{indent:{left:480},spacing:{after:120,line:320}}},{id:'TOC1',name:'toc 1',basedOn:'Normal',run:{font,size:24,bold:true,color:theme.ink},paragraph:{spacing:{before:100,after:120,line:320}}},{id:'TOC2',name:'toc 2',basedOn:'Normal',run:{font,size:24,color:theme.ink},paragraph:{indent:{left:240},spacing:{after:120,line:320}}}]},
  sections
 });
 return D.Packer.toBlob(wordDocument);
}
let macroProject=null;
async function setMacroTemplate(file){
 const zip=await g.JSZip.loadAsync(file),project=zip.file('word/vbaProject.bin');
 if(!project)throw Error('此文件没有 Word VBA 宏。请按设置说明保存带 AutoOpen 宏的 .docm 文件后再导入。');
 if(zip.file('word/_rels/vbaProject.bin.rels'))throw Error('请使用仅含目录更新宏的独立模板，不支持含外部宏依赖的模板。');
 macroProject=await project.async('uint8array');
}
async function exportReport(model,template=g.AuditReport){
 const blob=await report(model,template);if(!macroProject)return {blob,extension:'docx'};
 const zip=await g.JSZip.loadAsync(await blob.arrayBuffer()),relPath='word/_rels/document.xml.rels';
 let types=await zip.file('[Content_Types].xml').async('string');
 types=types.replace('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml','application/vnd.ms-word.document.macroEnabled.main+xml');
 types=types.replace('</Types>','<Override PartName="/word/vbaProject.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>');
 let rels=await zip.file(relPath).async('string');let id='AuditCompassVba';while(rels.includes('Id="'+id+'"'))id+='1';
 rels=rels.replace('</Relationships>','<Relationship Id="'+id+'" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>');
 zip.file('word/vbaProject.bin',macroProject);zip.file('[Content_Types].xml',types);zip.file(relPath,rels);
 return {blob:await zip.generateAsync({type:'blob',mimeType:'application/vnd.ms-word.document.macroEnabled.12'}),extension:'docm'};
}
const macroCode=`Attribute VB_Name = "AuditCompassContents"
Option Explicit

Public Sub AutoOpen()
    On Error GoTo Done
    If ActiveDocument.TablesOfContents.Count = 0 Then Exit Sub
    ActiveDocument.Repaginate
    ActiveDocument.TablesOfContents(1).Range.Select
    Dialogs(wdDialogUpdateTOC).Show
Done:
End Sub
`;
async function macroKit(){
 const zip=new g.JSZip();zip.file('AuditCompassContents.bas',macroCode);
 zip.file('首次设置说明.txt',`目录打开时更新（仅需配置一次）
1. 在桌面版 Microsoft Word 新建空白文档，打开开发工具中的 Visual Basic 编辑器。
2. 在此文档项目内选择 文件 → 导入文件，导入 AuditCompassContents.bas（标准模块，保留模块名）。
3. 将文档另存为 Word 启用宏的文档（.docm），关闭文档。模板不需要报告正文。
4. 回到工作坊的“目录更新宏设置”，导入这个 .docm 模板。之后本次页面中的报告会导出为 .docm。
5. 用 Word 打开报告，在你信任该宏时允许宏运行。AutoOpen 会定位第一个目录并显示“更新目录”对话框，请选择更新整个目录。
宏只重新分页、定位目录、打开更新窗口；不联网、不修改测试数据。Word 禁用宏、受保护视图或安全策略阻止时不会执行；网页不能绕过这些设置。
宏模板只在当前页面会话中使用，不保存进项目 JSON；刷新页面后需要重新导入模板。
请使用未签名、仅包含本目录更新宏的独立模板；模板中的 VBA 代码将原样带入导出报告。
`);
 return zip.generateAsync({type:'blob'});
}
g.AuditWord={report,exportReport,setMacroTemplate,macroKit,hasMacroTemplate:()=>!!macroProject};
})(globalThis);
