const fs=require('fs'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
function context(previous){const ctx=vm.createContext({console});vm.runInContext('window=globalThis',ctx);for(const n of ['baseline','engine','registry','report'])vm.runInContext(previous&&n==='registry'?cp.execFileSync('git',['show','HEAD:src/'+n+'.js'],{encoding:'utf8'}):fs.readFileSync('src/'+n+'.js','utf8'),ctx);return ctx;}
const ctx=context(false),R=ctx.AuditRegistry;
for(const [id,bounds,values] of [['days',[365,730,1095],[364,365,730,731,1095,1096]],['insured',[10,50,100],[9,10,50,51,100,101]],['capital',[100000,500000,1000000],[99999,100000,500000,500001,1000000,1000001]]]){
 assert.deepEqual(values.map(n=>R.bucket(n,bounds,id)),[0,1,1,2,2,3]);assert.equal(R.bucket(null,bounds,id),4);
 assert.equal(R.bucket(10,[10],id),1);assert(R.intervalLabels([10],id)[1].startsWith('≥'));
 assert(R.intervalLabels(bounds,id)[2].includes('>')); // No ambiguous shared lower boundary.
}
const old=context(true),settings={from:'2023-01-01',to:'2025-12-31',registry:[],rates:{USD:7}},now=ctx.AuditReport.compute(ctx.BASELINE,settings),before=old.AuditReport.compute(old.BASELINE,settings);
const numbers=m=>m.sections.map(s=>s.tables.map(t=>t.rows.map(r=>r.filter(x=>typeof x==='number'))));assert.equal(JSON.stringify(numbers(now)),JSON.stringify(numbers(before)));
for(const id of ['features','follow']){const m=ctx.AuditReport.selectSections(now,[id]);assert(ctx.AuditReport.render(m,{allRows:true,forExport:true}).includes('区间边界'));}
console.log('PASS: exact endpoints assigned once, single/custom cut labels, missing values excluded, report boundaries exported, all numeric report results unchanged');
