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
const detail=conc.tables.at(-1).rows.filter(r=>r[2]==='供应商公司'&&r[0]==='流入');assert.equal(new Set(detail.map(r=>r[1])).size,1);assert.deepEqual(new Set(detail.map(r=>r[4])),new Set(['关联方']));
assert.equal(JSON.stringify(d),before);console.log('PASS: category unified across entities, cross-company customer+supplier becomes both, all amounts retained, blanks nonmerchant, follow-up excludes known merchants, relationship matching is name-based, raw rows unchanged');
d[K.related].rows=[['甲','供应商公司',null],['乙','外部公司','董事'],['甲','外部公司','控股股东']];
const changed=JSON.stringify(d),newReport=AuditReport.compute(d,{from:'2025-01-01',to:'2025-12-31'}),typeTable=newReport.sections.find(s=>s.id==='counterparties').tables.find(t=>t.headers.includes('客商分类'));
assert.equal(typeTable.rows.find(r=>r[1]==='供应商公司')[3],'其他');
const mixed=typeTable.rows.find(r=>r[1]==='外部公司');assert(mixed[3].includes('董事')&&mixed[3].includes('控股股东'));assert.equal(mixed[6],2);
const ct=newReport.sections.find(s=>s.id==='concentration').tables.at(-1).rows;
assert(ct.filter(r=>r[2]==='供应商公司'||r[2]==='外部公司').every(r=>r[4]==='关联方'));
assert(ct.filter(r=>r[2]==='【对手方名称为空】').every(r=>r[4]==='第三方'));
const rel=newReport.sections.find(s=>s.id==='related'),known=rel.tables.find(t=>t.headers.includes('客商分类'));
assert.equal(known.rows.find(r=>r[1]==='供应商公司')[3],'其他');assert.equal(known.rows.find(r=>r[1]==='供应商公司')[6],2);
assert.equal(JSON.stringify(d),changed);console.log('PASS: blank role remains related/其他 across both entities, multiple roles retained without duplicate amounts, 1.3/2.1/2.2 agree, blank counterparty third party, source unchanged');
