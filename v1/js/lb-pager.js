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


/* ====== 影片就地替換播放（強化版） ====== */
(function () {
  'use strict';

  function createVideoEl(src, poster) {
    var v = document.createElement('video');

    // --- 基本屬性（跨裝置最穩定） ---
    v.setAttribute('controls', '');
    v.setAttribute('playsinline', ''); // iOS 內嵌播放
    v.playsInline = true;
    v.setAttribute('preload', 'metadata');
    if (poster) v.setAttribute('poster', poster);

    // --- 來源：用 <source> + 正確 type ---
    var s1 = document.createElement('source');
    s1.src = src;
    s1.type = 'video/mp4';
    v.appendChild(s1);

    // --- 錯誤處理（看得到原因 + 提供外開） ---
    var onError = function (ev) {
      var msg = '影片載入失敗';
      try {
        var code = (v.error && v.error.code) || 0;
        var ns = v.networkState;
        msg += '（errorCode=' + code + ', networkState=' + ns + '）';
      } catch (_) {}
      console.warn(msg, ev);

      // 以文字提示 + 外開連結替代
      var wrap = document.createElement('div');
      wrap.style.padding = '8px';
      wrap.innerHTML =
        '抱歉，影片無法播放。' +
        '請 <a href="' + src + '" target="_blank" rel="noopener">改用外部開啟</a> 或稍後再試。';
      if (v.parentNode) v.parentNode.replaceChild(wrap, v);
    };

    v.addEventListener('error', onError);
    v.addEventListener('stalled', onError);
    v.addEventListener('abort', onError);
    v.addEventListener('emptied', onError);

    // --- 加一點 UX：載入到可播時聚焦，方便鍵盤使用者 ---
    v.addEventListener('canplay', function () {
      v.focus();
    });

    return v;
  }

  function replaceBtnWithVideo(btn) {
    var src = btn.getAttribute('data-video-src');
    var poster = btn.getAttribute('data-poster') || '';
    if (!src) {
      alert('找不到影片來源（data-video-src）。');
      return;
    }

    // 建立 video 元素
    var video = createVideoEl(src, poster);

    // 用更穩定的方式替換節點
    var parent = btn.parentNode;
    parent.replaceChild(video, btn);

    // 明確呼叫 load()，讓部分瀏覽器進入載入流程
    try { video.load(); } catch (_) {}

    // 不自動播放（跨瀏覽器最穩），讓使用者按控制列播放
    // 如要嘗試自動播放，可解開下列三行（仍建議保持 muted）：
    // video.muted = true;
    // video.setAttribute('muted', '');
    // video.play && video.play().catch(function(){ /* 忽略策略拒絕 */ });
  }

  function onActivate(e) {
    if (e.type === 'click') return replaceBtnWithVideo(this);
    if (e.type === 'keydown') {
      var code = e.keyCode || e.which;
      if (code === 13 || code === 32) {
        e.preventDefault();
        return replaceBtnWithVideo(this);
      }
    }
  }

  // 事件委派（點縮圖 / 鍵盤）
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.video-play');
    if (btn) onActivate.call(btn, ev);
  }, false);

  document.addEventListener('keydown', function (ev) {
    var ae = document.activeElement;
    var btn = ae && ae.classList && ae.classList.contains('video-play') ? ae : null;
    if (btn) onActivate.call(btn, ev);
  }, false);
})();
