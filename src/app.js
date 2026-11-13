'use strict';
const E=AuditEngine,X=AuditExcel,K=E.KEYS,$=s=>document.querySelector(s),h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}),num=n=>Number(n||0).toLocaleString('en-US');
const reportScenarioCounts={
 big:12,blankCP:45,blankSummary:45,balanceErrors:8,sameTime:8,sameMissing:6,person:12,once:5,blacklist:15,
 customerPairs:64,supplierPairs:64,bothPairs:64,nonPairs:64,relatedPairs:12,
 relatedCustomerPairs:36,relatedSupplierPairs:36,relatedBothPairs:36,relatedNonPairs:36,
 internalBig:8,employeeRows:12,officerRows:12
};
function defaultReportProject(){
 const config={seed:'AC-REPORT-COVERAGE',start:'2023-01-01',end:'2025-12-31',count:9000,min:100,max:24000000,opening:120000,includeForeign:true,fx:E.DEFAULT_FX,growth:18,internal:12,big:12,bigThreshold:50000,blankCP:30,blankSummary:30,balanceErrors:12,sameTime:12,sameMissing:9,person:true,once:true,personPerYear:2,oncePerYear:2,annualCounts:{},companyFlow:{},sampleNonMerchants:{},sampleAccountPlans:{},companySourceMode:'all',missingCompany:true,cut:'12-31',first:2023,last:2025};
 config.annualCounts=Object.fromEntries([2023,2024,2025].map(year=>[year,{...reportScenarioCounts}]));
 const company=BASELINE[K.flow].rows[0][0];
 const counts={customerOnly:68,supplierOnly:68,both:68,nonMerchant:68};
 const related=Object.fromEntries(Object.keys(counts).map(id=>[id,36]));
 const samples=E.masterSamples(BASELINE,{companies:[company],seed:config.seed,counts,related,employees:12,officers:12,
  accounts:{normalCNY:5,normalUSD:2,bankOnly:2,bookOnly:2,noBook:2,noMaster:2,flowOnly:2}});
 config.sampleNonMerchants=samples.pools;
 config.sampleAccountPlans=samples.accountPlans;
 const {data}=E.generate(samples.data,config);
 config.reportCriteria=AuditReport.parseCriteria({daysMin:0,daysMax:365,insuredMax:50,paidMin:20,paidMax:50,overlapAmount:1000000,overlapPercent:20,unknownAmount:500000});
 config.registryIntervalVersion=AuditRegistry.INTERVAL_VERSION;
 config.registryBounds=Object.fromEntries(AuditRegistry.metrics.map(([id,,,limits])=>[id,[...limits]]));
 const own=new Set(data[K.company].rows.map(r=>r[0]));
 const frequency=new Map();
 for(const r of data[K.flow].rows)if(r[3]&&r[3].length>4&&!own.has(r[3]))frequency.set(r[3],(frequency.get(r[3])||0)+1);
 const names=[...frequency].sort((a,b)=>b[1]-a[1]).map(([name])=>name);
 config.registryRecords=AuditRegistry.generate(names.slice(0,Math.ceil(names.length*.85)),'2023-12-31').map((r,i)=>{
  // Include recorded values on both sides of common reporting boundaries.
  const durationCases=[180,364,365,366,729,730,1094,1095,1440];
  return i%3===0?{...r,days:durationCases[(i/3)%durationCases.length]}:r;
 });
 return {data,source:samples.data,config};
}
const builtIn=defaultReportProject(),defaultSourceLabel='可优比 · 报告覆盖样本';
let data=builtIn.data,generationSource=builtIn.source;
let page='overview',master=K.company,preview=K.flow,search='',pageNo=1,lastData=null,analysis=null,busy=false,sourceLabel=defaultSourceLabel;
const config=builtIn.config;
try{const saved=JSON.parse(localStorage.getItem('ac-forge-settings')||'null');if(saved){if(!saved.annualCounts)for(const [k,v]of Object.entries({big:6,blankCP:15,blankSummary:15,balanceErrors:6,sameTime:6,sameMissing:5}))if(saved[k]===v)delete saved[k];delete saved.sampleNonMerchants;delete saved.sampleAccountPlans;const annual=saved.annualCounts;delete saved.annualCounts;Object.assign(config,AuditRegistry.migrateSettings(saved));for(const [year,counts] of Object.entries(annual||{}))config.annualCounts[year]={...config.annualCounts[year],...counts};}}catch{}
const icons={overview:'◫',master:'▦',rules:'≋',anomaly:'◎',preview:'▤',export:'↗'};
if(!Number.isFinite(config.fx)||config.fx<=0)config.fx=E.DEFAULT_FX;
let reportPeriod={};
const exchangeRates=()=>({USD:config.fx,...config.rates});
const rawRegistry=()=>config.registryRecords||[];
let registryProjectionCache=null;
function registryReportEnd(){return config.registryStartAnchor||data[K.flow].rows.reduce((last,r)=>{const d=String(r[5]??'').slice(0,10);return d>last?d:last;},'')||config.end;}
function registryProjection(){
 const records=rawRegistry(),asOf=registryReportEnd(),signature=JSON.stringify(records);
 if(!registryProjectionCache||registryProjectionCache.asOf!==asOf||registryProjectionCache.signature!==signature)registryProjectionCache={...AuditRegistry.automaticDates(records,asOf),asOf,signature};
 return registryProjectionCache;
}
const registry=()=>registryProjection().records;
const bounds=()=>config.registryBounds||{};
const fullReportModel=()=>AuditReport.compute(data,{registry:registry(),registryOriginal:rawRegistry(),registryAsOf:registryReportEnd(),registryBounds:bounds(),criteria:config.reportCriteria,cut:config.cut,...reportPeriod,threshold:config.bigThreshold,rates:exchangeRates()});
const reportModel=()=>AuditReport.selectSections(fullReportModel(),config.reportSections);
const reportPage=()=>AuditReport.render(reportModel());
const titles={templateImport:['Excel 模板转项目','导入与平台导出格式一致的Excel，检查后转为可保存的JSON项目。'],registry:['对手方工商数据','生成和维护离线工商档案，并配置报告统计区间。'],coverage:['场景覆盖检查','按交易日期的自然年，确认当前数据是否含有预期测试样本。'],report:['报告核验','选择财年或日期区间，对照平台报告与当前测试数据。'],overview:['数据总览','从当前数据开始，按你的测试目标调整。'],master:['主档管理','新增或更换被审计单位，维护账号、员工及其他往来对象。'],rules:['流水生成规则','设定交易日期、笔数、金额和内部往来。'],anomaly:['异常场景','设定每年要植入的样本数。先预检，再正式生成。'],preview:['数据预览','生成前后都能逐行查看，核对真实导出内容。'],export:['导出测试数据','检查文件格式，再下载供平台上传的整套测试数据。']};
const narrowScreen=matchMedia('(max-width: 760px)');
let sidebarPreference;
try{
 const saved=localStorage.getItem('ac-forge-sidebar');
 if(saved==='collapsed'||saved==='expanded')sidebarPreference=saved==='collapsed';
}catch{}
function sidebarCollapsed(){return sidebarPreference??narrowScreen.matches;}
function renderSidebar(){
 const collapsed=sidebarCollapsed(),label=collapsed?'展开侧边栏':'收起侧边栏';
 document.body.classList.toggle('sidebar-collapsed',collapsed);
 $('#mainSidebar').classList.toggle('is-collapsed',collapsed);
 const toggle=$('#sidebarBrandToggle');
 toggle.setAttribute('aria-expanded',String(!collapsed));
 toggle.setAttribute('aria-label',label);toggle.title=label;
 closeFlyout();
 $('#sidebarScrim').hidden=collapsed||!narrowScreen.matches;
}
function setSidebar(collapsed){
 sidebarPreference=collapsed;
 try{localStorage.setItem('ac-forge-sidebar',collapsed?'collapsed':'expanded');}catch{}
 renderSidebar();
}
$('#sidebarBrandToggle').onclick=()=>setSidebar(!sidebarCollapsed());
$('#sidebarScrim').onclick=()=>{setSidebar(true);$('#sidebarBrandToggle').focus();};
narrowScreen.addEventListener('change',renderSidebar);
const flyout=$('#sidebarFlyout');
let flyoutTimer;
function closeFlyout(){
 clearTimeout(flyoutTimer);
 flyout.classList.remove('is-open');
 for(const head of document.querySelectorAll('.sb-toggle-head'))head.setAttribute('aria-expanded',String(!sidebarCollapsed()&&head.closest('.sb-toggle').classList.contains('open')));
}
function showFlyout(head){
 if(!sidebarCollapsed())return;
 clearTimeout(flyoutTimer);
 const group=head.closest('.sb-toggle');
 const title=head.querySelector('.sb-txt').textContent;
 const choices=[...group.querySelectorAll('[data-nav]')].map(entry=>{
  const clone=entry.cloneNode(true);
  clone.className='sidebar-flyout-item'+(clone.dataset.nav===page?' is-current':'');
  return clone.outerHTML;
 }).join('');
 flyout.innerHTML='<div class="sidebar-flyout-head">'+h(title)+'</div><div class="sidebar-flyout-list">'+choices+'</div>';
 const rect=head.getBoundingClientRect();
 flyout.style.left=rect.right+9+'px';
 flyout.style.top=rect.top+'px';
 flyout.classList.add('is-open');
 for(const item of document.querySelectorAll('.sb-toggle-head'))item.setAttribute('aria-expanded',String(item===head));
 flyout.style.top=Math.max(44,Math.min(rect.top,innerHeight-flyout.offsetHeight-8))+'px';
}
const scheduleFlyoutClose=()=>{clearTimeout(flyoutTimer);flyoutTimer=setTimeout(closeFlyout,160);};
for(const head of document.querySelectorAll('.sb-toggle-head')){
 head.addEventListener('mouseenter',()=>showFlyout(head));
 head.addEventListener('mouseleave',scheduleFlyoutClose);
 head.addEventListener('click',()=>{
  if(sidebarCollapsed()){showFlyout(head);flyout.querySelector('button')?.focus();return;}
  const open=head.closest('.sb-toggle').classList.toggle('open');
  head.setAttribute('aria-expanded',String(open));
 });
}
flyout.addEventListener('mouseenter',()=>clearTimeout(flyoutTimer));
flyout.addEventListener('mouseleave',scheduleFlyoutClose);
flyout.addEventListener('focusout',e=>{if(!flyout.contains(e.relatedTarget))scheduleFlyoutClose();});
document.addEventListener('click',e=>{
 if(!e.target.closest('#mainSidebar,#sidebarFlyout'))closeFlyout();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFlyout();});
