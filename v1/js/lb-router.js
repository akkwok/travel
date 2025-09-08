// ===== Lightbox 漂亮路由（每站獨立 slug；無任何別名合併） =====
(function(){
  // 如果站點不是掛在根目錄，把 BASE_PATH 改成你的子路徑（結尾保留 /）
  const BASE_PATH = "/";

  // ✅ 每一站自己一個 slug（可自由改字）
  const TL_SLUGS = {
    "01":"01-Thailand",
    "02":"02-Bali",
    "03":"03-Czech",
    "04":"04-HalongBay",
    "05":"05-Malaysia",
    "06":"06-Boracay",
    "07":"07-Sabah",
    "08":"08-TateyamaKurobe",
    "09":"09-Italy",
    "10":"10-Osaka-Kyoto",
    "11":"11-HongKong",
    "12":"12-Okinawa",
    "13":"13-Paris",
    "14":"14-Shanghai",
    "15":"15-Okinawa",
    "16":"16-Austria",
    "17":"17-Hokkaido",
    "18":"18-Korea",
    "19":"19-Okayama",
    "20":"20-Bali",
    "21":"21-Netherlands",
    "22":"22-Guangzhou",
    "23":"23-Macau",
    "24":"24-Shanghai",
    "25":"25-Hungary",
    "26":"26-Tokyo",
    "27":"27-Matsu",
    "28":"28-Clark",
    "29":"29-HalongBay",
    "30":"30-Korea",
    "31":"31-Turkiye",
    "32":"32-Jakarta",
    "33":"33-Osaka",
    "34":"34-Egypt"
  };

  // 反查表（slug → id，做大小寫不敏感）
  const SLUG_TO_ID = {};
  Object.entries(TL_SLUGS).forEach(([id,slug])=>{
    SLUG_TO_ID[slug.toLowerCase()] = id;
  });

  // 檢查 Lightbox 是否為開啟狀態（盡量不碰你原本 DOM 結構）
  const isOpen = ()=> {
    const el = document.getElementById('lb-root');
    if (!el) return false;
    const byClass = el.classList.contains('is-open') || el.classList.contains('open');
    const byAria  = el.getAttribute('aria-hidden') === 'false';
    return byClass || byAria;
  };

  // 取原本的開關（若存在）
  const _open  = window.lbOpen;
  const _close = window.lbClose;

  const pageTitle0 = document.title;
  function titleFor(id){
    const slug = TL_SLUGS[id] || id;
    const pretty = decodeURIComponent(slug).replace(/^\d+\-?/, '').replace(/-/g,' ');
    return `${pageTitle0} — ${pretty || id}`;
  }

  function pushUrlFor(id){
    const slug = TL_SLUGS[id] || id;
    const want = BASE_PATH.replace(/\/$/,'') + '/' + slug;
    if (decodeURI(location.pathname) !== want){
      history.pushState({lb:id}, '', want);
      document.title = titleFor(id);
    }
  }
  function replaceUrlRoot(){
    const want = BASE_PATH;
    if (location.pathname !== want){
      history.replaceState({}, '', want);
    }
    document.title = pageTitle0;
  }

  // 對外：用 id 開啟 + 推網址
  function openById(id, opts={}){
    id = String(id).padStart(2,'0');
    if (typeof _open === 'function') { _open(id); }
    pushUrlFor(id);
    if (opts.scrollTop) {
      const sc = document.querySelector('#lb-root .lb-stage .lb-content');
      if (sc) sc.scrollTop = 0;
    }
  }

  // 對外：關閉 + 還原網址
  function closeLb(){
    if (typeof _close === 'function') { _close(); }
    replaceUrlRoot();
  }

  // 包裝既有 lbOpen / lbClose（若你的專案已經有它們）
  if (typeof _open === 'function'){
    window.lbOpen = function(id, ...rest){
      id = String(id).padStart(2,'0');
      const r = _open.call(this, id, ...rest);
      pushUrlFor(id);
      return r;
    };
  }
  if (typeof _close === 'function'){
    window.lbClose = function(...rest){
      const r = _close.apply(this, rest);
      replaceUrlRoot();
      return r;
    };
  }

  // 如果你不是集中呼叫 lbOpen()，就加保險的 click 代理
  if (typeof _open !== 'function'){
    // a) 地圖 pin：class 含 t_XX
    document.addEventListener('click', function(e){
      const a = e.target.closest('.mark_area a[class*="t_"]');
      if (!a) return;
      const m = a.className.match(/\bt_(\d+)\b/);
      if (!m) return;
      openById(m[1], {scrollTop:true});
    }, true);

    // b) 數字區 p：class 含 p_XX
    document.addEventListener('click', function(e){
      const p = e.target.closest('.num_area p[class*="p_"]');
      if (!p) return;
      const m = p.className.match(/\bp_(\d+)\b/);
      if (!m) return;
      openById(m[1], {scrollTop:true});
    }, true);

    // c) 時間軸 li.stop：從 .badge 讀號碼
    document.addEventListener('click', function(e){
      const li = e.target.closest('.timeline li.stop');
      if (!li) return;
      const badge = li.querySelector('.badge');
      if (!badge) return;
      const n = parseInt(badge.textContent, 10);
      if (Number.isNaN(n)) return;
      openById(n, {scrollTop:true});
    }, true);
  }

  // 解析目前網址 → 直接開啟對應 lightbox（支援重新整理/直連）
  function consumeRoute(){
    const full = decodeURI(location.pathname);
    const baseRe = new RegExp("^" + BASE_PATH.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\/').replace(/\/$/,'') + "\\/?");
    const rest = full.replace(baseRe,'');
    const slug = rest.split('/')[0].toLowerCase(); // 只吃第一段
    const id = SLUG_TO_ID[slug];
    if (id){
      const openNow = ()=> openById(id, {scrollTop:true});
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(openNow, 0);
      } else {
        document.addEventListener('DOMContentLoaded', openNow, {once:true});
      }
    }
  }

  // 處理返回鍵：/NN-xxx ↔ /
  window.addEventListener('popstate', function(){
    const path = decodeURI(location.pathname).replace(/\/+$/,'');
    const base = BASE_PATH.replace(/\/+$/,'');
    if (path === base || path === "") {
      if (isOpen()) closeLb();
      return;
    }
    const slug = path.split('/').pop().toLowerCase();
    const id = SLUG_TO_ID[slug];
    if (id) openById(id, {scrollTop:true});
  });

  // 初次進站也吃路由
  consumeRoute();
})();