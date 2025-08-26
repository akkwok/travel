/* =========================
   Lightbox（使用現有 #lb-root；支援 fetch 後執行內嵌 <script>）
   - 點 .mark_area a / .num_area p / .timeline li.stop 會開啟
   - 檔名規則：lightbox_XX.html（支援 1 或 2 位數）
   - 若 #lb-pool 內有 .lightbox_XX，優先使用 pool
   - 別名對應：20→02、33→10、30→18、24→14、29→04、15→12
   ========================= */
(function($){
  'use strict';

  const $root    = $('#lb-root');
  const $mask    = $root.find('.lb-mask');
  const $stage   = $root.find('.lb-stage');
  const $close   = $root.find('.lb-close');
  const $content = $root.find('.lb-content');

  if ($root.length === 0){
    console.warn('[Lightbox] 找不到 #lb-root，請把提供的 HTML 結構貼進 body 內。');
    return;
  }

  /* ========= 工具 ========= */
  const TL_ALIAS = { '33':'10','15':'12','20':'02','30':'18','24':'14','29':'04' };
  const pad2 = n => String(n).padStart(2,'0');
  const canonicalId = id => TL_ALIAS[id] || id;
  const urlFor = id => `lightbox_${id}.html`;

  function idFromMark(el){ const m = el.className.match(/\bt_(\d+)\b/); return m ? pad2(m[1]) : null; }
  function idFromNum(el){  const m = el.className.match(/\bp_(\d+)\b/); return m ? pad2(m[1]) : null; }
  function idFromStop($li){
    const $badge = $li.find('.badge').first();
    if (!$badge.length) return null;
    const txt = $badge.clone().children().remove().end().text().trim();
    const n = parseInt(txt,10);
    return Number.isNaN(n) ? null : pad2(n);
  }

  function setLoading(on){ $root.toggleClass('is-loading', !!on); }
  function showRoot(){
    $('html,body').addClass('lb-open');
    $root.addClass('is-open').attr('aria-hidden','false');
  }
  function hideRoot(){
    $root.removeClass('is-open is-loading').attr('aria-hidden','true');
    $('html,body').removeClass('lb-open');
    $content.empty();
  }

  // 優先使用 #lb-pool 內的片段
  function tryLoadFromPool(id){
    const $pool = $('#lb-pool');
    if (!$pool.length) return false;
    const $frag = $pool.children(`.lightbox_${id}`).first();
    if (!$frag.length) return false;
    $content.html($frag.clone().prop('hidden', false));
    return true;
  }

  /* ========= 關鍵修正：讓 innerHTML 插入的 <script> 真正執行 =========
     - 逐一把插進來的 <script> 取出並新建節點替換，瀏覽器才會執行
     - 若原本有 defer/async，動態插入時 defer 其實不會生效；移除避免誤會
  */
  function execInsertedScripts(root){
    const scripts = root.querySelectorAll('script');
    scripts.forEach(old=>{
      const s = document.createElement('script');
      // 複製屬性
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      s.removeAttribute('defer'); // 動態插入不吃 defer
      // 內嵌腳本
      if (old.textContent) s.text = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  }

  // http(s)：fetch → 成功就塞字串 + 執行其中的 <script>，失敗 fallback iframe
  async function loadRemote(id){
    const url = urlFor(id);
    if (location.protocol === 'file:'){
      // 本機避免 CORS，直接 iframe
      $content.html(`<iframe class="lb-iframe" src="${url}" title="Lightbox ${id}" loading="lazy"></iframe>`);
      return;
    }
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      $content.html(html);
      // ★ 執行被插入的 <script>（例如 v1/js/lb-pager.js）
      execInsertedScripts($content.get(0));
    }catch(err){
      // 失敗就改用 iframe
      $content.html(`<iframe class="lb-iframe" src="${url}" title="Lightbox ${id}" loading="lazy"></iframe>`);
    }
  }

  function openLightboxById(rawId){
    if (!rawId) return;
    const id = canonicalId(rawId);
    showRoot();
    setLoading(true);
    if (tryLoadFromPool(id)){
      setLoading(false);
    }else{
      loadRemote(id).finally(() => setLoading(false));
    }
  }
  // 若你想從別處手動呼叫
  window.openLightboxById = openLightboxById;

  /* ========= 關閉 ========= */
  $mask.on('click', hideRoot);
  $close.on('click', hideRoot);
  $(document).on('keydown', function(e){
    if (e.key === 'Escape' && $root.hasClass('is-open')) hideRoot();
  });

  /* ========= 三種觸發 ========= */
  $('.mark_area').on('click', 'a', function(e){
    e.preventDefault();
    const id = idFromMark(this);
    if (id) openLightboxById(id);
  });
  $('.num_area').on('click', 'p', function(){
    const id = idFromNum(this);
    if (id) openLightboxById(id);
  });
  $('.timeline').on('click', 'li.stop', function(){
    const id = idFromStop($(this));
    if (id) openLightboxById(id);
  });
})(jQuery);