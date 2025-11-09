(function(){
  function ready(fn){if(document.readyState!=='loading'){fn()}else{document.addEventListener('DOMContentLoaded',fn)}}
  function ensureFormId(el){ if(!el.id){ el.id = 'admin-main-form'; } return el.id; }
  function isChangeForm(){ return document.body && /\bchange-form\b/.test(document.body.className); }

  function buildSticky(){
    const content = document.getElementById('content');
    if(!content) return;
    const form = content.querySelector('form');
    if(!form) return;
    const submitRow = content.querySelector('.submit-row');
    if(!submitRow) return;

    // Avoid duplicates
    if (content.querySelector('.sticky-save-tools')) return;

    // Find or create object-tools container (beside History)
    let tools = content.querySelector('.object-tools');
    if(!tools){
      const h1 = content.querySelector('h1');
      if(!h1) return;
      tools = document.createElement('ul');
      tools.className = 'object-tools';
      // insert after h1
      h1.parentNode.insertBefore(tools, h1.nextSibling);
    }

    // Create sticky tools box
    const box = document.createElement('div');
    box.className = 'sticky-save-tools';

    const formId = ensureFormId(form);
    submitRow.querySelectorAll('input[type="submit"], button[type="submit"]').forEach(function(btn){
      const clone = btn.cloneNode(true);
      clone.classList.add('sticky-save-btn');
      clone.setAttribute('form', formId);
      box.appendChild(clone);
    });

    tools.appendChild(box);
  }

  ready(function(){
    try{
      if(!isChangeForm()) return;
      buildSticky();
    }catch(e){ /* ignore */ }
  });
})();
