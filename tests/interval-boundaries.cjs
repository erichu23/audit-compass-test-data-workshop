const fs=require('fs'),vm=require('vm'),assert=require('assert');global.window=global;for(const n of ['baseline','engine','registry','report'])vm.runInThisContext(fs.readFileSync('src/'+n+'.js','utf8'));const E=AuditEngine,K=E.KEYS,R=AuditRegistry;
for(const [id,bounds,values] of [['days',[365,730,1095],[364,365,730,731,1095,1096]],['insured',[10,50,100],[9,10,50,51,100,101]],['capital',[100000,500000,1000000],[99999,100000,500000,500001,1000000,1000001]]]){
 assert.deepEqual(values.map(n=>R.bucket(n,bounds,id)),[0,1,2,2,3,3]);assert.equal(R.bucket(null,bounds,id),4);
 assert.equal(R.bucket(10,[10],id),1);assert(R.intervalLabels([10],id)[1].startsWith('≥'));
 assert(R.intervalLabels(bounds,id).at(-2).startsWith('≥'));assert(R.intervalLabels(bounds,id)[2].includes('<'));
}
const legacy=R.migrateSettings({registryIntervalVersion:2,registryBounds:{capital:[1000000,5000000,20000000,50000000]}});assert.deepEqual(legacy.registryBounds.capital,[1000000,5000000,20000000,50000000]);
const d=Object.fromEntries(Object.entries(BASELINE).map(([k,t])=>[k,{headers:t.headers,rows:[]}]));d[K.company].rows=[['本方',null,null,'母公司']];const registry=[];
const values=[999999.99,1000000,5000000,10000000,20000000,20000000.01];
values.forEach((v,i)=>{const r=Array(d[K.flow].headers.length).fill(null);Object.assign(r,{0:'本方',1:'001',2:'银行',3:'区间核验企业'+i,5:'2025-01-01',6:'12:00:00',7:'CNY',8:v,9:v,10:0,11:0,12:v,13:v});d[K.flow].rows.push(r);const days=[364,365,730,731,1095,1096][i];registry.push({name:r[3],start:new Date(Date.parse('2025-12-31')-days*86400000).toISOString().slice(0,10),insured:[9,10,50,51,100,101][i],capital:[99999,100000,500000,500001,1000000,1000001][i],currency:'CNY'});});
const before=JSON.stringify(d),m=AuditReport.compute(d,{from:'2025-01-01',to:'2025-12-31',registry,registryAsOf:'2025-12-31',threshold:50000});
const features=m.sections.find(s=>s.id==='features'),follow=m.sections.find(s=>s.id==='follow'),compliance=m.sections.find(s=>s.id==='compliance');
assert.deepEqual(features.charts.find(c=>c.name.startsWith('合并范围外')).rows.map(r=>r[1]),[1,1,1,1,2]);
assert.deepEqual(follow.charts.find(c=>c.name.startsWith('未识别')).rows.map(r=>r[1]),[2,1,1,2]);
for(const prefix of ['经营天数','参保人数','注册资本'])assert.deepEqual(compliance.charts.find(c=>c.name.startsWith(prefix)).rows.map(r=>r[1]),[1,1,2,2]);
for(const id of ['features','follow','compliance']){const html=AuditReport.render(AuditReport.selectSections(m,[id]),{allRows:true,forExport:true});assert(html.includes(id==='compliance'?'区间口径':'区间边界'));}
assert.equal(JSON.stringify(d),before);console.log('PASS: uniform left-closed/right-open intervals, exact cutoffs move to next bucket, 20m in last transaction bands, days/insured/capital distributions, custom legacy bounds retained, export notes and raw rows unchanged');