renderSidebar();
function recalc({preserveRows=false}={}){if(!preserveRows)for(const row of data[K.flow].rows)E.convertRow(row,exchangeRates());analysis=E.analysis(data,{cut:config.cut,first:config.first,last:config.last,threshold:config.bigThreshold,rates:exchangeRates()});}
function toast(text,error=false){const el=$('#toast');el.textContent=text;el.className='toast show'+(error?' error':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='toast',4200);}
function persist(){try{const {sampleNonMerchants,sampleAccountPlans,registryRecords,...settings}=config;localStorage.setItem('ac-forge-settings',JSON.stringify(settings));}catch{}}
function badge(text,kind=''){return `<span class="badge ${kind}">${h(text)}</span>`;}
function field(label,id,value,type='number',hint='',attrs=''){return `<label class="field"><span>${label}</span><input type="${type}" data-config="${id}" value="${h(value)}" ${attrs}>${hint?`<small>${hint}</small>`:''}</label>`;}
function summary(){return `<div class="metrics">${[['流水记录',num(analysis.count),'覆盖 '+analysis.activeCompanies+' 家有流水公司'],['本方银行账号',analysis.accounts,'账号主档 '+data[K.bank].rows.length+' 个'],['等值人民币交易额',fmt(analysis.total/1000000),'百万 · 等值人民币流入＋流出'],['待核验的余额断点',analysis.exceptions.length,'按相邻交易余额实际计算']].map(([l,v,n],i)=>`<article class="metric"><div>${l}<span class="metric-icon">${['↔','▣','¥','◎'][i]}</span></div><strong>${v}</strong><small>${n}</small></article>`).join('')}</div>`;}
function chart(){const rows=analysis.monthly;if(!rows.length)return '<div class="empty">暂无流水，导入数据或生成后再查看。</div>';const max=Math.max(1,...rows.flatMap(r=>[r[1],r[2]])),w=780,ht=170;const points=j=>rows.map((r,i)=>`${20+i*(w-40)/Math.max(1,rows.length-1)},${ht-15-r[j]/max*(ht-30)}`).join(' ');return `<svg viewBox="0 0 ${w} ${ht}" class="trend" role="img" aria-label="月度流入与流出趋势"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10448d" stop-opacity=".12"/><stop offset="1" stop-color="#10448d" stop-opacity="0"/></linearGradient></defs>${[30,70,110,150].map(y=>`<line x1="15" x2="765" y1="${y}" y2="${y}" stroke="#e6eaf0" stroke-dasharray="3 5"/>`).join('')}<polygon points="20,155 ${points(1)} 760,155" fill="url(#area)"/><polyline fill="none" stroke="#194c94" stroke-width="2.5" points="${points(1)}"/><polyline fill="none" stroke="#6c87b3" stroke-width="2" points="${points(2)}"/>${rows.map((r,i)=>`<circle cx="${20+i*(w-40)/Math.max(1,rows.length-1)}" cy="${ht-15-r[1]/max*(ht-30)}" r="3" fill="#194c94"><title>${r[0]} 流入 ${fmt(r[1])}；流出 ${fmt(r[2])}</title></circle>`).join('')}</svg><div class="chart-dates"><span>${h(rows[0][0])}</span><span>${h(rows[Math.floor(rows.length/2)][0])}</span><span>${h(rows.at(-1)[0])}</span></div>`;}
function overview(){return `<section class="hero"><div><div class="eyebrow">TEST DATA WORKSPACE</div><h2>一套数据，覆盖不同测试。</h2><p>以当前可优比版为起点，修改主档、重新造流水、植入异常，<br>再用自动生成的核验值检查报告。</p><div class="actions"><button class="primary" data-nav="master">开始生成测试数据 <span>→</span></button><button data-nav="report">进入报告核验</button></div></div><div class="hero-art" aria-hidden="true"><div class="art-top">数据方案 <b>AC / 4.0</b></div><div class="art-bars">${[42,74,57,100,66,83,53,91,62,78].map((v,i)=>`<i style="height:${v}%;background:${i%3===0?'#7fa0cf':'#b1c0d5'}"></i>`).join('')}</div><div class="art-bottom"><span>2023—2025</span><span>可配置 · 可复用</span></div></div></section>${summary()}<div class="two-col"><section class="panel"><div class="panel-heading"><h3>资金流入 / 流出趋势</h3><span class="legend"><i></i>流入 <i class="blue"></i>流出</span></div>${chart()}</section><section class="panel"><div class="panel-heading"><h3>这套数据包含什么</h3>${badge('实际检测')}</div><div class="scenario-list">${[['大额单笔交易',analysis.big],['交易对手方为空',analysis.blankCP],['摘要为空',analysis.blankSummary],['缺失同名账户',analysis.missing.length],['仅流水有的本方账号',analysis.flowOnly.length],['账号主档有但无流水',analysis.noflow.length]].map(([n,v])=>`<div><span>${n}</span><b>${v}<small> ${n.includes('账号')||n.includes('账户')?'个':'笔'}</small></b></div>`).join('')}</div></section></div>`;}
let flowFilters={},flowSort=null;
const currentFlowRows=()=>E.previewFlowRows(data[K.flow],{filters:flowFilters,sort:flowSort,query:search});
function resetFlowFilters(){
 flowFilters={};flowSort=null;search='';pageNo=1;
}
const flowFilterColumns={0:'company',1:'account',3:'counterparty',5:'date',7:'currency',8:'direction',10:'direction',20:'type'};
const flowFilterKeys=kind=>kind==='date'?['from','to']:[kind];
const filterPopover=$('#flowFilterPopover');
if(typeof filterPopover.showPopover!=='function'){filterPopover.removeAttribute('popover');filterPopover.hidden=true;}
let pageSize=20,tablePagerState=null;
function flowHeader(label,column){
 const active=flowSort?.column===column,kind=flowFilterColumns[column];
 const filtered=kind&&flowFilterKeys(kind).some(k=>flowFilters[k]);
 const sortButton=dir=>`<button type="button" data-sort-flow="${column}" data-sort-direction="${dir}" class="ba-sort-${dir==='desc'?'down':'up'}" aria-label="${h(label)}${dir==='desc'?'降序':'升序'}" title="${dir==='desc'?'降序':'升序'}"></button>`;
 return `<th class="${active?(flowSort.descending?'ba-sort-desc':'ba-sort-asc'):''} ${filtered?'ba-filtered':''}"${active?` aria-sort="${flowSort.descending?'descending':'ascending'}"`:''}><span class="ba-th-title">${h(label)}</span><span class="ba-th-tools"><span class="ba-sort-icons">${sortButton('asc')}${sortButton('desc')}</span>${kind?`<button type="button" class="ba-filter-btn" data-filter-flow="${column}" aria-label="筛选${h(label)}" aria-expanded="false" aria-controls="flowFilterPopover" title="筛选${h(label)}"></button>`:''}</span></th>`;
}
function showFlowFilter(button){
 const column=Number(button.dataset.filterFlow),kind=flowFilterColumns[column];
 if(AuditPopover.isOpen(filterPopover)){
  const same=filterPopover.dataset.column===String(column);
  AuditPopover.hide(filterPopover);
  if(same)return;
 }
 const t=data[K.flow];
 const date=(k,label)=>`<input type="date" name="${k}" aria-label="${label}" value="${h(flowFilters[k]||'')}">`;
 const choices=kind==='direction'?[['in','仅流入'],['out','仅流出']]:
  [...new Set(t.rows.map(r=>String(r[column]??'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN')).map(v=>[v,v]);
 const selected=flowFilters[kind];
 const has=v=>Array.isArray(selected)?selected.includes(v):!selected||selected===v;
 const fields=kind==='date'?`<div class="ba-filter-range">${date('from','起始日期')}<span>~</span>${date('to','截止日期')}</div>`:
  kind==='counterparty'?`<label class="ba-filter-search"><input name="counterparty" aria-label="包含文字" value="${h(selected||'')}" placeholder="输入对手方名称"><i></i></label>`:
  `<div class="ba-filter-search-row"><label class="ba-filter-search"><input type="search" data-filter-options-search placeholder="搜索选项" aria-label="搜索选项"><i></i></label></div><div class="ba-filter-select-all"><label><input type="checkbox" data-filter-select-all>全选</label></div><div class="ba-filter-options">${choices.map(([v,l])=>`<label><input type="checkbox" name="choice" value="${h(v)}"${has(v)?' checked':''}><span>${h(l)}</span></label>`).join('')}</div>`;
 filterPopover.dataset.column=String(column);
 filterPopover.classList.toggle('is-range-filter',kind==='date');
 filterPopover.innerHTML=`<form id="flowColumnFilterForm"><div class="ba-filter-title">${h(kind==='direction'?'收支方向':t.headers[column])}</div>${fields}<p class="flow-filter-error" role="alert" hidden></p><div class="actions"><button type="button" class="btn" id="clearFlowColumn">重置</button><button type="submit" class="btn btn-primary">确定</button></div></form>`;
 const options=()=>[...filterPopover.querySelectorAll('.ba-filter-options label:not([hidden]) input')];
 const all=filterPopover.querySelector('[data-filter-select-all]');
 const sync=()=>{
  if(!all)return;
  const visible=options(),count=visible.filter(x=>x.checked).length;
  all.checked=visible.length>0&&count===visible.length;
  all.indeterminate=count>0&&!all.checked;
 };
 if(all)all.onchange=()=>{options().forEach(x=>x.checked=all.checked);sync();};
 filterPopover.querySelector('.ba-filter-options')?.addEventListener('change',sync);
 const searchBox=filterPopover.querySelector('[data-filter-options-search]');
 if(searchBox)searchBox.oninput=()=>{
  const q=searchBox.value.trim().toLowerCase();
  filterPopover.querySelectorAll('.ba-filter-options label').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(q));
  sync();
 };
 sync();
 const rect=button.getBoundingClientRect();
 AuditPopover.show(filterPopover);
 const left=Math.max(8,Math.min(rect.left-22,innerWidth-filterPopover.offsetWidth-8));
 const above=rect.bottom+filterPopover.offsetHeight+10>innerHeight&&rect.top-filterPopover.offsetHeight>8;
 filterPopover.classList.toggle('is-above',above);
 filterPopover.style.left=left+'px';
 filterPopover.style.top=(above?rect.top-filterPopover.offsetHeight-7:rect.bottom+7)+'px';
 filterPopover.style.setProperty('--ba-filter-arrow-left',Math.min(filterPopover.offsetWidth-12,Math.max(12,rect.left+rect.width/2-left))+'px');
 button.setAttribute('aria-expanded','true');
}
filterPopover.addEventListener('toggle',e=>{
 if(e.newState==='closed')document.querySelectorAll('[data-filter-flow][aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));
});
function refreshFlowTable(selector){
 const left=$('#content .table-scroll').scrollLeft;
 pageNo=1;render();
 $('#content .table-scroll').scrollLeft=left;
 if(selector)$(selector)?.focus({preventScroll:true});
}
const tableViewQueries=new Map();
function currentTableQuery(){const key=page+'|'+(page==='master'?master:page==='preview'?preview:'');if(!tableViewQueries.has(key))tableViewQueries.set(key,{});return tableViewQueries.get(key);}
function table(t,{edit=false,flow=false,registry=false}={}){const limit=pageSize,hits=flow?AuditTableTools.query(currentFlowRows(),currentTableQuery(),(x,c)=>x.r[c-1]):AuditTableTools.query(t.rows.map((r,i)=>({r,i})).filter(x=>!search||x.r.some(v=>String(v??'').toLowerCase().includes(search.toLowerCase()))),currentTableQuery(),(x,c)=>x.r[c-1]),pages=Math.max(1,Math.ceil(hits.length/limit));pageNo=Math.min(pageNo,pages);const subset=hits.slice((pageNo-1)*limit,pageNo*limit);tablePagerState={total:hits.length,flow};return `<div class="table-scroll"><table class="table" data-main-query="true"${flow?' id="statementFlowTable"':''}><thead><tr><th class="rowno">#</th>${t.headers.map((x,i)=>flow?flowHeader(x,i):`<th>${h(x)}</th>`).join('')}${edit||registry?'<th class="sticky-right">操作</th>':''}</tr></thead><tbody>${subset.map(({r,i})=>`<tr><td class="rowno">${i+1}</td>${t.headers.map((hd,j)=>`<td class="${typeof r[j]==='number'?'numeric':''}">${r[j]===null||r[j]===undefined||r[j]===''?'<span class="null">—</span>':h(typeof r[j]==='number'&&/金额|余额|发生额|限额|资本|_PM|_AMPT/.test(hd)&&!/笔数/.test(hd)?fmt(r[j]):r[j])}</td>`).join('')}${registry?`<td class="sticky-right"><button class="text" data-registry-edit="${h(r[0])}">编辑</button></td>`:''}${edit?`<td class="sticky-right"><button class="text" data-edit="${i}">编辑</button><button class="text danger" data-delete="${i}">删除</button></td>`:''}</tr>`).join('')}</tbody></table>${!hits.length?'<div class="empty">没有找到记录</div>':''}</div>${flow?`<small class="flow-result-count">筛选结果 ${num(hits.length)} / ${num(t.rows.length)} 笔</small>`:''}<div class="pagination" id="tablePager" aria-label="表格分页"></div>`;}
function companyMode(name){
 return Object.hasOwn(config.companyFlow||{},name)?String(config.companyFlow[name]):'auto';
}
function snapshot(){
 return {data:E.copy(data),source:E.copy(generationSource),companyFlow:E.copy(config.companyFlow||{}),sampleNonMerchants:E.copy(config.sampleNonMerchants||{}),sampleAccountPlans:E.copy(config.sampleAccountPlans||{}),registryRecords:E.copy(rawRegistry()),registryBounds:E.copy(bounds()),reportCriteria:E.copy(config.reportCriteria||{}),registryStartAnchor:config.registryStartAnchor||'',reportPeriod:E.copy(reportPeriod),registryAsOf,label:sourceLabel};
}
function restoreRegistryDateState(next){config.registryStartAnchor=next.registryStartAnchor||'';reportPeriod=E.copy(next.reportPeriod||{});registryAsOf=next.registryAsOf||'';}
function renameCompanies(d,pairs){
 E.rename(d,pairs);
 const modes=config.companyFlow||{};
 config.companyFlow=Object.fromEntries(Object.entries(modes).map(([name,mode])=>[pairs.find(p=>p[0]===name)?.[1]||name,mode]));
 config.sampleAccountPlans=Object.fromEntries(Object.entries(config.sampleAccountPlans||{}).map(([name,list])=>{const next=pairs.find(p=>p[0]===name)?.[1]||name;return [next,list.map(a=>({...a,name:next}))];}));
 config.sampleNonMerchants=Object.fromEntries(Object.entries(config.sampleNonMerchants||{}).map(([name,list])=>[pairs.find(p=>p[0]===name)?.[1]||name,list]));
 persist();
}
let randomCompanyProposal=null,projectCheckpoint=null,checkpointComparison=null;
function companyList(){
 const bank=new Map(),flow=new Map();
 for(const r of data[K.bank].rows)if(r[0])bank.set(r[2],(bank.get(r[2])||0)+1);
 for(const r of data[K.flow].rows)flow.set(r[0],(flow.get(r[0])||0)+1);
 const rows=data[K.company].rows.map((r,i)=>{
  const name=r[0],mode=companyMode(name),n=flow.get(name)||0;
  return `<tr><td><input data-rename="${i}" value="${h(name)}" aria-label="第 ${i+1} 家公司名称"></td><td>${h(r[3])}</td><td>${bank.get(name)||0}</td><td>${n?num(n)+' 笔':badge('当前无流水','amber')}</td><td><select data-company-mode="${i}" aria-label="${h(name)}的生成范围">${[['auto','自动'],['true','生成流水'],['false','只留主档']].map(([v,l])=>`<option value="${v}" ${mode===v?'selected':''}>${l}</option>`).join('')}</select></td><td><button class="text danger" data-remove-company="${i}" aria-label="删除${h(name)}">删除</button></td></tr>`;
 }).join('');
 return `<section class="panel company-panel"><div class="panel-heading"><div><h3>被审计单位清单 ${badge(data[K.company].rows.length+' 家')}</h3><p class="muted">可添加任意家数。可在新增时自动创建模拟银行账号。</p></div><div class="actions"><button id="showRandomCompanies">一键随机生成</button><button class="primary" id="addCompany">＋ 手动新增</button></div></div>${randomCompanyTools()}<div class="table-scroll"><table class="company-list"><thead><tr><th>公司名称</th><th>公司职能</th><th>银行账号数</th><th>当前流水</th><th>下次生成</th><th>操作</th></tr></thead><tbody>${rows||'<tr><td colspan="6">尚无被审计单位，请先新增。</td></tr>'}</tbody></table></div><div class="section-footer"><span class="muted">「只留主档」用于测试流水缺失；「自动」沿用原项目的生成范围设置。</span><button id="applyNames">保存名称修改</button></div></section>`;
}
function randomCompanyTools(){
 const groups=E.companyGroups(),total=groups.reduce((n,g)=>n+g.members.length,0);
 return `<details id="randomCompanyTools" class="random-company-tools"><summary>随机生成被审计单位（确认后追加）</summary><p class="muted">新增 ${groups.length} 组、${total} 个集团成员名称，可按母公司、子公司、分公司成组选取，也可散选。每条真实名称都能查看公开来源；虚构名称带“测试专用”前缀。自动避开当前主档及流水中已出现的名称。不会替换、重命名原公司或改动已有流水。</p><form id="randomCompanyForm"><div class="form-grid"><label class="field"><span>企业名称来源</span><select name="mode"><option value="real">真实企业名称</option><option value="fictional">虚构企业名称</option><option value="mixed">真实＋虚构（各约一半）</option></select></label><label class="field"><span>真实企业分组</span><select name="groupId"><option value="auto">随机选一个集团（成组生成）</option><option value="">不分组，从全部名称散选</option>${groups.map(group=>`<option value="${h(group.id)}">${h(group.label)} · ${group.members.length} 家</option>`).join('')}</select><small>分组依据公开资料，代表来源时点，不作为实时股权或合并范围结论。</small></label><label class="field"><span>公司职能（散选／虚构时使用）</span><input name="role" value="子公司" required></label><label class="field"><span>生成公司数</span><input name="count" type="number" min="1" max="100" step="1" value="3" required></label><label class="field"><span>每家公司新增人民币账号</span><input name="accounts" type="number" min="0" max="10" step="1" value="0" required></label><label class="field"><span>下次生成流水</span><select name="flow"><option value="false">暂不参与，只新增主档</option><option value="true">参与（还需有可用账号）</option></select></label><label class="field"><span>生成编号（相同编号可复现候选）</span><input name="seed" value="AC-${Date.now().toString(36)}" required></label></div><div class="actions"><button type="submit" class="primary">随机生成预览</button><button type="button" id="randomCompanyReseed">换一批</button><button type="button" id="randomCompanyWholeGroup" disabled>整组预览</button></div></form><div id="randomCompanyPreview" aria-live="polite"></div></details>`;
}
function previewRandomCompanies(){
 const form=$('#randomCompanyForm');if(!form.reportValidity())return;
 const f=new FormData(form),q={mode:f.get('mode'),groupId:f.get('groupId')||'',count:Number(f.get('count')),accounts:Number(f.get('accounts')),seed:String(f.get('seed')).trim(),role:String(f.get('role')).trim(),excludeNames:generationSource[K.company].rows.map(r=>r[0]),reservedAccounts:[...generationSource[K.bank].rows.map(r=>String(r[0])),...Object.values(config.sampleAccountPlans||{}).flat().map(r=>r.account)]};
 if(!q.seed)throw Error('请输入生成编号。');
 const result=E.randomCompanies(data,q);
 randomCompanyProposal={...result,raw:JSON.stringify(data),source:JSON.stringify({template:generationSource,plans:config.sampleAccountPlans}),flow:f.get('flow')==='true',accounts:q.accounts};
 $('#randomCompanyPreview').innerHTML='<h4>候选清单 · '+result.companies.length+' 家（可取消勾选不需要的成员）</h4><div class="table-scroll"><table class="table"><thead><tr><th><input type="checkbox" id="randomCompanyAll" checked aria-label="全选候选公司"></th><th>公司名称</th><th>名称类型／集团</th><th>公司职能</th><th>上级公司</th><th>来源</th><th>新增账号数</th></tr></thead><tbody>'+result.companies.map(r=>'<tr><td><input type="checkbox" class="random-company-select" value="'+h(r.name)+'" checked aria-label="选择'+h(r.name)+'"></td><td>'+h(r.name)+'</td><td>'+h(r.type)+(r.group?'<br>'+h(r.group):'')+'</td><td>'+h(r.role||q.role)+'</td><td>'+h(r.parent||'—')+'</td><td>'+(r.url?'<a target="_blank" rel="noopener noreferrer" href="'+h(r.url)+'">'+h(r.source)+'</a>':h(r.source))+'</td><td>'+q.accounts+'</td></tr>').join('')+'</tbody></table></div><p class="muted">确认后会增加被审计单位数量，因此公司覆盖、缺流水等指标可能变化；已有流水、客商和工商记录不会被重写。当前预览尚未保存到项目。</p><button type="button" class="primary" id="applyRandomCompanies">确认追加这 '+result.companies.length+' 家公司</button>';

}
function applyRandomCompanies(){
 const proposal=randomCompanyProposal;if(!proposal)throw Error('请先生成候选清单。');
 if(proposal.raw!==JSON.stringify(data)||proposal.source!==JSON.stringify({template:generationSource,plans:config.sampleAccountPlans}))throw Error('项目数据已变化，请重新生成预览后再追加。');
 const names=new Set([...document.querySelectorAll('.random-company-select:checked')].map(el=>el.value));
 if(!names.size)throw Error('请至少勾选一家候选公司。');
 const excluded=new Set(proposal.companies.filter(r=>!names.has(r.name)).map(r=>r.name));
 const next=E.copy(proposal.data);next[K.company].rows=next[K.company].rows.filter(r=>!excluded.has(r[0]));next[K.bank].rows=next[K.bank].rows.filter(r=>!excluded.has(r[2]));
 const nextSource=E.copy(generationSource);
 nextSource[K.company].rows.push(...E.copy(proposal.data[K.company].rows.filter(r=>names.has(r[0]))));
 nextSource[K.bank].rows.push(...E.copy(proposal.data[K.bank].rows.filter(r=>names.has(r[2]))));
 lastData=snapshot();data=next;generationSource=nextSource;
 config.companyFlow={...config.companyFlow,...Object.fromEntries([...names].map(n=>[n,proposal.flow]))};
 sourceLabel='已追加 · 随机被审计单位';randomCompanyProposal=null;persist();recalc({preserveRows:true});render();toast('已追加 '+names.size+' 家公司，已有流水保持原样，可通过撤销恢复。');
}
function updateRandomGroupControls(){
 const form=$('#randomCompanyForm');if(!form)return;
 const fictional=form.elements.mode.value==='fictional',group=form.elements.groupId;
 group.disabled=fictional;form.elements.count.max=!fictional&&group.value?'100':'20';
 $('#randomCompanyWholeGroup').disabled=fictional||!group.value||group.value==='auto';
}
function previewWholeCompanyGroup(){
 const form=$('#randomCompanyForm'),id=form.elements.groupId.value;
 const group=E.availableCompanyGroups(data,generationSource[K.company].rows.map(r=>r[0])).find(g=>g.id===id);
 if(!group)throw Error('请先选择一个具体集团。');
 if(!group.available.length)throw Error('该集团的成员已在当前数据中，请选择其他集团。');
 form.elements.mode.value='real';updateRandomGroupControls();form.elements.count.value=group.available.length;previewRandomCompanies();
}
function makeProjectCheckpoint(label){
 const point={label,time:new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}),raw:JSON.stringify(data),registry:JSON.stringify(rawRegistry()),counts:Object.fromEntries(Object.entries(data).map(([name,t])=>[name,t.rows.length])),context:JSON.stringify({period:reportPeriod,criteria:config.reportCriteria,rates:exchangeRates(),registryEnd:registryReportEnd(),registryBounds:bounds(),threshold:config.bigThreshold,cut:config.cut})};
 try{
  const tables=AuditReport.workbook(fullReportModel());delete tables['本期流水明细'];
  if(tables['封面'])tables['封面'].rows=tables['封面'].rows.map(r=>r[0]==='报告版本'?[r[0],String(r[1]).replace(/\s+\d{4}年\d{1,2}月\d{1,2}日$/,'')]:r);
  const status=tables['分析数据范围'];if(status){const column=status.headers.indexOf('最后更新时间');if(column>=0)status.rows=status.rows.map(r=>r.map((v,i)=>i===column?'':v));}
  point.tables=Object.fromEntries(Object.entries(tables).map(([key,t])=>[key,JSON.stringify(t)]));
 }catch(error){point.error=error.message;}
 return point;
}
function compareProjectCheckpoint(){
 if(!projectCheckpoint)throw Error('请先导入项目，或点击“记录当前基线”。');
 const current=makeProjectCheckpoint('当前结果'),names=new Set([...Object.keys(projectCheckpoint.tables||{}),...Object.keys(current.tables||{})]);
 checkpointComparison={dataSame:current.raw===projectCheckpoint.raw,registrySame:current.registry===projectCheckpoint.registry,contextSame:current.context===projectCheckpoint.context,error:current.error||projectCheckpoint.error,changed:[...names].filter(name=>current.tables?.[name]!==projectCheckpoint.tables?.[name]),counts:current.counts};
 render();
}
function checkpointPanel(){
 const base=projectCheckpoint,result=checkpointComparison;
 return '<section class="panel"><div class="panel-heading"><div><h3>核验基线对比</h3><p class="muted">只读核对，不修复或重写数据。JSON 导入后自动记录基线；对比全部报告章节，忽略封面模拟更新时间，不受导出章节勾选影响。</p></div><div class="actions"><button id="recordProjectCheckpoint">记录当前基线</button><button class="primary" id="compareProjectCheckpoint" '+(base?'':'disabled')+'>检查与基线是否一致</button></div></div>'+(base?'<p>基线：'+h(base.label)+' · '+h(base.time)+'</p>':'<p class="muted">尚无基线。可先导入保存的项目，或将当前数据记录为基线。</p>')+(result?'<div class="checkpoint-results"><p>原始主档和流水：<b>'+(result.dataSame?'完全一致':'有变化')+'</b>；工商原始记录：<b>'+(result.registrySame?'完全一致':'有变化')+'</b>；期间、汇率和筛选条件：<b>'+(result.contextSame?'一致':'有变化')+'</b>。</p><p>'+(result.error?'统计暂不可比较：'+h(result.error):'变化的核验表：'+(result.changed.length?result.changed.map(h).join('、'):'无，统计结果一致'))+'</p><p class="muted">这是上次点击检查时的结果。修改数据或设置后，请重新检查；只有在期间、汇率、筛选条件一致时，才适合逐项比较金额。</p></div>':'')+'</section>';
}
function masterTools(){
 const catalog=E.companyCatalog(),tyc=catalog.filter(r=>r[2].includes('tianyancha.com')).length;
 const n=Object.values(config.sampleNonMerchants||{}).reduce((count,r)=>count+r.length,0);
 return `<section class="panel" id="masterGeneratorPanel"><div class="panel-heading"><div><h3>快速生成主档</h3><p class="muted">内置 ${catalog.length} 个企业名称，其中 ${tyc} 个有天眼查公开来源。当前已配置 ${n} 个非客商候选（按单位计）。</p></div><div class="actions"><button id="openCatalog">查看企业名称库</button><button id="resetMasterSamples">重新填写</button></div></div><p>三步完成：选公司 → 选生成方案 → 确认结果。默认追加，保留已有数据；需要外币或缺失账号时，再打开高级设置。</p><form id="masterSampleForm"><div id="masterSampleFields"></div><div class="dialog-footer master-wizard-footer"></div></form></section>`;
}
function openMasterSamples(){
 const own=data[K.company].rows;
 if(!own.length){$('#masterSampleFields').innerHTML='<p class="empty">请先在上方新增被审计单位，再生成主档。</p>';return;}
 $('#masterSampleFields').innerHTML=`<fieldset><legend>选择要生成主档的公司</legend><div class="master-sample-companies">${own.map((r,i)=>`<label><input type="checkbox" name="company" value="${h(r[0])}" ${i===0?'checked':''}> ${h(r[0])}</label>`).join('')}</div></fieldset>
 <fieldset><legend>被审计单位补充信息（选填）</legend><div class="form-grid"><label class="field"><span>公司职能（选填）</span><input name="companyRole" placeholder="留空保留原值"></label><label class="field"><span>所属行业（选填）</span><input name="companyIndustry" placeholder="留空保留原值"></label><label class="field"><span>下次生成流水</span><select name="flowMode"><option value="">沿用当前设置</option><option value="true">生成流水</option><option value="false">不生成，测试整家公司缺流水</option></select></label></div><label><input name="linkAudited" type="checkbox"> 把其他被审计单位写入所选单位的关联方主档</label></fieldset>
 <fieldset><legend>账号及缺失场景（数量按每家新增）</legend><div class="table-scroll"><table class="table"><thead><tr><th>账号场景</th><th>币种</th><th>账号主档</th><th>分账号余额表</th><th>银行流水</th><th>新增数量</th></tr></thead><tbody>${E.ACCOUNT_GROUPS.map(([id,label,currency,bank,book,flow])=>`<tr><td>${label}</td><td>${currency||`<select name="customCurrency" aria-label="自定义账号币种"><option value="">请选择</option>${Object.keys(exchangeRates()).filter(code=>!["CNY","RMB","USD"].includes(code)).map(code=>`<option value="${h(code)}">${h(code)}</option>`).join("")}</select>`}</td><td>${bank?'有':'缺失'}</td><td>${book?'有':'缺失'}</td><td>${flow?'有':'缺失'}</td><td><input name="${id}" aria-label="${label}数量" type="number" min="0" max="50" step="1" value="0" required></td></tr>`).join('')}</tbody></table></div><p class="muted">需要余额表的账号会在正式生成时写入分账号余额表并汇入总账。其他币种先到「配置流水」添加汇率。若单位选了「不生成流水」，单位级设置优先。</p></fieldset>
 <fieldset><legend>客户、供应商与人员（数量按每家新增）</legend><label><input type="checkbox" name="counterpartiesEnabled" checked> 生成客户、供应商、关联方和人员（取消后只配置账号与公司信息）</label>
 <div class="form-grid"><label class="field"><span>生成方式</span><select name="mode"><option value="append">追加，保留当前主档</option><option value="replace">重建所选单位的往来主档</option></select></label><label class="field"><span>企业名称来源</span><select name="sourceMode"><option value="all">优先天眼查，公开企业名录补充</option><option value="tyc">仅使用天眼查公开来源</option></select></label></div>
 <table class="table"><thead><tr><th>分类</th><th>每家生成数</th><th>其中有多少家是关联方</th></tr></thead><tbody>${E.MASTER_GROUPS.map(([id,label])=>`<tr><td>${label}</td><td><input aria-label="${label}家数" name="${id}" type="number" min="0" max="200" step="1" value="6" required></td><td><input aria-label="${label}关联方家数" name="${id}Related" type="number" min="0" max="200" step="1" value="2" required></td></tr>`).join('')}</tbody></table>
 <div class="form-grid"><label class="field"><span>员工人数（写入员工主档）</span><input name="employees" type="number" min="0" max="200" step="1" value="4" required></label><label class="field"><span>董监高人数（写入关联方主档）</span><input name="officers" type="number" min="0" max="200" step="1" value="2" required></label></div>
 <label class="field"><span>优先抽取的企业全称（可选，每行一家）</span><textarea name="preferredNames" rows="2" placeholder="可从企业名称库复制全称"></textarea></label>
 <p class="muted">客商重合会写入同一单位的客户和供应商主档。非客商仅作为流水候选，若选为关联方则只写入关联方主档。重建只影响选中单位的客商、员工和范围外关联方。</p></fieldset>`;
 setupMasterSampleWizard();
 restoreMasterWizardDraft();
}
let masterWizardStep=1,masterWizardPreview=null,masterWizardDraft=null;
function captureMasterWizardDraft(){
 const form=$('#masterSampleForm');if(!form||!$('#masterWizardStep1'))return;
 masterWizardDraft={entries:[...new FormData(form).entries()],step:masterWizardStep,advanced:!!form.querySelector('.master-advanced[open]')};
}
function restoreMasterWizardDraft(){
 if(!masterWizardDraft)return;const form=$('#masterSampleForm'),entries=masterWizardDraft.entries;
 for(const input of form.querySelectorAll('input[name],select[name],textarea[name]')){const values=entries.filter(([name])=>name===input.name).map(([,value])=>value);if(input.type==='checkbox'||input.type==='radio')input.checked=values.includes(input.value);else if(values.length)input.value=values[0];}
 form.querySelector('.master-advanced').open=masterWizardDraft.advanced;
 form.querySelector('[data-master-preset=custom]').click();
 const step=masterWizardDraft.step;showMasterWizardStep(Math.min(step,2));if(step===3)nextMasterWizardStep();
}

