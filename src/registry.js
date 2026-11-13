(function(g){
'use strict';
const fields=[
 ['name','对手方名称'],['formed','成立日期','date'],['start','经营开始时间','date'],['end','经营结束时间','date'],
 ['term','营业期限'],['days','经营天数','integer'],['status','经营状态'],['size','人员规模'],['insured','参保人数','integer'],
 ['legal','法人类型'],['credit','统一社会信用代码'],['tax','纳税人识别号'],['kind','公司类型'],['currency','注册资本币种'],
 ['capital','注册资本','number'],['paidIn','实缴资本（同注册资本币种）','number'],['industry','行业'],['scope','经营范围'],['address','注册地址'],['contact','企业联系方式'],
 ['directors','董事'],['supervisors','监事'],['executives','高管'],['staff','主要人员'],['owners','股东'],
 ['dishonest','失信被执行人','flag'],['cases','诉讼数量','integer'],['penalties','行政处罚数量','integer']
];
const metrics=[
 ['days','经营天数','天',[365,730,1095]],['insured','参保人数','人',[10,50,100]],
 ['capital','注册资本','人民币元',[100000,500000,1000000]],['cases','诉讼数量','件',[1,3,10]],['paidRatio','实缴／注册资本','%',[10,20,50]]
];
const clean=v=>String(v??'').trim();
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const oneDay=86400000;
const INTERVAL_VERSION=3;
const equalBounds=(a,b)=>Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>Number(v)===b[i]);
function migrateSettings(settings={}){
 const next={...settings,registryBounds:{...settings.registryBounds}};
 const legacyCapital=[1000000,5000000,20000000,50000000];
 if((settings.registryIntervalVersion??0)<2&&equalBounds(next.registryBounds.capital,legacyCapital)){
  next.registryBounds.capital=[100000,500000,1000000];
 }
 for(const [id,,unit,defaults] of metrics){
  const value=next.registryBounds[id]??defaults;
  next.registryBounds[id]=parseBounds(Array.isArray(value)?value.join(','):value,unit);
 }
 next.registryIntervalVersion=INTERVAL_VERSION;
 return next;
}
function parseBounds(value,unit){
 const values=clean(value).split(/[\s,，、;；]+/).filter(Boolean).map(Number);
 if(!values.length||values.length>12||values.some((n,i)=>!Number.isFinite(n)||n<=0||(!['人民币元','%'].includes(unit)&&!Number.isInteger(n))||(unit==='%'&&n>100)||(i&&n<=values[i-1])))throw Error('请输入 1–12 个严格递增的正数，整数指标请使用整数。');
 return values;
}
const boundsFor=(id,settings={})=>settings[id]||metrics.find(m=>m[0]===id)[3];
function intervalLabels(bounds,id){
 if(id==='days'&&equalBounds(bounds,[365,730,1095]))return ['<1年','1～<2年','2～<3年','≥3年','未提供'];
 if(id==='insured'&&equalBounds(bounds,[10,50,100]))return ['<10人','10～<50人','50～<100人','≥100人','未提供'];
 const fmt=id==='capital'?(n=>n/1000000+'百万'):(n=>n.toLocaleString('zh-CN',{maximumFractionDigits:8}));
 return ['<'+fmt(bounds[0]),...bounds.slice(1).map((n,i)=>fmt(bounds[i])+'～<'+fmt(n)),'≥'+fmt(bounds.at(-1)),'未提供'];
}

function value(record,id,asOf,rates={}){
 if(!record)return null;
 if(id==='days'){
  const start=record.start;
  if(!date(start)||!date(asOf))return null;
  return asOf<start?null:(Date.parse(asOf)-Date.parse(start))/oneDay;
 }
 if(id==='paidRatio')return record.capital>0&&record.paidIn!=null?record.paidIn*100/record.capital:null;
 if(id==='capital'||id==='paidIn'){
  const code=clean(record.currency).toUpperCase(),rate=['CNY','RMB'].includes(code)?1:rates[code];
  return record[id]!=null&&Number.isFinite(rate)&&rate>0?Math.round(record[id]*rate*100)/100:null;
 }
 return record[id]??null;
}
function automaticDates(records,asOf){
 if(!date(asOf))throw Error('请输入有效的报告结束日期。');
 const rows=records.map((record,index)=>{
  const calculated=value(record,'days',asOf),raw=record.days;
  const hasOriginal=raw!=null&&clean(raw)!==''&&Number.isFinite(Number(raw));
  const status=calculated==null?'skip':hasOriginal&&Number(raw)===calculated?'same':'change';
  const reason=calculated==null?(!date(record.start)?'经营开始时间缺失或无效，无法计算':'经营开始时间晚于报告结束日期，无法计算'):status==='same'?'按原经营开始时间计算，与导入天数一致':'按原经营开始时间重新计算，不使用导入天数';
  return {index,name:record.name||'未填写名称',start:record.start??'',originalDays:raw??null,calculated,difference:calculated!=null&&hasOriginal?calculated-Number(raw):null,status,reason};
 });
 const plan={asOf,rows,changed:rows.filter(r=>r.status==='change').length,unchanged:rows.filter(r=>r.status==='same').length,skipped:rows.filter(r=>r.status==='skip').length};
 return {records:records.map((record,index)=>({...record,days:rows[index].calculated})),plan};
}
function dayCalculationTable(plan){
 const labels={change:'已重新计算',same:'与原值一致',skip:'无法计算'};
 return {headers:['对手方名称','原经营开始时间（保留）','导入原经营天数','报告结束日期','新计算经营天数','新值－原天数','计算状态','说明'],rows:plan.rows.map(r=>[r.name,r.start,r.originalDays,plan.asOf,r.calculated,r.difference,labels[r.status],r.reason])};
}
function riskCounts(records){
 const count=v=>v==null||clean(v)===''?null:Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
 const rows=records.map((record,index)=>({index,name:record.name||'未填写名称',cases:count(record.cases),dishonest:record.dishonest==='是'?1:record.dishonest==='否'?0:null,penalties:count(record.penalties),rawCases:record.cases??null,rawDishonest:record.dishonest??null,rawPenalties:record.penalties??null}));
 return {rows,cases:rows.reduce((n,r)=>n+(r.cases??0),0),dishonest:rows.reduce((n,r)=>n+(r.dishonest??0),0),penalties:rows.reduce((n,r)=>n+(r.penalties??0),0),missing:rows.filter(r=>r.cases==null||r.dishonest==null||r.penalties==null).length};
}
function riskTables(records,asOf){
 if(!date(asOf))throw Error('请输入有效的报告结束日期。');
 const counts=riskCounts(records);
 if(counts.cases+counts.dishonest+counts.penalties>250000)throw Error('本次合规明细超过250,000条，请分批选择工商档案导出；原数量不会被截断或修改。');
 const lawsuits={headers:['对手方名称','工商记录序号','诉讼明细编号','案号','案件类型','案由','立案日期','当事人身份','案件状态'],rows:[]};
 const dishonest={headers:['失信被执行人名称','工商记录序号','失信明细编号','执行案号','立案日期','执行法院','履行情况','失信情形','公布日期'],rows:[]};
 const penalties={headers:['对手方名称','工商记录序号','行政处罚明细编号','决定文书号','处罚机关','处罚类型','处罚事由','处罚金额','处罚决定日期'],rows:[]};
 const check={headers:['对手方名称','工商记录序号','原诉讼数量','生成诉讼条数','诉讼校验','原失信标记','生成失信条数','失信校验','原行政处罚数量','生成行政处罚条数','处罚校验'],rows:[]};
 const year=asOf.slice(0,4),pad=n=>String(n).padStart(6,'0');
 const ago=n=>{const d=new Date(Date.parse(asOf)-n*oneDay);return d.getUTCFullYear()<1?asOf:d.toISOString().slice(0,10);};
 const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(16).padStart(8,'0');};
 for(const r of counts.rows){
  const base=hash(r.name)+'-'+pad(r.index+1);
  for(let i=0;i<(r.cases??0);i++)lawsuits.rows.push([r.name,r.index+1,'TEST-LIT-'+base+'-'+pad(i+1),'（测试）'+year+'民初'+pad(i+1)+'号',['民事案件','执行案件','行政案件'][i%3],['买卖合同纠纷','服务合同纠纷','租赁合同纠纷'][i%3],ago((i*17+r.index*3)%730),i%2?'原告':'被告',['审理中','已结案','执行中'][i%3]]);
  if(r.dishonest===1)dishonest.rows.push([r.name,r.index+1,'TEST-DISH-'+base,'（测试）'+year+'执'+pad(r.index+1)+'号',ago(r.index%365),'测试人民法院','全部未履行','有履行能力而拒不履行生效法律文书确定义务',ago(r.index%180)]);
  for(let i=0;i<(r.penalties??0);i++)penalties.rows.push([r.name,r.index+1,'TEST-PEN-'+base+'-'+pad(i+1),'测试罚字〔'+year+'〕'+pad(i+1)+'号','测试市场监督管理局',['警告','罚款','责令改正'][i%3],['未按规定公示信息','经营信息登记不完整','违反相关经营管理规定'][i%3],i%3===1?1000+((r.index+i)*137)%49000:0,ago((i*23+r.index*5)%365)]);
  check.rows.push([r.name,r.index+1,r.rawCases,r.cases??0,r.cases==null?'数量缺失或无效，未补值':'一致',r.rawDishonest,r.dishonest??0,r.dishonest==null?'标记缺失，未补值':'一致',r.rawPenalties,r.penalties??0,r.penalties==null?'数量缺失或无效，未补值':'一致']);
 }
 return {'诉讼明细':lawsuits,'失信被执行人明细':dishonest,'行政处罚明细':penalties,'合规数量核验':check};
}
function bucket(n,bounds,id){
 if(n==null||!Number.isFinite(n)||n<0)return bounds.length+1;
 const index=bounds.findIndex(edge=>n<edge);
 return index<0?bounds.length:index;
}
function readRecord(input){
 const out={};
 for(const [k,label,type] of fields){
  const v=clean(input[k]);
  if(!v){out[k]=null;continue;}
  if(type==='date'&&!date(v))throw Error(label+'请输入有效日期。');
  if(type==='integer'||type==='number'){
   if(!Number.isFinite(Number(v))||Number(v)<0||type==='integer'&&!Number.isInteger(Number(v)))throw Error(label+'请输入非负'+(type==='integer'?'整数':'数值')+'。');
   out[k]=Number(v);
  }else out[k]=v;
 }
 if(!out.name)throw Error('请填写对手方名称。');
 if(out.start&&out.end&&out.end<out.start)throw Error('经营结束时间不能早于经营开始时间。');
 if(out.currency){out.currency=out.currency.toUpperCase();if(!/^[A-Z]{3}$/.test(out.currency))throw Error('注册资本币种请填写三位代码。');}
 if(out.dishonest&&!['是','否'].includes(out.dishonest))throw Error('失信被执行人请填写是或否。');
 return out;
}
function generate(names,asOf,settings={},offset=0){
 if(!date(asOf))throw Error('请输入有效的样本基准日。');
 const sample=(id,i)=>{
  const b=boundsFor(id,settings),j=i%(b.length+1);
  const lower=j===0?0:b[j-1],upper=b[j]??(lower+Math.max(5,lower*.25));
  if(i<b.length+1)return j===0?Math.max(0,b[0]-1):lower;
  const n=lower+(upper-lower)*((i*17)%93+3)/100;
  return ['capital','paidRatio'].includes(id)?Math.round(n*100)/100:Math.floor(n);
 };
 const people=['秦知禾','梁若宁','沈宜安','林景辰','周悦岚','顾昕远'];
 const sectors=[['批发和零售业','日用品销售；国内贸易代理'],['制造业','通用零部件制造；产品销售'],['商务服务业','企业管理咨询；供应链管理服务'],['信息技术服务业','软件开发；信息技术咨询服务']];
 return names.map((name,i)=>{
  const index=i+offset;
  const days=sample('days',i),insured=sample('insured',i),capital=sample('capital',i),cases=sample('cases',i);
  const end=index%8===7?new Date(Date.parse(asOf)-30*oneDay).toISOString().slice(0,10):null;
  const begin=new Date(Date.parse(end||asOf)-days*oneDay);
  if(!Number.isFinite(begin.getTime())||begin.getUTCFullYear()<1)throw Error('经营天数分界值超过基准日可生成的日期范围。');
  const start=begin.toISOString().slice(0,10);
  const [industry,scope]=sectors[index%sectors.length],person=j=>people[(index+j)%people.length];
  const credit='91000000'+String(index+1).padStart(10,'0');
  return {name,formed:start,start,end,term:end?start+' 至 '+end:'长期',days:null,status:end?'注销':'存续',
   size:insured<10?'少于10人':insured<50?'10–49人':insured<100?'50–99人':'100人以上',insured,
   legal:'企业法人',credit,tax:credit,kind:'有限责任公司',currency:'CNY',capital,paidIn:Math.round(capital*sample('paidRatio',i))/100,industry,scope,
   address:'高新技术产业园创新路'+(index+1)+'号',contact:'contact'+(index+1)+'@example.com',
   directors:person(0),supervisors:person(1),executives:person(2),staff:[person(0),person(1),person(2)].join('、'),
   owners:[person(0),person(3)].join('、'),dishonest:index%9===8?'是':'否',cases,penalties:index%8===4?1:index%13===7?2:0};
 });
}
function table(records,asOf,rates){
 return {headers:fields.map(x=>x[1]),rows:records.map(r=>fields.map(([k])=>r[k]))};
}
g.AuditRegistry={INTERVAL_VERSION,migrateSettings,fields,metrics,boundsFor,intervalLabels,value,bucket,readRecord,parseBounds,generate,table,automaticDates,dayCalculationTable,riskCounts,riskTables};
})(globalThis);
