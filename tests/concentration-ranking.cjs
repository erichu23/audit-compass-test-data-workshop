const fs=require('fs'),vm=require('vm'),assert=require('assert');global.window=global;for(const n of ['baseline','engine','registry','report'])vm.runInThisContext(fs.readFileSync('src/'+n+'.js','utf8'));
const E=AuditEngine,K=E.KEYS,d=Object.fromEntries(Object.entries(BASELINE).map(([k,t])=>[k,{headers:t.headers,rows:[]}]));
d[K.company].rows=[['本方甲',null,null,'母公司'],['本方乙',null,null,'子公司']];
for(let i=0;i<25;i++){const name='企业'+String(i).padStart(2,'0'),which=i%4;if(which===0||which===2)d[K.customer].rows.push(['本方甲',null,name]);if(which===1||which===2)d[K.supplier].rows.push(['本方甲',null,name]);if(i%2===0)d[K.related].rows.push(['本方甲',name,'控股股东']);}
function add(name,inflow,outflow,date='2025-06-01',own='本方甲'){const r=Array(d[K.flow].headers.length).fill(null);Object.assign(r,{0:own,1:'001',2:'银行',3:name,5:date,6:'12:00:00',7:'CNY',8:inflow,9:inflow,10:outflow,11:outflow,12:1000,13:1000});d[K.flow].rows.push(r);}
for(let i=0;i<25;i++)add('企业'+String(i).padStart(2,'0'),1000-i*10,100+i*10);
add('',1200,50);add(null,100,20);add('本方乙',999999,999999);add('期间外',999999,999999,'2024-01-01');
// Same counterparty contributes to a second company/category; ranking is still by name.
d[K.supplier].rows.push(['本方乙',null,'企业00']);add('企业00',200,1,'2025-06-01','本方乙');
const before=JSON.stringify(d),m=AuditReport.compute(d,{from:'2025-01-01',to:'2025-12-31',rates:{USD:7}}),sec=m.sections.find(s=>s.id==='concentration');
const a=E.analysis({...d,[K.flow]:{...d[K.flow],rows:d[K.flow].rows.filter(r=>r[5].startsWith('2025'))}},{first:2025,last:2025});
const detail=a.concentrationDetail.filter(r=>r[0]==='所选合计'),bands=a.concentration.filter(r=>r[0]==='所选合计');
const inc=detail.filter(r=>r[1]==='流入');assert.equal(inc.find(r=>r[3]==='【对手方名称为空】')[4],1);assert(inc.filter(r=>r[3]==='企业00').every(r=>r[4]===2));
assert(!detail.some(r=>['本方乙','期间外'].includes(r[3])));
assert(inc.filter(r=>r[3]==='【对手方名称为空】').every(r=>r[2]==='非客商'&&r[5]==='第三方'));
assert.equal(new Set(inc.filter(r=>r[4]<=5).map(r=>r[3])).size,5);
assert.equal(bands.filter(r=>r[1]==='流入'&&r[4]==='前5').reduce((n,r)=>n+r[6],0),7); // 5 names, 7 transactions
for(const direction of ['流入','流出'])for(const cutoff of [5,10,20]){
 const expected=detail.filter(r=>r[1]===direction&&r[4]<=cutoff).reduce((n,r)=>n+r[6],0);
 const actual=bands.filter(r=>r[1]===direction&&r[4]==='前'+cutoff).reduce((n,r)=>n+r[5],0);
 assert.equal(actual,expected);
}
for(const direction of ['流入','流出'])for(const cat of ['客户','供应商','客商一体','非客商']){
 const all=bands.filter(r=>r[1]===direction&&r[2]===cat&&r[4]==='合计').reduce((n,r)=>n+r[5],0);
 for(const r of bands.filter(r=>r[1]===direction&&r[2]===cat))assert(Math.abs(r[7]-(all?r[5]/all:0))<1e-12);
}
assert(sec.tables.at(-1).headers.includes('全体对手方排名'));assert.equal(JSON.stringify(d),before);
console.log('PASS: period/internal exclusion, global ranking before category split, blank participates as nonmerchant third party, same name across companies, independent directions, top5/10/20 amounts and counts, category denominators, raw input unchanged');
