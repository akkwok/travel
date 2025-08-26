(function () {
  // ===== 可調參數 =====
  const MIN  = 1;   // 第一頁
  const MAX  = 34;  // 最後一頁
  const WRAP = false; // true=循環；false=不循環

  // 解析目前是第幾頁（吃 pathname 或 href，含 query/hash 也 OK）
  const m = location.pathname.match(/lightbox_(\d+)\.html$/i)
        || location.href.match(/lightbox_(\d+)\.html(?:[#?]|$)/i);
  if (!m) return;

  const raw    = m[1];                 // 目前頁碼原始字串（保留位數）
  const padLen = raw.length;           // 1 或 2
  const num    = Math.max(MIN, Math.min(MAX, parseInt(raw, 10)));

  const fmt    = n => String(n).padStart(padLen, '0');
  const hrefOf = n => `lightbox_${fmt(n)}.html`;

  // 計算前後頁碼
  const prevNum = WRAP ? (num === MIN ? MAX : num - 1) : (num > MIN ? num - 1 : null);
  const nextNum = WRAP ? (num === MAX ? MIN : num + 1) : (num < MAX ? num + 1 : null);

  // ===== ICON：圓角三角形（左右） =====
  const ICON_PREV = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M16 8 Q 16 6 14.4 7.2 L 9.6 10.8 Q 8 12 9.6 13.2 L 14.4 16.8 Q 16 18 16 16 Z"/>
    </svg>`;
  const ICON_NEXT = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M8 8 Q 8 6 9.6 7.2 L 14.4 10.8 Q 16 12 14.4 13.2 L 9.6 16.8 Q 8 18 8 16 Z"/>
    </svg>`;

  // ===== 建立導覽節點 =====
  const nav = document.createElement('nav');
  nav.className = 'lb-pager';
  nav.setAttribute('aria-label', '上一頁 / 下一頁');

  const aPrev = document.createElement('a');
  aPrev.className = 'prev';
  aPrev.setAttribute('aria-label', '上一頁');
  aPrev.innerHTML = ICON_PREV;
  aPrev.rel = 'prev';

  if (prevNum) {
    aPrev.href = hrefOf(prevNum);
    aPrev.dataset.num = String(prevNum);
  } else {
    aPrev.setAttribute('aria-disabled', 'true');
    aPrev.tabIndex = -1;
    aPrev.classList.add('is-disabled');
  }

  const aNext = document.createElement('a');
  aNext.className = 'next';
  aNext.setAttribute('aria-label', '下一頁');
  aNext.innerHTML = ICON_NEXT;
  aNext.rel = 'next';

  if (nextNum) {
    aNext.href = hrefOf(nextNum);
    aNext.dataset.num = String(nextNum);
  } else {
    aNext.setAttribute('aria-disabled', 'true');
    aNext.tabIndex = -1;
    aNext.classList.add('is-disabled');
  }

  nav.appendChild(aPrev);
  nav.appendChild(aNext);

  // 插入到 .lightbox_bg（找不到就放 body）
  (document.querySelector('.lightbox_bg') || document.body).appendChild(nav);

  // ===== 在 iframe 內優先呼叫父頁載入（若可用），否則就直接換頁 =====
  function tryOpenInParent(n){
    try {
      if (window.top && window.top !== window && typeof window.top.openLightboxById === 'function') {
        window.top.openLightboxById(fmt(n));
        return true;
      }
    } catch (_) { /* 可能跨網域，安全起見忽略 */ }
    return false;
  }

  // click：擋住 disabled；且若可用父頁函式就用父頁載入
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }

    const n = a.dataset.num ? parseInt(a.dataset.num, 10) : NaN;
    if (!Number.isNaN(n) && tryOpenInParent(n)) {
      e.preventDefault();
    }
  });

  // 鍵盤左右鍵
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && prevNum) {
      if (!tryOpenInParent(prevNum)) location.href = hrefOf(prevNum);
    }
    if (e.key === 'ArrowRight' && nextNum) {
      if (!tryOpenInParent(nextNum)) location.href = hrefOf(nextNum);
    }
  });
})();