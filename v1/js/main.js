$(function () {
  /* =========================
     通用參數
     ========================= */
  const FADE_MS = 500;         // 跟 CSS transition 0.5s 對齊
  const HOLD_MS = 700;         // 每個點停留時間（不含淡出）
  const RESUME_DELAY = 150;    // 離開互動狀態後再續播的延遲

  /* ✅ 新增：手機版媒體查詢守門員 */
  const MQ = window.matchMedia('(max-width:1080px)');

  /* =========================
     num_area p_XX 收集 + 自動巡迴
     ========================= */
  const $pAll = $('.num_area p').filter(function () {
    return /\bp_(\d+)\b/.test(this.className);
  });
  const items = $pAll.toArray().sort((a, b) => {
    const na = parseInt(a.className.match(/\bp_(\d+)\b/)[1], 10);
    const nb = parseInt(b.className.match(/\bp_(\d+)\b/)[1], 10);
    return na - nb;
  });

  let idx = 0;                 // 目前巡迴位置
  let autoplayTimer = null;    // 計時器 id
  let hoveringCount = 0;       // 目前有多少互動壓住（pin / timeline / num_area）
  let isAutoplaying = false;

  const offAll = () => $pAll.removeClass('on');
  const onAt  = (i) => $(items[i]).addClass('on');
  const clearTimer = () => { if (autoplayTimer) { clearTimeout(autoplayTimer); autoplayTimer = null; } };

  function step() {
    if (hoveringCount > 0) { isAutoplaying = false; return; }
    isAutoplaying = true;
    offAll();
    onAt(idx);

    autoplayTimer = setTimeout(() => { // 停留
      if (hoveringCount > 0) { isAutoplaying = false; return; }
      offAll(); // 淡出
      autoplayTimer = setTimeout(() => { // 等淡出完
        if (hoveringCount > 0) { isAutoplaying = false; return; }
        idx = (idx + 1) % items.length;
        step();
      }, FADE_MS);
    }, HOLD_MS);
  }

  /* ✅ 改寫：手機版（MQ.matches）一律不啟動 autoplay */
  const startAutoplay = () => {
    if (MQ.matches) return;                   // 行動裝置：不跑
    if (!isAutoplaying && hoveringCount === 0) { clearTimer(); step(); }
  };
  const stopAutoplay  = () => { isAutoplaying = false; clearTimer(); };

  /* ✅ 斷點切換：進入手機就停並清掉 .on；回桌機才恢復 */
  const onMQChange = (e) => {
    if (e.matches) {                 // 進入手機
      stopAutoplay();
      offAll();
    } else {                         // 回到桌機
      startAutoplay();
    }
  };
  (MQ.addEventListener ? MQ.addEventListener('change', onMQChange)
                       : MQ.addListener(onMQChange));

  /* =========================
     工具：站號 <-> timeline li.stop
     ========================= */
  const COLOR_CLASSES = ['cor_fm', 'cor_love', 'cor_child', 'cor_bro', 'cor_friend'];

  function pad2(nStr) { return ('' + nStr).padStart(2, '0'); }

  function pickColorClass($el) {
    for (const c of COLOR_CLASSES) if ($el.hasClass(c)) return c;
    return null;
  }

  // 從 li.stop 取站號（'01'..'34'）
  function getStopNumber($stop) {
    const $badge = $stop.find('.badge').first();
    if (!$badge.length) return null;
    const nText = $badge.clone().children().remove().end().text().trim();
    const n = parseInt(nText, 10);
    if (Number.isNaN(n)) return null;
    return pad2(n);
  }

  // 快取 timeline 的 li.stop
  const stopIndex = {};
  $('.timeline li.stop').each(function () {
    const id = getStopNumber($(this));
    if (id) stopIndex[id] = $(this);
  });

  // 別名（timeline → num_area）
  const TL_ALIAS = {
    '33': '10',
    '15': '12',
    '20': '02',
    '30': '18',
    '24': '14',
    '29': '04'
  };

  // 反向映射（pin/num → timeline，支援一對多）
  const PIN_TO_TL = {
    '10': ['10','33'],
    '12': ['12','15'],
    '02': ['02','20'],
    '18': ['18','30'],
    '14': ['14','24'],
    '04': ['04','29']
  };

  // 供 num_area p 使用：p_XX → timeline 目標（若未指定則回傳自身）
  function pToTimelineIds(id) {
    return PIN_TO_TL[id] || [id];
  }

  // 套用/移除 timeline 高亮（含 h3 著色）
  function setTimelineHoverByIds(ids, on) {
    ids.forEach(id => {
      const $stop = stopIndex[id];
      if (!$stop || !$stop.length) return;
      const $badge = $stop.find('.badge').first();
      const $title = $stop.find('h3.card-title').first();
      if (on) {
        $stop.addClass('tl-hover');
        if ($title.length) {
          $title.removeClass(COLOR_CLASSES.join(' '));
          const color = pickColorClass($badge);
          if (color) $title.addClass(color);
        }
      } else {
        $stop.removeClass('tl-hover');
        if ($title.length) $title.removeClass(COLOR_CLASSES.join(' '));
      }
    });
  }

  /* =========================
     地圖 pin hover → num（+ 反向高亮 timeline）
     ========================= */
  $('.mark_area').on('mouseenter', 'a', function () {
    hoveringCount++;
    stopAutoplay();

    const m = this.className.match(/\bt_(\d+)\b/);
    if (!m) return;

    const id = pad2(m[1]);  // '01'..'34'
    offAll();
    $('.num_area .p_' + id).addClass('on');

    // 反向：同步高亮對應的 timeline li.stop（支援一對多）
    const tlTargets = PIN_TO_TL[id] || [id];
    setTimelineHoverByIds(tlTargets, true);

    // 🔸在 mode-a 自動捲到對應 stop
    const targetId = pickFirstExistingId(tlTargets);
    if (targetId) scrollToStopId(targetId, 'center');
  });

  $('.mark_area').on('mouseleave', 'a', function () {
    const m = this.className.match(/\bt_(\d+)\b/);
    if (m) {
      const id = pad2(m[1]);
      $('.num_area .p_' + id).removeClass('on');

      const tlTargets = PIN_TO_TL[id] || [id];
      setTimelineHoverByIds(tlTargets, false);
    }

    hoveringCount = Math.max(0, hoveringCount - 1);
    if (hoveringCount === 0) {
      clearTimer();
      setTimeout(() => { if (hoveringCount === 0) startAutoplay(); }, RESUME_DELAY);
    }
  });

  /* ==================================================================
   * timeline li.stop hover → num（含別名）+ 標題著色
   * ================================================================== */
  $('.timeline').on('mouseenter', 'li.stop', function () {
    hoveringCount++;
    stopAutoplay();

    const id = getStopNumber($(this));
    if (!id) return;

    const targetId = TL_ALIAS[id] || id; // 若有別名就用別名顯示 num_area
    offAll();
    $('.num_area .p_' + targetId).addClass('on');

    // 自己高亮（僅高亮自身，不用別名）
    setTimelineHoverByIds([id], true);
  });

  $('.timeline').on('mouseleave', 'li.stop', function () {
    const id = getStopNumber($(this));
    if (id) {
      const targetId = TL_ALIAS[id] || id;
      $('.num_area .p_' + targetId).removeClass('on');

      setTimelineHoverByIds([id], false);
    }

    hoveringCount = Math.max(0, hoveringCount - 1);
    if (hoveringCount === 0) {
      clearTimer();
      setTimeout(() => { if (hoveringCount === 0) startAutoplay(); }, RESUME_DELAY);
    }
  });

  /* ==================================================================
   * num_area p hover → 同步互動（像 pin / timeline 一樣）
   * ================================================================== */
  $('.num_area').on('mouseenter', 'p', function () {
    // 只對具有 p_XX 的 p 啟用
    const m = this.className.match(/\bp_(\d+)\b/);
    if (!m) return;

    hoveringCount++;
    stopAutoplay();

    const id = pad2(m[1]); // '01'..'34'
    offAll();
    $('.num_area .p_' + id).addClass('on');

    // 同步高亮對應的 timeline（若該點有重複站號，一次高亮所有）
    const tlTargets = pToTimelineIds(id);
    setTimelineHoverByIds(tlTargets, true);

    // 🔸在 mode-a 自動捲到對應 stop
    const targetId = pickFirstExistingId(tlTargets);
    if (targetId) scrollToStopId(targetId, 'center');
  });

  $('.num_area').on('mouseleave', 'p', function () {
    const m = this.className.match(/\bp_(\d+)\b/);
    if (m) {
      const id = pad2(m[1]);
      $('.num_area .p_' + id).removeClass('on');

      const tlTargets = pToTimelineIds(id);
      setTimelineHoverByIds(tlTargets, false);
    }

    hoveringCount = Math.max(0, hoveringCount - 1);
    if (hoveringCount === 0) {
      clearTimer();
      setTimeout(() => { if (hoveringCount === 0) startAutoplay(); }, RESUME_DELAY);
    }
  });

  /* =========================
     fly / jet 閉環（只在滑到 .fly 時觸發）
     ========================= */
  const $fly = $('.sec-kv .kv_top .fly');
  const $jet = $('.sec-kv .kv_top .jet');

  const INTRO_DELAY_MS = 1000;           // 首次/回放 進場延遲
  const LOOP_BACK_AFTER_EXIT_MS = 5000;  // 飛走後幾秒回來（你要的 5 秒）
  const ANIMATION_END = 'animationend webkitAnimationEnd oAnimationEnd';

  let introTimer  = null;
  let loopTimer   = null;
  let unlockTimer = null;
  let inExitCycle = false;               // 🔒 飛走→回來期間上鎖

  // 讓動畫可重播
  function replay($el, addCls) {
    $el.removeClass('fly-enter jet-enter fly-exit jet-exit');
    $el.each(function(){ this.offsetWidth; }); // 強制 reflow
    if (addCls) $el.addClass(addCls);
    return $el;
  }

  function playIntro() {
    clearTimeout(introTimer);
    clearTimeout(loopTimer);
    clearTimeout(unlockTimer);

    inExitCycle = true;  // 直到兩個進場動畫都結束才解鎖
    let done = 0;
    const onEnd = () => {
      if (++done === 2) {
        inExitCycle = false;
        clearTimeout(unlockTimer);
      }
    };

    replay($fly, 'fly-enter').one(ANIMATION_END, onEnd);
    replay($jet, 'jet-enter').one(ANIMATION_END, onEnd);

    // 保險解鎖：delay(1s) + duration(0.9s) + buffer
    const MAX_DELAY_MS = 1000, DURATION_MS = 900, BUFFER_MS = 200;
    unlockTimer = setTimeout(() => { inExitCycle = false; }, MAX_DELAY_MS + DURATION_MS + BUFFER_MS);
  }

  function scheduleIntro(delayMs = INTRO_DELAY_MS) {
    clearTimeout(introTimer);
    introTimer = setTimeout(playIntro, delayMs);
  }

  function playExit() {
    clearTimeout(introTimer);
    clearTimeout(loopTimer);
    clearTimeout(unlockTimer);

    replay($fly, 'fly-exit');
    replay($jet, 'jet-exit');

    // 飛走後固定幾秒再回到進場（形成閉環）
    loopTimer = setTimeout(() => { scheduleIntro(0); }, LOOP_BACK_AFTER_EXIT_MS);
  }

  // 只在 hover 到 .fly 才觸發飛走；飛走→回來期間不上重覆觸發
  $fly.on('mouseenter', function () {
    if (inExitCycle) return;
    inExitCycle = true;
    playExit();
  });
  // 行動裝置補強（可選）
  $fly.on('touchstart', function () {
    if (inExitCycle) return;
    inExitCycle = true;
    playExit();
  });

  // 首次進場：頁面載入後 1 秒開始
  scheduleIntro(INTRO_DELAY_MS);

  /* =========================
     啟動 num 巡迴（若沒有 hover）
     ========================= */
  // ✅ 改成只在「非手機版」才啟動
  if (!MQ.matches) startAutoplay();

  /* =========================
     navScroll 防呆（你若沒載入套件也不報錯）
     ========================= */
  if ($.fn && $.fn.navScroll) {
    $('.overview_nav').navScroll({
      mobileDropdown: false,
      mobileBreakpoint: 768,
      scrollSpy: true
    });
  }

  /* ========= 時間軸樣式切換（Style A/B）+ 滑鼠滾輪橫向捲（加速版） ========= */
  const $timeline = $('.timeline').first();

  /* === 可調參數 === */
  const SCROLL_BOOST = 3.0;   // 滾輪倍速：1 = 原速，建議 2~4
  const MIN_STEP_PX  = 60;    // 每次滾輪的最小位移（像素）

  /* 垂直滾輪 -> 水平捲（只在 A 模式） */
  const WHEEL_KEY = '__tlWheelHandler';
  function bindWheelAsHorizontal($el){
    const el = $el.get(0);
    if (!el || el[WHEEL_KEY]) return;

    const handler = (evRaw) => {
      if (!$timeline.hasClass('mode-a')) return;

      // 避免干擾瀏覽器縮放（Ctrl/⌘ + 滾輪）
      if (evRaw.ctrlKey || evRaw.metaKey) return;

      const absX = Math.abs(evRaw.deltaX);
      const absY = Math.abs(evRaw.deltaY);
      const forceH = evRaw.shiftKey; // Shift+滾輪：強制水平

      // 主要是垂直滾動或 Shift 強制，才把捲動轉給水平
      if (forceH || absY > absX) {
        evRaw.preventDefault();

        // 將不同 deltaMode 正規化為像素
        let dy = evRaw.deltaY;
        let dx = evRaw.deltaX;
        if (evRaw.deltaMode === 1) { dy *= 16; dx *= 16; }                      // line -> px（近似）
        else if (evRaw.deltaMode === 2) { dy *= el.clientHeight; dx *= el.clientWidth; } // page -> px

        const primary = forceH ? (dy || dx) : dy;
        const step = Math.sign(primary) * Math.max(Math.abs(primary) * SCROLL_BOOST, MIN_STEP_PX);

        el.scrollLeft += step;
      }
    };

    el.addEventListener('wheel', handler, { passive:false });
    const p = el.parentElement;
    if (p) p.addEventListener('wheel', handler, { passive:false });
    el[WHEEL_KEY] = handler;
  }
  function unbindWheelAsHorizontal($el){
    const el = $el.get(0);
    if (!el || !el[WHEEL_KEY]) return;
    const handler = el[WHEEL_KEY];
    el.removeEventListener('wheel', handler, { passive:false });
    const p = el.parentElement;
    if (p) p.removeEventListener('wheel', handler, { passive:false });
    el[WHEEL_KEY] = null;
  }

  /* 兩種顯示模式切換 */
  function setTimelineMode(mode){ // 'a' or 'b'
    if (mode === 'a'){
      $timeline.addClass('mode-a').removeClass('mode-b')
               .attr('aria-label','時間軸（橫向單列可捲）');
      $('.btn-style-a').attr('aria-pressed','true');
      $('.btn-style-b').attr('aria-pressed','false');
      bindWheelAsHorizontal($timeline);
    }else{
      $timeline.removeClass('mode-a').addClass('mode-b')
               .attr('aria-label','時間軸（多列）');
      $('.btn-style-a').attr('aria-pressed','false');
      $('.btn-style-b').attr('aria-pressed','true');
      unbindWheelAsHorizontal($timeline);
    }
  }

  /* 初始：A 模式 */
  setTimelineMode('a');
  $timeline.scrollLeft(0);

  /* A/B 按鈕 */
  $('.btn-style-a').on('click', () => setTimelineMode('a'));
  $('.btn-style-b').on('click', () => setTimelineMode('b'));

  /* 鍵盤左右鍵輔助（只在 A 模式） */
  $timeline.attr('tabindex','0').on('keydown', function(e){
    if (!$timeline.hasClass('mode-a')) return;
    const step = $(this).find('.stop').first().outerWidth(true) || 320;
    if (e.key === 'ArrowRight'){ this.scrollLeft += step; e.preventDefault(); }
    if (e.key === 'ArrowLeft'){  this.scrollLeft -= step; e.preventDefault(); }
  });

  /* === 滑到 pin / num → 自動捲到對應 stop（只在 A 模式） === */
  function pickFirstExistingId(ids){
    const arr = Array.isArray(ids) ? ids : [ids];
    for (const id of arr) if (stopIndex[id] && stopIndex[id].length) return id;
    return null;
  }
  function scrollToStopId(id, align = 'center'){
    if (!$timeline.hasClass('mode-a')) return;     // 只在 A 模式動作
    const $stop = stopIndex[id];
    if (!$stop || !$stop.length) return;

    const container = $timeline.get(0);
    const el        = $stop.get(0);

    const cardW = el.offsetWidth;
    const viewW = container.clientWidth;

    let targetLeft;
    if (align === 'start'){
      targetLeft = el.offsetLeft - 12;             // 讓卡片靠左一點點（扣掉 gap）
    }else if (align === 'end'){
      targetLeft = el.offsetLeft - (viewW - cardW) + 12;
    }else{ // center
      targetLeft = el.offsetLeft - (viewW - cardW) / 2;
    }

    // 邊界防呆
    const maxLeft = container.scrollWidth - viewW;
    targetLeft = Math.max(0, Math.min(targetLeft, maxLeft));

    // 平滑捲動（原生優先，退回 jQuery 動畫）
    try{
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }catch(_){
      $timeline.stop(true).animate({ scrollLeft: targetLeft }, 400);
    }
  }
});

