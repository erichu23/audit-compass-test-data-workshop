const fs=require('fs'),vm=require('vm'),assert=require('assert');global.window=global;for(const n of ['baseline','engine','registry','report'])vm.runInThisContext(fs.readFileSync('src/'+n+'.js','utf8'));const E=AuditEngine,K=E.KEYS;
const d=Object.fromEntries(Object.entries(BASELINE).map(([k,t])=>[k,{headers:t.headers,rows:[]}]));d[K.company].rows=[['甲',null,null,'母公司'],['乙',null,null,'子公司']];
d[K.customer].rows=[['甲',null,'客户公司'],['甲',null,'双重公司']];d[K.supplier].rows=[['甲',null,'供应商公司'],['乙',null,'双重公司']];d[K.related].rows=[['甲','供应商公司','控股股东']];
for(const own of ['甲','乙'])for(const name of ['客户公司','供应商公司','双重公司','外部公司','']){const r=Array(d[K.flow].headers.length).fill(null);Object.assign(r,{0:own,1:'001',2:'银行',3:name,5:'2025-06-01',6:'12:00:00',7:'CNY',8:100,9:100,10:20,11:20,12:1000,13:1000});d[K.flow].rows.push(r);}
const before=JSON.stringify(d),m=AuditReport.compute(d,{from:'2025-01-01',to:'2025-12-31'}),cp=m.sections.find(s=>s.id==='counterparties'),conc=m.sections.find(s=>s.id==='concentration'),follow=m.sections.find(s=>s.id==='follow');
const expected={'客户公司':'客户','供应商公司':'供应商','双重公司':'客商一体','外部公司':'非客商','【对手方为空】':'非客商'};
for(const t of cp.tables.filter(t=>t.headers.includes('客商分类')))for(const r of t.rows)if(expected[r[1]])assert.equal(r[2],expected[r[1]]);
for(const row of conc.tables.at(-1).rows){const name=row[2]==='【对手方名称为空】'?'【对手方为空】':row[2];assert.equal(row[1],expected[name]);}
const supplier=cp.tables.find(t=>t.headers.includes('客商分类')).rows.find(r=>r[1]==='供应商公司');assert.equal(supplier[5],.0002);assert.equal(supplier[6],2);
const unknown=follow.tables.find(t=>t.name==='未识别客商关系明细');assert(!unknown.rows.some(r=>['供应商公司','客户公司','双重公司'].includes(r[0])));
const detail=conc.tables.at(-1).rows.filter(r=>r[2]==='供应商公司'&&r[0]==='流入');assert.equal(new Set(detail.map(r=>r[1])).size,1);assert.deepEqual(new Set(detail.map(r=>r[4])),new Set(['关联方','第三方']));
assert.equal(JSON.stringify(d),before);console.log('PASS: category unified across entities, cross-company customer+supplier becomes both, all amounts retained, blanks nonmerchant, follow-up excludes known merchants, relationship matching remains entity-specific, raw rows unchanged');
