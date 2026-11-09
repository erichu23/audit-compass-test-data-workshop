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
