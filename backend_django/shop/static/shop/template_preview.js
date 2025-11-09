(function(){
  function byIdSuffix(suffix){
    return document.querySelectorAll('[id$="'+suffix+'"]');
  }
  function init(){
    var preview = document.getElementById('tpl-preview');
    if(!preview) return;
    var card = preview.querySelector('.tpl-card');
    var img = preview.querySelector('.tpl-img');
    var price = preview.querySelector('.tpl-price');
    var btns = preview.querySelectorAll('.tpl-btn');

    function update(){
      var bg = getVal('card_bg_color', preview.dataset.bg || '#ffffff');
      var pc = getVal('price_color', preview.dataset.price || '#2563eb');
      var radius = parseInt(getVal('rounded_px', preview.dataset.radius || '10'), 10) || 10;
      var imgh = parseInt(getVal('image_height_px', preview.dataset.imgh || '200'), 10) || 200;
      var outline = getVal('button_variant', preview.dataset.outline === '1' ? 'outline' : 'primary');

      if(card){ card.style.background = bg; card.style.borderRadius = radius + 'px'; }
      if(img){ img.style.height = imgh + 'px'; }
      if(price){ price.style.color = pc; }
      btns.forEach(function(b){
        if(!b) return;
        if(outline === 'outline'){
          b.classList.add('outline');
        }else{
          b.classList.remove('outline');
        }
      });
    }

    function getVal(field, fallback){
      var els = byIdSuffix(field);
      if(els && els[0]){
        return els[0].value || fallback;
      }
      return fallback;
    }

    ['card_bg_color','price_color','rounded_px','image_height_px','button_variant'].forEach(function(suffix){
      var els = byIdSuffix(suffix);
      els.forEach(function(el){
        el.addEventListener('input', update);
        el.addEventListener('change', update);
      });
    });

    update();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
