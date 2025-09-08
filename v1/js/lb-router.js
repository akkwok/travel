/* v1/js/lb-router.js
   - 讀取網址 /XX-Name -> 自動打開對應站點
   - 點擊站點 -> 更新網址
   - 前進/返回(popstate) -> 同步打開/關閉
   依賴 jQuery，並會盡力呼叫 window.lbOpen(id)；若沒這函式就退而求其次模擬 click。
*/
(function($){
  // === 1) 你的自訂 slug 對照 ===
  // 注意：鍵是「兩位數字字串」；值就是你想要在網址上出現的 slug。
  const ID_TO_SLUG = {
    '01':'01-Thailand',
    '02':'02-Bali',
    '03':'03-Czech',
    '04':'04-Halong',
    '05':'05-Malaysia',
    '06':'06-Boracay',
    '07':'07-Sabah',
    '08':'08-Tateyama',
    '09':'09-Italy',
    '10':'10-Osaka',
    '11':'11-HongKong',
    '12':'12-Okinawa',
    '13':'13-France',
    '14':'14-Shanghai',
    '16':'16-Austria',
    '17':'17-Hokkaido',
    '18':'18-Korea',
    '19':'19-Okayama',
    '20':'20-Bali',       // ← 與 02-Bali 並存
    '21':'21-Netherlands',
    '22':'22-Guangzhou',
    '23':'23-Macau',
    '24':'24-Shanghai',
    '25':'25-Hungary',
    '26':'26-Tokyo',
    '27':'27-Matsu',
    '28':'28-Clark',
    '29':'29-Halong',
    '30':'30-Korea',
    '31':'31-Turkey',
    '32':'32-Jakarta',
    '33':'33-Osaka',
    '34':'34-Egypt'
  };
  const SLUG_TO_ID = Object.fromEntries(
    Object.entries(ID_TO_SLUG).map(([id, slug]) => [slug.toLowerCase(), id])
  );

  // === 2) 小工具 ===
  const pad2 = n => (''+n).padStart(2,'0');

  // 嘗試開啟指定站點（優先用你的 lightbox 開啟函式；沒有就模擬點擊）
  function openStopById(id){
    id = pad2(id);
    if (typeof window.lbOpen === 'function') {
      window.lbOpen(id);           // 推薦：你的 lightbox 對外開啟 API
      return true;
    }
    // 退而求其次：模擬點擊你現有的三種入口
    const $pin = $('.mark_area .t_' + id).first();
    if ($pin.length) { $pin.trigger('click'); return true; }

    const $p = $('.num_area .p_' + id).first();
    if ($p.length) { $p.trigger('click'); return true; }

    const $li = $('.timeline .stop').filter(function(){
      const t = $(this).find('.badge').first().clone().children().remove().end().text().trim();
      return t === String(parseInt(id,10));
    }).first();
    if ($li.length) { $li.trigger('click'); return true; }

    return false;
  }

  // 由網址取 slug -> 站點 ID
  function getIdFromURL(){
    // 允許兩種形式：/slug 或 #/slug
    const pathSegs = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g,'').split('/');
    let seg = pathSegs.pop() || '';
    if (!seg && location.hash) {
      seg = location.hash.replace(/^#\/?/, ''); // 支援 #/slug
    }
    seg = (seg || '').toLowerCase();
    return SLUG_TO_ID[seg] || null;
  }

  // 導向：把網址改成對應 slug（不重整頁面）
  function pushSlugForId(id){
    id = pad2(id);
    const slug = ID_TO_SLUG[id];
    if (!slug) return;
    const target = '/' + slug;
    if (location.pathname !== target) {
      history.pushState({lb:id}, '', target);
    }
  }

  // 回到首頁（關閉 lightbox 時呼叫）
  function pushHome(){
    if (location.pathname !== '/') {
      history.pushState({}, '', '/');
    }
  }

  // === 3) 事件繫結：點擊站點 -> 開啟 + 改網址 ===
  // pins
  $(document).on('click', '.mark_area a', function(){
    const m = this.className.match(/\bt_(\d+)\b/);
    if (!m) return;
    const id = pad2(m[1]);
    pushSlugForId(id);
  });
  // num list
  $(document).on('click', '.num_area p', function(){
    const m = this.className.match(/\bp_(\d+)\b/);
    if (!m) return;
    const id = pad2(m[1]);
    pushSlugForId(id);
  });
  // timeline
  $(document).on('click', '.timeline li.stop', function(){
    const nText = $(this).find('.badge').first().clone().children().remove().end().text().trim();
    const n = parseInt(nText,10);
    if (!Number.isNaN(n)) pushSlugForId(n);
  });
  // 關閉 lightbox（關閉鈕或遮罩） -> 回首頁
  $(document).on('click', '#lb-root .lb-close, #lb-root .lb-mask', function(){
    pushHome();
  });

  // === 4) 首次讀取 / 前進返回
  function openFromURL(){
    const id = getIdFromURL();
    if (!id) return;           // 沒指定 slug 就當一般首頁
    // 等 DOM 與你的 lightbox 初始化好再開（最多等待 1.5s）
    const t0 = Date.now();
    (function tryOpen(){
      if (openStopById(id)) return;
      if (Date.now() - t0 > 1500) return; // 超時就放棄，不阻塞
      setTimeout(tryOpen, 50);
    })();
  }

  $(openFromURL);
  window.addEventListener('popstate', function(){
    // popstate：返回/前進
    const id = getIdFromURL();
    if (id) {
      openStopById(id);
    } else {
      // 回到根路徑：請關閉 lightbox（若你有對外關閉 API，可在此呼叫）
      // 這裡什麼都不做也行，因為你的關閉鈕會 pushState 回根；使用者按返回也會到根
    }
  });
})(jQuery);