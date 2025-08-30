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
(function(){
  'use strict';

  function createVideoEl(src, poster){
    var v = document.createElement('video');

    // ===== 可存取與跨裝置設定 =====
    v.setAttribute('controls', '');
    v.setAttribute('playsinline', ''); // iOS 屬性
    v.playsInline = true;              // iOS 對應的 DOM 屬性（兩者都設較穩）
    v.setAttribute('preload', 'metadata');
    v.setAttribute('autoplay', '');    // 嘗試自動播放（若失敗會降級）
    v.setAttribute('muted', '');       // 為了通過自動播放策略，先預設靜音
    v.muted = true;                    // 同上，DOM 屬性也設
    v.setAttribute('crossorigin', 'anonymous'); // 搭配 jsDelivr 可避免未來擷取縮圖時的 CORS 汙染
    if (poster) v.setAttribute('poster', poster);

    // ===== 直接指定 src（避免部分瀏覽器對 <source> 的兼容坑）=====
    v.src = src;
    v.type = 'video/mp4';

    // ===== 簡易 fallback：提供下載或外開連結 =====
    var p = document.createElement('p');
    p.style.padding = '8px';
    p.innerHTML = '若影片無法播放，請 <a href="'+src+'" target="_blank" rel="noopener">改用外部開啟</a>。';
    v.appendChild(p);

    return v;
  }

  function replaceBtnWithVideo(btn){
    var src = btn.getAttribute('data-video-src');
    var poster = btn.getAttribute('data-poster') || '';
    if (!src){
      alert('找不到影片來源（data-video-src）。請確認路徑或改用 YouTube 方案。');
      return;
    }

    var video = createVideoEl(src, poster);

    // 用更穩定的方式替換節點
    var parent = btn.parentNode;
    parent.replaceChild(video, btn);

    // 部分瀏覽器需要先 load() 再嘗試 play()
    try {
      video.load();
    } catch(_) {}

    // 嘗試播放；若被策略拒絕，再退一步讓使用者手動播放
    var tryPlay = video.play && video.play();
    if (tryPlay && typeof tryPlay.then === 'function'){
      tryPlay.then(function(){
        // 自動播放成功：若你想要有聲，這裡可在第一幀後解除靜音（可選）
        // setTimeout(()=>{ video.muted = false; }, 300);
      }).catch(function(){
        // 自動播放被拒：移除 autoplay，保留 controls，讓使用者點擊播放
        video.removeAttribute('autoplay');
        // 也可以保留 muted 以避免再次被策略擋住（使用者可手動開聲）
      });
    }

    // 聚焦到播放器，提升鍵盤可用性
    video.focus();
  }

  function onActivate(e){
    if (e.type === 'click') return replaceBtnWithVideo(this);

    if (e.type === 'keydown'){
      var code = e.keyCode || e.which;
      if (code === 13 || code === 32){
        e.preventDefault();
        return replaceBtnWithVideo(this);
      }
    }
  }

  // 事件委派
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('.video-play');
    if (btn) onActivate.call(btn, ev);
  }, false);

  document.addEventListener('keydown', function(ev){
    var ae = document.activeElement;
    var btn = ae && ae.classList && ae.classList.contains('video-play') ? ae : null;
    if (btn) onActivate.call(btn, ev);
  }, false);
})();
