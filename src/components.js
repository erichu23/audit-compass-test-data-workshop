/* Shared pager from UI-design-main/assets/js/core/shared.js. */
(function(){
  function auditPagerRange(page, pages){
    const current = Math.max(1, Math.min(Number(page) || 1, Math.max(1, pages)));
    const total = Math.max(1, Number(pages) || 1);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
    if (current <= 4) { start = 2; end = 6; }
    if (current >= total - 3) { start = total - 5; end = total - 1; }
    if (start > 2) out.push('ellipsis-start');
    for (let i = start; i <= end; i++) out.push(i);
    if (end < total - 1) out.push('ellipsis-end');
    out.push(total);
    return out;
  }

  function renderAuditPager(el, opts){
    if (!el) return;
    const total = Number(opts.total) || 0;
    const pageSize = Number(opts.pageSize) || 20;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.max(1, Math.min(Number(opts.page) || 1, pages));
    const sizes = opts.sizes || [10,20,30,40,50];
    const pageItems = auditPagerRange(page, pages).map(item => {
      if (typeof item === 'string') return '<span class="audit-pager-ellipsis">...</span>';
      return `<button class="audit-pager-btn ${item === page ? 'is-active' : ''}" type="button" ${item===page?'aria-current="page"':''} data-page="${item}">${item}</button>`;
    }).join('');
    el.classList.add('audit-pager');
    el.innerHTML = `
      <span class="audit-pager-total">共 ${total.toLocaleString('zh-CN')} 条</span>
      <button class="audit-pager-btn audit-pager-arrow" type="button" aria-label="上一页" data-page="prev" ${page <= 1 ? 'disabled' : ''}>‹</button>
      ${pageItems}
      <button class="audit-pager-btn audit-pager-arrow" type="button" aria-label="下一页" data-page="next" ${page >= pages ? 'disabled' : ''}>›</button>
      <label class="audit-pager-size"><select aria-label="每页条数" data-page-size>${sizes.map(n => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n} 条/页</option>`).join('')}</select></label>
      <span class="audit-pager-jump-label">跳至</span>
      <input class="audit-pager-jump" type="number" min="1" max="${pages}" inputmode="numeric" aria-label="跳转页码" data-page-jump>
      <span class="audit-pager-jump-label">页</span>
    `;
    el.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => {
      let next = page;
      if (btn.dataset.page === 'prev') next = page - 1;
      else if (btn.dataset.page === 'next') next = page + 1;
      else next = Number(btn.dataset.page) || page;
      opts.onPage?.(Math.max(1, Math.min(next, pages)));
    }));
    el.querySelector('[data-page-size]')?.addEventListener('change', e => opts.onPageSize?.(Number(e.target.value) || 20));
    const jump = el.querySelector('[data-page-jump]');
    jump?.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const next = Math.max(1, Math.min(Math.trunc(Number(jump.value)) || page, pages));
      opts.onPage?.(next);
    });
    jump?.addEventListener('change', () => {
      if (!jump.value) return;
      const next = Math.max(1, Math.min(Math.trunc(Number(jump.value)) || page, pages));
      opts.onPage?.(next);
    });
  }

  window.renderAuditPager=renderAuditPager;
})();

/* View-only table queries: numeric sorting, combined column filters and reset. */
(function(g){
 const clean=v=>String(v??'').trim();
 function number(v){const s=clean(v).replace(/[,，%]/g,'');return s!==''&&Number.isFinite(Number(s))?Number(s):null;}
 function query(rows,state,value=(r,c)=>r[c]){
  const hits=rows.filter(r=>Object.entries(state.filters||{}).every(([c,f])=>{
   const v=value(r,Number(c)),s=clean(v).toLocaleLowerCase(),n=number(v);
   return (!f.text||s.includes(f.text.toLocaleLowerCase()))&&(!f.blank||s==='—'||s==='')&&(f.min===''||f.min==null||n!=null&&n>=Number(f.min))&&(f.max===''||f.max==null||n!=null&&n<=Number(f.max));
  }));
  if(state.sort)hits.sort((a,b)=>{const x=value(a,state.sort.column),y=value(b,state.sort.column),nx=number(x),ny=number(y);return (nx!=null&&ny!=null?nx-ny:clean(x).localeCompare(clean(y),'zh-CN',{numeric:true}))*(state.sort.desc?-1:1);});
  return hits;
 }
 const esc=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let popup;
 function attach(table,state,onChange,{skip=[]}={}){
  if(table.dataset.queryReady)return;table.dataset.queryReady='true';
  const head=table.tHead;if(!head)return;
  const occupied=[];
  [...head.rows].forEach((row,ri)=>{let ci=0;[...row.cells].forEach(th=>{
   while(occupied[ri]?.[ci])ci++;const col=ci;
   for(let r=ri;r<ri+th.rowSpan;r++){occupied[r]??=[];for(let c=ci;c<ci+th.colSpan;c++)occupied[r][c]=true;}ci+=th.colSpan;
   if(th.colSpan>1||row.classList.contains('report-filter-header')||skip.includes(col)||th.querySelector('button')||th.closest('table')!==table||!th.textContent.trim())return;
   const title=th.textContent.trim();
   const tools=document.createElement('span');tools.className='ba-th-tools table-query-tools';
   tools.innerHTML='<span class="ba-sort-icons"><button type="button" class="ba-sort-up" aria-label="'+esc(title)+'升序" title="升序"></button><button type="button" class="ba-sort-down" aria-label="'+esc(title)+'降序" title="降序"></button></span><button type="button" class="ba-filter-btn" aria-label="筛选'+esc(title)+'" title="筛选"></button>';
   th.append(tools);
   th.dataset.queryColumn=col;
   const refresh=()=>table.querySelectorAll('[data-query-column]').forEach(cell=>{const c=Number(cell.dataset.queryColumn),active=state.sort?.column===c;cell.classList.toggle('ba-filtered',!!state.filters?.[c]);cell.classList.toggle('ba-sort-asc',active&&!state.sort.desc);cell.classList.toggle('ba-sort-desc',active&&state.sort.desc);cell.setAttribute('aria-sort',active?(state.sort.desc?'descending':'ascending'):'none');});refresh();
   tools.querySelectorAll('.ba-sort-icons button').forEach((b,i)=>b.onclick=()=>{state.sort={column:col,desc:!!i};onChange();refresh();});
   tools.querySelector('.ba-filter-btn').onclick=()=>{
    popup?.remove();popup=document.createElement('div');popup.className='table-query-popup';popup.setAttribute('popover','auto');document.body.append(popup);
    const f=state.filters?.[col]||{};
    popup.innerHTML='<form><b>'+esc(title)+'</b><label>包含文字<input name="text" value="'+esc(f.text)+'" placeholder="输入名称、日期或内容"></label><div class="table-query-range"><label>最小值<input type="number" step="any" name="min" value="'+esc(f.min)+'"></label><label>最大值<input type="number" step="any" name="max" value="'+esc(f.max)+'"></label></div><label><input type="checkbox" name="blank"'+(f.blank?' checked':'')+'> 仅空白值</label><small>多列条件同时生效；数值范围包含上下限。</small><div class="actions"><button type="button" data-clear>重置本列</button><button type="button" data-all>重置全表</button><button class="primary" type="submit">应用</button></div></form>';
    const close=()=>{popup?.remove();popup=null;};
    popup.querySelector('form').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(f.min!==''&&f.max!==''&&Number(f.min)>Number(f.max)){popup.querySelector('[name=max]').setCustomValidity('最大值不能小于最小值');popup.querySelector('[name=max]').oninput=e=>e.target.setCustomValidity('');popup.querySelector('[name=max]').reportValidity();return;}state.filters??={};if(f.text||f.min!==''||f.max!==''||f.blank)state.filters[col]=f;else delete state.filters[col];close();onChange();refresh();};
    popup.querySelector('[data-clear]').onclick=()=>{delete (state.filters||{})[col];if(state.sort?.column===col)state.sort=null;close();onChange();refresh();};
    popup.querySelector('[data-all]').onclick=()=>{state.filters={};state.sort=null;close();onChange();refresh();};
    popup.showPopover();const rect=th.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(rect.left,innerWidth-340))+'px';popup.style.top=Math.max(8,Math.min(rect.bottom+5,innerHeight-popup.offsetHeight-8))+'px';popup.querySelector('input').focus();
   };
  });});
 }
 function mountStatic(root){
  root.querySelectorAll('table').forEach(table=>{
   if(table.dataset.queryReady||table.id==='statementFlowTable'||!table.tHead||!table.tBodies.length)return;
   const body=table.tBodies[0],original=body.innerHTML;
   if([...body.rows].some(r=>[...r.cells].some(c=>c.rowSpan>1))){
    const spans=[];
    [...body.rows].forEach(row=>{const cells=[...row.cells],out=[];let i=0,c=0;
     while(i<cells.length||spans.some((s,j)=>j>=c&&s?.left>0)){
      if(spans[c]?.left>0){const saved=spans[c];out.push(saved.cell.cloneNode(true));saved.left--;c++;continue;}
      const cell=cells[i++];if(!cell)break;
      const clone=cell.cloneNode(true);clone.rowSpan=1;out.push(clone);
      if(cell.rowSpan>1)spans[c]={cell:clone,left:cell.rowSpan-1};c+=cell.colSpan;
     }row.replaceChildren(...out);
    });
   }
   const rows=[...body.rows];
   const pinned=r=>r.classList.contains('report-total')||/^(合计|总计|小计|前20小计|其他|其中)/.test(r.textContent.trim());
   const fixed=rows.filter(pinned),data=rows.filter(r=>!pinned(r)),state={};
   const draw=()=>body.replaceChildren(...fixed,...query(data,state,(r,c)=>r.cells[c]?.textContent));
   attach(table,state,draw);
   g.addEventListener('beforeprint',()=>{if(table.isConnected)body.innerHTML=original;});
   g.addEventListener('afterprint',()=>{if(table.isConnected)body.replaceChildren(...rows);});
  });
 }
 g.AuditTableTools={query,attach,mountStatic};
})(globalThis);
