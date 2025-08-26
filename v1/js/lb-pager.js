// (function () {
//   'use strict';

//   /* 可調參數 */
//   const MIN  = 1;     // 第一頁
//   const MAX  = 34;    // 最後一頁
//   const WRAP = false; // true=循環；false=邊界停住

//   /* 解析目前頁碼（支援 ?query / #hash） */
//   const m = location.pathname.match(/lightbox_(\d+)\.html$/i)
//         || location.href.match(/lightbox_(\d+)\.html(?:[#?]|$)/i);
//   if (!m) return; // 不在目標頁就不做事

//   const raw    = m[1];               // 例如 '5' 或 '25' 或 '05'
//   const padLen = raw.length;         // 1 或 2
//   const num    = Math.max(MIN, Math.min(MAX, parseInt(raw, 10)));

//   const fmt    = (n) => String(n).padStart(padLen, '0');
//   const fileOf = (n) => `lightbox_${fmt(n)}.html`;

//   const prevNum = WRAP ? (num === MIN ? MAX : num - 1) : (num > MIN ? num - 1 : null);
//   const nextNum = WRAP ? (num === MAX ? MIN : num + 1) : (num < MAX ? num + 1 : null);

//   /* 找容器與現有 nav；沒有就補一個 */
//   const container = document.querySelector('.lightbox_bg') || document.body;

//   let nav = container.querySelector('.lb-pager');
//   if (!nav) {
//     nav = document.createElement('nav');
//     nav.className = 'lb-pager';
//     nav.setAttribute('aria-label', '上一頁 / 下一頁');
//     nav.innerHTML = `
//       <a class="prev" aria-label="上一頁" rel="prev">
//         <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
//           <path d="M16 8 Q16 6 14.4 7.2 L9.6 10.8 Q8 12 9.6 13.2 L14.4 16.8 Q16 18 16 16 Z"/>
//         </svg>
//       </a>
//       <a class="next" aria-label="下一頁" rel="next">
//         <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
//           <path d="M8 8 Q8 6 9.6 7.2 L14.4 10.8 Q16 12 14.4 13.2 L9.6 16.8 Q8 18 8 16 Z"/>
//         </svg>
//       </a>`;
//     container.appendChild(nav);
//   }

//   const aPrev = nav.querySelector('a.prev');
//   const aNext = nav.querySelector('a.next');

//   function setLink(a, n) {
//     if (!a) return;
//     if (n) {
//       a.href = fileOf(n);
//       a.dataset.num = String(n);
//       a.removeAttribute('aria-disabled');
//       a.classList.remove('is-disabled');
//       a.tabIndex = 0;
//     } else {
//       a.removeAttribute('href');
//       a.setAttribute('aria-disabled', 'true');
//       a.classList.add('is-disabled');
//       a.tabIndex = -1;
//     }
//   }
//   setLink(aPrev, prevNum);
//   setLink(aNext, nextNum);

//   /* 若在父頁 lightbox 內，優先用父頁切換（不整頁跳走） */
//   function tryOpenInParent(n) {
//     try {
//       if (window.top && window.top !== window && typeof window.top.openLightboxById === 'function') {
//         window.top.openLightboxById(fmt(n));
//         return true;
//       }
//     } catch (_) { /* 跨網域就算了 */ }
//     return false;
//   }

//   // 點擊：攔截 disabled；能用父頁就用父頁
//   nav.addEventListener('click', (e) => {
//     const a = e.target.closest('a');
//     if (!a) return;
//     if (a.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }

//     const n = a.dataset.num ? parseInt(a.dataset.num, 10) : NaN;
//     if (!Number.isNaN(n) && tryOpenInParent(n)) e.preventDefault();
//   });

//   // 鍵盤左右鍵
//   document.addEventListener('keydown', (e) => {
//     if (e.key === 'ArrowLeft' && prevNum) {
//       if (!tryOpenInParent(prevNum)) location.href = fileOf(prevNum);
//     } else if (e.key === 'ArrowRight' && nextNum) {
//       if (!tryOpenInParent(nextNum)) location.href = fileOf(nextNum);
//     }
//   });
// })();