(function(g){
'use strict';
const norm=s=>String(s??'').replace(/[\s*＊]/g,'').replace(/（/g,'(').replace(/）/g,')');
function prepare(entries,current,mode='new'){
 if(!['new','replace'].includes(mode))throw Error('请选择有效的导入方式。');
 const schema=g.BASELINE||g.AuditBaseline,keys=Object.keys(schema),data=mode==='replace'?g.AuditEngine.copy(current):Object.fromEntries(keys.map(k=>[k,{headers:[...schema[k].headers],rows:[]}]));
 const summaries=[],warnings=[],ignored=[],received=new Map();let registry=null,rawRegistry=null;
 function appendRegistry(existing,records){if(existing===null)return records;const seen=new Set(existing.map(r=>JSON.stringify(r))),fresh=records.filter(r=>!seen.has(JSON.stringify(r)));if(fresh.length<records.length)warnings.push('工商档案：跨文件相同记录 '+(records.length-fresh.length)+' 条仅导入一次。');return existing.concat(fresh);}
 for(const {file,name,table:t} of entries){
  if(/(?:^|\/)核验资料\//.test(file)||/核验预期值/.test(file)){ignored.push(file+' / '+name);continue;}
  const heads=t.headers.map(norm),duplicates=heads.filter((h,i)=>heads.indexOf(h)!==i);
  if(duplicates.length)throw Error(file+' / '+name+'有重复表头：'+duplicates.join('、'));
  const column=new Map(heads.map((h,i)=>[h,i]));
  const base=String(file).split('/').at(-1).replace(/\.xlsx$/i,'');
  let key=keys.find(k=>norm(k)===norm(name)||norm(k)===norm(base));
  const raw=name==='导入原始工商档案',reg=raw||name==='对手方工商档案'||(!key&&column.has(norm('对手方名称'))&&column.has(norm('经营开始时间'))&&column.has(norm('注册资本')));
  if(reg){
   if(!column.has(norm('对手方名称')))throw Error(file+' / '+name+'缺少对手方名称列。');
   const records=t.rows.map(row=>g.AuditRegistry.readRecord(Object.fromEntries(g.AuditRegistry.fields.map(([id,label])=>[id,row[column.get(norm(label))]]))));
   if(raw)rawRegistry=appendRegistry(rawRegistry,records);else registry=appendRegistry(registry,records);
   summaries.push({file,sheet:name,target:raw?'工商原始档案':'对手方工商档案',count:records.length});continue;
  }
  if(!key){const candidates=keys.filter(k=>schema[k].headers.every(h=>column.has(norm(h))));if(candidates.length===1)key=candidates[0];}
  if(!key){ignored.push(file+' / '+name);continue;}
  const expected=schema[key].headers;
  const required=key===g.AuditEngine.KEYS.flow?expected.slice(0,8).concat([expected[8],expected[10]]):expected.filter(h=>h.includes('*'));
  const missing=required.filter(h=>!column.has(norm(h)));
  if(missing.length)throw Error(file+' / '+name+'缺少必需列：'+missing.join('、'));
  const absent=expected.filter(h=>!column.has(norm(h))),extra=t.headers.filter(h=>!expected.some(e=>norm(e)===norm(h)));
  if(absent.length)warnings.push(key+'：'+absent.length+'列未提供，填充为空。');
  if(extra.length)warnings.push(file+' / '+name+'：额外列不进入平台模板：'+extra.join('、'));
  const rows=t.rows.map((row,i)=>expected.map(h=>{
   let v=row[column.get(norm(h))]??null;
   if(v===null||v==='')return null;
   if(/账号|员工ID|编号|税号|流水识别号/.test(h)){
    if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error(file+' / '+name+'第'+(i+2)+'行的'+h+'超过Excel数字精度，请将原始账号改为文本后重新导入。');
    return String(v);
   }
   if(/金额|余额|发生额|限额|_PM|_AMPT|对账年份|总交易行数/.test(h)&&typeof v==='string'){
    const clean=v.trim().replace(/[,，]/g,'');if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean))return Number(clean);
   }
   return v;
  }));
  if(!received.has(key)){data[key]={headers:[...expected],rows:[]};received.set(key,0);}
  data[key].rows.push(...rows);received.set(key,received.get(key)+rows.length);
  summaries.push({file,sheet:name,target:key,count:rows.length});
 }
 if(!received.size&&registry===null&&rawRegistry===null)throw Error('没有识别到平台模板。请使用平台导出的Excel列名，或先下载空白模板填写。');
 if(rawRegistry!==null){registry=rawRegistry;warnings.push('工商数据优先使用“导入原始工商档案”，未将计算后的工商档案重复导入。');}
 const missing=keys.filter(k=>!received.has(k));
 const validation=g.AuditEngine.validate(data);
 const flow=data[g.AuditEngine.KEYS.flow],di=flow.headers.indexOf('交易日期'),dates=flow.rows.map(r=>String(r[di]||'').slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
 return {data,registry,summaries,warnings:[...warnings,...validation.warnings],errors:validation.errors,ignored,missing,mode,from:dates[0]||'',to:dates.at(-1)||''};
}
g.AuditTemplateImport={prepare};
})(globalThis);