/**/

$(function() {
                $(".pic_open").colorbox({
                    maxWidth: '96%',
                    maxHeight: '700px',
                    rel: 'group1'
                });
            });


/* =========================
   Lightbox（使用現有 #lb-root；支援 fetch 後執行內嵌 <script>）
   ＋ 內建上一頁/下一頁 pager（由父頁產生）
   版本：不做任何別名正規化，全部用真實頁碼 01~34
   ========================= */
(function($){
  'use strict';

  const $root    = $('#lb-root');
  const $mask    = $root.find('.lb-mask');
  const $stage   = $root.find('.lb-stage');
  const $close   = $root.find('.lb-close');
  const $content = $root.find('.lb-content');

  if ($root.length === 0){
    console.warn('[Lightbox] 找不到 #lb-root');
    return;
  }

  /* ========= 工具 ========= */
  const pad2 = n => String(n).padStart(2,'0');
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

  // 讓 innerHTML 插入的 <script> 真的執行
  function execInsertedScripts(root){
    const scripts = root.querySelectorAll('script');
    scripts.forEach(old=>{
      const s = document.createElement('script');
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      s.removeAttribute('defer'); // 動態插入不吃 defer
      if (old.textContent) s.text = old.textContent;
      old.parentNode.replaceChild(s, old);
    });
  }

  /* ========= Pager 參數 & UI ========= */
  const PAGE_MIN  = 1;
  const PAGE_MAX  = 34;
  const PAGE_WRAP = false; // true=循環；false=邊界停住

  const ICON_PREV = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M16 8 Q 16 6 14.4 7.2 L 9.6 10.8 Q 8 12 9.6 13.2 L 14.4 16.8 Q 16 18 16 16 L 16 8 Z"/>
    </svg>`;
  const ICON_NEXT = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M8 8 Q 8 6 9.6 7.2 L 14.4 10.8 Q 16 12 14.4 13.2 L 9.6 16.8 Q 8 18 8 16 L 8 8 Z"/>
    </svg>`;

  let currentId = null; // '01'..'34'（始終用真實頁碼）

  function ensurePager(){
    let nav = $stage.children('.lb-pager').get(0);
    if (!nav){
      nav = document.createElement('nav');
      nav.className = 'lb-pager';
      nav.setAttribute('aria-label','上一頁 / 下一頁');
      nav.innerHTML = `
        <a class="prev" aria-label="上一頁" rel="prev">${ICON_PREV}</a>
        <a class="next" aria-label="下一頁" rel="next">${ICON_NEXT}</a>`;
      $stage.append(nav);

      // 點擊：用父頁切換，不整頁跳轉
      nav.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
        const id = a.dataset.id;
        if (id) { e.preventDefault(); openLightboxById(id); }
      });
    }
    return nav;
  }

  function updatePager(id){
    currentId = id;
    const nav   = ensurePager();
    const aPrev = nav.querySelector('.prev');
    const aNext = nav.querySelector('.next');

    const n = parseInt(id,10);
    const prev = PAGE_WRAP ? (n===PAGE_MIN ? PAGE_MAX : n-1) : (n>PAGE_MIN ? n-1 : null);
    const next = PAGE_WRAP ? (n===PAGE_MAX ? PAGE_MIN : n+1) : (n<PAGE_MAX ? n+1 : null);

    function setBtn(a, num){
      if (num){
        const target = pad2(num);
        a.dataset.id = target;
        a.removeAttribute('aria-disabled');
        a.classList.remove('is-disabled');
        a.tabIndex = 0;
      }else{
        a.removeAttribute('data-id');
        a.setAttribute('aria-disabled','true');
        a.classList.add('is-disabled');
        a.tabIndex = -1;
      }
    }
    setBtn(aPrev, prev);
    setBtn(aNext, next);
  }

  // 開啟時綁左右鍵（只在 lightbox 打開時反應）
  $(document).on('keydown.lbPager', function(e){
    if (!$root.hasClass('is-open') || !currentId) return;
    const n = parseInt(currentId,10);
    if (e.key === 'ArrowLeft'){
      const prev = PAGE_WRAP ? (n===PAGE_MIN ? PAGE_MAX : n-1) : (n>PAGE_MIN ? n-1 : null);
      if (prev){ e.preventDefault(); openLightboxById(pad2(prev)); }
    }else if (e.key === 'ArrowRight'){
      const next = PAGE_WRAP ? (n===PAGE_MAX ? PAGE_MIN : n+1) : (n<PAGE_MAX ? n+1 : null);
      if (next){ e.preventDefault(); openLightboxById(pad2(next)); }
    }
  });

  /* ========= 遠端載入 ========= */
  async function loadRemote(id){
    const url = urlFor(id);
    if (location.protocol === 'file:'){
      // 本機：避免 CORS，用 iframe（pager 在父頁）
      $content.html(`<iframe class="lb-iframe" src="${url}" title="Lightbox ${id}" loading="lazy"></iframe>`);
      return;
    }
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();
      $content.html(html);
      execInsertedScripts($content.get(0)); // 若子頁內有 inline script
    }catch(err){
      // 失敗就改用 iframe
      $content.html(`<iframe class="lb-iframe" src="${url}" title="Lightbox ${id}" loading="lazy"></iframe>`);
    }
  }

  /* ========= 對外 API：精準開啟（不做別名） ========= */
  function openLightboxById(rawId){
    if (!rawId) return;
    const idExact = pad2(rawId);      // 01..34
    showRoot();
    setLoading(true);
    updatePager(idExact);              // 先更新 pager
    if (tryLoadFromPool(idExact)){
      setLoading(false);
    }else{
      loadRemote(idExact).finally(() => setLoading(false));
    }
  }
  window.openLightboxById = openLightboxById;

  /* ========= 關閉 ========= */
  $mask.on('click', hideRoot);
  $close.on('click', hideRoot);
  $(document).on('keydown', function(e){
    if (e.key === 'Escape' && $root.hasClass('is-open')) hideRoot();
  });

  /* ========= 三種觸發（全部直接用實際頁碼） ========= */
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


