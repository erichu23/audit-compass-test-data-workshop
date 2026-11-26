const fs=require('fs'),vm=require('vm'),assert=require('assert');
const shell=fs.readFileSync('src/shell.html','utf8'),ids=new Set([...shell.matchAll(/id="([^"]+)"/g)].map(m=>m[1])),nodes=new Map(),events=[];
function node(){return {innerHTML:'',textContent:'',value:'',hidden:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},removeAttribute(){},addEventListener(){},querySelectorAll(selector){if(selector==='form[data-report-criteria]')return [...this.innerHTML.matchAll(/<form[^>]*data-report-criteria[^>]*>[\s\S]*?<\/form>/g)].map(m=>({outerHTML:m[0],querySelectorAll:()=>[...m[0].matchAll(/<input[^>]*name="([^"]+)"/g)].map(x=>({name:x[1]}))}));return[];},querySelector(){return null;},closest(){return null;},append(){},prepend(){},contains(){return false;},click(){},focus(){},getBoundingClientRect(){return{left:0,right:0,top:0,bottom:0}},matches(){return false;},remove(){}};}
const document={body:node(),addEventListener:(...args)=>events.push(args),querySelectorAll:()=>[],createElement:()=>node(),querySelector:s=>{if(!/^#[\w-]+$/.test(s))return null;const id=s.slice(1),exists=ids.has(id)||(nodes.get('content')?.innerHTML||'').includes('id="'+id+'"');if(!exists)return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);}};
const ctx={document,console,structuredClone,matchMedia:()=>({matches:false,addEventListener(){}}),localStorage:{getItem:()=>null,setItem(){}},innerHeight:900,addEventListener(){},scrollTo(){},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>fn(),Blob,FormData:class{entries(){return [][Symbol.iterator]();}},AuditExcel:{},AuditPopover:{isOpen:()=>false,hide(){},show(){}},AuditTableTools:{query:r=>r,attach(){},mountStatic(){}},renderAuditPager(){}};ctx.window=ctx;vm.createContext(ctx);
for(const n of ['baseline','company-groups','daily-fx','engine','registry','registry-mapping','importer','report','report-v2','fx-preview','workspace-ui','app'])vm.runInContext(fs.readFileSync('src/'+n+'.js','utf8'),ctx,{filename:n+'.js'});
const before=vm.runInContext('JSON.stringify({data,config,reportPeriod,generationSource})',ctx);for(const route of ['overview','validation','templateImport','registryMap','dailyFx','settings','report','exportReport','reportV2','exportReportV2','preview','registryData']){ctx.navigate(route);assert((nodes.get('content')?.innerHTML||'').length>100,route);assert.equal(vm.runInContext('JSON.stringify({data,config,reportPeriod,generationSource})',ctx),before,route+' changes project');if(route==='report'||route==='settings'){const html=nodes.get('content').innerHTML;assert(html.indexOf('id="reportFrom"')>=0&&html.indexOf('id="reportFrom"')<html.indexOf('<article class="report-document"'));assert(html.indexOf('id="registryReportEnd"')<html.indexOf('<article class="report-document"'));assert.equal(nodes.get('pageTitle').textContent,'综合分析报告核验');}console.log('PASS route '+route);}
console.log('PASS: full app initializes and every new workspace route renders without altering raw data, config, report period or generation template');

ctx.navigate('validation');
assert(nodes.get('content').innerHTML.includes('data-nav="reportV2"'));
ctx.navigate('report');
const report1=vm.runInContext('reportModel()',ctx);
ctx.navigate('reportV2');
assert.equal(nodes.get('pageTitle').textContent,'综合分析报告核验2');
assert(nodes.get('content').innerHTML.includes('data-nav="exportReportV2"'));
const report2=vm.runInContext('reportModel()',ctx);
const coverAmounts=vm.runInContext(`(()=>{
 const model=reportModel(),E=AuditEngine;
 const companyNames=new Set(data[E.KEYS.company].rows.map(row=>row[0]).filter(Boolean));
 const totals=new Map([...companyNames].map(name=>[name,0]));
 for(const row of data[E.KEYS.flow].rows){
  const date=String(row[5]).slice(0,10);
  if(date<model.from||date>model.to||!totals.has(row[0]))continue;
  totals.set(row[0],totals.get(row[0])+E.rmbCents(row,8,model.rates)+E.rmbCents(row,10,model.rates));
 }
 return totals;
})()`,ctx);
const coverCompanyOrder=report2.sections.find(s=>s.id==='cover').companyNamesByAmount;
assert.equal(coverCompanyOrder.length,coverAmounts.size);
assert(coverCompanyOrder.every((name,i)=>coverAmounts.has(name)&&(i===0||coverAmounts.get(coverCompanyOrder[i-1])>=coverAmounts.get(name))));
const currentVocabulary=value=>JSON.parse(JSON.stringify(value,(key,entry)=>key==='headers'?undefined:entry).replaceAll('模拟黑名单','黑名单'));
const sharedIds=['related','background'];
assert.deepEqual(currentVocabulary(report2.sections.filter(s=>sharedIds.includes(s.id))),currentVocabulary(report1.sections.filter(s=>sharedIds.includes(s.id))));
const chartData=({name,kind,rows})=>({name,kind,rows});
for(const id of ['registry','people','follow']){
 const current=report2.sections.find(s=>s.id===id),previous=report1.sections.find(s=>s.id===(id==='registry'?'compliance':id));
 assert.deepEqual((id==='follow'?current.charts.slice(0,1):current.charts).map(chartData),
  (id==='follow'?previous.charts.slice(0,1):previous.charts).map(chartData));
}
assert.deepEqual(Array.from(ctx.AuditReportV2.selectSections(report2,['compliance']).selectedSectionIds),['compliance-checks','registry']);
vm.runInContext('config[reportSectionKey()]=["features"]',ctx);
assert.deepEqual(Array.from(vm.runInContext('reportModel().selectedSectionIds',ctx)),['features']);
ctx.navigate('exportReportV2');
assert(nodes.get('content').innerHTML.includes('data-nav="reportV2"'));
ctx.navigate('report');
assert.deepEqual(vm.runInContext('reportModel().selectedSectionIds',ctx),report1.selectedSectionIds);
console.log('PASS: both report templates start with identical analysis and have independent section selection and export navigation');

const v2WordHtml=ctx.AuditReportV2.render(report2,{forExport:true,allRows:true});
assert(v2WordHtml.includes('本报告系年审使用模版，本报告内资金流水交易统计信息均以一个财务年度作为一个分析期间核算。'));
assert(v2WordHtml.includes('<h2>目录</h2>'));
assert(!v2WordHtml.includes('Table of Contents')&&!v2WordHtml.includes('核验预览'));
const v2WordPages=v2WordHtml.split('<div class="report-sheet"').slice(1);
assert.equal(v2WordPages.filter(page=>page.includes('id="report-cover"')).length,1);
assert(!v2WordHtml.includes('data-word-top20'));
const scopePage=v2WordPages.find(page=>page.includes('id="report-scope"'));
const appendixPage=v2WordPages.at(-1);
assert(scopePage.includes('report-scope-red')&&scopePage.includes('详见附录'));
assert(!scopePage.includes('缺失内容')&&!scopePage.includes('id="report-scope-appendix"'));
assert(appendixPage.includes('id="report-scope-appendix"')&&appendixPage.includes('<th>说明</th>'));
assert(appendixPage.includes('<colgroup><col style="width:4%"><col style="width:20%"><col style="width:20%"><col style="width:36%"><col style="width:20%"></colgroup>'));
const appendixRows=[...appendixPage.matchAll(/<tr>(<td[^>]*>.*?<\/td>)<\/tr>/g)];
assert(appendixRows.length>0);
assert(appendixRows.every(([,row])=>row.endsWith('<td class=""></td>')));
const v2Preview=ctx.AuditReportV2.render(report2);
assert(!v2Preview.includes('查看统计逻辑'));
assert(v2Preview.includes('<span>审计项目资料</span><span>财务报表期间：'+report2.from+' ～ '+report2.to+'</span>'));
assert(v2Preview.includes('href="#report-scope-appendix"'));
console.log('PASS: second report restored pagination, matching cover and directory text, and moved missing records to the appendix');
assert(v2WordHtml.includes('1.1.1 已上传资金账户分析'));
assert(v2WordHtml.includes('详见本报告 1.1.1'));
assert(!v2WordHtml.includes('1.1.2'));
assert(v2WordHtml.includes('附录1 缺失资金记录的被审计单位及账号明细'));
assert(v2Preview.includes('href="#report-accounts"'));

assert(scopePage.includes('id="report-accounts"'));
const followTitle='2.3.4 已识别有待进一步分析的交易对手方的分析（收支重合和未识别客商关系）';
assert(v2WordHtml.includes('<a href="#report-follow">'+followTitle+'</a>'));
assert(v2WordHtml.includes('<h3>'+followTitle+'</h3>'));
const executivePage=v2WordPages[1];
assert(v2WordPages[0].includes('id="report-cover"')&&executivePage.includes('id="report-executive-summary"'));
assert(v2WordPages[2].includes('class="report-toc"')&&v2WordPages[3]===scopePage);
assert.equal((v2WordPages[0].match(/class="report-cover-impact"/g)||[]).length,4);
assert.equal((executivePage.match(/report-three report-executive-row"/g)||[]).length,3);
assert(!executivePage.includes('report-executive-group-title'));
assert.equal((executivePage.match(/class="report-executive-card"/g)||[]).length,9);
const summaryTargets=[...executivePage.matchAll(/class="report-executive-link" href="#([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(summaryTargets).size,9);
for(const label of ['失信被执行人','行政处罚','交易对手方为个人或疑似个人'])assert(executivePage.includes('report-executive-label">'+label+'</p>'));
assert(executivePage.includes('收支重合比例最高')&&executivePage.includes('交易总额最高（非空对手方）'));
const overviewWinners=report2.sections.find(s=>s.id==='follow').overviewHighlights;
assert(overviewWinners.every(winner=>executivePage.includes('report-executive-representative">'+winner.name+'</p>')));
const cardsWithMax=executivePage.split('<article class="report-executive-card">').slice(1);
assert(cardsWithMax.every(card=>card.includes('最高')||card.includes('本期无符合条件')));
for(const id of ['compliance-checks','registry','people']){
 const section=report2.sections.find(s=>s.id===id);
 const winners=section.overviewHighlights?Object.values(section.overviewHighlights):[section.overviewHighlight];
 assert(winners.filter(Boolean).every(({name,measure})=>executivePage.includes('report-executive-representative">'+name+'</p>')&&
  executivePage.includes(measure.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' 百万')));
}
assert(executivePage.includes('report-executive-label">收支重合</p>'));
assert(executivePage.includes('report-executive-label">未识别客商关系</p>'));
assert(!executivePage.includes('同进同出'));
assert(!executivePage.includes('命中对手方 ·'));
for(const direction of ['流入','流出'])assert(executivePage.includes(direction+' <strong class="report-executive-flag">'));
for(const direction of ['in','out'])assert.equal((executivePage.match(new RegExp('report-executive-flow report-executive-'+direction,'g'))||[]).length,9);
assert.equal((executivePage.match(/report-executive-origin">系统默认/g)||[]).length,9);
const tunedSummary=ctx.AuditReportV2.render({...report2,criteria:{...report2.criteria,unknownAmount:500}},{forExport:true});
assert.equal((tunedSummary.match(/report-executive-origin">项目组自定义/g)||[]).length,1);
assert(summaryTargets.every(id=>v2WordHtml.includes('id="'+id+'" data-summary-target')));
const summaryOnlySelection=ctx.AuditReportV2.render(ctx.AuditReportV2.selectSections(report2,['cover','toc']),{forExport:true});
assert(summaryOnlySelection.includes('重点分析概览')&&!summaryOnlySelection.includes('class="report-executive-link"'));
assert(scopePage.includes('class="report-scope-value">35 个'));
assert(!scopePage.includes('详见系统[银行流水分析-账户总览]'));
assert(!scopePage.split('id="report-accounts"')[1].includes('已上传账户个数'));
for(const label of ['前五大','第6–10大','第11–20大','非前20大'])assert(scopePage.includes(label));

assert.equal(report1.threshold,50000);
assert.equal(report2.threshold,1000000);
const findFeatures=model=>model.sections.find(s=>s.id==='features');
const features2=findFeatures(report2);
const blankCard=features2.cards.find(card=>card.section==='1.2.2');
assert.deepEqual(Array.from(blankCard.partyGroups,([label])=>label),['有摘要的交易对手方','无摘要的交易对手方']);
assert.equal(blankCard.partyGroups.reduce((sum,[,stats])=>sum+stats.count,0),blankCard.count);
const [legacyInternal,legacyExternal]=findFeatures(report1).charts;
const [namedExternal,internal]=features2.charts;
assert.deepEqual({...internal,name:legacyInternal.name},legacyInternal);
const blankPartyChart=features2.charts[2];
assert.deepEqual(Array.from(features2.charts,c=>c.name),[
 '合并范围外交易情况（不包括对手方为空）',
 '合并范围内交易情况',
 '交易对手方信息为空'
]);
for(const [i,row] of namedExternal.amountBands.entries()){
 const [label,amount,count]=row;
 const [,legacyAmount,legacyCount]=legacyExternal.amountBands[i];
 const [,blankAmount,blankCount]=blankPartyChart.amountBands[i];
 assert.equal(label,legacyExternal.amountBands[i][0]);
 assert.equal(count+blankCount,legacyCount);
 assert.equal(Math.round(amount*1e8)+Math.round(blankAmount*1e8),Math.round(legacyAmount*1e8));
}
assert.deepEqual(Array.from(blankPartyChart.amountBands,r=>r[0]),['<1百万','1～<5百万','5～<10百万','10～<20百万','≥20百万']);
const blankPartyDetail=features2.tables.find(t=>t.name.startsWith('1.2.2 '));
assert.equal(blankPartyChart.amountBands.reduce((count,r)=>count+r[2],0),blankPartyDetail.rows.length-1);
for(const [chartColumn,detailColumn] of [[2,10],[5,11]]){
 const total=blankPartyChart.rows.reduce((sum,r)=>sum+r[chartColumn],0);
 assert.equal(Math.round(total*1e8),Math.round(blankPartyDetail.rows[0][detailColumn]*100));
}
assert(findFeatures(report2).cards[0].count<findFeatures(report1).cards[0].count);
assert(v2WordHtml.includes('1.2 资金流水 – 资金流水单笔交易性质分析'));
assert(v2WordHtml.includes('人民币100万元以上【系统默认】'));
assert(v2WordHtml.includes('class="report-large-red"'));

const featuresPage=v2WordPages.find(page=>page.includes('id="report-features"'));
assert(!featuresPage.includes('<h4>单笔交易金额分布</h4>'));
assert(!featuresPage.includes('区间边界：1百万'));
assert.equal((featuresPage.match(/y="173" text-anchor="middle">[^<]+ 百万<\/text>/g)||[]).length,6);
const emptyTransactionsPage=v2WordPages.find(page=>page.includes('id="report-blank-memo"'));
assert.equal((featuresPage.match(/class="report-nature-index-item"><span class="report-nature-index-number">1\.2\.[123]<\/span> [^<]+<\/p>/g)||[]).length,3);
assert(featuresPage.includes('class="report-nature-analysis"'));
assert.equal((emptyTransactionsPage.match(/class="report-nature-detail-frame"/g)||[]).length,2);
assert(featuresPage.indexOf('report-three report-nature-index')<featuresPage.indexOf('<h4 class="report-subhead">1.2.1'));
assert(featuresPage.indexOf('report-large-scope">合并范围外')<featuresPage.indexOf('report-large-scope">合并范围内'));
assert(featuresPage.includes('report-num report-count-share'));
assert(!featuresPage.includes('有交易对手方：'));
assert(emptyTransactionsPage.includes('<span class="report-subhead-note">（一般银行交易，通过批量支付）</span>'));
assert(emptyTransactionsPage.indexOf('1.2.2 交易对手方信息为空的交易分析')<emptyTransactionsPage.indexOf('1.2.3 摘要信息为空的交易分析'));
assert.equal((featuresPage.match(/<figcaption/g)||[]).length,3);
assert.equal((featuresPage.match(/<table class="table"/g)||[]).length,3);
assert.equal((featuresPage.match(/report-stat-rule report-large-overview"/g)||[]).length,1);
assert(featuresPage.includes('report-nature-cards report-stat-rule'));
assert(featuresPage.includes('<figcaption>交易对手方信息为空</figcaption>'));
assert.equal((emptyTransactionsPage.match(/class="report-nature-inline"/g)||[]).length,2);
const emptyFrames=[...emptyTransactionsPage.matchAll(/<thead><tr><td class="report-nature-summary-cell" colspan="8">([\s\S]*?)<\/td><\/tr><tr>/g)];
assert.equal(emptyFrames.length,2);
assert(emptyFrames.every(([,html])=>html.includes('前<strong class="report-stat-value">20</strong>大')&&html.includes('涉及被审计单位')));
assert.equal((featuresPage.match(/详见本报告1\.2\.1/g)||[]).length,2);
assert.equal((featuresPage.match(/详见本报告1\.2\.2/g)||[]).length,1);
const memoCard=features2.cards[1];
const memoDetail=features2.tables.find(t=>t.name.startsWith('1.2.3 ')).rows.slice(1);
for(const [label,group] of memoCard.partyGroups){
 const detail=memoDetail.filter(r=>Boolean(String(r[5]??'').trim())===(label==='有交易对手方'));
 const cents=detail.reduce((sum,r)=>sum+Math.round(r[10]*100)+Math.round(r[11]*100),0);
 assert.equal(group.count,detail.length);
 assert.equal(Math.round(group.amount*1e8),cents);
 assert(emptyTransactionsPage.includes(label+'：'));
}
const memoNamedCount=new Set(memoDetail.map(r=>String(r[5]??'').trim()).filter(Boolean)).size;
assert.equal(memoCard.partyGroups[0][1].parties,memoNamedCount);
assert(emptyTransactionsPage.includes('有交易对手方：<strong class="report-nature-group-total">'+memoNamedCount+'家/'));
assert(emptyTransactionsPage.includes('无交易对手方：<strong class="report-nature-group-total">0.00百万/0笔'));

const largePages=v2WordPages.filter(page=>page.includes('id="report-large-internal"')||page.includes('id="report-large-external"'));
assert.equal(largePages.length,1);
for(const page of largePages){
 assert(!page.includes('<th>流水识别号</th>'));
 assert(page.includes('<th>等值人民币流入金额（百万）</th>'));
 assert(page.includes('<th>等值人民币流出金额（百万）</th>'));
}
const outsidePage=largePages[0];
assert(outsidePage.includes('report-detail-summary">大额单笔交易人民币'));
assert(outsidePage.includes('其中：交易金额前<strong class="report-stat-value">20</strong>大，交易金额合计'));
assert(!outsidePage.includes('交易金额前20大明细')&&!outsidePage.includes('大共'));
const defaultFinanceNames=features2.externalTop20.table.rows.filter(row=>typeof row[0]==='number').map(row=>row[4]).filter(name=>/银行|理财|基金/.test(name));
assert.equal(new Set(defaultFinanceNames).size,8);
for(const keyword of ['银行','理财','基金'])assert(defaultFinanceNames.some(name=>name.includes(keyword)));
assert.equal((outsidePage.match(/class="report-category-band"/g)||[]).length,2);
assert(outsidePage.indexOf('银行／理财／基金（')<outsidePage.indexOf('其他对手方（'));
assert(/<tr class="report-total"><td colspan="9">非前20大合计（[^<]+<\/td>/.test(outsidePage));
assert.equal((outsidePage.match(/<th>序号<\/th>/g)||[]).length,1);
assert.equal((outsidePage.match(/<table\b/g)||[]).length,2);
assert.equal(v2WordPages.filter(page=>page.includes('id="report-blank-memo"')).length,1);
const sample=vm.runInContext(`(()=>{
 const E=AuditEngine, books=structuredClone(data), flow=books[E.KEYS.flow];
 const source=flow.rows.find(r=>r[7]==='CNY');
 const names=['样本银行','样本理财','样本基金','样本银行理财','一般供应商','  '];
 flow.rows=names.flatMap((name,i)=>Array.from({length:i===4?22:1},(_,j)=>{
  const row=source.slice();
  const paid=(i===3?20.5:i+1+j)*1e6;
  Object.assign(row,{3:name,4:'123456',7:'CNY',8:0,9:0,10:paid,11:paid,15:'样本-'+i+'-'+j});
  return row;
 }));
 return AuditReportV2.compute(books,{threshold:1e6});
})()`,ctx);
const sampleFeatures=findFeatures(sample);
const sampleCompliance=sample.sections.find(section=>section.id==='compliance-checks');
assert.deepEqual(Array.from(sampleCompliance.tables[0].rows.find(row=>row[0]==='行政处罚').slice(1,3)),[0,0]);
const {rows:classified}=sampleFeatures.externalTop20.table;
const ranked=classified.filter(r=>typeof r[0]==='number');
const [financeBand,finance,otherBand,...other]=classified.slice(0,-2);
assert.equal(financeBand[0],'银行／理财／基金（1笔）');
assert.equal(financeBand[10],20.5);
assert.equal(finance[4],'样本银行理财');
assert.equal(finance[10],20.5);
assert.equal(otherBand[0],'其他对手方（19笔）');
assert.equal(otherBand[10],323);
assert.equal(other.length,19);
assert.equal(other.reduce((sum,row)=>sum+row[10],0),323);
assert.equal(other[0][10],26);
assert.equal(other.at(-1)[10],8);
assert.equal(classified.at(-2)[10],343.5);
assert.deepEqual(Array.from(ranked,r=>r[0]),Array.from({length:20},(_,i)=>i+1));
assert(sampleFeatures.largeExternalSummary.includes('5家 /367.50百万/26笔'));
assert(sampleFeatures.externalTop20.note.includes('343.50百万'));
assert.equal(classified.at(-1)[0],'非前20大合计（6笔，交易金额合计 24.00百万）');
assert.equal(classified.at(-1)[9],0);
assert.equal(classified.at(-1)[10],24);

const natureSamples=vm.runInContext(`(()=>{
 const E=AuditEngine, books=structuredClone(data), flow=books[E.KEYS.flow];
 const source=flow.rows.find(r=>r[7]==='CNY');
 const makeFlow=(i,name,paid,type,memo)=>{
  const row=source.slice();
  const incoming=i%2?paid*1e6:0,outgoing=i%2?0:paid*1e6;
  return Object.assign(row,{3:name,4:'123456',7:'CNY',8:incoming,9:incoming,10:outgoing,11:outgoing,14:type,15:'汇总样本-'+name+i,16:memo});
 };
 flow.rows=[
  ...Array.from({length:24},(_,j)=>{
   const i=j+1;
   return makeFlow(i,'  ',i,i===5||i===6?'  ':['代发工资','转账','转账','理财申购'][i%4],['理财','','归还贷款',''][i%4]);
  }),
  ...Array.from({length:13},(_,i)=>makeFlow(i,i%2?'样本乙':'样本甲',101+i,'转账',''))
 ];
 return AuditReportV2.compute(books);
})()`,ctx);
const [blankTypeSummary,memoNameSummary]=findFeatures(natureSamples).tables.slice(-2).map(t=>t.top20Summary.rows);
const blankTypes=Array.from(blankTypeSummary,r=>Array.from(r));
assert.deepEqual(blankTypes,[
 ['理财',75,5,75/144,0,0,0,75],['贷款',0,0,0,70,5,70/156,70],['工资',0,0,0,80,5,80/156,80],
 ['交易类型为空白',5,1,5/144,0,0,0,5],['其他',60,4,60/144,0,0,0,60],['前20大小计',140,10,140/144,150,10,150/156,290],
 ['非前20大合计',4,2,4/144,6,2,6/156,10],['合计',144,12,1,156,12,1,300]
]);
assert.deepEqual(Array.from(memoNameSummary,r=>r[0]),['样本甲','样本乙','对手方为空','前20大小计','非前20大合计','合计']);
assert.deepEqual(Array.from(memoNameSummary[2]),['对手方为空',119,7,119/memoNameSummary.at(-1)[1],0,0,0,119]);
assert.deepEqual(Array.from(memoNameSummary.at(-2)),['非前20大合计',25,5,25/memoNameSummary.at(-1)[1],0,0,0,25]);
const naturePages=v2WordPages.filter(page=>/<h4 class="report-subhead">1\.2\.[23] /.test(page));
assert.equal(naturePages.length,1);
for(const page of naturePages){
 assert(page.includes('<th rowspan="2">交易类型</th>')&&page.includes('<th rowspan="2">对手方名称</th>'));
 assert(page.includes('<th colspan="3">流入</th><th colspan="3">流出</th>'));
 assert(page.includes('非前20大合计'));
 assert.equal((page.match(/<th>占比（%）<\/th>/g)||[]).length,4);
 assert(!page.includes('流水识别号')&&!page.includes('<th>本方账号</th>'));
}
const [blankFullTotal,memoFullTotal]=features2.tables.slice(-2).map(t=>t.top20Summary.rows.at(-1));
assert.equal(blankFullTotal[3],0);
assert.equal(blankFullTotal[6],1);
assert.equal(memoFullTotal[3],1);
assert.equal(memoFullTotal[6],1);

const concentrationPage=v2WordPages.findIndex(page=>page.includes('id="report-concentration"'));
assert(v2WordPages[2].includes('同时剔除交易对手方为空的数据'));
assert(v2WordPages[concentrationPage].includes('同时剔除交易对手方为空的数据'));
assert(v2WordPages[concentrationPage].includes('关联方资金流水集中度（关联方交易详情见2.2）'));
assert(v2WordPages[concentrationPage+1].includes('第三方资金流水集中度'));
assert(!v2WordPages[concentrationPage].includes('data-concentration-edges'));
const thirdConcentration=v2WordPages[concentrationPage+1];
assert(!thirdConcentration.split('</thead>')[0].includes('data-concentration-edges'));
const directionBodies=[...thirdConcentration.matchAll(/<tbody>(.*?)<\/tbody>/g)];
for(const [i,body] of directionBodies.entries()){
 const rows=[...body[1].matchAll(/<tr[^>]*>(.*?)<\/tr>/g)];
 for(const [j,row] of rows.entries()){
  const metricCells=[...row[1].matchAll(/<td class="report-num[^"]*"(?: data-concentration-edges="([^"]+)")?>/g)];
  assert.equal(metricCells.length,12);
  for(const [k,cell] of metricCells.entries()){
   const marked=Math.floor(k/3)>1||Math.floor(k/3)===(i===0?1:0);
   const expected=marked?[j===0?'top':'',j===rows.length-1?'bottom':'',k%3===0?'left':'',k%3===2?'right':''].filter(Boolean).join(' '):'';
   assert.equal(cell[1]||'',expected);
  }
 }
}
for(const page of v2WordPages.slice(concentrationPage,concentrationPage+2)){
 for(const label of ['前五大','第6–10大','第11–20大','非前20大'])assert.equal(page.split('>'+label+'</th>').length-1,2);
}
for(const report of [v2Preview,v2WordHtml]){
 assert(!report.includes('分类说明：先按对手方名称'));
 assert(!report.includes('月度数据及集中度排名明细'));
}

const directionPage=v2WordPages.findIndex(page=>page.includes('id="report-counterparties"'));
const directionModel=report2.sections.find(section=>section.id==='counterparties');
for(const t of directionModel.tables.slice(1)){
 const [sum,...rest]=t.rows;
 const details=rest.filter(r=>typeof r[0]==='number');
 assert(details.length>0&&details.every(r=>r[1]!=='【对手方为空】'&&r[3]==='第三方'));
 const sub=rest.find(r=>r[1]==='前20小计'),other=rest.find(r=>r[1]==='其他');
 for(const [value,share] of [[5,7],[8,10],[11,13]]){
  assert(Math.abs(sum[value]-sub[value]-other[value])<1e-8);
  assert.equal(sum[share],sum[value]>0?1:0);
  assert(details.every(row=>Math.abs(row[share]-(sum[value]?row[value]/sum[value]:0))<1e-12));
 }
}
const splitModel=vm.runInContext(`(()=>{
 const K=AuditEngine.KEYS;
 const books=Object.fromEntries(Object.entries(BASELINE).map(([name,t])=>[name,{headers:t.headers,rows:[]}]));
 const flagged=AuditEngine.blacklist[0];
 books[K.company].rows=[['本方']];
 books[K.related].rows=[['本方',flagged,'股东']];
 books[K.customer].rows=[['本方',null,'工商筛选样本公司']];
 books[K.flow].rows=[
  [flagged,90,60],['合规筛选样本公司',10,20],['工商筛选样本公司',30,5],['仅案号实缴样本公司',2,1],['',70,80]
 ].map(([name,credit,debit],i)=>{
  const r=Array(books[K.flow].headers.length).fill(null);
  Object.assign(r,{0:'本方',1:'001',3:name,5:'2025-12-31',6:'12:00:00',7:'CNY',8:credit*1e6,10:debit*1e6,15:'拆分-'+i});
  return r;
 });
 const settings={start:'2020-01-01',insured:200,capital:2e6,paidIn:800000,currency:'CNY',cases:0,dishonest:'否',penalties:0,industry:'样本行业'};
 const registry=[
  {...settings,name:'合规筛选样本公司',dishonest:'是',penalties:1},
  {...settings,name:'工商筛选样本公司',insured:5,start:'2025-06-01',capital:200000,paidIn:0},
  {...settings,name:'仅案号实缴样本公司',cases:2}
 ];
 return AuditReportV2.compute(books,{from:'2025-01-01',to:'2025-12-31',registry});
})()`,ctx);
const splitSection=id=>splitModel.sections.find(s=>s.id===id);
const matchedNames=table=>Array.from(table.rows.filter(r=>typeof r[0]==='number'),r=>r[1]);
assert.deepEqual(matchedNames(splitSection('compliance-checks').tables.at(-1)),['天津盛相电子有限公司','合规筛选样本公司']);
assert.deepEqual(matchedNames(splitSection('registry').tables.at(-1)),['工商筛选样本公司']);
const complianceRanking=splitSection('compliance-checks').tables.at(-1);
const complianceParty=complianceRanking.rows.find(row=>row[1]==='合规筛选样本公司');
assert.deepEqual(['所属行业','注册资本','社保人数'].map(name=>complianceParty[complianceRanking.headers.indexOf(name)]),['样本行业',2e6,200]);
const registryRanking=splitSection('registry').tables.at(-1);
assert.equal(registryRanking.rows[2][registryRanking.headers.indexOf('黑名单')],'否');
const [thirdIn,thirdOut]=splitSection('counterparties').tables.slice(1);
assert.deepEqual(matchedNames(thirdIn),['工商筛选样本公司','合规筛选样本公司','仅案号实缴样本公司']);
assert.deepEqual(matchedNames(thirdOut),['合规筛选样本公司','工商筛选样本公司','仅案号实缴样本公司']);
assert.deepEqual(Array.from(thirdIn.rows[0].slice(5)),[42,3,1,26,3,1,68,3,1]);
assert.equal(thirdIn.rows[1][7],30/42);
assert.equal(thirdOut.rows[1][10],20/26);
for(const [i,direction] of ['流入','流出'].entries()){
 const overview=v2WordPages[directionPage+i*2],ranking=v2WordPages[directionPage+i*2+1];
 const plotPosition=overview.indexOf('<figcaption>'+direction+'金额分布</figcaption>');
 assert(plotPosition>=0&&plotPosition<overview.indexOf('<h4>'+direction+'分类汇总</h4>'));
 assert(overview.includes('class="report-panes report-counterparty-summary"')&&!overview.includes('分类口径：'));
 assert.equal((overview.match(/class="report-pane"/g)||[]).length,2);
 assert.equal((overview.match(/<li><i style="background:/g)||[]).length,4);
 assert.equal((overview.match(/<i style="background:/g)||[]).length,4);
 assert(overview.includes('<th>性质</th><th>对手方类型</th>'));
 assert(overview.indexOf('<td rowspan="4" class="">关联方</td>')<overview.indexOf('<td rowspan="4" class="">第三方</td>'));
 assert.equal((overview.match(/<td rowspan="4"/g)||[]).length,2);
 assert(ranking.includes('<h4>'+direction+'第三方前20大对手方</h4>'));
 assert(ranking.includes('report-counterparty-rank-table'));
 for(const header of ['交易总金额（百万）','交易总金额笔数（笔）','交易总金额第三方占比（%）'])assert(ranking.includes('<th>'+header+'</th>'));
}

for(const html of [v2WordHtml,v2Preview]){
 const related=html.split('id="report-related"')[1].split('</section>')[0];
 assert(related.includes('<h4>关联关系类型流入流出分布</h4>'));
 assert(!related.includes('<figure'));
 assert(!related.includes('关联组合数量及补齐明细'));
 assert(!related.includes('本节仅统计本方单位与对手方组合命中的流水'));
 const compliance=html.split('id="report-registry"')[1].split('</section>')[0];
 assert(!compliance.includes('诉讼对手方及案件数'));
 for(const title of ['经营时间分析','社保人数分析','注册资本分析']){
  assert(compliance.includes('data-summary-target class="report-focus-card-title">'+title+'</figcaption>'));
  assert(!compliance.includes('<h4>'+title+'</h4>'));
 }
 assert(!compliance.includes('区间口径：&lt;1年'));
 assert(!compliance.includes('1年按365天计算；经营天数'));
 assert.equal((compliance.split('<details class="report-extra"')[0].match(/<h4>系统设定筛选条件<\/h4>/g)||[]).length,3);
}

assert(!report2.sections.some(s=>s.id==='focus'));
assert(!v2WordHtml.includes('前20大见2.4'));
assert(!v2WordHtml.includes('2.4 重点关注对手方清单表'));
assert.deepEqual(Array.from(ctx.AuditReportV2.selectSections(report2,['focus']).selectedSectionIds),['compliance-checks','registry','people','follow']);
assert(v2WordHtml.includes('已上传关联方主档中关联方个数'));
const masterPairs=report2.sections.find(s=>s.id==='related').relationStats.masterPairs;
assert(v2WordHtml.includes('class="report-scope-value">'+masterPairs.toLocaleString('en-US')+'组'));
assert(v2WordHtml.includes('详见本报告2.2.2'));
assert(v2WordHtml.includes('流入总额/交易笔数/占总流入比例：'));
assert(v2WordHtml.includes('流出总额/交易笔数/占总流出比例：'));
const filterRow=id=>v2WordHtml.split('id="report-'+id+'-detail"')[1].match(/<tr class="report-filter-header">(.*?)<\/tr>/)[1];
assert(filterRow('compliance-checks').includes('黑名单＝是'));
assert(!filterRow('compliance-checks').includes('经营天数'));
assert(filterRow('registry').includes('经营天数'));
assert(!filterRow('registry').includes('黑名单＝是'));
const reportTables=ctx.AuditReportV2.workbook(report2);
for(const [id,include,exclude] of [
 ['compliance-checks',['黑名单','失信被执行人','行政处罚数量','经营天数','所属行业','社保人数','注册资本'],['实缴资本','诉讼案件数量']],
 ['registry',['黑名单','经营天数','社保人数','注册资本'],['失信被执行人','行政处罚数量','实缴资本','诉讼案件数量']],
 ['people',['个人类型'],['黑名单','经营天数','收支重合','未识别客商关系']],
 ['follow',['收支重合','未识别客商关系','黑名单'],['个人类型','经营天数']]
]){
 const section=report2.sections.find(s=>s.id===id),t=section.tables.at(-1);
 const [full,subtotal]=t.rows,remaining=t.rows.at(-1);
 const details=t.rows.filter(row=>typeof row[0]==='number').sort((a,b)=>a[0]-b[0]);
 assert(details.length<=20);
 assert.equal(new Set(details.map(r=>r[1])).size,details.length);
 assert.deepEqual(Array.from(details,r=>r[0]),Array.from({length:details.length},(_,i)=>i+1));
 assert.equal(full[1],'本类别总合计');
 assert.equal(subtotal[1],'前20大合计');
 assert.equal(remaining[1],'非前20大合计');
 const amount=t.headers.length-4;
 for(let col=amount-6;col<=amount+2;col++){
  assert(Math.abs(details.reduce((sum,r)=>sum+r[col],0)-subtotal[col])<1e-9);
  assert(Math.abs(full[col]-subtotal[col]-remaining[col])<1e-9);
 }
 assert.equal(full[amount+2],full[amount]>0?1:0);
 assert(details.every((row,i)=>i===0||row[amount]<=details[i-1][amount]));
 for(const h of include)assert(t.headers.includes(h));
 for(const h of exclude)assert(!t.headers.includes(h));
 assert(v2WordHtml.includes('<h4 class="report-section-rank-title">'+section.title.replace(/^2\.3\.\d+\s+/,'').replace('（收支重合和未识别客商关系）','')+'（符合上述筛选条件的前20大交易对手方）</h4>'));
 assert(reportTables[t.name]);
}

for(const html of [v2WordHtml,v2Preview]){
 assert(!html.includes('>交易合计</th>'));
 assert(!html.includes('资金流水核查和工商信息汇总明细附件.excel'));
 assert(html.includes('资金流水核查和工商信息汇总明细附件.xlsx'));
 const compliance=html.split('id="report-registry"')[1].split('</section>')[0];
 for(const dimension of ['经营时间','社保人数','注册资本']){
  assert(compliance.includes('<th rowspan="2">'+dimension+'</th>'));
 }
 for(const condition of ['经营天数 ≤ <strong>[365]</strong> 天','社保人数 ≤ <strong>[50]</strong> 人','注册资本 <strong>[0]</strong>–<strong>[100]</strong> 万元']){
  assert(compliance.includes(condition+' <span>（系统默认）</span>'));
 }
 const follow=html.split('id="report-follow"')[1].split('</section>')[0];
 assert(!follow.includes('区间边界：'));
 assert(follow.includes('data-summary-target class="report-focus-card-title">收支重合</figcaption>'));
 assert(follow.includes('data-summary-target class="report-focus-card-title">未识别客商关系</figcaption>'));
 assert(!follow.includes('收支重合比例区间')&&!follow.includes('未识别客商的交易金额区间'));
 assert(follow.includes('与对手方交易总额<strong>[0]</strong>元及以上，且流入总额与流出总额重合比例<strong>[20%]</strong>及以上 <span>（系统默认）</span>'));
 assert(follow.includes('与对手方交易总额<strong>[0]</strong>元及以上 <span>（系统默认）</span>'));
 assert.equal((follow.match(/<td class="">识别对手方数<\/td>/g)||[]).length,2);
 assert(follow.includes('class="report-follow-highlight">其中，收支重合比例最高'));
 assert(follow.includes('class="report-follow-highlight">其中（非空对手方），'));
 const totals=[...html.matchAll(/y="173" text-anchor="middle">([^<]+)<\/text>/g)];
 assert(totals.length>=12&&totals.every(([,value])=>value.endsWith(' 百万')));
}
const customModel=ctx.AuditReportV2.selectSections({...report2,criteria:{...report2.criteria,daysMin:60,daysMax:500}},['registry']);
assert(ctx.AuditReportV2.render(customModel,{forExport:true}).includes('<strong>[60]</strong> 天 ≤ 经营天数 ≤ <strong>[500]</strong> 天 <span>（用户自定义）</span>'));
const blankFollowCriteria=ctx.AuditReportV2.parseCriteria({overlapAmount:'',unknownAmount:''},{overlapAmount:100,unknownAmount:200});
assert.equal(blankFollowCriteria.overlapAmount,0);
assert.equal(blankFollowCriteria.unknownAmount,0);
assert.equal(blankFollowCriteria.overlapPercent,20);

const customFollow=ctx.AuditReportV2.selectSections({...report2,originalCurrency:'USD',criteria:{
 ...report2.criteria,overlapAmount:250000,overlapPercent:30,unknownAmount:175000
}},['follow']);
const customFollowHtml=ctx.AuditReportV2.render(customFollow,{forExport:true});
assert(customFollowHtml.includes('<strong>[250,000]</strong> USD及以上，且流入总额与流出总额重合比例<strong>[30%]</strong>及以上 <span>（用户自定义）</span>'));
assert(customFollowHtml.includes('<strong>[175,000]</strong> USD及以上 <span>（用户自定义）</span>'));

const persons=report2.sections.find(s=>s.id==='people');
const personalRows=persons.tables[0].rows;
for(const col of [1,2,3,5,6,8,9])assert(Math.abs(personalRows[0][col]-personalRows.slice(1).reduce((sum,row)=>sum+row[col],0))<1e-9);
const personalTotal=personalRows[0];
for(const [count,share] of [[2,4],[5,7]]){
 const denominator=personalTotal[count];
 assert.equal(personalTotal[share],denominator===0?0:1);
 for(const row of personalRows)assert(Math.abs(row[share]-(denominator===0?0:row[count]/denominator))<1e-12);
}
const peoplePage=v2WordPages.find(page=>page.includes('id="report-people"'));
assert(peoplePage.includes('<span class="report-person-scope">（对手方名称小于等于四个字）</span>'));
const shortNameModel=vm.runInContext(`(()=>{
 const K=AuditEngine.KEYS;
 const books=Object.fromEntries(Object.entries(BASELINE).map(([name,t])=>[name,{headers:t.headers,rows:[]}]));
 books[K.company].rows=[['本方']];
 const sample=[
  ['示例银行',120],['示例基金',110],['示例大学',100],['示例金库',90],['张甲',130],
  ...Array.from({length:16},(_,i)=>['李'+String.fromCharCode(65+i),50-i]),
  ['微型基金',1],['超过四字银行',200]
 ];
 books[K.flow].rows=sample.map(([name,amount],i)=>{
  const row=Array(books[K.flow].headers.length).fill(null);
  Object.assign(row,{0:'本方',1:'001',3:name,5:'2025-01-01',6:'12:00:00',7:'CNY',8:amount*1e6,15:'个人分组-'+i});
  return row;
 });
 return AuditReportV2.compute(books);
})()`,ctx);
const shortRanking=shortNameModel.sections.find(s=>s.id==='people').tables.at(-1);
const shortRows=shortRanking.rows;
const shortInstitution='银行／基金／大学／金库（4个）';
const shortOther='其他对手方（16个）';
assert.equal(shortRows[2][0],shortInstitution);
assert.deepEqual(Array.from(shortRows.slice(3,7),row=>row[0]),[2,3,4,5]);
assert.equal(shortRows[7][0],shortOther);
assert.equal(shortRows[8][0],1);
assert.equal(shortRows[2][shortRanking.headers.indexOf('流入金额（百万）')],420);
assert(!shortRows.some(row=>row.includes('超过四字银行')||row.includes('微型基金')));
const shortHtml=ctx.AuditReportV2.render(ctx.AuditReportV2.selectSections(shortNameModel,['people']),{forExport:true});
assert.equal((shortHtml.match(/<tr class="report-person-muted">/g)||[]).length,4);
for(const label of [shortInstitution,shortOther])assert(shortHtml.includes('<tr class="report-category-band"><td colspan="5">'+label+'</td>'));
assert(ctx.AuditReportV2.workbook(shortNameModel)[shortRanking.name].rows.some(row=>row[0]===shortInstitution));
assert.equal((peoplePage.match(/<table class="table"/g)||[]).length,1);
for(const name of ['类型','人数（人）'])assert(peoplePage.includes('<th rowspan="2">'+name+'</th>'));
for(const direction of ['流入','流出'])assert(peoplePage.includes('<th colspan="3">'+direction+'</th>'));
assert(peoplePage.includes('<th colspan="2">交易金额合计</th>'));
assert(v2WordHtml.includes('>交易对手方为个人或疑似个人的分析（符合上述筛选条件的前20大交易对手方）</h4>'));

for(const id of ['compliance-checks','registry','people','follow']){
 const overviewIndex=v2WordPages.findIndex(page=>page.includes('id="report-'+id+'"'));
 assert(overviewIndex>=0);
 const detailIndex=id==='compliance-checks'?overviewIndex:overviewIndex+1;
 if(detailIndex!==overviewIndex)assert(!v2WordPages[overviewIndex].includes('report-section-rank-table'));
 assert(v2WordPages[detailIndex].includes('id="report-'+id+'-detail"'));
 assert(v2WordPages[detailIndex].includes('report-section-rank-table'));
}

for(const html of [v2WordHtml,v2Preview]){
 assert(!html.includes('模拟黑名单'));
 const compliance=html.split('id="report-compliance-checks"')[1].split('</section>')[0];
 for(const label of ['黑名单个数','失信被执行人个数','有行政处罚对手方个数']){
  assert(compliance.includes('>'+label+'</p>'));
 }
 assert.equal((compliance.match(/class="report-compliance-flows">流入 /g)||[]).length,3);
 assert.equal((compliance.match(/　流出 <strong>/g)||[]).length,3);
}

for(const html of [v2WordHtml,v2Preview]){
 const follow=html.split('id="report-follow"')[1].split('</section>')[0];
 assert(follow.includes('对同一交易对方的往来同时存在收款、付款(已剔除集团合并单位内的交易)'));
 assert(follow.includes('与不在客户和供应商清单中的对手方的往来(已剔除集团合并单位内的交易)'));
 assert(!follow.includes('收付款往来，包含单向交易'));
}

assert(!featuresPage.includes('资金流水中摘要信息为空的交易'));
assert(!featuresPage.includes('资金流水中交易对手方信息为空的交易'));
const blankChart=featuresPage.slice(featuresPage.indexOf('<figcaption>交易对手方信息为空</figcaption>'));
assert(blankChart.indexOf('</table>')<blankChart.indexOf('详见本报告1.2.2'));
assert(!v2WordHtml.includes('id="report-large-internal"'));
assert(v2WordPages.indexOf(outsidePage)===v2WordPages.indexOf(featuresPage)+1);

const internalSummaryPage=outsidePage.slice(outsidePage.indexOf('<div id="report-large-entity">'));
assert(internalSummaryPage.includes('id="report-large-entity"'));
assert(internalSummaryPage.includes('合并范围内交易按被审计单位汇总'));
assert(!/大额|阈值/.test(internalSummaryPage));
assert(outsidePage.indexOf('非前20大合计（')<outsidePage.indexOf('id="report-large-entity"'));
assert(reportTables[features2.internalEntitySummary.name]);
assert(internalSummaryPage.includes('<th>交易笔数（笔）</th>'));
assert(internalSummaryPage.includes('report-count-share">'+features2.internalEntitySummary.rows[0][7].toLocaleString('en-US')+'</td>'));
const specificRollup=vm.runInContext(`(()=>{
 const K=AuditEngine.KEYS;
 const books=Object.fromEntries(Object.entries(BASELINE).map(([name,t])=>[name,{headers:t.headers,rows:[]}]));
 books[K.company].rows=[['被审计甲'],['被审计乙']];
 const records=[
  ['被审计甲','被审计乙',1,0],['被审计甲','被审计乙',0,4],['被审计乙','被审计甲',0,2],
  ['被审计乙','被审计甲',0,.5],['被审计甲','达到边界样本有限公司',0,50],['被审计甲','超出边界样本有限公司',0,60]
 ];
 books[K.flow].rows=records.map(([our,party,inflow,outflow],i)=>{
  const row=Array(books[K.flow].headers.length).fill(null);
  Object.assign(row,{0:our,1:'001',3:party,5:'2025-01-01',6:'12:00:00',7:'CNY',8:inflow*1e6,10:outflow*1e6,15:'汇总-'+i});
  return row;
 });
 const registry=[{name:'达到边界样本有限公司',capital:1e6,currency:'CNY'},{name:'超出边界样本有限公司',capital:1e6+1,currency:'CNY'}];
 return AuditReportV2.compute(books,{registry});
})()`,ctx);
assert.equal(specificRollup.criteria.capitalMaxWan,100);
assert.equal(ctx.AuditReportV2.parseCriteria({},{capitalMaxWan:50}).capitalMaxWan,50);
const capitalScreen=specificRollup.sections.find(s=>s.id==='registry').tables.find(t=>t.name.startsWith('注册资本')&&t.name.endsWith('筛选结果'));
assert.deepEqual(Array.from(capitalScreen.rows[0].slice(1)),[1,0,0,50,1,50,1]);
assert.deepEqual(Array.from(findFeatures(specificRollup).internalEntitySummary.rows,row=>Array.from(row)),[
 ['', '合计', 1, 1, 6.5, 3, 7.5, 4],
 [1, '被审计甲', 1, 1, 4, 1, 5, 2],
 [2, '被审计乙', 0, 0, 2.5, 2, 2.5, 2]
]);

assert.deepEqual(Array.from(findFeatures(specificRollup).cards[0].breakdown[0]),['合并范围内',2,7,3]);
