(function () {
  'use strict';

  /* 可調參數 */
  const MIN  = 1;     // 第一頁
  const MAX  = 34;    // 最後一頁
  const WRAP = false; // true=循環；false=邊界停住

  /* 解析目前頁碼（支援 ?query / #hash） */
  const m = location.pathname.match(/lightbox_(\d+)\.html$/i)
        || location.href.match(/lightbox_(\d+)\.html(?:[#?]|$)/i);
  if (!m) return; // 不在目標頁就不做事

  const raw    = m[1];               // 例如 '5' 或 '25' 或 '05'
  const padLen = raw.length;         // 1 或 2
  const num    = Math.max(MIN, Math.min(MAX, parseInt(raw, 10)));

  const fmt    = (n) => String(n).padStart(padLen, '0');
  const fileOf = (n) => `lightbox_${fmt(n)}.html`;

  const prevNum = WRAP ? (num === MIN ? MAX : num - 1) : (num > MIN ? num - 1 : null);
  const nextNum = WRAP ? (num === MAX ? MIN : num + 1) : (num < MAX ? num + 1 : null);

  /* 找容器與現有 nav；沒有就補一個 */
  const container = document.querySelector('.lightbox_bg') || document.body;

  let nav = container.querySelector('.lb-pager');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'lb-pager';
    nav.setAttribute('aria-label', '上一頁 / 下一頁');
    nav.innerHTML = `
      <a class="prev" aria-label="上一頁" rel="prev">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
          <path d="M16 8 Q16 6 14.4 7.2 L9.6 10.8 Q8 12 9.6 13.2 L14.4 16.8 Q16 18 16 16 Z"/>
        </svg>
      </a>
      <a class="next" aria-label="下一頁" rel="next">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
          <path d="M8 8 Q8 6 9.6 7.2 L14.4 10.8 Q16 12 14.4 13.2 L9.6 16.8 Q8 18 8 16 Z"/>
        </svg>
      </a>`;
    container.appendChild(nav);
  }

  const aPrev = nav.querySelector('a.prev');
  const aNext = nav.querySelector('a.next');

  function setLink(a, n) {
    if (!a) return;
    if (n) {
      a.href = fileOf(n);
      a.dataset.num = String(n);
      a.removeAttribute('aria-disabled');
      a.classList.remove('is-disabled');
      a.tabIndex = 0;
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('is-disabled');
      a.tabIndex = -1;
    }
  }
  setLink(aPrev, prevNum);
  setLink(aNext, nextNum);

  /* 若在父頁 lightbox 內，優先用父頁切換（不整頁跳走） */
  function tryOpenInParent(n) {
    try {
      if (window.top && window.top !== window && typeof window.top.openLightboxById === 'function') {
        window.top.openLightboxById(fmt(n));
        return true;
      }
    } catch (_) { /* 跨網域就算了 */ }
    return false;
  }

  // 點擊：攔截 disabled；能用父頁就用父頁
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }

    const n = a.dataset.num ? parseInt(a.dataset.num, 10) : NaN;
    if (!Number.isNaN(n) && tryOpenInParent(n)) e.preventDefault();
  });

  // 鍵盤左右鍵
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && prevNum) {
      if (!tryOpenInParent(prevNum)) location.href = fileOf(prevNum);
    } else if (e.key === 'ArrowRight' && nextNum) {
      if (!tryOpenInParent(nextNum)) location.href = fileOf(nextNum);
    }
  });
})();


/* ============================================================
 * 影片就地替換播放（Netlify 也不跳＋一次點擊立即播放）
 * - 點縮圖（.video-play）→ 直接換成 <video> 並自動播放（靜音，使用者可再開聲）
 * - 捕獲階段攔截事件 + 阻止預設/冒泡，避免打到你的「捲到頂」全域監聽
 * - 置換時凍結外框高度 + 還原 scrollY，避免版面重排導致跳動
 * - 播放失敗時顯示外開連結
 * ============================================================ */
