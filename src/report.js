(function(g){
'use strict';
const E=g.AuditEngine,K=E.KEYS;
const day=v=>String(v??'').slice(0,10);
const clean=v=>String(v??'').trim();
const key=(a,b)=>JSON.stringify([String(a??'').trim(),String(b??'').trim()]);
const amount=v=>v/100000000;
const ratio=(a,b)=>b?a/b:0;
const categories=['客户','供应商','客商一体','非客商'];
const black=new Set(E.blacklist);
const missingValue='未提供';
const theme=Object.freeze({
 ink:'172438',navy:'153763',accent:'1673FF',fill:'E8F0FA',heading:'203B5D',link:'263A55',muted:'617793',border:'BAC9DA',total:'EEF5FC',
 statuses:{'已上传':{fill:'E5F4E9',text:'236341'},'部分缺失':{fill:'FFF0D7',text:'834C00'},'未上传':{fill:'FBE7E7',text:'972F37'}}
});
const value=(r,i,fx)=>E.rmbCents(r,i,fx);
const aggregate=()=>({in:0,out:0,ins:0,outs:0,n:0});
const turnover=a=>a.in+a.out;
function add(a,r,fx){
 const incoming=value(r,8,fx),outgoing=value(r,10,fx);
 a.in+=incoming;a.out+=outgoing;a.ins+=Number(incoming>0);a.outs+=Number(outgoing>0);a.n++;
 return a;
}
function group(map,k,props,r,fx){
 if(!map.has(k))map.set(k,{...aggregate(),...props});
 return add(map.get(k),r,fx);
}
const sortBy=(items,metric)=>[...items].sort((a,b)=>metric(b)-metric(a)||a.name.localeCompare(b.name,'zh-CN'));
const financial=a=>[amount(a.in),a.ins,amount(a.out),a.outs,amount(turnover(a)),a.n];
const moneyHeaders=['流入金额（百万元）','流入笔数','流出金额（百万元）','流出笔数','交易金额（百万元）','交易笔数'];
const rangeLabel=(a,b)=>a&&b?a+' ～ '+b:'无流水';
function fiscalPeriod(year,cut){
 const end=year+'-'+cut;
 const start=new Date(Date.parse((year-1)+'-'+cut+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 return {from:start,to:end};
}
const overlaps=(start,end,from,to)=>(!start||day(start)<=to)&&(!end||day(end)>=from);
function scopeData(data,rows,own,from,to,cut){
 const years=[];
 for(let y=Number(from.slice(0,4));y<=Number(to.slice(0,4))+1;y++){
  const period=fiscalPeriod(y,cut);
  if(overlaps(period.from,period.to,from,to))years.push(y);
 }
 const fiscalYears=new Set(years);
 const periods=r=>Array.from({length:10},(_,i)=>[r[5+i*4],r[6+i*4]]).filter(([a,b])=>a||b);
 const filterDates=(k,a,b)=>data[K[k]].rows.filter(r=>overlaps(r[a],r[b],from,to));
 const sources={
  company:data[K.company].rows.filter(r=>{const p=periods(r);return !p.length||p.some(([a,b])=>overlaps(a,b,from,to));}),
  bank:filterDates('bank',6,8),flow:rows,related:data[K.related].rows,
  customer:filterDates('customer',7,8),supplier:filterDates('supplier',7,8),employee:filterDates('employee',4,5),
  balance:data[K.balance].rows.filter(r=>fiscalYears.has(Number(r[3]))),
  gl:data[K.gl].rows.filter(r=>fiscalYears.has(Number(r[1])))
 };
 const expectedAccounts=new Set(sources.bank.filter(r=>own.has(r[2])&&r[0]).map(r=>key(r[2],clean(r[0]))));
 const actualAccounts=new Set(rows.filter(r=>own.has(r[0])&&r[1]).map(r=>key(r[0],clean(r[1]))));
 const absent=(expected,actual)=>[...expected].filter(k=>!actual.has(k)).length;
 const currency=v=>{const code=E.currencyCode(v);return code==='RMB'?'CNY':code;};
 const balanceKey=(company,account,year,code)=>JSON.stringify([clean(company),clean(account),Number(year),currency(code)]);
 const uploadedBank=new Set(sources.bank.map(r=>key(r[2],r[0])));
 const detectedAccounts=new Set(actualAccounts);
 for(const r of sources.balance)if(own.has(r[0])&&r[1])detectedAccounts.add(key(r[0],r[1]));
 for(const r of rows)if(own.has(r[3])&&r[4])detectedAccounts.add(key(r[3],r[4]));
 const requiredBalance=new Set();
 for(const year of years){
  const period=fiscalPeriod(year,cut),start=period.from>from?period.from:from,end=period.to<to?period.to:to;
  for(const r of sources.bank)if(own.has(r[2])&&r[0]&&overlaps(r[6],r[8],start,end))requiredBalance.add(balanceKey(r[2],r[0],year,r[4]));
  for(const r of rows)if(own.has(r[0])&&r[1]&&day(r[5])>=start&&day(r[5])<=end)requiredBalance.add(balanceKey(r[0],r[1],year,r[7]));
 }
 const status=Object.entries(sources).map(([k,list])=>{
  const col=k==='bank'?2:0,valid=list.filter(r=>own.has(r[col]));
  const uploaded=data[K[k]].rows.length>0;
  if(k==='company'){
   const masterCompanies=new Set(data[K.company].rows.map(r=>clean(r[0])).filter(Boolean));
   const flowCompanies=new Set(rows.map(r=>clean(r[0])).filter(Boolean));
   const missingCompanies=[...flowCompanies].filter(n=>!masterCompanies.has(n));
   return [k,!uploaded?'未上传':missingCompanies.length?'部分缺失':'已上传',masterCompanies.size,missingCompanies.length?'所选期间流水中 '+missingCompanies.length+' 家本方单位未在被审计单位主档：'+missingCompanies.join('、'):'被审计单位主档已覆盖所选期间流水的全部本方单位。'];
  }
  if(['related','customer','supplier','employee'].includes(k)){
   return [k,uploaded?'已上传':'未上传',valid.length,uploaded?'已上传；本期有效记录 '+valid.length+' 条。':'当前无已上传记录。'];
  }
  const covered=new Set(valid.map(r=>r[col])),gaps=[];
  const missing=absent(own,covered);
  if(missing)gaps.push(missing+' 家本期无记录');
  const requiredColumns=data[K[k]].headers.map((h,i)=>h.includes('*')?i:-1).filter(i=>i>=0);
  const invalid=list.filter(r=>requiredColumns.some(i=>!clean(r[i]))).length;
  if(invalid)gaps.push(invalid+' 条记录缺少必填字段');
  if(k==='flow'&&absent(expectedAccounts,actualAccounts))gaps.push(absent(expectedAccounts,actualAccounts)+' 个主档账号本期无流水');
  if(k==='bank'&&absent(detectedAccounts,uploadedBank))gaps.push(absent(detectedAccounts,uploadedBank)+' 个本期流水或余额表识别账号未匹配主档');
  if(k==='balance'){
   const booked=new Set(valid.map(r=>balanceKey(r[0],r[1],r[3],r[4])));
   const unbooked=absent(requiredBalance,booked);
   if(unbooked)gaps.push(unbooked+' 个账号对账年份及币种组合缺余额表');
  }
  if(k==='gl'||k==='balance'){
   const companyYears=new Set(valid.map(r=>key(r[0],Number(r[k==='gl'?1:3]))));
   const missingYears=years.reduce((n,y)=>n+[...own].filter(name=>!companyYears.has(key(name,y))).length,0);
   if(missingYears)gaps.push(missingYears+' 个公司财年缺记录');
  }
  const state=!uploaded?'未上传':gaps.length?'部分缺失':'已上传';
  if(k==='gl'||k==='balance')gaps.push('对账年份 '+years.join('、'));
  return [k,state,valid.length,gaps.join('；')||'本期资料完整。'];
 });
 return {sources,status};
}
const criteriaDefaults={daysMin:0,daysMax:365,insuredMax:50,capitalMinWan:0,capitalMaxWan:50,paidMin:20,paidMax:50,overlapAmount:1000000,overlapPercent:20,unknownAmount:500000};
const criteriaFields={
 registryDays:[['daysMin','经营天数下限'],['daysMax','经营天数上限']],
 registryInsured:[['insuredMax','参保人数上限']],
 registryCapital:[['capitalMinWan','注册资本下限（万元）'],['capitalMaxWan','注册资本上限（万元）']],
 registryPaid:[['paidMin','实缴比例下限（%）'],['paidMax','实缴比例上限（%）']],
 registry:[['daysMin','经营天数下限'],['daysMax','经营天数上限'],['insuredMax','参保人数上限'],['capitalMinWan','注册资本下限（万元）'],['capitalMaxWan','注册资本上限（万元）'],['paidMin','实缴比例下限（%）'],['paidMax','实缴比例上限（%）']],
 overlap:[['overlapAmount','交易总额下限（元／原币）'],['overlapPercent','收支重合比例下限（%）']],
 unknown:[['unknownAmount','交易总额下限（元／原币）']]
};
function parseCriteria(input,current={}){
 const next={...criteriaDefaults,...current};
 for(const [key,value]of Object.entries(input)){
  if(!Object.hasOwn(criteriaDefaults,key))continue;
  const n=Number(value);
  const percent=key==='paidMin'||key==='paidMax'||key==='overlapPercent';
  if(String(value).trim()===''||!Number.isFinite(n)||n<0||percent&&n>100||['daysMin','daysMax','insuredMax'].includes(key)&&!Number.isInteger(n))throw Error('请输入有效的非负筛选数值，比例须在 0–100 之间。');
  next[key]=n;
 }
 if(next.daysMin>next.daysMax||next.paidMin>next.paidMax||next.capitalMinWan>next.capitalMaxWan)throw Error('筛选下限不能大于上限。');
 return next;
}
// The report template shows disjoint rank bands; the engine exposes cumulative ranks.
function rankBands(rows){
 const labels=['合计','前 5','第 6–10','第 11–20','非前 20'];
 return labels.map((label,i)=>[label,...rows[i].map((v,j)=>i===2||i===3?v-rows[i-1][j]:v)]);
}
function compute(data,settings={}){
 const source=data[K.flow],all=source.rows;
 const dates=all.map(r=>day(r[5])).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
 const minimum=dates[0],maximum=dates.at(-1);
 const from=settings.from||minimum||'2023-01-01',to=settings.to||maximum||'2025-12-31';
 const criteria=parseCriteria({},settings.criteria);
 const threshold=settings.threshold??50000,rates=settings.rates??{USD:settings.fx??E.DEFAULT_FX};
 const currencies=[...new Set(all.map(r=>E.currencyCode(r[7])).filter(code=>/^[A-Z]{3}$/.test(code)).map(code=>code==='RMB'?'CNY':code))].sort();
 const originalCurrency=currencies.includes(settings.originalCurrency)?settings.originalCurrency:'';
 const fx=originalCurrency?{...rates,original:true}:rates;
 const fxLabel=Object.entries(rates).map(([code,rate])=>'1 '+code+' = '+formatRate(rate)+' CNY').join('；');
 const sum=rows=>rows.reduce((a,r)=>add(a,r,fx),aggregate());
 const cut=settings.cut||'12-31';
 const periodRows=all.filter(r=>day(r[5])>=from&&day(r[5])<=to);
 const matchesCurrency=r=>!originalCurrency||(E.currencyCode(r[7])==='RMB'?'CNY':E.currencyCode(r[7]))===originalCurrency;
 const rows=periodRows.filter(matchesCurrency);
 const selectedDates=rows.map(r=>day(r[5])).sort();
 const unknown=[...new Set(periodRows.map(r=>E.currencyCode(r[7])).filter(code=>code&&!['CNY','RMB'].includes(code)&&!rates[code]))];
 const yearStart=Number(from.slice(0,4)),yearEnd=Number(to.slice(0,4));
 const a=E.analysis({...data,[K.flow]:{...source,rows}},{cut:'12-31',first:yearStart,last:yearEnd,threshold,fx});
 const model={from,to,minimum,maximum,threshold,criteria,registryBounds:settings.registryBounds,rates,fxLabel,originalCurrency,currencies,cut,sections:[],flow:{headers:source.headers,rows:rows.map(r=>E.convertRow([...r],rates))}};
 const section=(id,title,note='')=>{
  const item={id,title,note,tables:[],charts:[]};
  model.sections.push(item);return item;
 };
 const table=(s,name,headers,rows,limit)=>s.tables.push({name,headers:headers.map((h,i)=>reportHeader(i===0&&h==='区间'&&/比例|重合/.test(name)?h+'（%）':h)),rows,limit});
 const directionHeaders=['流入金额（百万元）','流入笔数','流入占比','流出金额（百万元）','流出笔数','流出占比'];
 const directions=(x,total)=>[amount(x.in),x.ins,ratio(x.in,total.in),amount(x.out),x.outs,ratio(x.out,total.out)];
 const stacked=(section,name,items,{detail=true,first='区间',countLabel='对手方数量'}={})=>{
  const total=totals(items.map(x=>x[2]));
  const rows=items.map(([label,n,x])=>[label,n,...directions(x,total)]);
  section.charts.push({name,kind:'stacked',rows});
  if(detail){
   table(section,name,[first,countLabel,...directionHeaders],rows);
   section.tables.at(-1).grouped=true;
  }
 };
 const masterSets=Object.fromEntries(['customer','supplier','employee','related'].map(k=>[k,new Map(data[K[k]].rows.map(r=>[key(r[0],r[k==='related'?1:2]),r]))]));
 const own=new Set(data[K.company].rows.map(r=>r[0]).filter(Boolean));
 const present=new Set(periodRows.map(r=>r[0]));
 const external=rows.filter(r=>!own.has(r[3]));
 const externalTotals=sum(external);
 const {sources:periodSources,status:sourceStatus}=scopeData(data,periodRows,own,from,to,cut);
 const cover=section('cover','综合分析报告（年审适用）','本页为模拟数据的核验预期值。'+(originalCurrency?'金额只使用 '+originalCurrency+' 原币。资料状态仍基于本期全币种数据。':'金额折算为人民币后汇总。'+(unknown.length?'未设置汇率的币种 '+unknown.join('、')+' 使用导入表已有的等值人民币列，缺值按 0。':''))+' 最后更新时间为本次报告生成时的北京时间（模拟）。');
 const timestampParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 table(cover,'封面',['项目','当前结果'],[['被审计单位',[...own].join('、')],['系统已有数据期间',rangeLabel(minimum,maximum)],['财务报表期间',rangeLabel(from,to)],['本期首末交易日期',rangeLabel(selectedDates[0],selectedDates.at(-1))],['金额口径',originalCurrency?'原币 '+originalCurrency:'折算人民币'],['测试汇率',fxLabel],['报告版本','核验预览 V1.0 '+timestampParts.year+'年'+Number(timestampParts.month)+'月'+Number(timestampParts.day)+'日']]);
 const simulatedUpdatedAt=timestampParts.year+'-'+timestampParts.month+'-'+timestampParts.day+' '+timestampParts.hour+':'+timestampParts.minute+':'+timestampParts.second;
 const masterList=[['company','被审计单位主档'],['bank','银行账号主档'],['flow','资金交易明细'],['related','关联方主档'],['customer','客户主档'],['supplier','供应商主档'],['employee','员工主档'],['balance','银行科目主档'],['gl','总账科目余额表']];
 table(cover,'分析数据范围',['主档名称','状态','本期记录数','最后更新时间','本期核验说明'],masterList.map(([k,label])=>{
  const [,status,count,note]=sourceStatus.find(r=>r[0]===k);
  return [label,status,count,simulatedUpdatedAt,note];
 }));

 const background=section('background','1 被审计单位企业背景','工商、诉讼、执行和董监高变更资料需另行核验。当前预览可查看主档中的单位、上级公司和行业。');
 table(background,'1.1 被审计单位合并范围分析',['公司名称','上级公司名称','公司职能','所属行业','天眼查清单','被审计单位主档'],periodSources.company.map(r=>[r[0],r[2],r[3],r[4],missingValue,'已上传']));
 for(const [name,label] of [['1.2 重大法律诉讼清单','法律诉讼'],['1.3 失信被执行案件清单','失信被执行案件']])table(background,name,['项目','状态'],[[label,missingValue]]);
 const coverage=section('scope','1.1 资金流水 – 企业及账号范围分析','已上传账号个数为本期已上传流水中，本方名称属于被审计单位主档的公司及账号去重数，包含未列入银行账号清单的流水账号；不按公司家数或账号主档行数计算，也不因原币筛选减少。银行账号清单、科目余额表来源仅检查本期资料中已有的账号是否缺少所选期间的本方流水；其他期间有流水不能代替本期，不将流水有而清单或余额表没有的账号计入这两类。流水中识别的缺失同名账户仍检查同一工作簿全部日期是否已上传该账号本方流水。各来源分别按公司及账号去重，一个账号可命中多类，总数只计一次，因此分类个数之和可能大于总数。');
 const accountKey=(company,account)=>key(clean(company),clean(account));
 const uploaded=new Set(all.filter(r=>clean(r[0])&&clean(r[1])).map(r=>accountKey(r[0],r[1])));
 const periodUploaded=new Set(periodRows.filter(r=>own.has(r[0])&&clean(r[1])).map(r=>accountKey(r[0],r[1])));
 const uploadedAccountCount=periodUploaded.size;
 const missingSources=['流水中识别的缺失同名账户','银行账号清单','科目余额表'];
 const absent=new Map();
 function candidate(company,account,sourceName){
  account=clean(account);
  const k=accountKey(company,account);
  const actual=sourceName==='流水中识别的缺失同名账户'?uploaded:periodUploaded;
  if(!own.has(company)||!account||actual.has(k))return null;
  const reason=sourceName==='流水中识别的缺失同名账户'?'同名付款识别账号，整个工作簿未上传该账号本方流水':sourceName+'有该账号，所选期间未上传该账号本方流水';
  if(!absent.has(k))absent.set(k,{company,account,sources:new Set(),reasons:new Set(),pay:aggregate(),ids:[]});
  const item=absent.get(k);item.sources.add(sourceName);item.reasons.add(reason);return item;
 }
 for(const r of periodRows){
  if(clean(r[0])===clean(r[3])&&clean(r[1])!==clean(r[4])&&E.cents(r[10])>0){
   const item=candidate(r[0],r[4],'流水中识别的缺失同名账户');
   if(item&&matchesCurrency(r)){add(item.pay,r,fx);item.ids.push(r[15]);}
  }
 }
 for(const r of periodSources.bank)candidate(r[2],r[0],'银行账号清单');
 for(const r of periodSources.balance)candidate(r[0],r[1],'科目余额表');
 const missing=[...absent.values()].map(m=>({...m,primary:missingSources.filter(s=>m.sources.has(s)).join('、')})),missingCompanies=[...own].filter(n=>!present.has(n));
 table(coverage,'企业及账号总览',['指标','数量'],[['主档被审计单位',own.size],['本期有流水的被审计单位',[...own].filter(n=>present.has(n)).length],['本期无流水的被审计单位',missingCompanies.length],['已上传账号个数',uploadedAccountCount],['本期流水本方账号',uploadedAccountCount],['整个工作簿本方账号',uploaded.size],['缺失银行账号（去重）',missing.length],...missingSources.map(s=>[s,missing.filter(m=>m.sources.has(s)).length])]);
 table(coverage,'缺失公司',['被审计单位','核验结果'],missingCompanies.map(n=>[n,all.some(r=>r[0]===n)?'本期无流水，工作簿其他日期有流水':'整个工作簿无流水']));
 table(coverage,'2.1.1 缺失账号明细',['被审计单位','缺失银行账号','归属来源','同名付款笔数','同名付款金额（百万元）','流水号','全部命中来源','缺失内容'],missing.map(m=>[m.company,m.account,m.primary,m.pay.n,amount(m.pay.out),m.ids.join('、'),[...m.sources].join('、'),[...m.reasons].join('；')]));
 for(const metric of ['交易额','期末余额']){
  const ranks=a.ranking.filter(r=>r[0]==='所选合计'&&r[1]===metric);
  table(coverage,'2.1.2 账户'+metric+'分析',['分布','金额（百万元）','交易笔数','金额占比'],rankBands(ranks.map(r=>[r[3]/1e6,r[4],r[5]])));
 }

 const thresholdLabel='大额单笔交易人民币['+thresholdInWan.format(threshold/10000)+']万元以上'+(threshold===50000?'【系统默认】':'【项目自定义】');
 const features=section('features','1.2 资金流水 – 资金流水性质分析',thresholdLabel+'（含阈值）。范围内外柱图与区间表基于同一批命中流水，方向占比分母为该范围内同方向的大额金额。');
 const tradeAmount=r=>value(r,8,fx)+value(r,10,fx);
 const big=rows.filter(r=>value(r,8,rates)+value(r,10,rates)>=E.cents(threshold));
 const blank=rows.filter(r=>!clean(r[3])&&!clean(r[4]));
 const blankSummary=rows.filter(r=>!clean(r[16]));
 const groups=[['2.2.1 合并范围内大额',big.filter(r=>own.has(r[3]))],['2.2.1 合并范围外大额',big.filter(r=>!own.has(r[3]))],['2.2.2 对手方信息为空',blank],['2.2.3 摘要信息为空',blankSummary]];
 const overview=[['大额单笔交易',big],...groups];
 const involved=(rs,column)=>new Set(rs.map(r=>clean(r[column])).filter(n=>column===3||n)).size;
 const metrics=rs=>[involved(rs,0),involved(rs,3),...financial(sum(rs))];
 table(features,'流水性质概览',['项目','本方公司数量','对手方数量（空白计1个）',...moneyHeaders],overview.map(([name,rs])=>[name,...metrics(rs)]));
 features.cards=[overview[0],...groups.slice(2)].map(([name,rs])=>{
  const card={name:name.replace(/^2\.2\.[23] /,''),amount:amount(turnover(sum(rs))),count:rs.length,companies:involved(rs,0),parties:involved(rs,3)};
  if(rs===big){card.condition=thresholdLabel;card.breakdown=groups.slice(0,2).map(([n,r])=>[n.includes('范围内')?'合并范围内':'合并范围外',involved(r,3),amount(turnover(sum(r))),r.length]);}
  return card;
 });
 const buckets=['<1百万','1～<5百万','5～<10百万','10～20百万','>20百万'];
 for(const [name,rs] of [['合并范围内',groups[0][1]],['合并范围外',groups[1][1]]]){
  const parts=buckets.map(()=>aggregate());
  for(const r of rs){const m=amount(value(r,8,fx)+value(r,10,fx));add(parts[m<1?0:m<5?1:m<10?2:m<=20?3:4],r,fx);}
  stacked(features,name+'大额交易金额分布',buckets.map((label,i)=>[label,parts[i].n,parts[i]]),{first:'单笔金额（百万元）',countLabel:'交易笔数'});
 }
 const detailHeaders=['源Excel行','流水号','本方名称','本方账号','本方银行','对手方名称','对手方账号','交易日期','交易时间','币种','等值人民币流入金额（元）','等值人民币流出金额（元）','交易类型','摘要','关联关系','对手方类型'];
 const originalIndex=new Map(all.map((r,i)=>[r,i+2]));
 for(const [n,rs] of groups){
  const total=sum(rs),detail=[...rs].sort((x,y)=>tradeAmount(y)-tradeAmount(x)||String(x[15]).localeCompare(String(y[15]))).map(r=>[originalIndex.get(r),r[15],...r.slice(0,5),day(r[5]),r[6],r[7],E.money(value(r,8,fx)),E.money(value(r,10,fx)),r[14],r[16],r[18],r[20]]);
  if(rs.length)detail.unshift(['','合计',...Array(8).fill(''),E.money(total.in),E.money(total.out)]);
  table(features,n,detailHeaders,detail,21);
  const t=features.tables.at(-1);
  const top20=detail.filter(r=>r[1]!=='合计').slice(0,20);
  const top20Amount=top20.reduce((n,r)=>n+E.cents(r[10])+E.cents(r[11]),0)/100/1e6;
  const scope=n.includes('范围内')?'合并范围内':n.includes('范围外')?'合并范围外':'';
  const summary=scope?scope+thresholdLabel+'对手方个数 /交易总额/交易笔数： '+involved(rs,3)+'家 /'+currency.format(amount(turnover(total)))+'百万元/'+integer(rs.length)+'笔':
   (n.includes('对手方')?'对手方为空':'摘要信息为空')+'的交易总额/交易笔数： '+currency.format(amount(turnover(total)))+'百万元/'+integer(rs.length)+'笔';
  t.note=summary+'\n其中：交易金额前20大：交易金额合计 '+currency.format(top20Amount)+'百万元。';

 }

 const concentration=section('concentration','1.3 资金流水集中度分析（以下数据分析已剔除被审计单位合并范围内各单位之间的交易往来）','剔除合并范围内单位之间的往来。先按客商分类对对手方排名，再拆分关联方和第三方。占比的分母是该方向、该客商分类的总金额。只有同一本方单位与对手方在关联方主档中匹配，才列为关联方；内部往来仍剔除。对手方名称为空的交易计入合计和其他，跳过排名。');
 const months=new Map(),counterparties=new Map(),related=new Map(),relations=new Map(),people=new Map(),byCategory=new Map(),byCategoryRelated=new Map();
 const flagByName=new Map(),relationshipNames=new Map();
 for(const r of external){
  const k=key(r[0],r[3]),c=masterSets.customer.has(k),s=masterSets.supplier.has(k);
  const category=c&&s?'客商一体':c?'客户':s?'供应商':'非客商';
  const relationship=masterSets.related.get(k)?.[2];
  const name=clean(r[3])||'【对手方为空】';
  group(months,key(day(r[5]).slice(0,7),category),{},r,fx);
  group(byCategory,category,{},r,fx);
  const record=group(counterparties,name,{name,categories:new Set(),relationships:new Set(),black:black.has(name)},r,fx);
  record.categories.add(category);
  if(relationship){
   group(byCategoryRelated,category,{},r,fx);
   record.relationships.add(relationship);
   const rel=group(related,name,{name,categories:new Set(),relationships:new Set(),black:black.has(name)},r,fx);
   rel.categories.add(category);rel.relationships.add(relationship);
   group(relations,relationship,{},r,fx);
   if(!relationshipNames.has(relationship))relationshipNames.set(relationship,new Set());
   relationshipNames.get(relationship).add(name);
  }
  const employee=masterSets.employee.has(k);
  const personType=E.isRelatedOfficer(name,relationship)?'董监高':employee?'员工':clean(r[3])&&[...name].length<=4?'其他个人':'';
  if(personType){
   group(people,key(name,personType),{name,personType},r,fx);
   if(!flagByName.has(name))flagByName.set(name,new Set());
   flagByName.get(name).add(personType);
  }
 }
 const monthKeys=[];
 for(let y=yearStart,m=Number(from.slice(5,7));y*12+m<=yearEnd*12+Number(to.slice(5,7));){
  monthKeys.push(y+'-'+String(m).padStart(2,'0'));if(++m===13){m=1;y++;}
 }
 const trendRows=monthKeys.map(m=>[m,...categories.flatMap(c=>{const a=months.get(key(m,c))||aggregate();return [amount(a.in),amount(a.out)];})]);
 concentration.trend={headers:['月份',...categories.flatMap(c=>[c+'流入金额（百万元）',c+'流出金额（百万元）'])],rows:trendRows};
 table(concentration,'月度流入流出趋势',concentration.trend.headers,trendRows);
 for(const direction of ['流入','流出']){
  const cs=a.concentration.filter(r=>r[0]==='所选合计'&&r[1]===direction);
  const nature=['关联方','第三方'];
  const bands=nature.map(rel=>rankBands(['合计','前5','前10','前20','其他'].map(rank=>categories.flatMap(cat=>{
   const r=cs.find(x=>x[2]===cat&&x[3]===rel&&x[4]===rank);
   return [r[5]/1e6,r[6],r[7]];
  }))));
  table(concentration,direction+'集中度',['分布','性质',...categories.flatMap(c=>[c+'金额（百万元）',c+'笔数',c+'占比'])],
   bands[0].flatMap(([label],i)=>nature.map((rel,j)=>[label,rel,...bands[j][i].slice(1)])));
 }

 table(concentration,'集中度排名明细',['方向','客商分类','对手方名称','分类内排名','关联性质','等值人民币金额（百万元）','交易笔数','金额占比'],
  a.concentrationDetail.filter(r=>r[0]==='所选合计').map(r=>[...r.slice(1,6),r[6]/1e6,r[7],r[8]]));

 const cpSection=section('counterparties','2.1 资金流水按交易对手方类型分析','剔除合并范围内往来。按对手方名称汇总；同名对手方在不同主档中有多种分类时一并显示。空白名称统一分组。');
 const cp=[...counterparties.values()];
 const cpHeaders=['排名','对手方名称','客商分类','关联关系','模拟黑名单','流入金额（百万元）','流入笔数','流入占比','流出金额（百万元）','流出笔数','流出占比','交易金额（百万元）','交易笔数','交易金额占比'];
 function totals(items){return items.reduce((acc,x)=>{for(const k of ['in','out','ins','outs','n'])acc[k]+=x[k];return acc;},aggregate());}
 const cpAmounts=(x,den)=>[amount(x.in),x.ins,ratio(x.in,den.in),amount(x.out),x.outs,ratio(x.out,den.out),amount(turnover(x)),x.n,ratio(turnover(x),turnover(den))];
 function ranking(items,den,limit=20,unranked=[]){
  const summary=(name,rs)=>['',name,'','',rs.filter(x=>x.black).length+' 家',...cpAmounts(totals(rs),den)];
  return [summary('合计',[...items,...unranked]),...items.slice(0,limit).map((x,i)=>[i+1,x.name,[...x.categories].join('、'),[...x.relationships].join('、')||'第三方',x.black?'是':'否',...cpAmounts(x,den)]),...(limit===20?[summary('前20小计',items.slice(0,20)),summary('其他',[...items.slice(20),...unranked])]:[])];
 }
 stacked(cpSection,'对手方类型流入流出分布',categories.map(cat=>[cat,'',byCategory.get(cat)||aggregate()]),{detail:false});
 table(cpSection,'对手方类型及关联方汇总',['对手方类型','统计范围',...directionHeaders],categories.flatMap(cat=>[
  [cat,'交易总量',...directions(byCategory.get(cat)||aggregate(),externalTotals)],
  [cat,'其中：关联方',...directions(byCategoryRelated.get(cat)||aggregate(),externalTotals)]
 ]));
 cpSection.tables.at(-1).grouped=true;
 for(const [dir,metric] of [['流入','in'],['流出','out']])table(cpSection,dir+'前20大对手方',cpHeaders,ranking(sortBy(cp.filter(x=>x[metric]>0),x=>x[metric]),externalTotals,20,cp.filter(x=>x[metric]<=0)));
 const relatedSection=section('related','2.2 关联方资金流水分析（以下数据分析是依据系统中关联方主档名单进行汇总）','关联组合按被审计单位公司名称＋关联方名称去重，不按关联关系类型或重复主档行重复计数。在已有主档组合基础上，自动补齐不同被审计单位之间的有向关联组合（X→Y和Y→X分别计一组），不自动增加自身组合，也不扩展第三方关系。组合数量使用“组”，不同关联方名称数量使用“个”。交易统计仍剔除合并范围内往来。');
 const rels=[...related.values()];
 const masterRelatedNames=new Set(data[K.related].rows.map(r=>clean(r[1])).filter(Boolean));
 const relationPairs=new Map();
 for(const r of data[K.related].rows){
  const company=clean(r[0]),party=clean(r[1]);
  if(company&&party)relationPairs.set(key(company,party),[company,party,'关联方主档']);
 }
 const masterPairCount=relationPairs.size;
 const auditedNames=[...new Set([...own].map(clean).filter(Boolean))];
 for(const company of auditedNames)for(const party of auditedNames){
  const pair=key(company,party);
  if(company!==party&&!relationPairs.has(pair))relationPairs.set(pair,[company,party,'被审计单位之间自动补齐']);
 }
 relatedSection.relationStats={masterNames:masterRelatedNames.size,masterPairs:masterPairCount,addedPairs:relationPairs.size-masterPairCount,effectivePairs:relationPairs.size};
 table(relatedSection,'3.2.1 关联方交易汇总',['有效关联组合数量（组）','本期交易关联方数量',...cpHeaders.slice(5)],[[relationPairs.size,rels.length,...cpAmounts(totals(rels),externalTotals)]]);
 stacked(relatedSection,'关联关系类型流入流出分布',[...relations].sort(([a],[b])=>a.localeCompare(b,'zh-CN')).map(([n,x])=>[n,relationshipNames.get(n).size,x]),{first:'关联方类型'});
 table(relatedSection,'3.2.2 已知关联方交易清单',cpHeaders,ranking(sortBy(rels,turnover),totals(rels)));
 table(relatedSection,'关联组合数量核验',['指标','数量'],[['主档不同关联方名称数量（个）',masterRelatedNames.size],['主档去重关联组合数量（组）',masterPairCount],['自动补齐被审计单位间组合（组）',relationPairs.size-masterPairCount],['有效关联组合数量（组）',relationPairs.size]]);
 table(relatedSection,'关联组合明细',['被审计单位公司名称','关联方名称','组合来源'],[...relationPairs.values()]);

 const R=g.AuditRegistry;
 const compliance=section('compliance','2.3.1 交易对手方合规事项及工商信息分析','按对手方全称关联工商档案，只统计本期有交易的范围外企业。经营天数＝报告结束日期－导入的经营开始时间，按自然日日期差计算，不额外加一天；不读取导入原经营天数作为计算结果，不反推或修改经营开始时间，也不按经营结束时间截断。原经营天数仅保留供对照。经营日期独立于报告导出期间；共享端点归入前一档，首个端点归入第二档，经营时长按 365 天折算 1 年，恰好 3 年归入 2~3 年，恰好 100 人归入 50~100 人；注册资本按人民币归档；恰好 1百万 归入 500k–1百万，最后一档为 >1百万。工商区间图表仅统计对应字段有有效数值的本期范围外对手方，缺失或无效字段不参与该图的金额及占比计算。');
 const registryEnd=settings.registryAsOf||to;
 const registryHitGroups=[];
 const profiles=new Map((settings.registry||[]).map(r=>[clean(r.name),r]));
 const originalProfiles=new Map((settings.registryOriginal||settings.registry||[]).map(r=>[clean(r.name),r]));
 const enterprise=cp.filter(x=>[...x.name].length>4&&x.name!=='【对手方为空】'&&!flagByName.has(x.name));
 const matched=enterprise.filter(x=>profiles.has(x.name));
 const flagged=cp.filter(x=>x.black);
 const knownDishonest=matched.filter(x=>profiles.get(x.name).dishonest!=null);
 const knownCases=matched.filter(x=>profiles.get(x.name).cases!=null);
 const knownPenalties=matched.filter(x=>profiles.get(x.name).penalties!=null);
 const penalties=knownPenalties.filter(x=>profiles.get(x.name).penalties>0);
 const dishonest=knownDishonest.filter(x=>profiles.get(x.name).dishonest==='是');
 const lawsuits=knownCases.filter(x=>profiles.get(x.name).cases>0);
 const profileSummary=(name,items,known,note)=>[name,known.length?items.length:missingValue,known.length?amount(turnover(totals(items))):missingValue,note+'；有数据 '+known.length+' 家'];
 table(compliance,'合规及工商信息',['指标','对手方数量','交易金额（百万元）','说明'],[
  ['模拟黑名单',flagged.length,amount(turnover(totals(flagged))),'按本期有交易的对手方名称去重'],
  profileSummary('失信被执行人',dishonest,knownDishonest,'命中为是'),
  profileSummary('诉讼对手方及案件数',lawsuits,knownCases,'已知案件 '+knownCases.reduce((n,x)=>n+profiles.get(x.name).cases,0)+' 件'),
  profileSummary('行政处罚',penalties,knownPenalties,'处罚 '+knownPenalties.reduce((n,x)=>n+profiles.get(x.name).penalties,0)+' 件'),
  ['工商档案匹配',matched.length,amount(turnover(totals(matched))),'本期企业 '+enterprise.length+' 家，未匹配 '+(enterprise.length-matched.length)+' 家']
 ]);
 table(compliance,'模拟黑名单命中明细',cpHeaders,ranking(sortBy(flagged,turnover),externalTotals,Infinity));
 const registryScreens={
  days:[v=>v>=criteria.daysMin&&v<=criteria.daysMax,'经营天数 '+criteria.daysMin+'–'+criteria.daysMax+' 天（含边界）'],
  insured:[v=>v<=criteria.insuredMax,'参保人数 ≤ '+criteria.insuredMax+' 人'],
  capital:[v=>v>=criteria.capitalMinWan*10000&&v<=criteria.capitalMaxWan*10000,'注册资本 ['+criteria.capitalMinWan+'–'+criteria.capitalMaxWan+'] 万元（含边界）'],
  paidRatio:[v=>v>=criteria.paidMin&&v<=criteria.paidMax,'实缴占注册资本 '+criteria.paidMin+'%–'+criteria.paidMax+'%（含边界）']
 };
 for(const [id,label,unit]of R.metrics){
  const bounds=R.boundsFor(id,settings.registryBounds);
  const labels=R.intervalLabels(bounds,id).slice(0,-1).map(x=>id==='paidRatio'?x.replace(/\d+(?:\.\d+)?/g,n=>n+'%'):x);
  const groups=labels.map(()=>[]);
  for(const x of enterprise){
   const bucket=R.bucket(R.value(profiles.get(x.name),id,registryEnd,rates),bounds,id);
   if(bucket<groups.length)groups[bucket].push(x);
  }
  const name=label+'区间（'+unit+'）';
  stacked(compliance,name,labels.map((l,i)=>[l,groups[i].length,totals(groups[i])]));
  if(registryScreens[id]){
   const [predicate,description]=registryScreens[id];
   const hits=enterprise.filter(x=>{const v=R.value(profiles.get(x.name),id,registryEnd,rates);return v!=null&&predicate(v);});
   registryHitGroups.push(hits);
   table(compliance,name+'筛选结果',['筛选条件','识别对手方数量',...moneyHeaders],[[description,hits.length,...financial(totals(hits))]]);
  }
 }
 const fieldTable=R.table(matched.map(x=>{const profile=profiles.get(x.name);return {...profile,days:R.value(profile,'days',registryEnd,rates)};}),registryEnd,rates);
 table(compliance,'本期工商匹配明细',[...fieldTable.headers,'导入原经营天数','报告结束日期','按日期计算经营天数','计算值－原天数',...moneyHeaders],fieldTable.rows.map((r,i)=>{const profile=profiles.get(matched[i].name),days=R.value(profile,'days',registryEnd,rates),raw=originalProfiles.get(matched[i].name)?.days;return [...r,raw??null,registryEnd,days,days!=null&&raw!=null&&String(raw).trim()!==''&&Number.isFinite(Number(raw))?days-Number(raw):null,...financial(matched[i])];}));

 const persons=section('people','2.3.2 交易对手方为个人或疑似个人的分析','按本方公司及姓名匹配。董监高以关联方主档中的人员关系为准，其次匹配员工主档；其余非空且姓名不超过4个字符的对手方归为其他个人。合计按姓名去重。');
 const individuals=[...people.values()];
 table(persons,'个人交易汇总',['个人类型','人数',...moneyHeaders],[['合计',individuals],...['员工','董监高','其他个人'].map(n=>[n,individuals.filter(x=>x.personType===n)])].map(([n,rs])=>[n,new Set(rs.map(x=>x.name)).size,...financial(totals(rs))]));
 table(persons,'个人交易明细',['姓名','个人类型',...moneyHeaders],sortBy(individuals,turnover).map(x=>[x.name,x.personType,...financial(x)]));

 const follow=section('follow','2.3.3 已识别有待进一步分析的交易对手方的分析','收支重合和未识别客商关系的全部统计、区间及筛选结果均已剔除集团合并单位内的交易。柱图与区间表展示完整候选分布。下方筛选结果仅统计符合所设条件的对手方。收支重合比例＝较小方向金额 ÷ 较大方向金额；空白对手方单列核验。代表性结果来自筛选命中项；重合比例并列时取交易总额较高者，总额仍并列时按名称排序。');
 const overlap=x=>ratio(Math.min(x.in,x.out),Math.max(x.in,x.out));
 const both=cp.filter(x=>x.name!=='【对手方为空】'&&x.in>0&&x.out>0);
 const overlapList=both.filter(x=>turnover(x)>=E.cents(criteria.overlapAmount)&&overlap(x)>=criteria.overlapPercent/100);
 const unidentified=cp.filter(x=>x.name!=='【对手方为空】'&&x.categories.size===1&&x.categories.has('非客商'));
 const unknownList=unidentified.filter(x=>turnover(x)>=E.cents(criteria.unknownAmount));
 const rules=[['收支重合',overlapList],['未识别客商关系',unknownList]];
  const unitCode=originalCurrency||'CNY';
 const followConditions=[
  '双向往来；交易总额 ≥ '+currency.format(criteria.overlapAmount)+' '+unitCode+'；重合比例 ≥ '+criteria.overlapPercent+'%',
  '所有往来均未匹配客商主档；交易总额 ≥ '+currency.format(criteria.unknownAmount)+' '+unitCode
 ];
 const highestOverlap=[...overlapList].sort((a,b)=>overlap(b)-overlap(a)||turnover(b)-turnover(a)||a.name.localeCompare(b.name,'zh-CN'))[0];
 const highestUnknown=sortBy(unknownList,turnover)[0];
 const representatives=[highestOverlap,highestUnknown].map((x,i)=>{
  if(!x)return '本期无符合筛选条件的对手方。';
  const lead=i?'其中，未识别客商关系'+x.name+'，交易总额最高':'其中，收支重合比例最高'+(overlap(x)*100).toFixed(2)+'%，'+x.name;
  return lead+'，流入金额'+currency.format(amount(x.in))+'百万元，流出金额'+currency.format(amount(x.out))+'百万元。';
 });
 table(follow,'待分析对手方汇总',['识别规则','对手方数量',...moneyHeaders,'筛选条件','筛选代表性结果'],rules.map(([n,rs],i)=>[n,rs.length,...financial(totals(rs)),followConditions[i],representatives[i]]));
 for(const [n,rs] of rules)table(follow,n+'明细',['对手方名称','收支重合比例',...moneyHeaders],sortBy(rs,turnover).map(x=>[x.name,overlap(x),...financial(x)]));
 function distribution(name,rs,labels,classify){
  const sets=labels.map(()=>[]);
  rs.forEach(x=>sets[classify(x)].push(x));
  stacked(follow,name,labels.map((n,i)=>[n,sets[i].length,totals(sets[i])]));
 }
 distribution('双向交易的收支重合区间',both,['低于20%','20%至低于50%','50%至低于80%','80%及以上'],x=>overlap(x)<.2?0:overlap(x)<.5?1:overlap(x)<.8?2:3);
 distribution('未识别客商的交易金额区间',unidentified,['低于5','5至低于10','10至20','超过20'],x=>{const m=amount(turnover(x));return m<5?0:m<10?1:m<=20?2:3;});

 const focus=section('focus','2.4 重点关注对手方清单表','分别取2.3.1–2.3.3各识别结果交易总额前20大，再按名称取并集；并集全部展示，可能超过20个对手方。');
 const overlapNames=new Set(overlapList.map(x=>x.name)),unknownNames=new Set(unknownList.map(x=>x.name));
 const focusNames=new Set([flagged,dishonest,lawsuits,penalties,...registryHitGroups,...['员工','董监高','其他个人'].map(n=>cp.filter(x=>flagByName.get(x.name)?.has(n))),overlapList,unknownList].flatMap(items=>sortBy(items,turnover).slice(0,20).map(x=>x.name)));
 const focusRows=sortBy(cp.filter(x=>focusNames.has(x.name)),turnover);
 const details=ranking(focusRows,externalTotals,Infinity);
 details[0]=['','合计（全部对手方）','','',flagged.length+' 家',...cpAmounts(externalTotals,externalTotals)];
 function focusProfile(r){
  if(!r[0])return Array(10).fill('');
  const profile=profiles.get(r[1]),empty=flagByName.has(r[1])?'':missingValue;
  return [null,profile?.cases,profile?.dishonest,profile?.penalties,R.value(profile,'days',registryEnd,rates),profile?.industry,R.value(profile,'capital',registryEnd,rates),R.value(profile,'paidIn',registryEnd,rates),profile?.insured,[profile?.directors,profile?.supervisors,profile?.executives].filter(Boolean).join('、')||null].map(x=>x==null||empty===''&&x===missingValue?empty:x);
 }
 table(focus,'重点关注对手方并集清单',[...cpHeaders,'个人类型','收支重合','未识别客商关系','疑似关联方','诉讼案件数量','失信被执行人','行政处罚数量','经营天数','所属行业','注册资本','实缴资本','社保人数','董监高信息'],details.filter(r=>r[1]!=='其他').map(r=>[...r,[...(flagByName.get(r[1])||[])].join('、'),overlapNames.has(r[1])?'是':'',unknownNames.has(r[1])?'未识别':'',...focusProfile(r)]));
 const numbering={scope:['2.1','1.1'],features:['2.2','1.2'],concentration:['2.3','1.3'],counterparties:['3.1','2.1'],related:['3.2','2.2'],compliance:['3.3.1','2.3.1'],people:['3.3.2','2.3.2'],follow:['3.3.3','2.3.3'],focus:['3.4','2.4']};
 for(const s of model.sections){
  const pair=numbering[s.id];
  if(pair){
   const [old,next]=pair;
   const rename=v=>v.startsWith(old)?next+v.slice(old.length):v;
   s.title=rename(s.title);for(const t of s.tables)t.name=rename(t.name);
  }
 }
 const appendix=model.sections.splice(model.sections.findIndex(s=>s.id==='background'),1)[0];
 appendix.title='附录 被审计单位企业背景';
 appendix.tables.forEach(t=>t.name=t.name.replace(/^1\./,'附录 '));
 model.sections.push(appendix);
 return model;
}
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const integer=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:0});
const formatRate=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:20});
const thresholdInWan=new Intl.NumberFormat('zh-CN',{maximumFractionDigits:6});
const display=(v,header)=>typeof v!=='number'?esc(v):/占比|比例/.test(header)?(100*v).toFixed(2)+'%':/金额|余额/.test(header)?currency.format(v):/笔数|总交易行数/.test(header)?integer(v):String(v);
const palette=['#24569e','#5283c5','#83a9dc','#abc6eb','#a92226','#cc4c50','#df8588','#efb9bb'];
function cardHTML(card){
 return '<article class="report-nature-card"><h4>'+esc(card.name)+'</h4>'+(card.condition?'<p class="report-condition">'+esc(card.condition)+'</p>':'')+'<strong>'+currency.format(card.amount)+' <small>百万元</small> / '+integer(card.count)+' <small>笔</small></strong><p>涉及 '+card.companies+' 家被审计单位 · '+card.parties+' 个有名称对手方</p>'+(card.breakdown?'<dl>'+card.breakdown.map(([label,parties,amount,count])=>'<div><dt>'+esc(label)+'</dt><dd>'+parties+' 个对手方 / '+currency.format(amount)+' 百万元 / '+integer(count)+' 笔</dd></div>').join('')+'</dl>':'')+'</article>';
}
function tableCell(value,header){
 if(header==='未识别客商关系'&&value==='未识别')return '<span class="report-unidentified">未识别</span>';
 if(header==='状态'&&['已上传','部分缺失','未上传'].includes(value))return '<span class="report-status" data-status="'+esc(value)+'">'+esc(value)+'</span>';
 if(typeof value==='number'&&/占比|比例/.test(header))return (100*value).toFixed(2);
 if(typeof value==='string'&&header.includes('%')&&/区间|占比|比例/.test(header))return esc(value.replace(/(\d)%/g,'$1'));
 return display(value,header);
}
let reportPagerTables=[],reportInteractiveTables=[],renderAllRows=false,renderForExport=false;
function detailRowsHTML(t,rows){
 return rows.map(r=>'<tr'+(r.some((v,i)=>i<2&&typeof v==='string'&&/^(合计|前20小计)/.test(v))?' class="report-total"':'')+'>'+t.headers.map((h,i)=>'<td class="'+(typeof r[i]==='number'?'report-num':'')+'">'+tableCell(r[i],h)+'</td>').join('')+'</tr>').join('')||
  '<tr><td colspan="'+t.headers.length+'">本期无记录</td></tr>';
}
function tableHTML(t){
 const interactiveId=renderForExport?null:reportInteractiveTables.push(t)-1;
 const pageable=false,id=null;
 const visible=t.rows.slice(0,t.limit??(pageable?20:t.rows.length));
 const heading=h=>'<th>'+esc(reportHeader(h))+'</th>';
 const head=t.grouped?'<tr>'+t.headers.slice(0,2).map(h=>'<th rowspan="2">'+esc(reportHeader(h))+'</th>').join('')+'<th colspan="3">流入</th><th colspan="3">流出</th></tr><tr>'+t.headers.slice(2).map(h=>heading(h.slice(2))).join('')+'</tr>':'<tr>'+t.headers.map(heading).join('')+'</tr>';
 return '<div class="report-table"><h4>'+esc(t.name)+'</h4>'+(t.note?'<p class="muted report-detail-summary">'+esc(t.note).replace(/\d[\d,]*(?:\.\d+)?/g,n=>'<strong class="report-stat-value">'+n+'</strong>').replaceAll('\n','<br>')+'</p>':'')+
  '<div class="table-scroll"><table class="table"'+(interactiveId==null?'':' data-report-table="'+interactiveId+'"')+'>'+(t.hideHeader?'':'<thead>'+head+(t.filterHeaders?'<tr class="report-filter-header">'+t.filterHeaders.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr>':'')+'</thead>')+'<tbody>'+detailRowsHTML(t,visible)+'</tbody></table></div>'+
  (pageable?'<div class="pagination" data-report-pager="'+id+'" aria-label="'+esc(t.name)+'分页"></div>':visible.length<t.rows.length?'<p class="muted">页面显示前 '+visible.length+' 行，共 '+t.rows.length+' 行。完整明细见本期核验 Excel。</p>':'')+'</div>';
}
const printPagers=[];
function mountPagers(){
 printPagers.length=0;
 for(const el of document.querySelectorAll('[data-report-pager]')){
  const t=reportPagerTables[Number(el.dataset.reportPager)],tbody=el.previousElementSibling.querySelector('tbody');
  let page=1,pageSize=20;
  const draw=()=>{
   tbody.innerHTML=detailRowsHTML(t,t.rows.slice((page-1)*pageSize,page*pageSize));
   g.renderAuditPager(el,{total:t.rows.length,page,pageSize,onPage:n=>{page=n;draw();},onPageSize:n=>{pageSize=n;page=1;draw();}});
  };
  draw();
  printPagers.push({showAll:()=>{tbody.innerHTML=detailRowsHTML(t,t.rows);},restore:draw});
 }
}
g.addEventListener?.('beforeprint',()=>printPagers.forEach(p=>p.showAll()));
g.addEventListener?.('afterprint',()=>printPagers.forEach(p=>p.restore()));
function stackedHTML(c,onlyDirection){
 const total=[2,5].map(j=>c.rows.reduce((n,r)=>n+r[j],0));
 const peak=onlyDirection===undefined?Math.max(...total):total[onlyDirection];
 const stepBase=peak?10**Math.floor(Math.log10(peak/4)):1;
 const step=Math.ceil(peak/(4*stepBase))*stepBase||1, max=4*step;
 const fill=(i,d)=>'hsl('+(d?2:214)+' '+(d?58:67)+'% '+(26+60*i/Math.max(1,c.rows.length-1))+'%)';
 const ticks=Array.from({length:5},(_,i)=>{
  const y=142-i*29;
  return '<path d="M54 '+y+'H318" stroke="#e7edf5"/><text x="49" y="'+(y+3)+'" text-anchor="end">'+esc((step*i).toLocaleString('zh-CN',{maximumFractionDigits:6}))+'</text>';
 }).join('');
 const bars=[2,5].map((j,d)=>{
  if(onlyDirection!==undefined&&d!==onlyDirection)return '';
  let y=142;
  const x=onlyDirection===undefined?86+d*133:139,dir=d?'流出':'流入';
  const segments=c.rows.map((r,i)=>{
   const h=r[j]/max*116;y-=h;
   return h?'<rect x="'+x+'" y="'+y+'" width="62" height="'+h+'" fill="'+fill(i,d)+'"><title>'+esc(dir+' · '+r[0]+'：'+currency.format(r[j])+' 百万元 / '+integer(r[j+1])+' 笔')+'</title></rect>':'';
  }).join('');
  return segments+'<text x="'+(x+31)+'" y="158" text-anchor="middle">'+dir+'</text><text x="'+(x+31)+'" y="173" text-anchor="middle">'+esc(currency.format(total[d]))+'</text>';
 }).join('');
 return '<figure class="report-chart report-stacked"><figcaption>'+esc(c.name)+'</figcaption><ul class="report-stack-legend">'+c.rows.map((r,i)=>'<li><i style="background:'+fill(i,0)+'"></i><i style="background:'+fill(i,1)+'"></i>'+esc(r[0])+'</li>').join('')+'</ul><svg role="img" aria-label="'+esc(c.name+'，左为流入，右为流出')+'" viewBox="0 0 330 181"><text x="54" y="15">金额（百万元）</text>'+ticks+bars+'</svg>'+(peak?'':'<p class="muted">本期无命中金额</p>')+'</figure>';
}
function chartAndTable(chart,tables,criteria){
 const table=tables.find(t=>t.name===chart.name);
 const screen=tables.find(t=>t.name===chart.name+'筛选结果');
 const filterGroup=chart.name.startsWith('经营天数')?'registryDays':chart.name.startsWith('参保人数')?'registryInsured':chart.name.startsWith('注册资本')?'registryCapital':'registryPaid';
 const results=screen?(()=>{const r=screen.rows[0];return '<div class="report-registry-screen"><h4>系统设定筛选条件</h4>'+(criteria?criteriaForm(filterGroup,criteria):'')+'<p class="report-note">'+esc(r[0])+'</p>'+tableHTML({name:'',hideHeader:true,headers:['指标','本期结果'],rows:[['识别对手方数',integer(r[1])],['识别流入金额/笔数',currency.format(r[2])+'百万/'+integer(r[3])+'笔'],['识别流出金额/笔数',currency.format(r[4])+'百万/'+integer(r[5])+'笔']]})+'</div>';})():'';
 return stackedHTML(chart)+(table?tableHTML(table):'')+results;
}
function trendHTML(t){
 const width=Math.max(520,t.rows.length*30),height=185;
 const directionTotal=(r,d)=>categories.reduce((s,_,i)=>s+r[1+i*2+d],0);
 const rawMax=Math.max(1,...t.rows.map(r=>Math.max(directionTotal(r,0),directionTotal(r,1))));
 const magnitude=10**Math.floor(Math.log10(rawMax/5)),tickStep=Math.ceil(rawMax/5/magnitude)*magnitude,max=tickStep*5;
 const ticks=Array.from({length:6},(_,i)=>{const y=158-i*26;return '<line x1="52" y1="'+y+'" x2="'+(width-4)+'" y2="'+y+'" stroke="#e1e7ef"/><text x="48" y="'+(y+3)+'" text-anchor="end">'+esc(currency.format(tickStep*i))+'</text>';}).join('');
 const step=(width-64)/Math.max(1,t.rows.length),labelInterval=Math.max(1,Math.ceil(t.rows.length/12));
 const bars=t.rows.map((r,i)=>{
  const x=58+i*step,barWidth=Math.min(12,(step-3)/2);
  let html=i%labelInterval===0?'<text x="'+x+'" y="177">'+esc(r[0].slice(2))+'</text>':'';
  for(let d=0;d<2;d++){
   let y=158;
   for(let j=0;j<categories.length;j++){
    const v=r[1+j*2+d],h=Math.max(0,130*v/max);y-=h;
    html+='<rect x="'+(x+d*(barWidth+1))+'" y="'+y+'" width="'+barWidth+'" height="'+h+'" fill="'+palette[j+(d?4:0)]+'"><title>'+esc(r[0]+' '+categories[j]+(d?'流出':'流入')+' '+currency.format(v)+' 百万元')+'</title></rect>';
   }
  }
  return html;
 }).join('');
 return '<figure class="report-chart"><figcaption>月度资金流水（百万元）</figcaption><div class="table-scroll"><svg role="img" aria-label="各月流入与流出金额" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><path d="M52 28V158H'+(width-4)+'" stroke="#bacad0" fill="none"/><text x="4" y="18">百万</text>'+ticks+bars+'</svg></div><ul class="report-legend">'+categories.flatMap((c,i)=>[0,1].map(d=>'<li><i style="background:'+palette[i+d*4]+'"></i>'+c+(d?'流出':'流入')+'</li>')).join('')+'</ul></figure>';
}
function sideBySide(items,variant=''){
 return '<div class="report-panes '+variant+'">'+items.map(x=>'<div class="report-pane">'+x+'</div>').join('')+'</div>';
}
function subhead(title){return '<h4 class="report-subhead">'+esc(title)+'</h4>';}
function extra(title,content){if(renderForExport)return '';return '<details class="report-extra"><summary>'+esc(title)+'</summary>'+content+'</details>';}
function metricHTML(label,main,detail=''){
 return '<div class="report-metric"><span>'+esc(label)+'</span><strong>'+esc(main)+'</strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div>';
}
function coverHTML(s){
 const [cover,status]=s.tables;
 const info=cover.rows.slice(0,3);
 const version=cover.rows.find(([label])=>label==='报告版本');
 const row=([label,text])=>'<tr><th scope="row">'+esc(label)+'</th><td>'+esc(text)+(label==='系统已有数据期间'?'<p>本报告为年审使用模板，资金流水交易统计按所选报告期间核算。</p>':'')+'</td></tr>';
 return '<table class="report-cover-grid"><tbody>'+info.map(row).join('')+'<tr><th scope="row">分析数据范围</th><td><div class="table-scroll"><table class="report-cover-status"><colgroup><col style="width:40%"><col style="width:22%"><col style="width:38%"></colgroup><thead><tr>'+[0,1,3].map(i=>'<th>'+esc(status.headers[i])+'</th>').join('')+'</tr></thead><tbody>'+status.rows.filter(r=>r[0]!=='总账科目余额表').map(r=>'<tr>'+[0,1,3].map(i=>'<td'+(i===1?' title="'+esc(r[4])+'"':'')+'>'+tableCell(r[i],status.headers[i])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></td></tr>'+row(version)+'</tbody></table><div class="report-cover-notes"><b>本报告数据展示说明</b><p>本报告仅展示特定指标的汇总分析，以及重点内容的前20大清单。特定分析事项的完整清单请见本报告附录Excel文件。依据交易对手方汇总的资金流水全量分析，请见同报告一同导出的&lt;资金流水核查和工商信息汇总明细附件.excel&gt;。</p><b>报告说明</b><p>本报告是由毕马威审计罗盘平台输出生成，基于对项目组上传的资金交易明细，通过平台设定的数据分析方法，帮助项目组对被审计单位进行风险画像，以及识别包括集中度高、可能存在潜在舞弊风险的交易对手方及相关交易。该报告属于审计风险评价的一部分，不构成任何实质性审计证据或审计意见。</p></div>';
}
function concentrationHTML(s){
 const sections=s.tables.filter(t=>/^(流入|流出)集中度$/.test(t.name));
 const rowspans=sections.map(t=>t.rows.map((r,i)=>'<tr'+(r[0]==='合计'?' class="report-total"':'')+'>'+(i===0?'<th scope="rowgroup" rowspan="'+t.rows.length+'">'+t.name.slice(0,2)+'</th>':'')+(i%2===0?'<th scope="rowgroup" rowspan="2">'+esc(r[0])+'</th>':'')+'<td>'+esc(r[1])+'</td>'+r.slice(2).map((v,j)=>'<td class="report-num">'+tableCell(v,t.headers[j+2])+'</td>').join('')+'</tr>'));
 return '<div class="table-scroll"><table class="report-concentration"><thead><tr><th rowspan="2">方向</th><th rowspan="2">分布</th><th rowspan="2">性质</th>'+categories.map(c=>'<th scope="colgroup" colspan="3">'+esc(c)+'</th>').join('')+'</tr><tr>'+categories.map(()=>'<th>金额（百万）</th><th>笔数（笔）</th><th>占比（%）</th>').join('')+'</tr></thead>'+rowspans.map(rows=>'<tbody>'+rows.join('')+'</tbody>').join('')+'</table></div>';
}
function criteriaForm(group,criteria,bounds){
 return '<form class="report-criteria" data-report-criteria><b>设置筛选条件</b><div>'+criteriaFields[group].map(([id,label])=>'<label>'+esc(label)+'<input type="number" min="0" step="'+(['daysMin','daysMax','insuredMax'].includes(id)?'1':'any')+'" name="'+id+'" value="'+esc(criteria[id])+'" required></label>').join('')+(group==='registry'?'<label>经营天数统计分界值（天）<input name="daysBounds" value="'+esc(g.AuditRegistry.boundsFor('days',bounds).join(', '))+'" required></label>':'')+'</div><button type="submit" class="btn btn-primary">应用筛选</button></form>';
}
function sectionBody(s,m,continuations){
 const tables=s.tables,charts=s.charts;
 if(s.id==='cover')return coverHTML(s);
 if(s.id==='scope'){
  const n=Object.fromEntries(tables[0].rows);
  const company=metricHTML('已上传被审计公司家数',n['主档被审计单位']+' 家')+metricHTML('已上传流水的被审计公司',n['本期有流水的被审计单位']+' 家','本期无流水 '+n['本期无流水的被审计单位']+' 家');
  const bank=metricHTML('已上传账号个数',n['已上传账号个数']+' 个','被审计单位主档内公司 · 本期已上传流水账号去重')+metricHTML('缺失银行账号个数',n['缺失银行账号（去重）']+' 个',n['流水中识别的缺失同名账户']+' 个流水中识别的缺失同名账户 · '+n['银行账号清单']+' 个银行账号清单 · '+n['科目余额表']+' 个科目余额表');
  return sideBySide([company,bank],'report-scope-panes')+tableHTML({...tables[2],name:'1.1.1 缺失资料的被审计单位及账号明细',headers:['序号','对手方名称（被审计单位）','缺失银行账号','来源','缺失内容'],rows:tables[2].rows.map((r,i)=>[i+1,...r.slice(0,3),r[7]])})+extra('缺失公司明细',tableHTML(tables[1]));
 }
 if(s.id==='features'){
  const detail=(t,name,notes=false)=>{
   const order=[2,3,4,5,6,7,8,9,10,11,12,1,13,...(notes?[14,15]:[])];
   const headers=['序号',...order.map(i=>i===1?'流水识别号':t.headers[i])];
   const rows=t.rows.slice(0,t.limit).map((r,i)=>[r[1]==='合计'?'合计':i,...order.map(j=>j===1&&r[1]==='合计'?'':r[j])]);
   if(t.limit&&t.rows.length>t.limit){
    const remaining=t.rows.slice(t.limit);
    rows.push(['非前 20 大合计',...order.map(j=>[10,11].includes(j)?E.money(remaining.reduce((n,r)=>n+E.cents(r[j]),0)):'')]);
   }
   return tableHTML({...t,name,headers,rows,limit:t.limit?t.limit+1:undefined});
  };
  const breakdown=c=>{
   const total=c.rows.reduce((n,r)=>n+r[2]+r[5],0);
   return stackedHTML(c)+tableHTML({name:'单笔交易金额分布',headers:['单笔交易','金额（百万元）','笔数','占比'],rows:c.rows.map(r=>[r[0],r[2]+r[5],r[3]+r[6],ratio(r[2]+r[5],total)])});
  };
  continuations.push(
   subhead('1.2.1 大额单笔交易分析')+detail(tables[3],'合并范围内')+detail(tables[4],'合并范围外'),
   detail(tables[5],'1.2.2 交易对手方信息为空的交易分析'),
   detail(tables[6],'1.2.3 摘要信息为空的交易分析',true)
  );
  return sideBySide([cardHTML(s.cards[0]),...charts.map(breakdown)],'report-three')+
   sideBySide([...s.cards.slice(1).map(cardHTML),''],'report-three')+extra('流水性质汇总数据',tableHTML(tables[0]));
 }
 if(s.id==='concentration')return trendHTML(s.trend)+concentrationHTML(s)+extra('月度数据及集中度排名明细',tableHTML(tables[0])+tableHTML(tables.at(-1)));
 if(s.id==='counterparties'){
  const [inflow,outflow]=tables.slice(1).map((t,i)=>{
   const direction=i?'流出':'流入',offset=2+i*3;
   const rows=tables[0].rows.map(([cat],j)=>{
    const row=tables[0].rows[j],related=tables[0].rows[j|1],isRelated=j%2===1;
    const values=related.slice(offset,offset+3);
    return [isRelated?'':cat,isRelated?'关联方':'第三方',...(isRelated?values:row.slice(offset,offset+3).map((v,k)=>v-values[k]))];
   });
   const summary={name:'全部交易对手方',headers:['对手方类型','性质',direction+'金额（百万元）','笔数','占比'],rows};
   return '<div class="report-direction"><b class="report-direction-tag">'+direction+'</b><div class="report-direction-summary">'+stackedHTML({...charts[0],name:'全部交易对手方'},i)+tableHTML(summary)+'</div><div class="report-wide-detail">'+tableHTML({...t,limit:23})+'</div></div>';
  });
  continuations.push(subhead('2.1 资金流水按交易对手方类型分析（续）')+outflow);
  return inflow;
 }
 if(s.id==='related'){
  const r=tables[0].rows[0];
  const stats=s.relationStats;
  const overview=metricHTML('关联组合数量（含被审计单位之间）',integer(r[0])+' 组','主档 '+integer(stats.masterPairs)+' 组 ＋ 自动补齐 '+integer(stats.addedPairs)+' 组；主档不同关联方名称 '+integer(stats.masterNames)+' 个；本期有交易关联方 '+integer(r[1])+' 个')+
   metricHTML('流入金额 / 笔数 / 占比',currency.format(r[2])+' 百万元 / '+integer(r[3])+' 笔',display(r[4],'占比'))+
   metricHTML('流出金额 / 笔数 / 占比',currency.format(r[5])+' 百万元 / '+integer(r[6])+' 笔',display(r[7],'占比'));
  return subhead('2.2.1 已知关联方资金交易汇总')+sideBySide([overview,chartAndTable(charts[0],tables)])+tableHTML({...tables[2],name:'2.2.2 已知关联方交易清单'})+extra('关联组合数量及补齐明细',tableHTML(tables[3])+tableHTML(tables[4]));
 }
 if(s.id==='compliance'){
  const [summary,details]=tables;
  const cards=summary.rows.slice(0,4).map(([label,count,amount])=>metricHTML(label,typeof count==='number'?count+' 家 / '+currency.format(amount)+' 百万元':missingValue));
  const main=charts.slice(0,3),more=charts.filter(c=>!main.includes(c));
  return sideBySide(cards,'report-four')+sideBySide(main.map(c=>chartAndTable(c,tables,m.criteria)),'report-three')+extra('合规汇总',tableHTML(summary))+extra('注册资本金额及诉讼数量区间',sideBySide(more.map(c=>chartAndTable(c,tables,m.criteria))))+extra('本期工商匹配明细',tableHTML(tables.at(-1)))+extra('模拟黑名单命中明细',tableHTML(details));
 }
 if(s.id==='people')return sideBySide(tables[0].rows.map(r=>tableHTML({name:r[0],headers:['人数 / 交易额 / 交易笔数','本期结果'],rows:[
  ['识别人数',r[1]+' 人'],['识别流入金额 / 笔数',currency.format(r[2])+' 百万元 / '+integer(r[3])+' 笔'],['识别流出金额 / 笔数',currency.format(r[4])+' 百万元 / '+integer(r[5])+' 笔']
 ]})),'report-four')+extra('个人交易明细',tableHTML(tables[1]));
 if(s.id==='follow')return sideBySide(charts.map((c,i)=>{
  const r=tables[0].rows[i];
  return chartAndTable(c,tables)+'<p class="report-note">'+(i?'与不在客户和供应商清单中的对手方的往来':'对同一交易对方的往来同时存在收款、付款')+'（已剔除集团合并单位内的交易）</p>'+criteriaForm(i?'unknown':'overlap',m.criteria)+'<div class="report-registry-screen"><h4>系统设定筛选条件</h4><p class="report-note">'+esc(r[8])+'</p>'+tableHTML({name:'',hideHeader:true,headers:['指标','本期结果'],rows:[['识别对手方数',integer(r[1])],['识别流入金额/笔数',currency.format(r[2])+'百万/'+integer(r[3])+'笔'],['识别流出金额/笔数',currency.format(r[4])+'百万/'+integer(r[5])+'笔']]})+'</div><p class="report-follow-highlight">'+esc(r[9])+'</p>'+extra(tables[i+1].name,tableHTML(tables[i+1]));
 }));
 if(s.id==='focus'){
  const t=tables[0],order=[0,1,2,14,3,4,18,20,19,21,22,23,24,25,26,16,15,5,6,7,8,9,10,11,12,13];
  const [total,...details]=t.rows;
  const rows=[total,...details];
  const conditions={'诉讼案件数量':'诉讼数量 > 0','失信被执行人':'失信被执行人＝是','行政处罚数量':'行政处罚数量 > 0','经营天数':'经营天数 '+m.criteria.daysMin+'–'+m.criteria.daysMax+' 天（含边界）','社保人数':'参保人数 ≤ '+m.criteria.insuredMax+' 人','注册资本':'注册资本 '+m.criteria.capitalMinWan+'–'+m.criteria.capitalMaxWan+' 万元（含边界）','实缴资本':'实缴占注册资本 '+m.criteria.paidMin+'%–'+m.criteria.paidMax+'%','收支重合':'交易额 ≥ '+currency.format(m.criteria.overlapAmount)+'；重合比例 ≥ '+m.criteria.overlapPercent+'%','未识别客商关系':'交易额 ≥ '+currency.format(m.criteria.unknownAmount)};
  return tableHTML({...t,filterHeaders:[...order.map(i=>conditions[t.headers[i]]||''),''],headers:[...order.map(i=>t.headers[i]),'说明'],rows:rows.map(r=>[...order.map(i=>r[i]),''])});
 }
 return tables.map(tableHTML).join('');
}
const chapterTitles={scope:'1 被审计单位资金流水数据总览（相关信息依据工作簿资金流水数据信息汇总）',counterparties:'2 被审计单位资金流水按交易对手方分析总览（以下数据分析已剔除被审计单位合并范围内各单位之间的交易往来）',compliance:'2.3 交易对手方重点事项分析（相关信息依据天眼查信息汇总，交易金额前20大见2.4，详细清单见<资金流水核查和工商信息汇总明细附件.excel>）'};
function logicHTML(s){return renderForExport?'':'<details class="report-logic"><summary>查看统计逻辑</summary><p>'+esc(s.note)+'</p></details>';}
function reportSection(s,m,continuations){
 const tag=s.id==='cover'?'h2':'h3';
 return (chapterTitles[s.id]?'<h2 class="report-chapter">'+esc(chapterTitles[s.id])+'</h2>':'')+'<section class="report-section" id="report-'+s.id+'">'+(s.id==='cover'?'<div class="report-masthead"><span>毕马威审计罗盘</span></div>':'')+'<'+tag+'>'+esc(s.title)+'</'+tag+'>'+logicHTML(s)+sectionBody(s,m,continuations)+'</section>';
}
function amountLabels(text,code){
 const converted=text.replaceAll('百万元','百万');
 return code?converted.replaceAll('等值人民币','原币 '+code).replace(/金额（元）/g,'金额（'+code+'）'):converted;
}

function reportHeader(header){
 let h=amountLabels(header).replace(/^交易金额占比$/,'占比').replace(/^金额占比$/,'占比').replace(/^交易金额（百万）$/,'金额（百万）').replace(/^交易笔数$/,'笔数');
 if(/笔数$/.test(h))h+='（笔）';
 if(/占比|比例/.test(h)&&!h.includes('%'))h+='（%）';
 return h;
}
function exportReportTable(t,code){
 return {headers:t.headers.map(h=>amountLabels(reportHeader(h),code)),rows:t.rows.map(row=>row.map((v,i)=>typeof v==='number'&&/占比|比例/.test(t.headers[i])?v*100:typeof v==='string'?amountLabels(t.headers[i]?.includes('%')&&/区间|占比|比例/.test(t.headers[i])?v.replace(/(\d)%/g,'$1'):v,code):v))};
}
function formatTables(tables,code){return Object.fromEntries(Object.entries(tables).map(([name,t])=>[name,exportReportTable(t,code)]));}

function tocDepth(title){return Math.min(3,(String(title).match(/^\d+(?:\.\d+)*/)?.[0]||'1').split('.').length);}
function tocHTML(m){
 const item=(title,id)=>'<li class="toc-level-'+tocDepth(title)+'"><a href="#report-'+id+'">'+esc(title)+'</a></li>';
 return '<nav class="report-toc" aria-label="报告目录"><h2>报告目录</h2><p>Table of Contents</p><ol>'+m.sections.filter(s=>!['cover','background'].includes(s.id)).map(s=>(chapterTitles[s.id]?item(chapterTitles[s.id],s.id):'')+item(s.title,s.id)).join('')+'</ol></nav>';
}
function selectSections(model,ids){
 const allSections=model.allSections||model.sections;
 const available=allSections.filter(s=>s.id!=='background');
 const selected=Array.isArray(ids)?ids:available.map(s=>s.id).concat('toc');
 return {...model,allSections,selectedSectionIds:selected,sections:available.filter(s=>selected.includes(s.id))};
}
function sectionPicker(m){
 const all=(m.allSections||m.sections).filter(s=>s.id!=='background');
 const selected=m.selectedSectionIds||all.map(s=>s.id).concat('toc');
 const choices=[...all.slice(0,1),{id:'toc',title:'报告目录'},...all.slice(1)];
 return '<fieldset class="report-section-picker"><legend>选择导出章节</legend><div class="actions"><button type="button" id="reportSectionsAll">全选</button><button type="button" id="reportSectionsClear">清空选择</button><span>已选 '+selected.filter(id=>choices.some(s=>s.id===id)).length+' / '+choices.length+' 项</span></div><div class="report-section-options">'+choices.map(s=>'<label><input type="checkbox" data-report-section="'+esc(s.id)+'"'+(selected.includes(s.id)?' checked':'')+'> '+esc(s.id==='cover'?'报告封面':s.title)+'</label>').join('')+'</div><p class="muted">所选章节同步显示在下方预览，并用于 Word、打印及本期核验 Excel；目录仅列出所选章节，章节编号保持原报告编号。</p></fieldset>';
}
function reportPages(m){
 const scope=(m.allSections||m.sections).find(s=>s.id==='scope');
 const accountSummary=subhead('1.1.2 已上传资金账户分析')+
  metricHTML('已上传账户个数',Object.fromEntries(scope.tables[0].rows)['已上传账号个数']+' 个')+
  sideBySide(scope.tables.slice(3).map(t=>tableHTML({...t,name:t.name.includes('期末余额')?'按账户余额分析':'按账户交易总额分析'})));
 const pieces=m.sections.filter(s=>s.id!=='background').flatMap(s=>{
  const continuations=[];
  const content=reportSection(s,m,continuations);
  if(s.id==='cover')return [content];
  const hasScope=m.sections.some(s=>s.id==='scope'),hasFeatures=m.sections.some(s=>s.id==='features');
  return [s.id==='features'&&hasScope?accountSummary+content:s.id==='scope'&&!hasFeatures?content+accountSummary:content,...continuations.map(part=>logicHTML(s)+part)];
 });
 if(!m.selectedSectionIds||m.selectedSectionIds.includes('toc'))pieces.splice(m.sections.some(s=>s.id==='cover')?1:0,0,tocHTML(m));
 const front=pieces.map(content=>content.includes('id="report-cover"')||content.includes('class="report-toc"'));
 let bodyPage=0;const bodyNumbers=pieces.map((_,i)=>front[i]?null:++bodyPage);
 const tocPages=new Map();
 pieces.forEach((content,i)=>{for(const match of content.matchAll(/<(?:h2|h3)[^>]*>([^<]+)<\/(?:h2|h3)>/g))if(!tocPages.has(match[1]))tocPages.set(match[1],bodyNumbers[i]);});
 for(let i=0;i<pieces.length;i++)if(pieces[i].includes('class="report-toc"'))pieces[i]=pieces[i].replace(/(<li[^>]*><a[^>]*>)([^<]+)(<\/a>)(<\/li>)/g,(_,open,title,close,end)=>open+title+close+'<span class="report-toc-dots"></span><span class="report-toc-page">'+(tocPages.get(title)||'')+'</span>'+end);
 return pieces.map((content,i)=>'<div class="report-sheet" data-report-front="'+front[i]+'"'+(bodyNumbers[i]===1?' data-report-body-first="true"':'')+'>'+'<div class="report-sheet-header"><span>毕马威审计罗盘</span><span>综合分析报告（年审适用）</span></div>'+
  '<div class="report-sheet-content" data-report-front="'+front[i]+'">'+content+'</div><footer class="report-sheet-footer"><span>审计项目资料</span><span>'+esc(rangeLabel(m.from,m.to))+'</span><span>'+(front[i]?'':'第 '+bodyNumbers[i]+' 页')+'</span></footer></div>').join('');
}
function render(m,{allRows=false,forExport=false}={}){
 renderAllRows=allRows;renderForExport=forExport;
 reportPagerTables=[];reportInteractiveTables=[];
 const full=(m.minimum||m.from)+'|'+(m.maximum||m.to);
 const first=Number((m.minimum||m.from).slice(0,4)),last=Number((m.maximum||m.to).slice(0,4));
 const presets=[['全部流水期间',full]];
 for(let y=first;y<=last+1;y++){
  const {from:start,to:end}=fiscalPeriod(y,m.cut);
  if(end>=(m.minimum||m.from)&&start<=(m.maximum||m.to))presets.push([y+' 财年 · '+start+' ～ '+end,start+'|'+end,y]);
 }
 const current=m.from+'|'+m.to;
 const output='<section class="panel report-controls"><div class="panel-heading"><h3>选择分析与导出期间</h3><div class="actions"><button id="reportPrint"'+(m.sections.length?'':' disabled')+'>打印横版报告</button><button id="reportWord"'+(m.sections.length?'':' disabled')+'>下载 Word 报告</button><button class="primary" id="reportExport"'+(m.sections.length?'':' disabled')+'>下载本期核验 Excel</button></div></div><div class="report-inputs"><label>金额口径<select id="reportCurrency"><option value="">折算人民币（CNY）</option>'+m.currencies.map(code=>'<option value="'+code+'"'+(code===m.originalCurrency?' selected':'')+'>原币 · '+code+'</option>').join('')+'</select></label><label>财年截止日<select id="reportCut">'+['03-31','06-30','09-30','12-31'].map(c=>'<option'+(c===m.cut?' selected':'')+'>'+c+'</option>').join('')+'</select></label><label>期间快捷选择<select id="reportPreset"><option value="">自定义日期</option>'+presets.map(([label,value,year])=>'<option value="'+esc(value)+'"'+(year?' data-year="'+year+'"':'')+(value===current?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label><label>开始日期<input id="reportFrom" type="date" value="'+esc(m.from)+'"></label><label>结束日期<input id="reportTo" type="date" value="'+esc(m.to)+'"></label><button id="reportApply">应用区间</button></div><p class="muted">Word 目录需在打开后更新域，页码按正文重新计算，封面和目录不编号。日期包含首尾两天。财年按结束年份命名；导出使用已应用的期间，含核验表及本期流水。上传整套数据请使用「测试数据生成 → 导出测试数据」。</p>'+ '<details class="report-macro-tools"><summary>目录更新宏设置（首次配置后，允许宏时打开报告自动弹窗）</summary><p>先下载配置包，在 Word 中保存宏模板，再导入此处。导入后下载的报告为 .docm；未导入时仍为 .docx。宏受 Word 安全设置控制。</p><div class="actions"><button id="reportMacroKit">下载宏代码与设置说明</button><button id="reportMacroTemplate">导入宏模板（.docm / .dotm）</button><span>'+ (g.AuditWord?.hasMacroTemplate()?'本次会话已加载宏模板':'尚未加载宏模板')+'</span></div></details>'+sectionPicker(m)+'<nav class="report-index" aria-label="报告章节">'+m.sections.filter(s=>s.id!=='background').map(s=>'<a href="#report-'+s.id+'">'+esc(s.title.startsWith('综合')?'封面':s.title.split(' ').slice(0,2).join(' '))+'</a>').join('')+'</nav></section>'+
 '<article class="report-document" aria-label="综合分析报告预览">'+(m.sections.length?amountLabels(reportPages(m),m.originalCurrency):'<p class="empty">请至少勾选一个报告章节，预览和导出将按所选内容生成。</p>')+'</article>';
 renderAllRows=false;renderForExport=false;
 return output;
}
function workbook(m){
 const tables={};
 for(const s of m.sections){
  for(const t of s.tables)tables[t.name]=exportReportTable(t,m.originalCurrency);
  for(const c of s.charts){
   if(!tables[c.name])tables[c.name]=exportReportTable({headers:['类别','对手方数量','流入金额（百万元）','流入笔数','流入占比','流出金额（百万元）','流出笔数','流出占比'],rows:c.rows},m.originalCurrency);
  }
 }
 return {...tables,'核验口径':{headers:['章节','口径'],rows:[...m.sections.map(s=>[s.title,amountLabels(s.note,m.originalCurrency)]),...m.sections.flatMap(s=>s.tables.filter(t=>t.note).map(t=>[t.name,amountLabels(t.note,m.originalCurrency)])),['分析期间',rangeLabel(m.from,m.to)],['金额口径',m.originalCurrency?'原币 '+m.originalCurrency:'折算人民币'],['测试汇率',m.fxLabel],['大额判断阈值（CNY）',currency.format(m.threshold)]]},'本期流水明细':m.flow};
}
g.AuditReport={theme,compute,render,workbook,selectSections,fiscalPeriod,mountPagers,parseCriteria,formatTables};
})(globalThis);
