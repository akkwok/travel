(function () {
  // 你有幾頁就改這兩個數
  const MIN = 1;
  const MAX = 34;

  // 是否要循環（第 1 頁的上一頁跳到第 34；第 34 的下一頁跳回第 1）
  const WRAP = false; // 想循環就改成 true

  // 解析檔名中的數字（支援 lightbox_1.html 或 lightbox_01.html）
  const m = location.pathname.match(/lightbox_(\d+)\.html$/i);
  if (!m) return;

  const raw = m[1];                    // 當前頁碼的原始位數
  const padLen = raw.length;           // 1 或 2
  const num = Math.max(MIN, Math.min(MAX, parseInt(raw, 10)));

  const fmt = n => String(n).padStart(padLen, '0');
  const fileOf = n => `lightbox_${fmt(n)}.html`;

  const prevNum = WRAP ? (num === MIN ? MAX : num - 1) : (num > MIN ? num - 1 : null);
  const nextNum = WRAP ? (num === MAX ? MIN : num + 1) : (num < MAX ? num + 1 : null);

  // ===== SVG（圓角三角形）
  const ICON_PREV = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M16 8 Q 16 6 14.4 7.2 L 9.6 10.8 Q 8 12 9.6 13.2 L 14.4 16.8 Q 16 18 16 16 L 16 8 Z"/>
    </svg>`;
  const ICON_NEXT = `
    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
      <path d="M8 8 Q 8 6 9.6 7.2 L 14.4 10.8 Q 16 12 14.4 13.2 L 9.6 16.8 Q 8 18 8 16 L 8 8 Z"/>
    </svg>`;

  // 建按鈕
  const nav = document.createElement('nav');
  nav.className = 'lb-pager';
  nav.setAttribute('aria-label', '上一頁 / 下一頁');

  const aPrev = document.createElement('a');
  aPrev.className = 'prev';
  aPrev.setAttribute('aria-label', '上一頁');
  aPrev.innerHTML = ICON_PREV;
  aPrev.rel = 'prev';
  if (prevNum) {
    aPrev.href = fileOf(prevNum);
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
    aNext.href = fileOf(nextNum);
  } else {
    aNext.setAttribute('aria-disabled', 'true');
    aNext.tabIndex = -1;
    aNext.classList.add('is-disabled');
  }

  nav.appendChild(aPrev);
  nav.appendChild(aNext);

  // 優先放進 .lightbox_bg（沒有就放 body）
  (document.querySelector('.lightbox_bg') || document.body).appendChild(nav);

  // 鍵盤左右鍵支援
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft'  && prevNum) location.href = fileOf(prevNum);
    if (e.key === 'ArrowRight' && nextNum) location.href = fileOf(nextNum);
  });

  // 停用狀態防誤點
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[aria-disabled="true"]');
    if (a) e.preventDefault();
  });
})();