(function () {
  'use strict';

  // 取得元素目前像素高度（含 padding，不含 margin）
  function getRectHeight(el) {
    return el ? el.getBoundingClientRect().height : 0;
  }

  // 建立 <video>
  function createVideoEl(src, poster) {
    var v = document.createElement('video');
    // 基本屬性：跨裝置最穩定
    v.setAttribute('controls', '');
    v.setAttribute('playsinline', ''); // iOS 內嵌
    v.playsInline = true;
    v.setAttribute('preload', 'metadata');
    if (poster) v.setAttribute('poster', poster);

    // 一次點擊就能播放：先靜音，符合各瀏覽器自動播放策略
    v.muted = true;
    v.setAttribute('muted', '');

    // 用 <source>（相容性最好）
    var s1 = document.createElement('source');
    s1.src = src;
    s1.type = 'video/mp4';
    v.appendChild(s1);

    // 錯誤回退：改成外開連結
    var onError = function () {
      var wrap = document.createElement('div');
      wrap.style.padding = '8px';
      wrap.innerHTML =
        '抱歉，影片無法播放。' +
        '請 <a href="' + src + '" target="_blank" rel="noopener">改用外部開啟</a>。';
      if (v.parentNode) v.parentNode.replaceChild(wrap, v);
    };
    v.addEventListener('error', onError);
    v.addEventListener('stalled', onError);
    v.addEventListener('abort', onError);
    v.addEventListener('emptied', onError);

    // 使用者第一次點影片畫面時，嘗試解除靜音（可選）
    v.addEventListener('click', function () {
      if (!v.paused && v.muted) { try { v.muted = false; } catch (_) {} }
    }, { once: true });

    return v;
  }

  function activateVideo(btn, ev) {
    // —— 完全攔截這次互動，避免打到其它全域 handler（如捲到頂）——
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    }

    var src = btn.getAttribute('data-video-src');
    var poster = btn.getAttribute('data-poster') || '';
    if (!src) { alert('找不到影片來源（data-video-src）。'); return; }

    // 記住目前卷軸位置
    var holdY = window.scrollY || document.documentElement.scrollTop || 0;

    // 凍結外框高度，避免置換造成重排跳動
    var figure = btn.closest('.video-figure') || btn.parentNode;
    var h = getRectHeight(figure);
    if (figure && h > 0) figure.style.height = h + 'px';

    // 置換成 <video>
    var video = createVideoEl(src, poster);
    var parent = btn.parentNode;
    parent.replaceChild(video, btn);

    // 立刻載入並嘗試自動播放（一次點擊即播）
    try { video.load(); } catch (_) {}
    var pp = video.play && video.play();
    if (pp && typeof pp.catch === 'function') {
      pp.catch(function () {
        // 若被政策拒絕，保留控制列，使用者可手動播放
      });
    }

    // 強制還原卷軸位置（兩次，確保不同瀏覽器都不跳）
    window.scrollTo({ top: holdY, left: 0, behavior: 'auto' });
    requestAnimationFrame(function () {
      window.scrollTo({ top: holdY, left: 0, behavior: 'auto' });
    });

    // 聚焦播放器但避免觸發捲動
    try {
      video.setAttribute('tabindex', '-1');
      if (video.focus) video.focus({ preventScroll: true });
    } catch (_) {}

    // 當可播放後，解除高度凍結
    var unlock = function () {
      if (figure) figure.style.height = '';
      video.removeEventListener('loadedmetadata', unlock);
      video.removeEventListener('canplay', unlock);
      video.removeEventListener('playing', unlock);
    };
    video.addEventListener('loadedmetadata', unlock);
    video.addEventListener('canplay', unlock);
    video.addEventListener('playing', unlock);
  }

  // 捕獲階段先攔截 click/keydown，避免觸發你頁面其它「捲到頂」監聽
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.video-play');
    if (!btn) return;
    activateVideo.call(btn, btn, ev);
  }, true);

  document.addEventListener('keydown', function (ev) {
    var ae = document.activeElement;
    var btn = ae && ae.classList && ae.classList.contains('video-play') ? ae : null;
    if (!btn) return;
    var code = ev.keyCode || ev.which;
    if (code === 13 || code === 32) {  // Enter / Space
      activateVideo.call(btn, btn, ev);
    }
  }, true);
})();