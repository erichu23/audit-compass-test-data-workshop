(function(g){
'use strict';
const R=g.AuditRegistry,norm=v=>String(v??'').normalize('NFKC').replace(/[\s*＊()（）]/g,'').toLowerCase();
const aliases={name:['企业名称','公司名称','交易对手方名称','companyName'],formed:['成立时间','成立日期'],start:['经营起始日期','经营开始日期','营业开始日期','营业期限自','经营期限自'],end:['经营截止日期','经营结束日期','营业结束日期','营业期限至','经营期限至'],days:['经营天数','存续天数'],insured:['参保人数','社保人数','参保人员'],currency:['注册资本币种','资本币种'],capital:['注册资本万元','注册资本元','注册资本亿元','注册资本百万'],paidIn:['实缴资本','实收资本','实缴资本万元','实缴资本元','实缴资本亿元'],cases:['诉讼案件数量','诉讼次数','诉讼数','案件数量'],penalties:['行政处罚次数','行政处罚个数','处罚数量'],dishonest:['是否失信','是否失信被执行人','失信被执行人数量'],credit:['统一信用代码','社会信用代码'],tax:['纳税识别号'],kind:['企业类型'],industry:['所属行业'],owners:['股东信息'],directors:['董事信息'],supervisors:['监事信息'],executives:['高管信息']};
function recommend(headers,saved){const map={};for(const [id,label] of R.fields){if(Object.prototype.hasOwnProperty.call(saved?.fields||{},id)&&saved.fields[id]===null){map[id]=-1;continue;}const prior=saved?.fields?.[id],hits=headers.map((h,i)=>({h,i})).filter(x=>prior?norm(x.h)===norm(prior.header):[label,...(aliases[id]||[])].some(a=>norm(a)===norm(x.h)));map[id]=prior?(hits[prior.occurrence||0]?.i??-1):hits.length===1?hits[0].i:-1;}return map;}
function preset(headers,map,options){return {type:'AuditCompass.RegistryMapping',version:1,options,fields:Object.fromEntries(R.fields.map(([id])=>{const i=map[id];return [id,Number.isInteger(i)&&i>=0?{header:headers[i],occurrence:headers.slice(0,i).filter(h=>norm(h)===norm(headers[i])).length}:null];}))};}
function scaleFor(header){const s=String(header||'');return s.includes('亿元')?1e8:s.includes('万元')?1e4:s.includes('百万')?1e6:1;}
function normalizeDate(v,epoch=25569){if(typeof v==='number')return new Date(Math.round((v-epoch)*86400000)).toISOString().slice(0,10);let s=String(v).trim().replace(/年|月/g,'-').replace(/日/g,'').replace(/\//g,'-');s=s.split(/[T\s]/)[0];const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'):s;}
function convert(table,map,options={}){
 const errors=[],warnings=[],found=new Map(),duplicates=options.duplicates||'error';if(!['error','first','last'].includes(duplicates))throw Error('重复名称处理方式无效。');
 for(const id of ['capital','paidIn'])if(![1,10000,1000000,100000000].includes(Number(options[id+'Scale']||1)))throw Error('资本单位设置无效。');
 if(!Number.isInteger(map.name)||map.name<0||map.name>=table.headers.length){
  return {records:[],errors,warnings:['请选择企业名称对应的来源列后再导入。'],sourceRows:table.rows.length};
 }
 let skipped=0;
 for(const [i,row] of table.rows.entries()){
  if(!R.hasImportName(row[map.name])){skipped++;continue;}
  try{
   const input={};for(const [id,label,type] of R.fields){const c=map[id];if(c!==undefined&&c!==-1&&(!Number.isInteger(c)||c<0||c>=table.headers.length))throw Error(label+'的映射列无效');let v=c===undefined||c===-1?null:row[c]??null;
    if(v==null||String(v).trim()===''||['-','—','未提供','不详'].includes(String(v).trim()))v=null;
    else if(['credit','tax'].includes(id)&&typeof v==='number'&&!Number.isSafeInteger(v))throw Error(label+'超过Excel数字精度，请在来源文件中使用文本');
    else if(id==='end'){
     if(typeof v==='number'&&Number.isFinite(new Date(Math.round((v-(options.epoch||25569))*86400000)).getTime()))v=normalizeDate(v,options.epoch||25569);
     else if(/^\s*\d{4}[-/年]\d{1,2}[-/月]\d{1,2}(?:日|\s|T|$)/.test(String(v)))v=normalizeDate(v,options.epoch||25569);
    }
    else if(type==='date')v=normalizeDate(v,options.epoch||25569);
    else if(type==='integer'||type==='number'){v=typeof v==='string'?v.trim().replace(/[,，]/g,''):v;v=Number(v);if(id==='capital'||id==='paidIn')v*=Number(options[id+'Scale']||1);}
    else if(type==='flag'){const raw=String(v).trim().toLowerCase();v=['是','yes','true','有'].includes(raw)||/^\d+$/.test(raw)&&Number(raw)>0?'是':['否','no','false','无','0'].includes(raw)?'否':v;}
    if(id==='currency'){v=v||options.defaultCurrency||null;if(v){const names={'人民币':'CNY','人民币元':'CNY','美元':'USD','港币':'HKD','港元':'HKD','日元':'JPY','欧元':'EUR','英镑':'GBP','澳元':'AUD','加元':'CAD','加拿大元':'CAD','新加坡元':'SGD','瑞士法郎':'CHF'};v=names[String(v).trim()]||String(v).trim().toUpperCase();if(v==='RMB')v='CNY';}}
    input[id]=v;
   }
   const r=R.readRecord(input);if(found.has(r.name)){if(duplicates==='error')throw Error('对手方名称重复：'+r.name);warnings.push('第'+(i+2)+'行名称重复，按'+(duplicates==='first'?'第一条':'最后一条')+'保留。');if(duplicates==='first')continue;}
   found.set(r.name,r);
  }catch(e){errors.push('第'+(i+2)+'行：'+e.message);}
 }
 if(skipped)warnings.unshift('已跳过 '+skipped+' 行没有对手方名称的记录。');
 if(!table.rows.length)errors.push('所选工作表没有数据行。');
 return {records:[...found.values()],errors,warnings,sourceRows:table.rows.length};
}
function merge(existing,records,mode,fieldIds=R.fields.map(([id])=>id)){if(mode==='replace')return records.map(r=>({...r}));if(mode!=='update')throw Error('请选择有效的导入方式。');const updates=new Map(records.map(r=>[r.name,r])),names=new Set(existing.map(r=>String(r.name??'').trim()));return [...existing.map(r=>{const next=updates.get(String(r.name??'').trim());if(!next)return {...r};const merged={...r,...Object.fromEntries(fieldIds.map(id=>[id,next[id]]))};R.readRecord(merged);return merged;}),...records.filter(r=>!names.has(r.name)).map(r=>({...r}))];}
g.AuditRegistryMapping={recommend,preset,scaleFor,convert,merge};
})(globalThis);