/**/
(() => {
  // 只在手機版啟動
  const MQ = matchMedia('(max-width:1080px)');

  const CONTAINER_SEL = '.tl-wrap';           // 用這個容器的「中心點」當準心
  const STOP_SEL      = '.timeline .stop';
  const NUM_ROOT      = '#AK .scalable_info_area .num_area';

  // 站點別名（同一個點出現多次）
  const ALIAS = { '33':'10','15':'12','20':'02','30':'18','24':'14','29':'04' };

  // 小工具
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const pad2   = v => String(parseInt(v,10)).padStart(2,'0');
  const canon  = v => ALIAS[pad2(v)] || pad2(v);

  let armed=false, cleanup=[], rafId=null, currentLi=null, holdTarget=null, holdT0=0, lockedCode=null;
  const HOLD_MS = 120; // 防抖：中心候選穩定一小段時間才切換

  function setOnFor(code){
    const root = $(NUM_ROOT);
    if (!root || !code) return;
    const c = canon(code);
    if (lockedCode === c) return;
    lockedCode = c;

    // 清掉舊 on；只處理 num_area
    $$('.on', root).forEach(el=>el.classList.remove('on'));

    // p_02 / p_2 皆相容
    const p = root.querySelector(`.p_${c}`) || root.querySelector(`.p_${parseInt(c,10)}`);
    if (p) p.classList.add('on');
  }

  function direction(){
    const tl = $('.timeline');
    if (!tl) return 'vertical';
    return (tl.scrollWidth - tl.clientWidth > 8) ? 'horizontal' : 'vertical';
  }

  // 找出「最接近 .tl-wrap 中心」的 li.stop（依當前方向以 X 或 Y 為主）
  function pickByCenter(){
    const container = $(CONTAINER_SEL) || $('.timeline') || document.body;
    const rc = container.getBoundingClientRect();
    const midX = rc.left + rc.width/2;
    const midY = rc.top  + rc.height/2;
    const dir  = direction();

    let best=null;
    for (const li of $$(STOP_SEL)) {
      const r = li.getBoundingClientRect();
      // 必須在容器可視範圍內才算
      const vis = r.right > rc.left && r.left < rc.right && r.bottom > rc.top && r.top < rc.bottom;
      if (!vis) continue;

      const cx = r.left + r.width/2;
      const cy = r.top  + r.height/2;
      const d  = (dir==='horizontal') ? Math.abs(cx - midX) : Math.abs(cy - midY);
      if (!best || d < best.d) best = { li, d };
    }
    return best ? best.li : null;
  }

  function codeFromLi(li){
    if (!li) return null;
    const dc = li.getAttribute('data-code');
    if (dc)   return pad2(dc);
    const b = li.querySelector('.badge');
    if (b){
      const n = parseInt((b.textContent || '').trim(), 10);
      if (!isNaN(n)) return pad2(n);
    }
    // 萬一都沒有，就退回序號
    const all = $$(STOP_SEL);
    return pad2(all.indexOf(li) + 1);
  }

  function tick(){
    const cand = pickByCenter();
    if (!cand) return;

    if (cand === currentLi){ holdTarget=null; holdT0=0; return; }

    const now = performance.now();
    if (holdTarget !== cand){ holdTarget = cand; holdT0 = now; }
    else if (now - holdT0 >= HOLD_MS){
      currentLi = cand;
      setOnFor(codeFromLi(currentLi));
    }
  }

  function onScroll(){
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function arm(){
    if (armed) return;
    armed = true;

    // 進場先亮第一個
    setOnFor('01');

    // 監聽：頁面垂直滾、時間軸水平滾、視窗尺寸
    addEventListener('scroll', onScroll, {passive:true});
    cleanup.push(()=> removeEventListener('scroll', onScroll));

    const tl = $('.timeline');
    if (tl){
      tl.addEventListener('scroll', onScroll, {passive:true});
      cleanup.push(()=> tl.removeEventListener('scroll', onScroll));
    }

    addEventListener('resize', onScroll, {passive:true});
    cleanup.push(()=> removeEventListener('resize', onScroll));

    // 先跑一次
    requestAnimationFrame(tick);
  }

  function disarm(){
    if (!armed) return;
    armed = false;
    lockedCode = null;
    currentLi  = null;
    cleanup.forEach(fn=>{ try{fn();}catch{} });
    cleanup = [];
  }

  function onMQ(e){ e.matches ? arm() : disarm(); }

  document.addEventListener('DOMContentLoaded', ()=>{
    if (MQ.matches) arm();
    (MQ.addEventListener ? MQ.addEventListener('change', onMQ) : MQ.addListener(onMQ));
  });
})();

/**/

(() => {
  const container = document.querySelector('#lb-root .lb-content');
  if (!container) return;

  function prep(img){
    // 避免重複綁定
    if (img.dataset.lbBound) return;
    img.dataset.lbBound = '1';

    // 盡量提高載入優先度（不會影響相容性）
    if (!img.hasAttribute('loading'))       img.loading = 'eager';
    if (!img.hasAttribute('decoding'))      img.decoding = 'async';
    if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority','high');

    const reveal = () => img.classList.add('lb-ready');

    // 已經載好 → 直接 decode 再顯示
    if (img.complete && img.naturalWidth > 0){
      if (img.decode) img.decode().then(reveal).catch(reveal);
      else reveal();
      return;
    }

    // 尚未載好 → 等 load 後再 decode
    img.addEventListener('load', () => {
      if (img.decode) img.decode().then(reveal).catch(reveal);
      else reveal();
    }, { once:true });

    // 出錯也不要卡住 UI
    img.addEventListener('error', reveal, { once:true });
  }

  // 掃描目前已存在的圖片
  function scan(){ container.querySelectorAll('img').forEach(prep); }
  scan();

  // 監看 lightbox 內容變化（你開啟燈箱時注入的 HTML/IMG 都會被預載）
  const mo = new MutationObserver(scan);
  mo.observe(container, { childList:true, subtree:true });
})();

/**/
(function(){
  const root    = document.getElementById('lb-root');
  if (!root) return;

  const stage   = root.querySelector('.lb-stage');   // 燈箱可捲動容器（通常 90vh、高度固定、overflow:auto）
  const content = root.querySelector('.lb-content'); // 你把 lightbox_XX.html 塞進來的容器

  function resetTop(){
    if (!stage) return;

    // 避免平滑滾動干擾：暫時設成 auto
    const prev = stage.style.scrollBehavior;
    stage.style.scrollBehavior = 'auto';

    // 把燈箱與內容都拉回頂端
    stage.scrollTop = 0;
    if (content) content.scrollTop = 0;

    // 若你的 lightbox 沒鎖 body 捲動，也把整頁拉到頂（保險）
    window.scrollTo(0, 0);

    // 再補兩次，避免圖片解碼後高度變動把位置「擠下去」
    requestAnimationFrame(() => {
      stage.scrollTop = 0;
      if (content) content.scrollTop = 0;
    });
    setTimeout(() => {
      stage.scrollTop = 0;
      if (content) content.scrollTop = 0;
      stage.style.scrollBehavior = prev; // 還原
    }, 120);
  }

  // A) 如果你有上下頁按鈕，點擊當下先回頂一次（class 可換成你實際的）
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.lb-nav-prev, .lb-nav-next');
    if (!btn) return;
    resetTop();
    // 真正新內容換進來時，B 會再回頂一次（雙保險）
  });

  // B) 任何時候 .lb-content 被換入新節點（切換到另一個 lightbox_XX.html），就自動回頂
  if (content){
    const mo = new MutationObserver(() => resetTop());
    mo.observe(content, { childList:true, subtree:true });
  }

  // C)（可選）若你自己的載入程式會 dispatch 自訂事件，也可監聽
  root.addEventListener('lb:content:loaded', resetTop);
})();