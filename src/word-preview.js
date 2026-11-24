(function(g){
'use strict';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const children=(node,name)=>Array.from(node?.children||[]).filter(child=>!name||child.localName===name);
const child=(node,name)=>children(node,name)[0];
const attr=(node,key)=>node?.getAttributeNS(W,key);
const number=(node,key)=>Number(attr(node,key)||0);
const twips=value=>Number(value)/20+'pt';
const color=value=>/^[0-9a-f]{6}$/i.test(value||'')?'#'+value:'';
const create=tag=>document.createElement(tag);
function xml(source){return new DOMParser().parseFromString(source,'application/xml');}
function applyRunStyle(span,props){
 const enabled=name=>{
  const setting=child(props,name);
  return setting&&!['0','false','off'].includes(attr(setting,'val'));
 };
 if(enabled('b'))span.style.fontWeight='700';
 if(enabled('i'))span.style.fontStyle='italic';
 if(child(props,'sz'))span.style.fontSize=number(child(props,'sz'),'val')/2+'pt';
 if(child(props,'color'))span.style.color=color(attr(child(props,'color'),'val'));
 if(child(props,'spacing'))span.style.letterSpacing=twips(number(child(props,'spacing'),'val'));
}
async function render(blob){
 const zip=await g.JSZip.loadAsync(await blob.arrayBuffer());
 const read=async path=>xml(await zip.file(path).async('string'));
 const [documentXml,relXml]=await Promise.all([read('word/document.xml'),read('word/_rels/document.xml.rels')]);
 const assets=new Map(),pageParts=new Map();
 await Promise.all(Array.from(relXml.documentElement.children).map(async relation=>{
  const target=relation.getAttribute('Target')||'';
  if(/^(?:header|footer)\d+\.xml$/.test(target)&&zip.file('word/'+target)){
   pageParts.set(relation.getAttribute('Id'),(await read('word/'+target)).documentElement);
   return;
  }
  if(!/^media\/[\w.()-]+$/i.test(target)||!zip.file('word/'+target))return;
  const mime=/\.png$/i.test(target)?'image/png':/\.jpe?g$/i.test(target)?'image/jpeg':'';
  if(mime)assets.set(relation.getAttribute('Id'),'data:'+mime+';base64,'+await zip.file('word/'+target).async('base64'));
 }));
 function appendInline(output,node){
  switch(node.localName){
   case 'r':{
    const span=create('span');applyRunStyle(span,child(node,'rPr'));
    for(const part of children(node))appendInline(span,part);
    if(span.hasChildNodes())output.append(span);
    break;
   }
   case 't':output.append(node.textContent);break;
   case 'tab':{const tab=create('span');tab.className='word-preview-tab';output.append(tab);break;}
   case 'br':output.append(create('br'));break;
   case 'hyperlink':{
    const link=create('a'),anchor=attr(node,'anchor');
    if(anchor)link.href='#word-preview-'+anchor;
    for(const part of children(node))appendInline(link,part);
    output.append(link);break;
   }
   case 'bookmarkStart':{
    const anchor=create('span');anchor.id='word-preview-'+attr(node,'name');output.append(anchor);break;
   }
   case 'drawing':{
    const descendants=Array.from(node.getElementsByTagName('*'));
    const picture=descendants.find(n=>n.localName==='blip'),extent=descendants.find(n=>n.localName==='extent');
    const src=assets.get(picture?.getAttributeNS(R,'embed'));
    if(!src)break;
    const image=create('img');image.src=src;image.alt='报告图表';
    if(extent)image.style.width=Number(extent.getAttribute('cx'))/12700+'pt';
    output.append(image);break;
   }
   default: break;
  }
 }
 function renderParagraph(node){
  const p=create('p'),props=child(node,'pPr'),spacing=child(props,'spacing');
  if(spacing){
   p.style.marginTop=twips(number(spacing,'before'));
   p.style.marginBottom=twips(number(spacing,'after'));
   if(number(spacing,'line'))p.style.lineHeight=number(spacing,'line')/240;
  }
  const alignment=attr(child(props,'jc'),'val');
  if(['left','right','center'].includes(alignment))p.style.textAlign=alignment;
  const fill=color(attr(child(props,'shd'),'fill'));
  if(fill)p.style.backgroundColor=fill;
  const style=attr(child(props,'pStyle'),'val')||'';
  if(/^TOC[123]$/i.test(style)){
   p.classList.add('word-preview-toc-entry');
   p.style.marginLeft=Number(style.at(-1)-1)*12+'pt';
  }
  for(const item of children(node))appendInline(p,item);
  if(!p.hasChildNodes())p.append('\u00a0');
  return p;
 }
 function renderTable(node){
  const table=create('table'),props=child(node,'tblPr'),cols=children(child(node,'tblGrid'),'gridCol'),widths=cols.map(col=>number(col,'w'));
  if(attr(child(props,'jc'),'val')==='center')table.style.marginInline='auto';
  const specifiedWidth=child(props,'tblW');
  if(attr(specifiedWidth,'type')==='pct'){
   const measure=attr(specifiedWidth,'w');
   if(measure)table.style.width=measure.endsWith('%')?measure:Number(measure)/50+'%';
  }
  const borders=children(child(props,'tblBorders'));
  if(borders.length&&borders.every(edge=>['none','nil'].includes(attr(edge,'val'))))table.classList.add('word-preview-borderless');
  const sum=widths.reduce((a,b)=>a+b,0);
  if(sum){
   const group=create('colgroup');
   for(const width of widths){const col=create('col');col.style.width=width/sum*100+'%';group.append(col);}
   table.append(group);
  }
  const merges=new Map();
  for(const row of children(node,'tr')){
   const tr=create('tr'),height=child(child(row,'trPr'),'trHeight');
   if(height&&attr(height,'hRule')!=='auto')tr.style.height=twips(number(height,'val'));
   let column=0;
   for(const cell of children(row,'tc')){
    const props=child(cell,'tcPr'),span=number(child(props,'gridSpan'),'val')||1;
    const merge=child(props,'vMerge'),previous=merges.get(column);
    if(merge&&attr(merge,'val')!=='restart'&&previous){previous.rowSpan++;column+=span;continue;}
    const td=create('td');td.colSpan=span;
    if(merge)merges.set(column,td);else merges.delete(column);
    const fill=color(attr(child(props,'shd'),'fill'));if(fill)td.style.backgroundColor=fill;
    if(attr(child(props,'vAlign'),'val')==='center')td.style.verticalAlign='middle';
    const margins=child(props,'tcMar');
    for(const side of ['top','bottom','left','right']){
     if(child(margins,side))td.style['padding'+side[0].toUpperCase()+side.slice(1)]=twips(number(child(margins,side),'w'));
    }
    for(const block of children(cell))appendBlock(td,block);
    tr.append(td);column+=span;
   }
   table.append(tr);
  }
  return table;
 }
 function appendBlock(output,node){
  if(node.localName==='p')output.append(renderParagraph(node));
  else if(node.localName==='tbl')output.append(renderTable(node));
  else if(node.localName==='sdt')for(const block of children(child(node,'sdtContent')))appendBlock(output,block);
 }
 function pagePart(section,kind,pageNumber){
  const reference=child(section,kind+'Reference');
  const part=pageParts.get(reference?.getAttributeNS(R,'id'));
  if(!part)return null;
  const elements=Array.from(part.getElementsByTagNameNS(W,'*'));
  const value=elements.map(node=>node.localName==='t'?node.textContent:
   node.localName==='instrText'&&node.textContent.trim()==='PAGE'?String(pageNumber):'').join('');
  const line=create(kind==='header'?'header':'footer');
  line.className='word-preview-'+kind;
  for(const group of value.split('\t')){const span=create('span');span.textContent=group;line.append(span);}
  return line;
 }
 const pages=create('div');pages.className='word-preview-pages';
 let pageNumber=1;
 let content=create('section');
 let sectionPages=[];
 for(const block of children(child(documentXml.documentElement,'body'))){
  const properties=child(block,'pPr');
  if(child(properties,'pageBreakBefore')&&content.hasChildNodes()){
   sectionPages.push(content);
   content=create('section');
  }
  const section=block.localName==='sectPr'?block:child(properties,'sectPr');
  if(!section||block.textContent.trim()||block.getElementsByTagNameNS(W,'drawing').length)appendBlock(content,block);
  if(!section)continue;
  const size=child(section,'pgSz'),margins=child(section,'pgMar');
  const restart=number(child(section,'pgNumType'),'start');
  if(restart)pageNumber=restart;
  for(const sectionPage of [...sectionPages,content]){
   sectionPage.className='word-preview-page';
   sectionPage.style.width=twips(number(size,'w')||16838);
   sectionPage.style.minHeight=twips(number(size,'h')||11906);
   sectionPage.style.padding=['top','right','bottom','left'].map(side=>twips(number(margins,side))).join(' ');
   const header=pagePart(section,'header',pageNumber),footer=pagePart(section,'footer',pageNumber);
   if(header)sectionPage.prepend(header);
   if(footer)sectionPage.append(footer);
   pages.append(sectionPage);
   pageNumber++;
  }
  sectionPages=[];
  content=create('section');
 }
 if(content.hasChildNodes()){content.className='word-preview-page';pages.append(content);}
 return pages;
}
g.AuditWordPreview={render};
})(globalThis);
