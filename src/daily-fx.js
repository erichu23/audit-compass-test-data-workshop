(function(g){
'use strict';
const aliases={'人民币':'CNY','人民币元':'CNY','美元':'USD','美金':'USD','港币':'HKD','港元':'HKD','欧元':'EUR','日元':'JPY','英镑':'GBP','澳元':'AUD','澳大利亚元':'AUD','加拿大元':'CAD','加元':'CAD','新加坡元':'SGD','新元':'SGD','瑞士法郎':'CHF','韩元':'KRW','泰铢':'THB','新西兰元':'NZD','新台币':'TWD','越南盾':'VND','印度卢比':'INR','印尼盾':'IDR','印度尼西亚盾':'IDR','马来西亚林吉特':'MYR','马币':'MYR','澳门元':'MOP','澳门币':'MOP','菲律宾比索':'PHP','俄罗斯卢布':'RUB','卢布':'RUB','南非兰特':'ZAR','巴西雷亚尔':'BRL','墨西哥比索':'MXN','阿联酋迪拉姆':'AED','沙特里亚尔':'SAR','瑞典克朗':'SEK','挪威克朗':'NOK','丹麦克朗':'DKK','土耳其里拉':'TRY','波兰兹罗提':'PLN'};
const cache=new WeakMap(),own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function code(value){const text=String(value??'').trim();let c=aliases[text]||text.toUpperCase();if(c==='RMB')c='CNY';if(!/^[A-Z]{3}$/.test(c))throw Error('无法识别货币名称“'+text+'”，请填写USD、HKD、EUR等三位代码，或美元、港币、欧元等常用名称。');return c;}
function date(value){let s=String(value??'').trim().slice(0,10).replace(/\//g,'-');const m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);if(m)s=m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('汇率生效日期无效：'+value);return s;}
function detectMixedQuotes(table,currencyMap={}){
 const dateIndex=table.headers.indexOf('生效日期');
 const nameIndex=table.headers.indexOf('货币名称');
 const rateIndex=table.headers.indexOf('汇率');
 const groups=new Map();
 table.rows.forEach((row,index)=>{
  const name=String(row[nameIndex]??'').trim();
  if(!name)return;
  const currency=code(own(currencyMap,name)?currencyMap[name]:name);
  const rate=Number(String(row[rateIndex]??'').trim().replace(/[,，]/g,''));
  if(!groups.has(currency))groups.set(currency,[]);
  groups.get(currency).push({index,currency,date:row[dateIndex],rate});
 });
 const changes=[];
 for(const [currency,records] of groups){
  if(currency==='CNY'||records.length<2||records.some(row=>!Number.isFinite(row.rate)||row.rate<=0))continue;
  const sorted=[...records].sort((a,b)=>a.rate-b.rate);
  const split=sorted.findIndex((row,i)=>i>0&&row.rate/sorted[i-1].rate>=50);
  if(split<0)continue;
  const low=sorted.slice(0,split),high=sorted.slice(split);
  let closest=0;
  const proposed=high.map(row=>{
   const normalized=Number((row.rate/100).toPrecision(15));
   while(closest+1<low.length&&Math.abs(low[closest+1].rate-normalized)<=Math.abs(low[closest].rate-normalized))closest++;
   return {...row,normalized,reference:low[closest].rate};
  });
  if(proposed.every(row=>Math.abs(row.normalized/row.reference-1)<=0.05))changes.push(...proposed);
 }
 changes.sort((a,b)=>a.index-b.index);
 const replacements=new Map(changes.map(row=>[row.index,row.normalized]));
 const rows=table.rows.map((row,i)=>{
  if(!replacements.has(i))return row;
  const updated=[...row];
  updated[rateIndex]=replacements.get(i);
  return updated;
 });
 return {changes,table:{...table,rows}};
}
function parse(table,options={}){
 const columns=new Map(table.headers.map((v,i)=>[String(v).trim(),i]));for(const h of ['生效日期','货币名称','汇率'])if(!columns.has(h))throw Error('汇率模板缺少列：'+h);
 const found=new Map();let duplicates=0;
 for(const [i,row] of table.rows.entries()){
  try{const day=date(row[columns.get('生效日期')]),source=String(row[columns.get('货币名称')]??'').trim(),currency=code(own(options.currencyMap||{},source)?options.currencyMap[source]:source),raw=row[columns.get('汇率')],rate=Number(typeof raw==='string'?raw.trim().replace(/[,，]/g,''):raw);if(!source)throw Error('货币名称不能为空');if(raw==null||raw===''||!Number.isFinite(rate)||rate<=0)throw Error('汇率必须是大于0的数字');if(/^(CNY|RMB|人民币|人民币元)$/i.test(source)&&currency!=='CNY')throw Error('人民币不能映射为其他币种');if(currency==='CNY'&&rate!==1)throw Error('人民币汇率固定为1');const key=day+'|'+currency;
   if(found.has(key)){if(found.get(key).rate!==rate)throw Error('同日同币种汇率冲突：'+key);const previous=found.get(key);previous.names=[...new Set([...(previous.names||[]),previous.name,source])];duplicates++;continue;}
   found.set(key,{date:day,currency,rate,name:String(row[columns.get('货币名称')]).trim()});
  }catch(e){throw Error('汇率表第'+(i+2)+'行：'+e.message);}
 }
 if(!found.size)throw Error('汇率表没有数据。');return {records:[...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.currency.localeCompare(b.currency)),duplicates};
}
function index(records){if(cache.has(records))return cache.get(records);const byCode=new Map();if(!Array.isArray(records)||!records.length)throw Error('每日汇率主档为空');for(const r of records){if(date(r.date)!==r.date||code(r.currency)!==r.currency||!Number.isFinite(r.rate)||r.rate<=0)throw Error('每日汇率项目记录无效');if(!byCode.has(r.currency))byCode.set(r.currency,new Map());const days=byCode.get(r.currency);if(days.has(r.date)&&days.get(r.date)!==r.rate)throw Error('每日汇率配置存在冲突');days.set(r.date,r.rate);}const out=new Map([...byCode].map(([c,days])=>[c,[...days].sort(([a],[b])=>a.localeCompare(b))]));cache.set(records,out);return out;}
function attach(fixed,records,options={}){
 const rates={...fixed},units={...(options.units||{})},match=options.match||'exact';if(!['exact','previous','original'].includes(match)||Object.values(units).some(n=>!Number.isFinite(Number(n))||Number(n)<=0))throw Error('每日汇率报价单位或匹配规则无效');
 const idx=index(records),names=new Map();for(const r of records){for(const original of [r.name,...(Array.isArray(r.names)?r.names:[])]){const name=String(original??'').trim().toUpperCase();if(!name)continue;if(names.has(name)&&names.get(name)!==r.currency)throw Error('同一币种名称映射冲突：'+name);let standard=null;try{standard=code(name);}catch{}if(standard&&standard!==r.currency)throw Error('已识别币种名称不能映射为其他币种：'+name);names.set(name,r.currency);}}for(const [c,items] of idx)if(c!=='CNY'&&!own(rates,c))rates[c]=items.at(-1)[1]/Number(units[c]||1);
 Object.defineProperty(rates,'dailyFx',{value:{records,units,match,index:idx,names},enumerable:false});return rates;
}
function resolve(rates,day,currency){
 const rawCode=String(currency??'').trim().toUpperCase();let c=rawCode;if(rates?.dailyFx){c=rates.dailyFx.names.get(rawCode)||rawCode;try{c=code(c);}catch{}}if(c==='CNY'||c==='RMB')return {rate:1,date:String(day).slice(0,10),source:'人民币固定为1'};
 const cfg=rates?.dailyFx;if(!cfg)return {rate:Number.isFinite(rates?.[c])&&rates[c]>0?rates[c]:null,date:'',source:'固定汇率'};
 const list=cfg.index.get(c)||[],target=String(day??'').slice(0,10);let low=0,high=list.length-1,hit=-1;while(low<=high){const mid=(low+high)>>1;if(list[mid][0]<=target){hit=mid;low=mid+1;}else high=mid-1;}
 if(hit<0||(cfg.match!=='previous'&&list[hit][0]!==target))return cfg.match==='original'?{rate:1,date:'',source:'缺少当日汇率，按原币数值计入（未折算）'}:{rate:null,date:'',source:'缺少每日汇率'};
 return {rate:list[hit][1]/Number(cfg.units[c]||1),date:list[hit][0],source:cfg.match==='previous'?'最近生效汇率':'交易当日汇率',quote:list[hit][1],unit:Number(cfg.units[c]||1)};
}
function coverage(rows,rates){const missing=new Map();for(const r of rows){const hit=resolve(rates,r[5],r[7]);if(hit.rate==null){const k=String(r[5]).slice(0,10)+'|'+String(r[7]);if(!missing.has(k))missing.set(k,{date:String(r[5]).slice(0,10),currency:String(r[7]),count:0});missing.get(k).count++;}}return [...missing.values()];}
function assertCoverage(rows,rates){if(!rates?.dailyFx)return;const missing=coverage(rows,rates);if(missing.length)throw Error('每日汇率缺失 '+missing.length+' 个日期／币种组合，例如 '+missing[0].date+' '+missing[0].currency+'。请补齐汇率或调整匹配规则；未使用固定汇率替代。');}
function table(records){return {headers:['生效日期','货币名称','汇率'],rows:records.map(r=>[r.date,r.currency,r.rate])};}
function trace(rows,rates,sourceRows=rows){const sourceIndex=new Map(sourceRows.map((r,i)=>[r,i+2]));return {headers:['源流水行','流水识别号','本方名称','本方账号','交易日期','币种','原币流入金额','原币流出金额','原币交易后余额','汇率生效日期','实际汇率（1单位原币兑人民币）','匹配来源','换算人民币流入金额','换算人民币流出金额','换算人民币交易后余额','导入人民币流入金额（保留）','导入人民币流出金额（保留）','导入人民币交易后余额（保留）','报价单位','主档原始报价汇率'],rows:rows.map((r,i)=>{const hit=resolve(rates,r[5],r[7]),convert=j=>hit.rate==null?null:Math.round(Math.round(Number(r[j]||0)*100)*hit.rate)/100;return [sourceIndex.get(r),r[15],r[0],r[1],String(r[5]).slice(0,10),r[7],r[8],r[10],r[12],hit.date,hit.rate,hit.source,convert(8),convert(10),convert(12),r[9],r[11],r[13],hit.unit??null,hit.quote??null];})};}
function describe(rates){const c=rates?.dailyFx;return c?'每日汇率；'+(c.match==='previous'?'最近生效日期≤交易日期':'交易日期精确匹配')+'；报价单位：'+[...c.index.keys()].filter(k=>k!=='CNY').map(k=>k+'按'+Number(c.units[k]||1)+'单位原币报价').join('、')+'；人民币固定为1；'+(c.match==='original'?'缺少当日汇率的流水按原币数值计入，可能为人民币与未折算原币混合口径。':'未命中不使用固定汇率。'):'';}
g.AuditDailyFx={code,detectMixedQuotes,parse,attach,resolve,coverage,assertCoverage,table,trace,describe};
})(globalThis);
