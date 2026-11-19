const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
global.window=global;
for(const file of ['baseline','engine','registry','report']){
 vm.runInThisContext(fs.readFileSync('src/'+file+'.js','utf8'));
}
const K=AuditEngine.KEYS;
const data=Object.fromEntries(Object.entries(BASELINE).map(([name,t])=>[name,{headers:t.headers,rows:[]}]));
data[K.company].rows=[['本方',null,null,'母公司']];
data[K.employee].rows=[['本方','职员01','这是五字名']];
const sample=[['  欧阳小明  ',10],['测试有限公司',2],['这是五字名',20]];
const registry=sample.map(([name,cases])=>({
 name:name.trim(),cases,start:'2024-12-31',insured:3,capital:100000,paidIn:50000,currency:'CNY',
 dishonest:'是',penalties:1,industry:'测试行业'
}));
for(const [name] of sample){
 const row=Array(data[K.flow].headers.length).fill(null);
 Object.assign(row,{0:'本方',1:'001',3:name,5:'2025-01-01',6:'12:00:00',7:'CNY',8:100000,10:50000});
 data[K.flow].rows.push(row);
}
const before=JSON.stringify({data,registry});
const model=AuditReport.compute(data,{from:'2025-01-01',to:'2025-12-31',registry});
const compliance=model.sections.find(s=>s.id==='compliance');
const detail=compliance.tables.find(t=>t.name==='本期工商匹配明细');
assert.deepEqual(detail.rows.map(row=>row[0]),['测试有限公司']);
assert.equal(compliance.lawsuitCaseCount,2);
for(const chart of compliance.charts){
 assert.equal(chart.rows.reduce((n,row)=>n+row[1],0),1);
}
const focus=model.sections.find(s=>s.id==='focus').tables[0];
for(const [name,type] of [['欧阳小明','其他个人'],['这是五字名','员工']]){
 const row=focus.rows.find(row=>row[1]===name);
 assert.equal(row[focus.headers.indexOf('个人类型')],type);
 for(const field of ['诉讼案件数量','失信被执行人','行政处罚数量','经营天数','社保人数','注册资本']){
  assert.equal(row[focus.headers.findIndex(header=>header.startsWith(field))],'');
 }
}
assert.equal(JSON.stringify({data,registry}),before);
console.log('PASS: short names and identified employees excluded across registry matches and classifications, personal focus rows carry no registry fields, original records retained');