function masterSampleRequest(){
 const f=new FormData($('#masterSampleForm'));
 return {companies:[...new Set(f.getAll('company'))],mode:f.get('mode'),seed:config.seed,
  counts:Object.fromEntries(E.MASTER_GROUPS.map(([id])=>[id,Number(f.get(id))])),
  related:Object.fromEntries(E.MASTER_GROUPS.map(([id])=>[id,Number(f.get(id+'Related'))])),
  employees:Number(f.get('employees')),officers:Number(f.get('officers')),pools:config.sampleNonMerchants,
  sourceMode:f.get('sourceMode'),preferredNames:String(f.get('preferredNames')||'').split(/[\n、，,]+/).map(s=>s.trim()).filter(Boolean),
  counterpartiesEnabled:f.has('counterpartiesEnabled'),linkAudited:f.has('linkAudited'),companyRole:String(f.get('companyRole')||''),companyIndustry:String(f.get('companyIndustry')||''),
  accounts:{...Object.fromEntries(E.ACCOUNT_GROUPS.map(([id])=>[id,Number(f.get(id))])),customCurrency:f.get('customCurrency')},accountPlans:config.sampleAccountPlans};
}
function setupMasterSampleWizard(){
 const root=$('#masterSampleFields'),form=$('#masterSampleForm'),sets=[...root.children];masterWizardStep=1;masterWizardPreview=null;form.noValidate=true;
 const companies=sets[0],companyInfo=sets[1],accounts=sets[2],parties=sets[3];
 root.replaceChildren();
 root.innerHTML='<ol class="master-wizard-steps"><li>1 选择公司</li><li>2 选择方案</li><li>3 确认结果</li></ol><p class="master-wizard-error" role="alert" hidden></p><section id="masterWizardStep1"></section><section id="masterWizardStep2" hidden></section><section id="masterWizardStep3" hidden></section>';
 const first=$('#masterWizardStep1'),second=$('#masterWizardStep2');
 first.innerHTML='<h4>先选择本次要补充数据的公司</h4><p class="muted">下面填写的数量，都按每家公司计算。未选中的公司保持原样。</p><div class="actions"><button type="button" data-master-all>全选公司</button><button type="button" data-master-none>清空</button></div>';
 first.append(companies);
 second.innerHTML='<h4>选一个起点，再按需要调整</h4><div class="master-preset-grid"><button type="button" data-master-preset="report"><b>报告常用主档</b><small>客商重合、关联方、人员及缺失账号场景</small></button><button type="button" data-master-preset="basic"><b>基础业务数据</b><small>正常人民币账号、客户、供应商和员工</small></button><button type="button" data-master-preset="custom"><b>自定义数量</b><small>保留当前填写值，按你的测试要求调整</small></button></div><p class="master-preset-explanation"></p>';
 const options=document.createElement('details');options.className='master-advanced';options.innerHTML='<summary>高级设置：外币、缺失账号、覆盖方式和企业名称来源</summary><p class="muted">不需要特殊场景时可以跳过。重建会替换选中公司的客商、员工和范围外关联方；账号仍按新增处理。</p>';
 const sourceGrid=parties.querySelector('.form-grid');if(sourceGrid)options.append(sourceGrid);
 const preferred=parties.querySelector('textarea')?.closest('label');if(preferred)options.append(preferred);
 options.append(accounts,companyInfo);second.append(parties,options);
 const help=document.createElement('p');help.className='master-count-help';help.textContent='仅客户：只进客户表；仅供应商：只进供应商表；客商重合：同一家公司同时进客户和供应商表；非客商：不进这两张表，用作后续流水对手方。关联方数量包含在对应分类内，不额外增加企业数。';parties.querySelector('legend').after(help);
 const footer=$('#masterGeneratorPanel .dialog-footer');footer.innerHTML='<p id="masterWizardProgress"></p><div class="actions"><button type="button" id="masterWizardBack">上一步</button><button type="button" class="primary" id="masterWizardNext">下一步</button><button type="submit" class="primary" id="masterWizardApply" hidden>确认生成主档</button></div>';
 const set=(name,value)=>{const input=form.elements.namedItem(name);if(input){if(input.type==='checkbox')input.checked=!!value;else input.value=value;}};
 const preset=kind=>{
  root.querySelectorAll('[data-master-preset]').forEach(b=>{const active=b.dataset.masterPreset===kind;b.classList.toggle('is-selected',active);b.setAttribute('aria-pressed',String(active));});
  if(kind!=='custom'){
   const report=kind==='report';for(const [id] of E.ACCOUNT_GROUPS)set(id,id==='normalCNY'?2:report&&['bankOnly','bookOnly','noBook','noMaster','flowOnly'].includes(id)?1:0);
   for(const [id] of E.MASTER_GROUPS){set(id,report?(id==='both'?8:12):(id==='customerOnly'||id==='supplierOnly'?10:0));set(id+'Related',report?(id==='both'?3:4):0);}
   set('employees',report?10:5);set('officers',report?2:0);set('counterpartiesEnabled',true);set('mode','append');set('flowMode','');set('linkAudited',report);set('sourceMode','all');
  }
  updateMasterWizardSummary();
 };
 root.querySelectorAll('[data-master-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.masterPreset));
 root.querySelector('[data-master-all]').onclick=()=>{root.querySelectorAll('[name=company]').forEach(x=>x.checked=true);updateMasterWizardSummary();};
 root.querySelector('[data-master-none]').onclick=()=>{root.querySelectorAll('[name=company]').forEach(x=>x.checked=false);updateMasterWizardSummary();};
 const changed=e=>{masterWizardPreview=null;if(e.target.closest('#masterWizardStep2'))preset('custom');else updateMasterWizardSummary();};form.oninput=changed;form.onchange=changed;
 form.onsubmit=submitMasterSamples;
 $('#masterWizardNext').onclick=nextMasterWizardStep;$('#masterWizardBack').onclick=()=>showMasterWizardStep(masterWizardStep-1);
 preset('report');showMasterWizardStep(1);
}
function updateMasterWizardSummary(){
 const q=masterSampleRequest(),n=q.companies.length,counts=q.counts;
 const customers=q.counterpartiesEnabled?counts.customerOnly+counts.both:0,suppliers=q.counterpartiesEnabled?counts.supplierOnly+counts.both:0;
 const accountCount=E.ACCOUNT_GROUPS.reduce((sum,[id])=>sum+q.accounts[id],0);
 $('#masterSampleFields .master-preset-explanation').textContent='每家公司：客户 '+customers+' 家、供应商 '+suppliers+' 家（客商重合 '+(q.counterpartiesEnabled?counts.both:0)+' 家已计入双方），员工 '+(q.counterpartiesEnabled?q.employees:0)+' 人；新增账号场景 '+accountCount+' 个。可在下方调整。';
 $('#masterWizardProgress').textContent='已选 '+n+' 家公司 · '+(q.mode==='replace'?'重建所选单位往来主档':'追加生成，保留已有数据');
}
function showMasterWizardStep(step){
 masterWizardStep=Math.max(1,Math.min(3,step));
 for(let i=1;i<=3;i++)$('#masterWizardStep'+i).hidden=i!==masterWizardStep;
 document.querySelectorAll('.master-wizard-steps li').forEach((li,i)=>{li.classList.toggle('is-current',i+1===masterWizardStep);if(i+1===masterWizardStep)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 $('#masterWizardBack').hidden=masterWizardStep===1;$('#masterWizardNext').hidden=masterWizardStep===3;$('#masterWizardApply').hidden=masterWizardStep!==3;
 $('#masterWizardNext').textContent=masterWizardStep===1?'下一步：选择方案':'下一步：查看生成结果';
 $('#masterSampleFields .master-wizard-error').hidden=true;$('#masterSampleFields').scrollTop=0;
}
function nextMasterWizardStep(){
 const error=$('#masterSampleFields .master-wizard-error');
 try{
  const q=masterSampleRequest();if(!q.companies.length)throw Error('请先勾选至少一家公司。');
  if(masterWizardStep===1){showMasterWizardStep(2);return;}
  for(const input of $('#masterWizardStep2').querySelectorAll('input,select,textarea'))if(!input.checkValidity()){for(let el=input.parentElement;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;input.reportValidity();throw Error('请检查标出的输入项，数量需要是范围内的整数。');}
  const result=E.masterSamples(data,q);masterWizardPreview={result,request:JSON.stringify(q)};
  const plans=q.companies.length*E.ACCOUNT_GROUPS.reduce((n,[id])=>n+q.accounts[id],0);
  const plannedFlow=q.companies.length*E.ACCOUNT_GROUPS.reduce((n,[id,,,,,flow])=>n+(flow?q.accounts[id]:0),0);
  const plannedBook=q.companies.length*E.ACCOUNT_GROUPS.reduce((n,[id,,,,book])=>n+(book?q.accounts[id]:0),0);
  const rows=[K.bank,K.customer,K.supplier,K.related,K.employee].map(key=>{const before=data[key].rows.length,after=result.data[key].rows.length;return '<tr><td>'+h(key.replace('信息',''))+'</td><td>'+num(before)+'</td><td>'+num(after)+'</td><td>'+(after-before>=0?'+':'')+num(after-before)+'</td></tr>';}).join('');
  $('#masterWizardStep3').innerHTML='<h4>确认这些变化后，再生成</h4><p>适用公司：'+q.companies.map(h).join('、')+'</p><p class="master-review-warning">'+(q.mode==='replace'?'将重建所选公司的往来主档；其他公司不变。':'本次追加生成，保留已有记录。')+'</p><table class="table"><thead><tr><th>立即更新的主档</th><th>当前总条数</th><th>生成后总条数</th><th>净变化</th></tr></thead><tbody>'+rows+'</tbody></table><div class="master-next-note"><b>这一步不生成银行流水或余额表</b><p>另保存 '+plans+' 个新增账号场景，其中 '+plannedFlow+' 个计划有流水，'+plannedBook+' 个计划有余额表；是否最终生成流水仍以公司和流水设置为准。</p><p>确认后只保存主档和账号场景计划。接下来到「设置异常并生成」生成流水；需要余额表的账号也在那一步写入余额表。非客商作为后续流水候选，不单独生成客户或供应商记录。</p></div>';
  showMasterWizardStep(3);
 }catch(e){error.textContent=e.message;error.hidden=false;error.scrollIntoView({block:'nearest'});}
}
function submitMasterSamples(e){
 e.preventDefault();if(masterWizardStep!==3){nextMasterWizardStep();return;}
 const q=masterSampleRequest();
 const flowMode=new FormData($('#masterSampleForm')).get('flowMode');
 run(()=>{
  const result=masterWizardPreview?.request===JSON.stringify(q)?masterWizardPreview.result:E.masterSamples(data,q);
  lastData=snapshot();data=result.data;config.sampleNonMerchants=result.pools;config.sampleAccountPlans=result.accountPlans;
  if(flowMode)config.companyFlow={...config.companyFlow,...Object.fromEntries(q.companies.map(n=>[n,flowMode==='true']))};
  persist();sourceLabel='已更新 · 自定义主档';recalc();masterWizardDraft=null;$('#masterSampleForm')?.remove();render();masterWizardPreview=null;
  toast('已更新 '+q.companies.length+' 家公司的主档。下一步到「设置异常并生成」生成流水和余额表。');
 });
};
function renderCatalog(){
 const q=$('#catalogSearch').value.trim().toLowerCase();
 const groupId=$('#catalogGroup').value,group=E.companyGroups().find(g=>g.id===groupId),members=group?new Set(group.members.map(m=>m.name)):null;
 const rows=E.companyCatalog().filter(r=>(!members||members.has(r[0]))&&r.some(v=>String(v).toLowerCase().includes(q)));
 $('#catalogCount').textContent='共 '+rows.length+' 家，页面显示前 50 家。';
 $('#catalogRows').innerHTML=rows.slice(0,50).map(([name,source,url])=>`<tr><td>${h(name)}</td><td><a href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(source)}</a></td></tr>`).join('');
}
$('#catalogSearch').oninput=renderCatalog;
$('#catalogGroup').onchange=renderCatalog;
function masters(){const keys=Object.values(K).filter(k=>k!==K.flow);return `${companyList()}${masterTools()}<section class="panel"><div class="panel-heading"><h3>主档明细</h3><div class="actions"><button id="addRow">＋ 新增记录</button><button id="exportSingle">导出当前表</button></div></div><div class="tabs">${keys.map(k=>`<button class="${master===k?'active':''}" data-master="${k}">${h(k.replace('(必须上传)','').replace('信息',''))}<small>${data[k].rows.length}</small></button>`).join('')}</div><div class="table-tools"><div class="searchbox">⌕ <input id="search" placeholder="搜索名称、账号或任意字段" value="${h(search)}"></div><span class="muted">带 * 的列是平台必填字段</span></div>${table(data[master],{edit:true})}</section>`;}
function fxSettings(){
 const lines=Object.entries(exchangeRates()).filter(([code])=>!['CNY','RMB'].includes(code)).map(([code,rate])=>code+' = '+rate).join('\n');
 return `<section class="panel"><h3>币种与测试汇率</h3><form id="fxForm"><label class="field"><span>每行一个币种，填写 1 单位原币对应的人民币金额</span><textarea id="fxRates" rows="4" placeholder="USD = 7&#10;HKD = 0.92">${h(lines)}</textarea></label><p class="muted">CNY 和 RMB 固定为 1。这里填写模拟汇率，应用后会重算等值人民币列。报告核验可另选单一币种查看原币。</p><button type="submit" class="btn btn-primary">应用币种与汇率</button></form></section>`;
}
document.addEventListener('submit',e=>{
 if(e.target.id!=='fxForm')return;
 e.preventDefault();
 const rates={};
 for(const line of $('#fxRates').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
  const match=line.match(/^([a-z]{3})\s*[=＝]\s*(\d+(?:\.\d+)?|\.\d+)$/i);
  if(!match){toast('格式应为「币种 = 汇率」，例如 HKD = 0.92。',true);return;}
  const code=E.currencyCode(match[1]),rate=Number(match[2]);
  if(!Number.isFinite(rate)||rate<=0||Object.hasOwn(rates,code)||['CNY','RMB'].includes(code)){
   toast('汇率必须大于 0，币种不能重复。人民币汇率固定为 1。',true);return;
  }
  rates[code]=rate;
 }
 if(!Object.hasOwn(rates,'USD')){toast('请保留 USD 汇率，供内置美元账号使用。',true);return;}
 config.fx=rates.USD;config.rates=rates;persist();recalc();render();toast('已应用测试汇率。');
});
function currencySetup(){
 const foreign=config.includeForeign!==false;
 return `<section class="panel"><h3>第一步：是否生成外币流水？</h3><fieldset class="currency-mode" aria-label="生成流水的币种范围"><label><input type="radio" name="currencyMode" value="cny" ${foreign?'':'checked'}> 仅人民币</label><label><input type="radio" name="currencyMode" value="all" ${foreign?'checked':''}> 包含外币</label></fieldset><p class="muted">${foreign?'请在下方定义币种及汇率。只有已配置且有可用账号的币种会出现在流水里。':'下次生成只使用人民币账号。已有外币主档、汇率和当前流水不会被这一步修改。'}</p></section>${foreign?fxSettings():''}`;
}
function rules(){return `${currencySetup()}<div class="config-grid"><section class="panel"><div class="panel-heading"><h3>生成范围</h3>${badge('只影响下次生成')}</div><div class="form-grid">${field('开始日期','start',config.start,'date')}${field('结束日期','end',config.end,'date')}${field('流水总笔数','count',config.count,'number','100～50000条，包含所选异常场景','min="100" max="50000" step="1"')}${field('随机种子（用于复现）','seed',config.seed,'text','想复测同一批流水就保留原种子；想生成另一批可换一个种子。')}${field('常规交易最低金额（原币元）','min',config.min,'number','','min="0" step="0.01"')}${field('常规交易最高金额（原币元）','max',config.max,'number','','min="0" step="0.01"')}${field('账号最低期初余额（原币元）','opening',config.opening,'number','自动补足余额，避免常规交易产生非预期负余额','min="0"')}${field('每年常规金额增长（%）','growth',config.growth,'number','从生成起始日计算，逐年提高普通交易的金额水平。','min="0" max="100"')}${field('内部往来生成概率（%）','internal',config.internal,'number','属于被审计单位之间的往来；实际占比以检测为准','min="0" max="80"')}<label class="field"><span>流水企业名称来源</span><select data-config="companySourceMode"><option value="all" ${config.companySourceMode!=='tyc'?'selected':''}>全部内置公开来源</option><option value="tyc" ${config.companySourceMode==='tyc'?'selected':''}>仅天眼查公开来源</option></select><small>适用于普通企业及场景对手方。指定黑名单仍使用你提供的名单。</small></label></div></section><div><section class="panel"><h3>如何复现同一批流水？</h3><p class="muted readable">保存项目后，重新导入同一个项目，并保留种子和生成设置。如果只想换一批样本，点击下方按钮更换种子。</p><button id="newSeed">生成一个新种子</button></section><section class="panel"><h3>生成后的余额表怎么处理？</h3><p class="muted readable">生成流水后，工作坊会按自然年重算参与对账的账号余额。原数据里刻意缺少余额表的账号仍可用于测试缺失；新建并指定「生成流水」的主档账号会生成余额表。</p></section></div></div>${stepActions('master','返回主档管理','anomaly','下一步：设置异常')}`;}
function generationInput(){
 return {...data,[K.flow]:generationSource[K.flow]};
}
function generationScope(){
 try{
  const accounts=E.generationAccounts(generationInput(),config);
  const count=new Set(accounts.map(a=>a.name)).size;
  return count?`下次覆盖 ${count} 家单位 · ${accounts.length} 个账号`:'尚无可生成流水的账号，请先配置主档。';
 }catch(error){return error.message;}
}
function generateBar(){return `<div class="generate-bar"><div><b>准备生成 <span data-planned-count>${num(config.count)}</span> 笔流水</b><small><span id="generationScope">${h(generationScope())}</span>。生成后先预览流水，可撤销。</small></div><div class="actions"><button data-nav="rules">返回流水规则</button><button id="preflight">预检生成设置</button><button class="primary" id="generate">生成测试数据 <span>→</span></button></div></div>`;}
function anomalies(){
 const items=[['大额交易（不含单次大额）','big'],['对手方名称及账号均为空','blankCP'],['摘要为空','blankSummary'],['植入余额错误','balanceErrors'],['同账号同日同时间（组）','sameTime'],['缺失同名账户（个）','sameMissing'],['非员工个人交易','person'],['全期仅往来一次的大额交易','once'],['模拟黑名单企业（家）','blacklist'],
 ['仅客户双向往来（组）','customerPairs'],['仅供应商双向往来（组）','supplierPairs'],['客商重合双向往来（组）','bothPairs'],['非客商双向往来（组）','nonPairs'],['关联企业双向往来（组）','relatedPairs'],['客户关联方双向往来（组）','relatedCustomerPairs'],['供应商关联方双向往来（组）','relatedSupplierPairs'],['客商重合关联方双向往来（组）','relatedBothPairs'],['非客商关联方双向往来（组）','relatedNonPairs'],['合并范围内大额划拨（组）','internalBig'],['员工工资（笔）','employeeRows'],['董监高津贴（笔）','officerRows']];
 const from=Number(config.start.slice(0,4)),to=Number(config.end.slice(0,4));
 const years=Array.from({length:from>0&&to>=from&&to-from<=10?to-from+1:0},(_,i)=>from+i);
 const blacklistMax=E.blacklist.filter(name=>!data[K.company].rows.some(r=>r[0]===name)).length;
 const fallback=(id,i)=>{if(id==='blacklist')return Math.min(10,blacklistMax);if(id==='employeeRows'||id==='officerRows'||/^related(Customer|Supplier|Both|Non)Pairs$/.test(id))return '自动';if(id==='person'||id==='once')return config[id]?(config[id+'PerYear']??1):0;const n=config[id]?Math.max(config[id],years.length):0;return Math.floor(n/years.length)+Number(i<n%years.length);};
 return `<section class="panel"><div class="panel-heading"><h3>逐年配置报告测试场景</h3><div class="actions">${badge('按交易日期自然年')}<button id="reportScenarioPreset">套用报告场景建议值</button></div></div><p class="muted">留空使用灰色提示的默认值；输入 0 可关闭该年度的项目。设置的是准备植入的样本数，生成后的实际命中数可在「功能验证 → 场景覆盖检查」查看。年份随“流水生成规则”里的起止日期变化。</p>
 <div class="table-scroll"><table><thead><tr><th>异常场景</th>${years.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${items.map(([label,id])=>`<tr><td>${label}</td>${years.map((y,i)=>`<td><input style="width:85px" type="number" min="0" max="${id==='blacklist'?blacklistMax:id==='sameMissing'?20:200}" step="1" data-annual="${id}" data-year="${y}" aria-label="${y} ${label}" value="${h(config.annualCounts?.[y]?.[id]??'')}" placeholder="${fallback(id,i)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
 ${years.length?'':'<p>请先在流水生成规则中选择有效日期范围。</p>'}
 <p class="muted">关联方分类场景留空时，如有匹配的单位和对手方，每年自动安排一组。双向往来每组生成一笔流入和一笔流出，可用于集中度及收支重合核验。范围内大额划拨每组为付款、收款各一笔。每组同时间交易占两笔；每个缺失同名账号安排两笔 A 向 B 的付款，B 不生成本方流水。余额错误可能导致下一笔也被识别为断点。</p></section>
 <section class="panel"><h3>其他设置</h3><div class="form-grid compact">${field('大额判断阈值（人民币元）','bigThreshold',config.bigThreshold,'number','单笔金额达到或超过此阈值即计入大额','min="1"')}</div><div class="switch-list"><label><div><b>自动模式保留原来没有流水的公司</b></div><input type="checkbox" role="switch" data-config="missingCompany" ${config.missingCompany?'checked':''}></label></div><p class="muted">此开关只影响在主档中选了「自动」的公司。员工、董监高留空时，有匹配主档的年份默认安排一笔。存取下逐年安排。黑名单只从你提供的名单中选取，每年按企业去重。异常包含在流水总笔数内。</p></section>${generateBar()}`;
}
function previews(){
 const flow=preview===K.flow;
 return `<section class="panel"><div class="panel-heading"><div><h3>预览当前数据</h3><p class="muted">${flow?'点表头漏斗筛选，点上下箭头排序；再次点击同一箭头恢复原顺序。':'搜索只影响页面显示。'}</p></div><div class="actions"><button data-nav="coverage">检查场景覆盖</button><button id="exportSingle">导出整表</button>${flow?`<button id="exportFilteredFlow" ${currentFlowRows().length?'':'disabled'}>导出筛选结果</button>`:''}</div></div>
 <div class="table-tools"><label>数据表 <select id="previewSelect">${Object.keys(data).map(k=>`<option ${preview===k?'selected':''} value="${h(k)}">${h(k)} · ${num(data[k].rows.length)}条</option>`).join('')}</select></label><div class="searchbox">⌕ <input id="search" aria-label="搜索当前表" placeholder="按公司、账号、流水号搜索" value="${h(search)}"></div></div>
 ${flow?`<div class="flow-table-tools"><small>${Object.values(flowFilters).some(Boolean)?'已应用列筛选':'表头漏斗可组合筛选'}</small><button type="button" class="text" id="clearFlowFilters">清空筛选和排序</button></div>`:''}${table(data[preview],{edit:true,flow})}</section>`;
}
function exportsPage(){const v=E.validate(data);return `${summary()}<div class="two-col export-grid"><section class="panel"><div class="panel-heading"><h3>上传包检查</h3>${badge(v.errors.length?'需要修正':'可导出',v.errors.length?'red':'green')}</div><div class="file-list">${Object.entries(data).map(([k,t])=>`<div><span class="file-icon">X</span><div><b>${h(k)}.xlsx</b><small>${num(t.rows.length)} 条记录 · ${t.headers.length} 列</small></div><span class="tick">✓</span></div>`).join('')}</div><div class="section-footer"><b>9 个上传文件 + 1 个数据检查文件${registry().length?' + 1 个工商档案 Excel':''}</b></div></section><section class="panel"><div class="panel-heading"><h3>导出前，检查测试数据</h3><button id="refreshAnalysis">重新检查</button></div><div class="check-list">${[['主档无本方流水账号',analysis.noflow.length,'用于验证账号完整性'],['缺失同名账户',analysis.missing.length,'同公司A已付款给B，B未作为本方账号上传；请跟进B流水是否在其他工作簿'],['仅流水有的本方账号',analysis.flowOnly.length,'账号主档和科目表中均不存在'],['余额断点',analysis.exceptions.length,'相邻记录余额不连续的实际数量']].map(([t,n,hint])=>`<div><div><b>${t}</b><small>${hint}</small></div>${badge(n+' 个',n?'amber':'')}</div>`).join('')}</div><details class="validation" ${v.errors.length?'open':''}><summary>${v.errors.length} 项错误 · ${v.warnings.length} 项提醒</summary>${[...v.errors,...v.warnings].slice(0,40).map(t=>`<p>${h(t)}</p>`).join('')||'<p>未发现字段格式问题。</p>'}${v.warnings.length>40?'<p>仅展示前40项，全部记录请在主档检查。</p>':''}</details><p class="muted readable">原数据中的必填字段缺失会保留并提醒，适合上传校验测试；金额或日期格式错误需先修正。已植入的异常不会被自动修复。</p><button class="primary wide big" id="exportZip" ${v.errors.length?'disabled':''}>下载整套测试数据 .zip <span>↓</span></button><div class="actions secondary-actions"><button data-nav="report">前往功能验证</button><button id="exportRegistryFull" ${registry().length?'':'disabled'}>单独下载工商档案 .xlsx</button><button id="exportRegistryAll">下载全部工商及合规数据</button><button id="saveProject">保存项目 .json</button></div></section></div>`;}
function coverageTable(a){
 const {headers,rows}=E.checksWorkbook(a)['逐年异常覆盖'];
 if(!rows.length)return '<p class="muted">当前没有可检查的流水。请先导入或生成数据。</p>';
 return '<div class="table-scroll"><table class="coverage-table"><thead><tr><th>检查项</th>'+rows.map(r=>'<th>'+r[0]+' 年</th>').join('')+'</tr></thead><tbody>'+headers.slice(1).map((label,i)=>'<tr><th scope="row">'+h(label)+'</th>'+rows.map(r=>'<td class="'+(r[i+1]===0?'coverage-zero':'')+'">'+r[i+1]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function coveragePage(){
 return checkpointPanel()+`<section class="panel"><div class="panel-heading"><div><h3>各年度实际命中的样本</h3><p class="muted">读取当前数据，按自然年统计。0 表示该年没有命中，可结合你的测试计划判断是否需要补样本。</p></div><button id="exportCoverage">下载场景检查 Excel</button></div>${coverageTable(analysis)}<p class="muted">大额按单笔等值人民币达到或超过 ${fmt(config.bigThreshold)} 元判断。余额断点按相邻交易计算；同名账户按整个工作簿是否有本方流水判断。</p></section>${stepActions('preview','查看流水明细','report','按报告期间核验')}`;
}
function preflight(){
 const candidate=E.generate(generationInput(),{...config,rates:exchangeRates()}).data;
 const a=E.analysis(candidate,{first:Number(config.start.slice(0,4)),last:Number(config.end.slice(0,4)),threshold:config.bigThreshold,rates:exchangeRates()});
 const v=E.validate(candidate);
 if(v.errors.length)throw Error(v.errors.slice(0,3).join('；'));
 $('#preflightContent').innerHTML=`<p>本次试算得到 <b>${num(a.count)}</b> 笔流水，覆盖 <b>${a.activeCompanies}</b> 家单位、<b>${a.accounts}</b> 个本方账号。${v.warnings.length?'有 '+v.warnings.length+' 项格式提醒，可在导出前查看。':''}</p>${coverageTable(a)}<p class="muted">这是当前设置的试算结果。已保存的项目和当前流水没有被替换。</p>`;
 $('#preflightContent table')?.classList.add('table');$('#preflightModal').showModal();
}
const R=AuditRegistry;
let registryFilter={},registryAsOf='',editingRegistry=null;
function registryDate(){return registryReportEnd();}
document.addEventListener('change',e=>{
 if(e.target.id!=='registryReportEnd')return;
 try{
  const end=e.target.value;
  R.automaticDates(rawRegistry(),end);
  lastData=snapshot();config.registryStartAnchor=end;registryAsOf=end;
  persist();render();toast('已按原经营开始时间重新计算经营天数，报告核验同步；导入原值和风险数量未改动。');
 }catch(error){e.target.value=registryDate();toast(error.message,true);}
});
function registryNames(){
 const names=new Set(),own=new Set(data[K.company].rows.map(r=>r[0]));
 for(const r of data[K.flow].rows){
  const n=String(r[3]??'').trim();
  if([...n].length>4&&!own.has(n)&&!['员工','个人'].includes(r[20]))names.add(n);
 }
 return [...names].sort((a,b)=>a.localeCompare(b,'zh-CN'));
}
function registryFiltered(){
 const asOf=registryDate(),{q,status,dishonest,metric,range}=registryFilter;
 return registry().filter(r=>(!q||R.fields.some(([k])=>String(r[k]??'').toLowerCase().includes(q.toLowerCase())))&&
  (!status||r.status===status)&&(!dishonest||r.dishonest===dishonest)&&
  (!metric||range===''||range==null||R.bucket(R.value(r,metric,asOf,exchangeRates()),R.boundsFor(metric,bounds()),metric)===Number(range)));
}
function registryPage(){
 const asOf=registryDate(),names=registryNames(),filtered=registryFiltered();
 const auto=registryProjection(),risks=R.riskCounts(rawRegistry());
 const select=(name,options,chosen)=>`<select name="${name}"><option value="">全部</option>${options.map(([v,label])=>`<option value="${h(v)}" ${String(chosen)===String(v)?'selected':''}>${h(label)}</option>`).join('')}</select>`;
 const metric=registryFilter.metric||'';
 const ranges=metric?R.intervalLabels(R.boundsFor(metric,bounds()),metric).map((s,i)=>[i,s]):[];
 const shown=R.table(filtered,asOf,exchangeRates());
 shown.headers.push('导入原经营天数','计算值－原天数');
 const originals=new Map(registry().map((r,i)=>[r,rawRegistry()[i]]));
 shown.rows.forEach((row,i)=>{const calculated=filtered[i].days,raw=originals.get(filtered[i])?.days;row.push(raw??null,calculated!=null&&raw!=null&&String(raw).trim()!==''&&Number.isFinite(Number(raw))?calculated-Number(raw):null);});
 return `<section class="panel"><div class="panel-heading"><h3>工商档案与报告区间</h3><div class="actions"><button id="addRegistry">新增档案</button><button id="exportRegistry">下载筛选结果</button><button id="exportRegistryAll" class="primary">下载全部工商及合规数据</button><button data-nav="report">查看报告核验</button></div></div>
 <form id="registryGenerate" class="registry-controls"><label>样本基准日 <input type="date" name="asOf" value="${h(asOf)}" required></label><label>生成范围（可选） <input name="nameFilter" placeholder="按对手方名称包含文字"></label><label>最多生成（可选） <input name="maxRows" type="number" min="1" step="1" placeholder="不限"></label><button type="submit" class="primary">为当前流水补齐工商档案</button><span>按对手方全称匹配；现有档案保留。当前流水识别到 ${names.length} 家企业候选。</span></form>
 <section class="registry-start-tools" aria-labelledby="registryStartHeading"><h4 id="registryStartHeading">经营天数规则：自动同步</h4><div class="registry-controls"><label>报告结束日期 <input type="date" id="registryReportEnd" value="${h(asOf)}" required></label><span>仅用于工商经营天数计算，不修改报告分析与导出期间。</span></div><p>保留导入的经营开始时间，新经营天数＝报告结束日期－经营开始时间，不额外加一天。导入旧数据、修改开始时间或报告结束日期后自动重新计算；导入的原经营天数仅供对照，不参与计算。列表、报告和导出统一使用新天数，保存项目JSON保留原始记录。</p><p class="muted">已计算 ${num(auto.plan.changed+auto.plan.unchanged)} 条，其中 ${num(auto.plan.changed)} 条与导入天数不同；${num(auto.plan.skipped)} 条因开始日期缺失、无效或晚于报告结束日而无法计算。<button type="button" class="text" id="exportRegistryDates">下载日期核验明细</button> 其他工商字段、流水及主档不变。</p></section>
 <section class="registry-start-tools"><h4>合规明细：按原数量自动补生成</h4><p>诉讼 ${num(risks.cases)} 条，失信被执行人 ${num(risks.dishonest)} 条，行政处罚 ${num(risks.penalties)} 条。失信标记“是”生成1条，“否”生成0条；诉讼、处罚按原数量逐条生成，不改原数量。${risks.missing?'有 '+num(risks.missing)+' 份档案的数量或标记未提供／无效，保留缺失，不自动填0。':''}</p><div class="actions"><button id="exportRegistryLawsuits">下载全部诉讼明细</button><button id="exportRegistryDishonest">下载全部失信明细</button><button id="exportRegistryPenalties">下载全部行政处罚</button><button id="exportRegistryRaw">下载导入原始工商档案</button></div><p class="muted">这些下载包含全部档案，不受列表筛选影响。明细为按已有标记与条数补充的测试数据；可在“合规数量核验”中逐家比对。</p></section>
 <form id="registryBounds" class="registry-controls"><div class="registry-grid">${R.metrics.map(([id,label,unit])=>`<label>${label}分界值（${unit}）<input name="${id}" value="${h(R.boundsFor(id,bounds()).join(', '))}" required></label>`).join('')}</div><button type="submit">应用报告区间</button><button id="registryDefaultIntervals" type="button">恢复新版三项区间</button><span>逗号分隔；经营天数、参保人数及注册资本首个分界值计入第二档；其余共享端点计入前一档，避免重复统计。默认按 365 天为 1 年；3 年、100 人、1百万 均计入第三档。</span></form>
 <form id="registryFilter" class="registry-controls"><label>搜索 <input name="q" value="${h(registryFilter.q||'')}" placeholder="名称、行业、信用代码等"></label><label>经营状态 ${select('status',[...new Set(registry().map(r=>r.status).filter(Boolean))].map(x=>[x,x]),registryFilter.status)}</label><label>失信被执行人 ${select('dishonest',[['是','是'],['否','否']],registryFilter.dishonest)}</label><label>区间指标 ${select('metric',R.metrics.map(([id,label])=>[id,label]),metric)}</label><label>筛选区间 ${select('range',ranges,registryFilter.range)}</label><button type="submit">筛选</button><button type="button" id="clearRegistryFilter">清空筛选</button></form>
 <p class="muted">显示 ${filtered.length} / ${registry().length} 条。经营天数列显示以 ${h(asOf)} 为截止日新计算的天数；导入原天数单独保留，差值为0表示一致。列表筛选只影响列表和“下载筛选结果”，不影响全部下载。</p>${table(shown,{registry:true})}</section>`;
}
function openRegistry(name=null){
 const record=rawRegistry().find(r=>r.name===name)||{};
 editingRegistry=name;
 $('#registryFields').innerHTML=R.fields.map(([key,label,type])=>`<label class="field"><span>${label}${key==='days'?'（导入原值，仅供对照）':''}</span>${type==='flag'?`<select name="${key}"><option value="">未提供</option>${['是','否'].map(v=>`<option ${record[key]===v?'selected':''}>${v}</option>`).join('')}</select>`:`<input name="${key}" type="${type==='date'?'date':type==='integer'||type==='number'?'number':'text'}" ${type==='integer'||type==='number'?`min="0" step="${type==='integer'?'1':'any'}"`:''} ${key==='name'?'required':''} value="${h(record[key]??'')}">`}</label>`).join('');
 $('#registryModal').showModal();
}
document.addEventListener('submit',e=>{
 const id=e.target.id;
 if(!['registryGenerate','registryBounds','registryFilter','registryRecord'].includes(id))return;
 e.preventDefault();
 const f=Object.fromEntries(new FormData(e.target));
 try{
  if(id==='registryGenerate'){
   const q=String(f.nameFilter||'').trim().toLowerCase();
   const existing=new Set(registry().map(r=>r.name));
   const names=registryNames().filter(n=>!existing.has(n)&&(!q||n.toLowerCase().includes(q))).slice(0,Number(f.maxRows)||Infinity);
   if(!names.length){toast('当前没有需要补齐的企业，已有档案及风险数量保持不变。');return;}
   const rows=R.generate(names,f.asOf,bounds(),registry().length);
   lastData=snapshot();config.registryRecords=[...rawRegistry(),...rows];registryAsOf=f.asOf;
   toast('已新增 '+rows.length+' 份工商档案；原档案、原天数和风险数量保持不变。');
  }else if(id==='registryBounds'){
   const next=Object.fromEntries(R.metrics.map(([key,,unit])=>[key,R.parseBounds(f[key],unit)]));
   lastData=snapshot();config.registryBounds=next;config.registryIntervalVersion=R.INTERVAL_VERSION;registryFilter.range='';
  }else if(id==='registryFilter'){registryFilter=f;}
  else{
   const r=R.readRecord(f);
   if(registry().some(x=>x.name===r.name&&x.name!==editingRegistry))throw Error('该对手方已有工商档案。');
   lastData=snapshot();config.registryRecords=[...rawRegistry().filter(x=>x.name!==editingRegistry),r];
   $('#registryModal').close();
  }
  pageNo=1;render();
 }catch(err){toast(err.message,true);}
});
document.addEventListener('submit',e=>{
 if(!e.target.matches('[data-report-criteria]'))return;
 e.preventDefault();
 try{
  const input=Object.fromEntries(new FormData(e.target));
  const next=AuditReport.parseCriteria(input,config.reportCriteria);
  const nextBounds=input.daysBounds?{...bounds(),days:R.parseBounds(input.daysBounds,'天')}:bounds();
  lastData=snapshot();
  config.reportCriteria=next;config.registryBounds=nextBounds;config.registryIntervalVersion=R.INTERVAL_VERSION;
  const top=window.scrollY;persist();render();window.scrollTo(0,top);
  toast('已更新筛选结果与核验明细。');
 }catch(err){toast(err.message,true);}
});
const workflow=[['master','维护主档'],['rules','配置流水'],['anomaly','设置异常并生成'],['preview','预览数据'],['registry','对手方工商数据'],['export','导出测试数据']];
function stepActions(back,backLabel,next,nextLabel){
 return `<div class="workflow-actions">${back?`<button data-nav="${back}">${backLabel}</button>`:''}<button class="primary" data-nav="${next}">${nextLabel} <span aria-hidden="true">→</span></button></div>`;
}
function workflowNav(){
 return `<nav class="workflow" aria-label="测试数据生成步骤">${workflow.map(([id,label],i)=>`<button type="button" data-nav="${id}" ${id===page?'aria-current="step"':''}><span>${i+1}</span>${label}</button>`).join('')}</nav>`;
}
function mountComponents(){
 for(const panel of document.querySelectorAll('#content .panel')){
  panel.classList.add('card');
  let head=panel.querySelector(':scope > .panel-heading');
  if(!head){
   const title=panel.querySelector(':scope > h3');
   if(title){head=document.createElement('div');panel.prepend(head);head.append(title);}
  }
  if(head){head.classList.add('head');head.querySelector('h3')?.classList.add('title');}
  const body=document.createElement('div');body.className='content';
  for(const node of [...panel.childNodes])if(node!==head)body.append(node);
  panel.append(body);
 }
 document.querySelectorAll('#content table,#preflightModal table').forEach(t=>t.classList.add('table'));
 document.querySelectorAll('#content button:not(.ba-sort-up,.ba-sort-down,.ba-filter-btn,.workflow button), dialog button:not(.dialog-heading button)').forEach(b=>{
  b.classList.add('btn');if(b.classList.contains('primary'))b.classList.add('btn-primary');
 });
 const pager=$('#tablePager');
 if(pager&&tablePagerState){
  const refresh=()=>{const left=$('#content .table-scroll').scrollLeft;render();$('#content .table-scroll').scrollLeft=left;};
  renderAuditPager(pager,{total:tablePagerState.total,page:pageNo,pageSize,
   onPage:n=>{pageNo=n;refresh();},onPageSize:n=>{pageSize=n;pageNo=1;refresh();}});
 }
 if(page==='report')AuditReport.mountPagers();
 const mainQueryTable=document.querySelector('[data-main-query]');
 if(mainQueryTable?.id==='statementFlowTable')mainQueryTable.querySelectorAll('thead th').forEach(th=>{if(!th.querySelector('[data-filter-flow]'))th.querySelector('.ba-th-tools')?.remove();});
 if(mainQueryTable)AuditTableTools.attach(mainQueryTable,currentTableQuery(),()=>{pageNo=1;render();},{skip:[0,...(mainQueryTable.tHead.rows[0].cells[mainQueryTable.tHead.rows[0].cells.length-1].textContent==='操作'?[mainQueryTable.tHead.rows[0].cells.length-1]:[])]});
 if(page!=='report')AuditTableTools.mountStatic(document.querySelector('#content'));
 if(page==='master'){openMasterSamples();updateRandomGroupControls();}
}
function render(){captureMasterWizardDraft();if(AuditPopover.isOpen(filterPopover))AuditPopover.hide(filterPopover);if(!analysis)recalc();document.querySelectorAll('.sidebar [data-nav]').forEach(b=>{const active=b.dataset.nav===page;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});document.querySelectorAll('.sb-toggle-head').forEach(b=>b.classList.toggle('group-current',!!b.parentElement.querySelector('[aria-current=page]')));$('#pageTitle').textContent=titles[page][0];$('#pageSubtitle').textContent=titles[page][1];$('#sourceLabel').textContent=sourceLabel;$('#sidebarCount').textContent=num(data[K.flow].rows.length)+' 条流水 · '+data[K.company].rows.length+' 家单位';$('#breadcrumbSection').textContent=['report','coverage'].includes(page)?'功能验证':page==='overview'?'数据总览':'测试数据生成';$('#content').innerHTML=(workflow.some(([id])=>id===page)?workflowNav():'')+({templateImport:templateImportPage,overview,master:()=>masters()+stepActions(null,'','rules','下一步：配置流水'),rules,anomaly:anomalies,preview:()=>previews()+stepActions('anomaly','返回异常设置','registry','下一步：对手方工商数据'),report:reportPage,registry:()=>registryPage()+stepActions('preview','返回数据预览','export','下一步：导出测试数据'),coverage:coveragePage,export:exportsPage}[page])();$('#undoTop').disabled=!lastData;mountComponents();}
function navigate(p){closeFlyout();if(narrowScreen.matches&&!sidebarCollapsed())setSidebar(true);page=p;search='';pageNo=1;render();window.scrollTo(0,0);}
function updateSetting(el){const id=el.dataset.config;if(!id)return;if(id==='fx'&&(!Number.isFinite(Number(el.value))||Number(el.value)<=0)){el.value=config.fx;toast('美元汇率必须大于 0。',true);return;}config[id]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;if(id==='fx')recalc();if(id==='missingCompany'&&$('#generationScope'))$('#generationScope').textContent=generationScope();if(id==='count'&&$('[data-planned-count]'))$('[data-planned-count]').textContent=num(config.count);persist();}
async function run(fn){if(busy)return;busy=true;$('#busy').hidden=false;try{await new Promise(r=>setTimeout(r,35));await fn();}catch(e){console.error(e);toast(e.message||String(e),true);}finally{busy=false;$('#busy').hidden=true;}}
function analyzeConfig(){if(config.first>config.last||config.last-config.first>10)throw Error('核验开始财年不能晚于结束财年，范围最多10年。');recalc();}
function originalRegistryFor(records){const indices=new Map(registry().map((r,i)=>[r,i]));return records.map(r=>rawRegistry()[indices.get(r)]||r);}
const registryWorkbook=records=>X.workbook({'对手方工商档案':R.table(records,registryDate(),exchangeRates()),'导入原始工商档案':R.table(originalRegistryFor(records),registryDate(),exchangeRates())});
function registryDateAuditTable(){return R.dayCalculationTable(registryProjection().plan);}
function allRegistryTables(){
 const asOf=registryDate();
 return {'对手方工商档案':R.table(registry(),asOf,exchangeRates()),'导入原始工商档案':R.table(rawRegistry(),asOf,exchangeRates()),...R.riskTables(rawRegistry(),asOf),'经营日期自动核验':registryDateAuditTable(),'数据说明':{headers:['项目','说明'],rows:[['报告结束日期',asOf],['经营日期规则','经营开始时间保留，新经营天数＝报告结束日期－原经营开始时间；不额外加一天。导入原天数仅供对照，原始记录未改写。'],['风险明细规则','诉讼、行政处罚按已有数量生成；失信标记是为1条、否为0条。缺失值保留，不补0。'],['资料性质','案号、处罚文书及明细内容均为按条数生成的测试资料，不代表企业真实风险，不来自实时工商查询。'],['下载范围','包含全部工商档案及其全部合规明细，不受页面筛选影响。']]}};
}
async function exportZip(){const v=E.validate(data);if(v.errors.length)throw Error('请先修正导出检查中的错误。');analyzeConfig();const z=new JSZip();for(const [name,t]of Object.entries(data))z.file('上传数据/'+name+'.xlsx',await X.workbook({[name]:t}));z.file('核验资料/综合分析报告_核验预期值.xlsx',await X.workbook(AuditReport.formatTables(E.checksWorkbook(analysis))));if(registry().length){z.file('工商数据/对手方工商档案.xlsx',await registryWorkbook(registry()));z.file('工商数据/工商及合规全部数据.xlsx',await X.workbook(allRegistryTables()));}z.file('生成配置.json',JSON.stringify({version:2,label:sourceLabel,config:{...config,registryStartAnchor:registryReportEnd()},data,template:generationSource},null,2));z.file('使用说明.txt','Audit Compass 测试数据工作坊\n数据为模拟测试用途。\n9个上传Excel位于上传数据目录；工商数据目录包含工商档案、导入原始值、诉讼／失信／处罚明细及数量和日期核验，核验资料另存。\n账号及流水号为文本，日期无ISO后缀，金额千分符两位，数量整数。\n集中度先剔除被审计单位之间的往来，按全体对手方分别对流入、流出统一排名，再拆客商分类及关联方/第三方；空白对手方参与排名并归入非客商第三方，分母仍为同客商分类方向总额。\n余额断点不检查每个账号的第一笔期初；科目余额仍按自然年。\n核验报告为当前数据实际计算结果，不是平台已经通过测试的证明。\n');X.download(await z.generateAsync({type:'blob',compression:'DEFLATE'}),'AuditCompass_测试数据_'+config.seed.replace(/[^\w\u4e00-\u9fff-]/g,'_')+'.zip');toast(registry().length?'已导出9个上传文件、工商档案 Excel 和核验结果。':'已导出9个上传文件及核验结果。');}
let templateDraft=null,templateMode='new',templateImported=false;
function templateImportPage(){
 const d=templateDraft;
 return `<section class="panel"><h3>1. 准备模板文件</h3><p>可选择多个单独的 .xlsx、一个包含多个工作表的 .xlsx，或包含Excel的 .zip。支持9类主档／流水及对手方工商档案，与平台生成的数据模板一致。只在本机处理。</p><div class="actions"><button id="downloadImportTemplate">下载空白模板（含工商档案）</button><button class="primary" id="chooseTemplateFiles">选择 Excel / ZIP 文件</button><label>导入方式 <select id="templateImportMode"><option value="new" ${templateMode==='new'?'selected':''}>创建新项目（缺少的表留空）</option><option value="replace" ${templateMode==='replace'?'selected':''}>更新当前项目（替换已识别的表）</option></select></label></div><p class="muted">账号、税号、员工编号请按文本填写。金额和日期按原值导入；保留空白字段及余额异常。Excel 不包含生成规则、汇率和报告筛选条件，导入后请确认设置；完整恢复设置请继续使用原来的JSON导入。</p></section>`+
 (d?`<section class="panel"><h3>2. 检查识别结果</h3><p>${d.mode==='new'?'将创建新项目，未提供的表保持为空。':'将替换下表中已识别的数据类型，其余当前数据保留。'} 同类表来自多个文件时按选择顺序合并，不自动去重。</p><table><thead><tr><th>文件</th><th>工作表</th><th>识别为</th><th>记录数</th></tr></thead><tbody>${d.summaries.map(x=>`<tr><td>${h(x.file)}</td><td>${h(x.sheet)}</td><td>${h(x.target)}</td><td>${num(x.count)}</td></tr>`).join('')}</tbody></table><p>流水日期：${h(d.from||'无流水')} ${d.to?'～ '+h(d.to):''}</p><p>未提供的模板：${d.missing.map(h).join('、')||'无'}</p>${d.ignored.length?`<details><summary>未识别／辅助工作表 ${d.ignored.length} 张（不导入）</summary>${d.ignored.map(x=>'<p>'+h(x)+'</p>').join('')}</details>`:''}<details ${d.errors.length?'open':''}><summary>${d.errors.length} 项错误 · ${d.warnings.length} 项提醒</summary>${[...d.errors,...d.warnings].slice(0,100).map(x=>'<p>'+h(x)+'</p>').join('')||'<p>未发现格式问题。</p>'}${d.warnings.length>100?'<p>提醒较多，仅显示前100项。</p>':''}</details><div class="actions"><button class="primary" id="applyTemplateImport" ${d.errors.length||templateImported?'disabled':''}>确认转换并导入平台</button>${templateImported?'<button id="saveProject">下载转换后的项目 JSON</button><button data-nav="report">进入报告核验</button>':''}</div><p>${templateImported?'转换完成，已进入平台数据；请下载JSON保存，下次可直接恢复。':'当前项目尚未改变。点击确认后替换，可用顶部“撤销”恢复。'}</p></section>`:'<section class="panel"><h3>2. 识别并检查</h3><p>选择文件后，会在这里展示各表的记录数、缺少的模板及格式问题。确认之前不会覆盖当前项目。</p></section>');
}
async function prepareTemplateFiles(files){
 if(!files.length)return;
 templateDraft=null;templateImported=false;render();
 const entries=[];
 for(const f of files){
  if(f.size>40*1024*1024)throw Error('单个文件请小于40MB。');
  const ext=f.name.toLowerCase();let workbooks;
  if(ext.endsWith('.zip')){const zip=await JSZip.loadAsync(await f.arrayBuffer());workbooks=Object.values(zip.files).filter(e=>!e.dir&&/\.xlsx$/i.test(e.name)&&!e.name.startsWith('__MACOSX/')).map(e=>({name:e.name,read:()=>e.async('uint8array')}));}
  else if(ext.endsWith('.xlsx'))workbooks=[{name:f.name,read:()=>f.arrayBuffer()}];
  else throw Error('请选择 .xlsx 或 .zip；旧项目JSON请使用“导入项目 / 文件”。');
  for(const wb of workbooks){const tables=await X.read(await wb.read());for(const [name,table] of Object.entries(tables))entries.push({file:wb.name,name,table});}
 }
 const draft=AuditTemplateImport.prepare(entries,data,templateMode);
 templateDraft=draft;templateImported=false;navigate('templateImport');
}
function applyTemplateImport(){
 const d=templateDraft;if(!d||d.errors.length||templateImported)throw Error('请先选择文件并修正格式错误。');
 lastData=snapshot();data=E.copy(d.data);generationSource=E.copy(data);
 if(d.mode==='new'){
  config.companyFlow={};config.sampleNonMerchants={};config.sampleAccountPlans={};config.registryRecords=[];config.registryBounds={};config.reportCriteria={};config.reportSections=undefined;config.registryStartAnchor='';
 }
 if(d.registry!==null)config.registryRecords=E.copy(d.registry);
 if(d.from&&d.to){config.start=d.from;config.end=d.to;config.first=Number(d.from.slice(0,4));config.last=Number(d.to.slice(0,4));reportPeriod={from:d.from,to:d.to};}
 else if(d.mode==='new')reportPeriod={};
 registryAsOf='';config.registryIntervalVersion=R.INTERVAL_VERSION;registryFilter.range='';
 sourceLabel='Excel 模板导入 · '+d.summaries.length+' 张表';randomCompanyProposal=null;resetFlowFilters();persist();recalc({preserveRows:true});
 projectCheckpoint=makeProjectCheckpoint('Excel转换导入时基线');checkpointComparison=null;templateImported=true;render();toast('Excel已转换为项目数据，主档、流水和工商档案已载入，可保存JSON。');
}
async function importFiles(files){
 const staged=E.copy(data);
 let n=0,project=null,importedRegistry=null,importedRawRegistry=null;
 const readProject=text=>{
  const saved=JSON.parse(text);
  if(!saved.data)throw Error('请选择本工具保存的项目JSON。');
  project={...saved,config:R.migrateSettings(saved.config||{})};
 };
 for(const f of files){
  if(f.size>40*1024*1024)throw Error('单个文件请小于40MB。');
  if(f.name.endsWith('.json')){readProject(await f.text());continue;}
  let entries;
  if(f.name.endsWith('.zip')){
   const zip=await JSZip.loadAsync(f);
   const metadata=Object.values(zip.files).find(e=>!e.dir&&e.name.split('/').at(-1)==='生成配置.json');
   if(metadata)readProject(await metadata.async('string'));
   entries=Object.values(zip.files).filter(e=>!e.dir&&e.name.endsWith('.xlsx')&&(!e.name.includes('核验')||e.name.endsWith('对手方工商档案.xlsx'))).map(e=>({name:e.name,read:()=>e.async('uint8array')}));
  }else entries=[{name:f.name,read:async()=>f}];
  for(const entry of entries){
   const tables=await X.read(await entry.read());
   for(const [name,t] of Object.entries(tables)){
    if(name==='对手方工商档案'||name==='导入原始工商档案'){
     const columns=new Map(t.headers.map((value,i)=>[value.trim(),i]));
     if(!columns.has('对手方名称'))throw Error('工商档案缺少对手方名称列。');
     const records=t.rows.map(row=>R.readRecord(Object.fromEntries(R.fields.map(([id,label])=>[id,row[columns.get(label)]]))));
     if(name==='导入原始工商档案')importedRawRegistry=records;else importedRegistry=records;
     continue;
    }
    const recognized=Object.keys(BASELINE).find(k=>k===name||entry.name.split('/').at(-1)===k+'.xlsx');
    if(!recognized)continue;
    const expected=BASELINE[recognized].headers;
    if(t.headers.length!==expected.length||t.headers.some((value,i)=>value.trim()!==expected[i].trim()))throw Error(recognized+'的表头与平台模板不一致。');
    staged[recognized]=t;n++;
   }
  }
 }
 if(importedRawRegistry!==null)importedRegistry=importedRawRegistry;
 if(!n&&!project&&importedRegistry===null)throw Error('未找到可识别的上传模板、工商档案或项目文件。');
 const next=project?.data||staged,v=E.validate(next);
 if(v.errors.length)throw Error(v.errors.slice(0,3).join('；'));
 lastData=snapshot();data=next;resetFlowFilters();
 generationSource=E.copy(project?.template||data);
 if(project){
  config.companyFlow={};config.sampleNonMerchants={};config.sampleAccountPlans={};
  config.registryRecords=[];config.registryBounds={};config.reportCriteria={};config.reportSections=undefined;config.registryStartAnchor='';config.annualCounts={};config.rates=undefined;config.fx=E.DEFAULT_FX;
  Object.assign(config,project.config);reportPeriod=config.registryStartAnchor?{to:config.registryStartAnchor}:{};
 }
 if(importedRegistry!==null&&!project?.config.registryRecords)config.registryRecords=importedRegistry;
 config.registryIntervalVersion=R.INTERVAL_VERSION;registryFilter.range='';
 persist();sourceLabel=project?.label||'已导入 · '+n+'个文件';recalc({preserveRows:!!project});randomCompanyProposal=null;projectCheckpoint=makeProjectCheckpoint(project?'项目导入时基线':'文件导入时基线');checkpointComparison=null;render();
 toast(project?'已打开保存的项目，旧版默认区间已兼容新版报告。':'已导入数据，并按当前区间重新统计。');
}
function editRow(index){const tableName=page==='preview'?preview:master;const isNew=index===null,r=isNew?[]:data[tableName].rows[index];$('#modalTitle').textContent=isNew?'新增记录':'编辑第'+(index+1)+'条记录';$('#modalFields').innerHTML=data[tableName].headers.map((hd,j)=>`<label class="field"><span>${h(hd)}</span><input data-cell="${j}" value="${h(r[j]??'')}" ${/日期|期间\d+_[从到]|开立时间|注销时间/.test(hd)?'placeholder="yyyy-mm-dd"':''}></label>`).join('');$('#rowForm').onsubmit=e=>{e.preventDefault();try{const newRow=[...$('#modalFields').querySelectorAll('input')].map((el,j)=>{const val=el.value,head=data[tableName].headers[j];if(!val)return null;if(/金额|余额|发生额|限额|_PM|_AMPT/.test(head)&&!/账号|编号/.test(head)){if(!Number.isFinite(Number(val)))throw Error(head+'必须是数字');return Number(val);}if(/对账年份|总交易行数/.test(head)){if(!/^\d+$/.test(val))throw Error(head+'必须是整数');return Number(val);}return val;});if(tableName===K.company){newRow[0]=String(newRow[0]??'').trim();if(!newRow[0]||!String(newRow[3]??'').trim())throw Error('公司名称和公司职能为必填项。');}lastData=snapshot();if(!isNew&&tableName===K.company&&r[0]!==newRow[0]){renameCompanies(data,[[r[0],newRow[0]]]);}if(isNew)data[tableName].rows.push(newRow);else data[tableName].rows[index]=newRow;E.annotate(data);generationSource=E.copy(data);recalc();$('#rowModal').close();render();toast('已保存记录并更新匹配标签。');}catch(e){toast(e.message,true);}};$('#rowModal').showModal();}
function deleteCompany(index){
 const name=data[K.company].rows[index][0];
 if(!confirm(`删除「${name}」及其本方主档、余额表和流水？其他公司的流水中若有该对手方，会继续保留。可撤销本次删除。`))return;
 lastData=snapshot();
 E.removeCompany(data,name);E.removeCompany(generationSource,name);
 delete config.companyFlow?.[name];delete config.sampleNonMerchants?.[name];delete config.sampleAccountPlans?.[name];persist();recalc();render();toast('已删除被审计单位及其本方资料。');
}
$('#companyForm').onsubmit=e=>{
 e.preventDefault();
 const fields=new FormData(e.currentTarget);
 const name=String(fields.get('name')).trim(),role=fields.get('role'),count=Number(fields.get('count'));
 const mode=fields.get('flow')==='true';
 try{
  const next=E.copy(data);
  E.addCompany(next,{name,role,count});
  lastData=snapshot();data=next;
  generationSource[K.company].rows.push(E.copy(next[K.company].rows.at(-1)));
  if(count)generationSource[K.bank].rows.push(...E.copy(next[K.bank].rows.slice(-count)));
  config.companyFlow={...(config.companyFlow||{}),[name]:mode};persist();
  e.currentTarget.reset();$('#companyModal').close();master=K.company;recalc();render();
  toast(count?`已新增被审计单位和 ${count} 个模拟账号。`:'已新增被审计单位。');
 }catch(error){toast(error.message,true);}
};
document.addEventListener('submit',e=>{
 if(e.target.id!=='flowColumnFilterForm')return;
 e.preventDefault();
 const next=Object.fromEntries(new FormData(e.target));
 if(next.from&&next.to&&next.from>next.to){
  const error=e.target.querySelector('.flow-filter-error');error.textContent='起始日期不能晚于截止日期。';error.hidden=false;return;
 }
 const kind=flowFilterColumns[Number(filterPopover.dataset.column)];
 const choices=[...e.target.querySelectorAll('input[name="choice"]')];
 if(choices.length){
  const checked=choices.filter(x=>x.checked).map(x=>x.value);
  if(checked.length===choices.length)delete flowFilters[kind];else flowFilters[kind]=checked;
 }else Object.assign(flowFilters,next);
 refreshFlowTable(`[data-filter-flow="${filterPopover.dataset.column}"]`);
});
document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;
 if(el.dataset.filterFlow!==undefined){showFlowFilter(el);return;}
 if(el.dataset.sortFlow!==undefined){
  const column=Number(el.dataset.sortFlow),descending=el.dataset.sortDirection==='desc';
  flowSort=flowSort?.column===column&&flowSort.descending===descending?null:{column,descending};
  refreshFlowTable(`[data-sort-flow="${column}"][data-sort-direction="${el.dataset.sortDirection}"]`);
  return;
 }if(el.dataset.nav){navigate(el.dataset.nav);return;}if(el.dataset.master){master=el.dataset.master;search='';pageNo=1;render();return;}if(el.dataset.edit!==undefined){editRow(Number(el.dataset.edit));return;}if(el.dataset.removeCompany!==undefined){deleteCompany(Number(el.dataset.removeCompany));return;}if(el.dataset.delete!==undefined){if(page==='master'&&master===K.company){deleteCompany(Number(el.dataset.delete));return;}if(confirm('确认删除这条主档记录？关联流水会保留，用于检查资料缺失。')){lastData=snapshot();data[page==='preview'?preview:master].rows.splice(Number(el.dataset.delete),1);E.annotate(data);generationSource=E.copy(data);recalc();render();}return;}
const id=el.id;
if(el.dataset.registryEdit!==undefined){openRegistry(el.dataset.registryEdit);return;}
if(id==='addRegistry')openRegistry();
if(id==='closeRegistry')$('#registryModal').close();
if(id==='clearRegistryFilter'){registryFilter={};pageNo=1;render();}
if(id==='exportRegistry'||id==='exportRegistryFull')run(async()=>X.download(new Blob([await registryWorkbook(id==='exportRegistryFull'?registry():registryFiltered())]),'对手方工商档案.xlsx'));
if(id==='exportRegistryAll')run(async()=>X.download(new Blob([await X.workbook(allRegistryTables())]),'工商及合规全部数据_'+registryDate()+'.xlsx'));
if(id==='exportRegistryDates')run(async()=>X.download(new Blob([await X.workbook({'经营日期自动核验':registryDateAuditTable()})]),'经营日期自动核验_'+registryDate()+'.xlsx'));
if(id==='exportRegistryRaw')run(async()=>X.download(new Blob([await X.workbook({'导入原始工商档案':R.table(rawRegistry(),registryDate(),exchangeRates())})]),'导入原始工商档案.xlsx'));
if(['exportRegistryLawsuits','exportRegistryDishonest','exportRegistryPenalties'].includes(id))run(async()=>{const key={exportRegistryLawsuits:'诉讼明细',exportRegistryDishonest:'失信被执行人明细',exportRegistryPenalties:'行政处罚明细'}[id],tables=R.riskTables(rawRegistry(),registryDate());X.download(new Blob([await X.workbook({[key]:tables[key],'合规数量核验':tables['合规数量核验']})]),key+'_'+registryDate()+'.xlsx');});
if(id==='resetMasterSamples'){masterWizardDraft=null;openMasterSamples();}
if(id==='openCatalog'){$('#catalogGroup').innerHTML='<option value="">全部企业名称</option>'+E.companyGroups().map(g=>'<option value="'+h(g.id)+'">'+h(g.label)+'</option>').join('');$('#catalogSearch').value='';renderCatalog();$('#catalogModal').showModal();}
if(id==='closeCatalog')$('#catalogModal').close();
if(id==='exportCatalog')run(async()=>X.download(new Blob([await X.workbook({'企业名称库':{headers:['企业名称','来源','来源链接'],rows:E.companyCatalog()},'集团成员清单':{headers:['集团名称','企业名称','公司职能','上级公司','来源','来源链接'],rows:E.companyGroups().flatMap(g=>g.members.map(m=>[g.label,m.name,m.role,m.parent,g.source,g.url]))}})]),'离线企业名称库.xlsx'));
if(id==='registryDefaultIntervals'){
 lastData=snapshot();
 config.registryBounds={...bounds(),...Object.fromEntries(R.metrics.filter(([id])=>['days','insured','capital'].includes(id)).map(([id,,,values])=>[id,[...values]]))};
 config.registryIntervalVersion=R.INTERVAL_VERSION;registryFilter.range='';persist();render();
 toast('已恢复新版经营天数、社保人数、注册资本区间，并按现有数据重新统计。');
}
if(id==='reportScenarioPreset'){
 const choices=reportScenarioCounts;
 for(const input of document.querySelectorAll('[data-annual]'))if(Object.hasOwn(choices,input.dataset.annual)){
  const y=input.dataset.year,counts=(config.annualCounts[y]??={});
  if(counts[input.dataset.annual]===undefined)counts[input.dataset.annual]=Math.min(Number(input.max),choices[input.dataset.annual]);
 }
 persist();render();toast('已补齐空白的报告场景建议值，现有自定义值已保留。');
}
if(id==='clearFlowColumn'){
 const column=filterPopover.dataset.column;
 for(const k of flowFilterKeys(flowFilterColumns[column]))delete flowFilters[k];
 refreshFlowTable(`[data-filter-flow="${column}"]`);
 }if(id==='clearFlowFilters'){resetFlowFilters();render();}
if(id==='exportFilteredFlow')run(async()=>{
 const t=data[K.flow],rows=currentFlowRows().map(x=>x.r);
 X.download(new Blob([await X.workbook({[K.flow]:{headers:t.headers,rows}})]),'全量银行流水_筛选结果.xlsx');
});if(id==='importButton')$('#fileInput').click();if(id==='chooseTemplateFiles')$('#templateFileInput').click();if(id==='applyTemplateImport')run(async()=>applyTemplateImport());if(id==='downloadImportTemplate')run(async()=>{const tables=Object.fromEntries(Object.entries(BASELINE).map(([k,t])=>[k,{headers:[...t.headers],rows:[]}]));tables['对手方工商档案']={headers:R.fields.map(x=>x[1]),rows:[]};X.download(new Blob([await X.workbook(tables)]),'AuditCompass_项目导入模板.xlsx');});if(id==='saveProject'||id==='saveProjectTop'){X.download(new Blob([JSON.stringify({version:2,label:sourceLabel,config:{...config,registryStartAnchor:registryReportEnd()},data,template:generationSource})],{type:'application/json'}),'AuditCompass_数据项目.json');toast('已保存项目，可随时导入恢复。');}if(id==='applyNames')run(async()=>{const pairs=[...document.querySelectorAll('[data-rename]')].map(el=>[data[K.company].rows[Number(el.dataset.rename)][0],el.value.trim()]);if(pairs.some(p=>!p[1]))throw Error('公司名称不能为空。');const next=E.copy(data),previous=snapshot();renameCompanies(next,pairs);lastData=previous;data=next;generationSource=E.copy(data);sourceLabel='已修改 · 自定义公司名称';recalc();render();toast('名称已同步替换，交易金额与笔数保持不变。');});if(id==='preflight')run(preflight);if(id==='closePreflight')$('#preflightModal').close();if(id==='newSeed'){
 const seed='AC-'+[...crypto.getRandomValues(new Uint8Array(4))].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
 config.seed=seed;$('[data-config="seed"]').value=seed;persist();toast('已更换种子，下次生成时生效。');
 }if(id==='exportCoverage')run(async()=>{
 const source=E.checksWorkbook(analysis);
 const names=['逐年异常覆盖','专项交易','缺失同名付款明细','余额断点','账号覆盖','核验口径'];
 X.download(new Blob([await X.workbook(Object.fromEntries(names.map(n=>[n,source[n]])))]),'测试数据场景检查.xlsx');
 });if(id==='generate')run(async()=>{const result=E.generate(generationInput(),{...config,rates:exchangeRates()});lastData=snapshot();data=result.data;sourceLabel='新生成 · '+config.seed;recalc();reportPeriod=config.includeForeign===false?{originalCurrency:'CNY'}:{};preview=K.flow;resetFlowFilters();navigate('preview');toast('测试数据已生成，可预览流水或继续导出。');});if(id==='refreshAnalysis')run(async()=>{analyzeConfig();render();toast('已按当前财年重新核验。');});if(id==='reportApply')run(async()=>{const from=$('#reportFrom').value,to=$('#reportTo').value;if(!from||!to||from>to||Number(to.slice(0,4))-Number(from.slice(0,4))>11)throw Error('请选择有效的开始和结束日期。');reportPeriod={...reportPeriod,from,to,fiscalYear:undefined};render();});if(id==='reportPrint'){if(!reportModel().sections.length)toast('请至少选择一个报告章节。',true);else window.print();}if(id==='reportMacroKit')run(async()=>X.download(await AuditWord.macroKit(),'Word目录自动更新配置.zip'));if(id==='reportMacroTemplate'){const picker=document.createElement('input');picker.type='file';picker.accept='.docm,.dotm';picker.onchange=()=>run(async()=>{if(!picker.files[0])return;await AuditWord.setMacroTemplate(picker.files[0]);render();toast('宏模板已加载，本次会话将导出 .docm 报告。');});picker.click();}if(id==='reportWord')run(async()=>{const m=reportModel();if(!m.sections.length)throw Error('请至少选择一个报告章节。');const result=await AuditWord.exportReport(m);X.download(result.blob,'综合分析报告_'+m.from+'_'+m.to+'_'+(m.originalCurrency||'CNY')+'.'+result.extension);toast('Word 已导出。目录初始页码按平台分页生成；如 Word 重新分页，请在目录中选择“更新整个目录”。');});if(id==='reportExport')run(async()=>{const m=reportModel();if(!m.sections.length)throw Error('请至少选择一个报告章节。');X.download(new Blob([await X.workbook(AuditReport.workbook(m))]),'综合分析报告核验_'+m.from+'_'+m.to+'_'+(m.originalCurrency||'CNY')+'.xlsx');});if(id==='exportZip')run(exportZip);if(id==='exportSingle')run(async()=>{const name=page==='master'?master:preview;X.download(new Blob([await X.workbook({[name]:data[name]})]),name+'.xlsx');});if(id==='undo'||id==='undoTop'){if(lastData){const next=lastData;lastData=snapshot();restoreRegistryDateState(next);data=next.data;generationSource=next.source;config.companyFlow=next.companyFlow;config.sampleNonMerchants=next.sampleNonMerchants;config.sampleAccountPlans=next.sampleAccountPlans;config.registryRecords=next.registryRecords;config.registryBounds=next.registryBounds;config.reportCriteria=next.reportCriteria;persist();sourceLabel=next.label;recalc();render();toast('已恢复到上次修改前的数据。');}}if(id==='reset'){if(confirm('恢复内置可优比版数据？建议先保存当前项目。')){lastData=snapshot();const fresh=defaultReportProject();data=fresh.data;generationSource=fresh.source;for(const key of Object.keys(config))delete config[key];Object.assign(config,fresh.config);reportPeriod={};persist();sourceLabel=defaultSourceLabel;recalc();render();toast('已恢复内置数据。');}}if(id==='addCompany'||id==='addRow'&&master===K.company)$('#companyModal').showModal();else if(id==='addRow')editRow(null);if(id==='closeCompany')$('#companyModal').close();if(id==='closeModal')$('#rowModal').close();});
document.addEventListener('change',e=>{if(e.target.id==='templateImportMode'){templateMode=e.target.value;templateDraft=null;templateImported=false;render();return;}if(e.target.id==='templateFileInput'){const files=[...e.target.files];e.target.value='';run(()=>prepareTemplateFiles(files));return;}if(e.target.dataset.reportSection){const selected=reportModel().selectedSectionIds;config.reportSections=e.target.checked?[...new Set([...selected,e.target.dataset.reportSection])]:selected.filter(id=>id!==e.target.dataset.reportSection);const top=window.scrollY;persist();render();window.scrollTo(0,top);return;}if(e.target.form?.id==='registryFilter'&&e.target.name==='metric'){registryFilter={...Object.fromEntries(new FormData(e.target.form)),range:''};pageNo=1;render();return;}if(e.target.name==='currencyMode'){config.includeForeign=e.target.value==='all';persist();render();document.querySelector('input[name=currencyMode]:checked')?.focus({preventScroll:true});return;}if(e.target.dataset.config)updateSetting(e.target);if(e.target.dataset.config==='bigThreshold')recalc();if(e.target.dataset.companyMode!==undefined){const name=data[K.company].rows[Number(e.target.dataset.companyMode)][0];const modes={...(config.companyFlow||{})};if(e.target.value==='auto')delete modes[name];else Object.defineProperty(modes,name,{value:e.target.value==='true',enumerable:true,configurable:true});config.companyFlow=modes;persist();toast('已保存，下次生成流水时生效。');}if(e.target.id==='reportCurrency'){reportPeriod={...reportPeriod,originalCurrency:e.target.value};render();}if(e.target.id==='reportCut'){const cut=e.target.value;reportPeriod={...reportPeriod,cut,...(reportPeriod.fiscalYear?AuditReport.fiscalPeriod(reportPeriod.fiscalYear,cut):{})};render();}if(e.target.id==='reportPreset'&&e.target.value){const [from,to]=e.target.value.split('|');reportPeriod={...reportPeriod,from,to,fiscalYear:Number(e.target.selectedOptions[0].dataset.year)||undefined};render();}if(e.target.id==='previewSelect'){preview=e.target.value;pageNo=1;search='';render();}if(e.target.id==='fileInput'){const fs=[...e.target.files];run(()=>importFiles(fs));e.target.value='';}});
document.addEventListener('input',e=>{if(e.target.dataset.annual){const {annual,year}=e.target.dataset;config.annualCounts??={};const counts=config.annualCounts[year]??={};if(e.target.value==='')delete counts[annual];else counts[annual]=Number(e.target.value);persist();}if(e.target.dataset.config)updateSetting(e.target);if(e.target.id==='search'){search=e.target.value;pageNo=1;const start=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(start,start);}});
recalc();render();

document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if(!['reportSectionsAll','reportSectionsClear'].includes(id))return;config.reportSections=id==='reportSectionsAll'?undefined:[];const top=window.scrollY;persist();render();window.scrollTo(0,top);});

document.addEventListener('submit',e=>{if(e.target.id!=='randomCompanyForm')return;e.preventDefault();run(previewRandomCompanies);});
document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;
 if(id==='showRandomCompanies'){$('#randomCompanyTools').open=true;$('#randomCompanyTools').scrollIntoView({block:'nearest',behavior:'smooth'});}
 if(id==='randomCompanyReseed'){$('#randomCompanyForm [name=seed]').value='AC-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);run(previewRandomCompanies);}
 if(id==='randomCompanyWholeGroup')run(previewWholeCompanyGroup);
 if(id==='applyRandomCompanies')run(applyRandomCompanies);
 if(id==='recordProjectCheckpoint')run(()=>{projectCheckpoint=makeProjectCheckpoint('手动记录的基线');checkpointComparison=null;render();toast('已记录当前基线，项目数据没有修改。');});
 if(id==='compareProjectCheckpoint')run(compareProjectCheckpoint);
});

document.addEventListener('change',e=>{
 if(e.target.closest('#randomCompanyForm')){updateRandomGroupControls();randomCompanyProposal=null;$('#randomCompanyPreview').innerHTML='';}
 if(e.target.id==='randomCompanyAll'||e.target.classList.contains('random-company-select')){
  const boxes=[...document.querySelectorAll('.random-company-select')],all=$('#randomCompanyAll');
  if(e.target===all)boxes.forEach(b=>b.checked=all.checked);
  const count=boxes.filter(b=>b.checked).length;if(all){all.checked=count===boxes.length;all.indeterminate=count>0&&count<boxes.length;}
  const button=$('#applyRandomCompanies');if(button){button.disabled=count===0;button.textContent='确认追加这 '+count+' 家公司';}
 }
});
