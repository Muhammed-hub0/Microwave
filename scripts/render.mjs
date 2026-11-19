import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACCESSORIES,
  EXCLUDED_BRANDS,
  FEATURED_ASINS,
  MARKETPLACE,
  MAX_PRICE,
  MIN_PRICE,
  PARTNER_TAG,
} from './config.mjs';
import { productKey } from './naming.mjs';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DATA_DIR = join(ROOT, 'data');
export const OUT_DIR = join(ROOT, 'public');

const emptyDash = '—';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPrice = (value) =>
  Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Africa/Cairo',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }
};

// الصفوف اللي هتظهر: نشِطة + سعرها منطقي + عندها صورة + مش براند مستثنى
export function visibleOffers(offers) {
  const list = offers
    .filter((o) => o && o.active !== false)
    .filter((o) => !EXCLUDED_BRANDS.includes(String(o.brand || '').trim()))
    .filter((o) => Number.isFinite(Number(o.price)))
    .map((o) => ({ ...o, price: Number(o.price) }))
    .filter((o) => o.price >= MIN_PRICE && o.price <= MAX_PRICE)
    .filter((o) => typeof o.img === 'string' && /^https:\/\//.test(o.img))
    .sort((a, b) => a.price - b.price);

  // نفس المنتج بأكتر من ASIN → نخلي الأرخص بس
  const seen = new Set();
  const rows = [];
  for (const offer of list) {
    const key = productKey(offer);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(offer);
  }
  return rows;
}

function filterScript() {
  return `(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('#tbl tbody tr'));
  var fBrand = document.getElementById('fBrand');
  var fCap = document.getElementById('fCap');
  var fWatt = document.getElementById('fWatt');
  var fMin = document.getElementById('fMin');
  var fMax = document.getElementById('fMax');
  var cnt = document.getElementById('cnt');
  var total = rows.length;

  function fill(sel, attr, numeric) {
    var set = {};
    rows.forEach(function (r) { var v = r.getAttribute(attr); if (v) set[v] = 1; });
    var vals = Object.keys(set);
    vals.sort(numeric
      ? function (a, b) { return parseFloat(a) - parseFloat(b); }
      : function (a, b) { return a.localeCompare(b, 'ar'); });
    vals.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }
  fill(fCap, 'data-cap', true);
  fill(fWatt, 'data-watt', true);
  fill(fBrand, 'data-brand', false);

  function apply() {
    var b = fBrand.value, c = fCap.value, w = fWatt.value;
    var mn = parseFloat(fMin.value), mx = parseFloat(fMax.value);
    var shown = 0;
    rows.forEach(function (r) {
      var ok = (!b || r.getAttribute('data-brand') === b)
            && (!c || r.getAttribute('data-cap') === c)
            && (!w || r.getAttribute('data-watt') === w);
      var p = parseFloat(r.getAttribute('data-price'));
      if (!isNaN(mn)) { ok = ok && p >= mn; }
      if (!isNaN(mx)) { ok = ok && p <= mx; }
      r.style.display = ok ? '' : 'none';
      r.className = ok && (shown % 2 === 1) ? 'alt' : '';
      if (ok) { shown++; }
    });
    cnt.textContent = shown + ' من ' + total + ' منتج';
  }

  [fBrand, fCap, fWatt, fMin, fMax].forEach(function (el) {
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
  });
  document.getElementById('fReset').addEventListener('click', function () {
    fBrand.value = ''; fCap.value = ''; fWatt.value = ''; fMin.value = ''; fMax.value = '';
    apply();
  });
  apply();
})();`;
}

function themeScript() {
  return `(function () {
  var btn = document.getElementById('themeToggleBtn');
  var icon = document.getElementById('themeIcon');
  try {
    if (localStorage.getItem('mwo-theme') === 'dark') {
      document.documentElement.dataset.theme = 'dark';
      if (icon) icon.textContent = '☀️';
    }
  } catch (e) {}
  if (!btn) return;
  btn.addEventListener('click', function () {
    var dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    if (icon) icon.textContent = dark ? '🌙' : '☀️';
    try { localStorage.setItem('mwo-theme', dark ? 'light' : 'dark'); } catch (e) {}
  });
})();`;
}

function tabsScript() {
  return `(function () {
  var tabs = {
    featured: document.getElementById('tabFeatured'),
    all: document.getElementById('tabAll'),
    accessories: document.getElementById('tabAccessories')
  };
  var views = {
    featured: document.getElementById('viewFeatured'),
    all: document.getElementById('viewAll'),
    accessories: document.getElementById('viewAccessories')
  };
  if (!tabs.all || !views.all) return;

  function show(which) {
    if (!tabs[which] || !views[which]) which = 'all';
    Object.keys(tabs).forEach(function (k) {
      if (!tabs[k] || !views[k]) return;
      var on = k === which;
      tabs[k].classList.toggle('active', on);
      tabs[k].setAttribute('aria-selected', on ? 'true' : 'false');
      views[k].hidden = !on;
    });
    try { localStorage.setItem('mwo-tab', which); } catch (e) {}
  }

  Object.keys(tabs).forEach(function (k) {
    if (tabs[k]) tabs[k].addEventListener('click', function () { show(k); });
  });
  try {
    var saved = localStorage.getItem('mwo-tab');
    if (saved && saved !== 'all') show(saved);
  } catch (e) {}
})();`;
}

const HEAD_CSS = `
:root{--bg:#f6f7f9;--surface:#ffffff;--surface-alt:#f0f3f7;--text:#1b1f24;--muted:#5d6670;--line:#e3e6ea;--a:#1c3d63;--a-soft:#e8eef6;--b:#9a6f1e;--b-soft:#f8f0de;--win:#0f7a4a;--win-soft:#e3f5ec;--accent:#b8892f;color-scheme:light}
:root[data-theme="dark"]{--bg:#0b1a2b;--surface:#11273f;--surface-alt:#183350;--text:#eceff2;--muted:#9aa4af;--line:#27415e;--a:#86b4e8;--a-soft:#15283f;--b:#e0c080;--b-soft:#3a2f16;--win:#4fd08f;--win-soft:#13301f;--accent:#e0c080;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif;line-height:1.65;transition:background-color .2s ease,color .2s ease}
a{color:var(--a);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
.surface-card{background:var(--surface);border:1px solid var(--line);border-radius:16px}
header.top{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-block:10px}
.brand{display:flex;align-items:center;gap:10px}
.brand img{width:44px;height:44px;border-radius:12px;border:1px solid var(--line)}
.brand b{font-size:17px;font-weight:800}
.socials{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.social-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:12px;text-decoration:none;font-size:12px;font-weight:700;color:var(--text);background:var(--surface-alt);border:1px solid var(--line)}
.theme-btn{padding:7px 11px;border-radius:12px;border:1px solid var(--line);background:var(--surface-alt);color:var(--text);font-weight:700;cursor:pointer}
h1{font-size:22px;margin:18px 0 12px}
h2.sec{font-size:17px;margin:20px 0 10px;padding-inline-start:10px;border-inline-start:4px solid var(--b)}
h2.sec span{font-size:12px;color:var(--muted);font-weight:600;margin-inline-start:8px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 10px}
.tab{font-family:inherit;font-size:14px;font-weight:800;padding:9px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer}
.tab span{font-size:11px;font-weight:600;color:var(--muted);margin-inline-start:6px}
.tab.active{background:var(--a);border-color:var(--a);color:#fff}
.tab.active span{color:#dbe8f7}
:root[data-theme="dark"] .tab.active{color:#0b1a2b}
:root[data-theme="dark"] .tab.active span{color:#26415e}
.tab:hover{border-color:var(--b)}
`;

function siteHeader(root = '') {
  return `<header class="top"><div class="wrap head">
  <div class="brand"><a href="${root}index.html"><img src="${root}logo.jpg" alt="مشترياتك صح"></a><b>مشترياتك صح · دليل الميكروويف</b></div>
  <div class="socials">
    <a class="social-pill" href="https://www.facebook.com/share/1d5zsrA3L8/" target="_blank" rel="noopener">صفحتنا</a>
    <a class="social-pill" href="https://www.facebook.com/share/g/1HzNFsMQCc/" target="_blank" rel="noopener">الجروب</a>
    <a class="social-pill" href="https://chat.whatsapp.com/Dujjs3WZxVZ5tlEBNnZN2W?s=cl&amp;p=a&amp;iam=2" target="_blank" rel="noopener">واتساب</a>
    <button id="themeToggleBtn" class="theme-btn" type="button" title="تغيير المظهر"><span id="themeIcon">🌙</span></button>
  </div>
</div></header>`;
}

function tracker() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=G-X7SD1FVX33"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){ dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-X7SD1FVX33');
</script>`;
}

const TABLE_CSS = `
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding:12px 14px;margin-bottom:14px}
.fld{display:flex;flex-direction:column;gap:4px}
.fld label{font-size:12px;color:var(--muted);font-weight:600}
select,input{font-family:inherit;font-size:14px;padding:9px 11px;border:2px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);min-width:130px}
button.reset{font-family:inherit;font-size:14px;padding:9px 14px;border:1px solid var(--b);border-radius:12px;background:var(--b);color:#fff;font-weight:700;cursor:pointer}
:root[data-theme="dark"] button.reset{color:#0b1a2b}
.cnt{font-size:13px;color:var(--win);font-weight:700;margin-inline-start:auto;padding-bottom:8px}
table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:14px}
th{background:var(--a);color:#fff;padding:11px 10px;text-align:right;position:sticky;top:0;z-index:1;white-space:nowrap}
td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tr.alt td{background:var(--surface-alt)}
.n{color:var(--muted);width:34px}
.nm{font-weight:700}
.nm a{color:var(--text)}
.nm a:hover{color:var(--a)}
.sp{white-space:nowrap}
.p{font-weight:800;white-space:nowrap;color:var(--win)}
.w{color:var(--muted);font-size:12px}
.im{width:90px;text-align:center}
.lk a{display:inline-block;padding:6px 10px;border-radius:9px;background:var(--a);color:#fff;font-size:12px;white-space:nowrap}
.lk a:hover{text-decoration:none;opacity:.9}
.ft{margin:16px 0 0;color:var(--muted);font-size:12px;line-height:1.8}
.banner{display:block;width:100%;height:auto;border-radius:16px;border:1px solid var(--line);margin:0 0 14px}
.empty{padding:28px 18px;text-align:center;color:var(--muted);font-size:14px}
.empty b{display:block;color:var(--text);font-size:16px;margin-bottom:6px}
@media(max-width:720px){
  .wrap{padding:8px}
  .tabs{margin:10px 0 8px}
  .tab{font-size:13px;padding:8px 10px;flex:1 1 140px}
  h1{font-size:18px;margin:12px 0 8px}
  h2.sec{font-size:15px;margin:14px 0 8px}
  .banner{margin-bottom:10px}
  .bar{padding:10px}
  select,input{font-size:13px;padding:8px;min-width:0;width:100%}
  .fld{flex:1 1 130px}
  .cnt{width:100%;margin-inline-start:0;padding-bottom:0}
  .brand b{font-size:13px}
  .brand img{width:36px;height:36px}
  .social-pill{font-size:11px;padding:5px 8px}
  table{font-size:12px}
  th,td{padding:6px 5px}
  .c-num,.c-cap,.c-watt,.c-war,.c-ship{display:none}
  .im img{width:54px;height:54px}
  .lk a{padding:5px 7px;font-size:11px}
}
`;

const ACCESSORY_CSS = `
.acc{padding:14px 16px 16px;margin-top:6px}
.acc h2.sec{margin-top:0}
.acc-lead{margin:0 0 12px;font-size:13px;color:var(--muted)}
.acc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.acc-card{background:var(--surface-alt);border:1px solid var(--line);border-radius:12px;padding:14px 10px;text-align:center;display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-height:96px}
.acc-card b{font-size:14px;font-weight:800}
.acc-card a{display:inline-block;padding:7px 10px;border-radius:9px;background:var(--a);color:#fff;font-size:12px;font-weight:700}
.acc-card a:hover{text-decoration:none;opacity:.9}
:root[data-theme="dark"] .acc-card a{color:#0b1a2b}
@media(max-width:720px){
  .acc{padding:12px}
  .acc-grid{grid-template-columns:repeat(2,1fr)}
  .acc-card b{font-size:12px}
  .acc-card a{font-size:11px;padding:6px 8px}
}
`;

const DETAIL_CSS = `
.card{margin-top:14px;padding:16px;display:grid;grid-template-columns:200px 1fr;gap:18px;align-items:start}
.pic{text-align:center}
.pic img{width:100%;max-height:250px;object-fit:contain}
.name{font-size:19px;font-weight:800;margin:0 0 6px}
.price{font-size:23px;font-weight:800;color:var(--win);margin:10px 0}
dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:14px}
dt{color:var(--muted)}
dd{margin:0;font-weight:700}
.buy{display:inline-block;margin-top:14px;padding:10px 18px;border-radius:12px;background:var(--win);color:#fff;font-weight:800}
.buy:hover{opacity:.9;text-decoration:none}
.back{display:inline-block;margin-bottom:4px;font-size:13px;font-weight:700}
.note{color:var(--muted);font-size:12px;margin-top:18px}
@media(max-width:600px){
  .card{grid-template-columns:1fr;padding:12px}
  .pic img{max-height:200px}
  .name{font-size:16px}
  dl{grid-template-columns:1fr;gap:2px}
  dd{margin-bottom:6px}
}
`;

function renderRows(rows, start = 0) {
  return rows
    .map((offer, index) => {
      const warranty = esc(offer.warranty || '').replace(/\s\|\s/g, '<br>') || emptyDash;
      const ship = esc(offer.ship || '') || emptyDash;
      const cap = offer.cap ? esc(offer.cap) : emptyDash;
      const watt = offer.watt ? esc(offer.watt) : emptyDash;
      const url = esc(offer.url || '');
      const detail = `p/${encodeURIComponent(offer.asin)}.html`;
      const image = `<a href='${detail}'><img src='${esc(offer.img)}' loading='lazy' alt='${esc(
        offer.name,
      )}' style='width:76px;height:76px;object-fit:contain'></a>`;
      return `<tr data-brand='${esc(offer.brand || '')}' data-cap='${esc(offer.cap || '')}' data-watt='${esc(
        offer.watt || '',
      )}' data-price='${offer.price}'><td class='n c-num'>${start + index + 1}</td><td class='im c-img'>${image}</td><td class='nm c-name'><a href='${detail}'>${esc(
        offer.name,
      )}</a></td><td class='sp c-cap'>${cap}</td><td class='sp c-watt'>${watt}</td><td class='w c-war'>${warranty}</td><td class='c-ship'>${ship}</td><td class='p c-price'>${formatPrice(
        offer.price,
      )} ج.م</td><td class='lk c-link'><a href='${url}' target='_blank' rel='nofollow sponsored'>أمازون</a></td></tr>`;
    })
    .join('\n');
}

const tableHead = `<thead><tr><th class='c-num'></th><th class='c-img'>الصورة</th><th class='c-name'>الاسم</th><th class='c-cap'>السعة (لتر)</th><th class='c-watt'>القدرة (وات)</th><th class='c-war'>الضمان</th><th class='c-ship'>الشحن</th><th class='c-price'>السعر</th><th class='c-link'>الرابط</th></tr></thead>`;

function renderAccessories() {
  if (!ACCESSORIES.length) return '';
  const cards = ACCESSORIES.map(
    (a) =>
      `    <div class="acc-card"><b>${esc(a.name)}</b><a href="https://${MARKETPLACE}/dp/${a.asin}?tag=${PARTNER_TAG}" target="_blank" rel="nofollow sponsored noopener">شوف على أمازون</a></div>`,
  ).join('\n');
  return `<section id="accessoriesSection" class="acc surface-card">
  <h2 class="sec">إكسسوارات الميكروويف</h2>
  <p class="acc-lead">إكسسوارات مفيدة مع الميكروويف. اضغط على أي منتج لتفتح صفحته على أمازون مصر.</p>
  <div class="acc-grid">
${cards}
  </div>
</section>`;
}

export function renderHtml(offers, options = {}) {
  const rows = visibleOffers(offers);
  const byAsin = new Map(rows.map((o) => [o.asin, o]));
  const featured = FEATURED_ASINS.map((asin) => byAsin.get(asin))
    .filter(Boolean)
    .sort((a, b) => a.price - b.price);
  const hasFeatured = featured.length > 0;
  const hasAccessories = ACCESSORIES.length > 0;
  const updatedAt = options.updatedAt || new Date().toISOString();

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>دليل الميكروويف في مصر | مشترياتك صح</title>
<meta name="description" content="قارن أسعار الميكروويف في مصر: السعة والقوة والنوع والسعر من أمازون مصر مع تحديث تلقائي.">
<meta name="theme-color" content="#0f253d">
<meta property="og:type" content="website">
<meta property="og:title" content="دليل الميكروويف في مصر | مشترياتك صح">
<meta property="og:description" content="قارن بين أشهر الميكروويفات واختار الأنسب لمطبخك.">
<meta property="og:image" content="og-image.jpg">
<link rel="icon" href="logo.jpg">
${tracker()}
<style>${HEAD_CSS}${TABLE_CSS}${ACCESSORY_CSS}</style></head><body>
${siteHeader()}
<main class="wrap">
<h1>الميكروويف على أمازون مصر</h1>
<img class="banner" src="banner.jpg" alt="مشترياتك صح — دليلك للمقارنة الذكية واختيار الأفضل" width="1024" height="390">
<div class="tabs" role="tablist" aria-label="اختر القائمة">
${hasFeatured ? `  <button id="tabFeatured" class="tab" type="button" role="tab" aria-selected="false" aria-controls="viewFeatured">ترشيحاتنا الموثوقة <span>أفضل قيمة مقابل سعر</span></button>
` : ''}  <button id="tabAll" class="tab ${hasFeatured ? '' : 'active'}" type="button" role="tab" aria-selected="${hasFeatured ? 'false' : 'true'}" aria-controls="viewAll">كل المتوفر <span>${rows.length} منتج</span></button>
${hasAccessories ? `  <button id="tabAccessories" class="tab" type="button" role="tab" aria-selected="false" aria-controls="viewAccessories">إكسسوارات الميكروويف <span>${ACCESSORIES.length} منتجات</span></button>
` : ''}</div>
${hasFeatured ? `<section id="viewFeatured" role="tabpanel" aria-labelledby="tabFeatured" hidden>
<table id="tblFeatured" class="surface-card">
${tableHead}
<tbody>
${renderRows(featured)}
</tbody></table>
</section>` : ''}
<section id="viewAll" role="tabpanel" aria-labelledby="tabAll" ${hasFeatured ? 'hidden' : ''}>
<div class="bar surface-card">
  <div class="fld"><label for="fBrand">البراند</label><select id="fBrand"><option value="">الكل</option></select></div>
  <div class="fld"><label for="fCap">السعة (لتر)</label><select id="fCap"><option value="">الكل</option></select></div>
  <div class="fld"><label for="fWatt">القدرة (وات)</label><select id="fWatt"><option value="">الكل</option></select></div>
  <div class="fld"><label for="fMin">السعر من</label><input id="fMin" type="number" inputmode="numeric" placeholder="0" min="0"></div>
  <div class="fld"><label for="fMax">السعر إلى</label><input id="fMax" type="number" inputmode="numeric" placeholder="∞" min="0"></div>
  <button id="fReset" class="reset">مسح الفلاتر</button>
  <div class="cnt" id="cnt">${rows.length} من ${rows.length} منتج</div>
</div>
${rows.length ? '' : `<div class="empty surface-card"><b>لسه مفيش منتجات هنا</b>هتظهر الميكروويفات تلقائيًا بعد أول تشغيل للتحديث (Actions ← تحديث أسعار الميكروويف ← Run workflow).</div>`}
<table id="tbl" class="surface-card">
${tableHead}
<tbody>
${renderRows(rows)}
</tbody></table>
</section>
${hasAccessories ? `<section id="viewAccessories" role="tabpanel" aria-labelledby="tabAccessories" hidden>
${renderAccessories()}
</section>` : ''}
<div class="ft">
  <div style="color:var(--b);font-weight:800">تنويه: يجب مراجعة السعر والمواصفات الفنية من صفحة المنتج على أمازون قبل الشراء.</div>
  <div>آخر فحص تلقائي: ${esc(formatDate(updatedAt))} · ${rows.length} منتج</div>
  <div>كأفلييت أمازون: قد نحصل على عمولة من عمليات الشراء اللي بتحصل عن طريق روابط الصفحة، من غير أي تكلفة إضافية عليك. الأسعار والمقاسات بتتحدث تلقائيًا وقد تختلف لحظة الشراء.</div>
</div>
</main>
<script>
${filterScript()}
${tabsScript()}
${themeScript()}
</script>
</body></html>
`;
}

export function renderDetail(offer, options = {}) {
  const updatedAt = options.updatedAt || new Date().toISOString();
  const warranty = esc(offer.warranty || '').replace(/\s\|\s/g, '<br>') || emptyDash;
  const ship = esc(offer.ship || '') || emptyDash;
  const brand = esc(offer.brand || '') || emptyDash;
  const cap = offer.cap ? `${esc(offer.cap)} لتر` : emptyDash;
  const watt = offer.watt ? `${esc(offer.watt)} وات` : emptyDash;
  const variant = esc(offer.variant || '') || emptyDash;
  const model = esc(offer.model || '') || emptyDash;
  const url = esc(offer.url || '');

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(offer.name)} | مشترياتك صح</title>
<meta name="description" content="تفاصيل وسعر ${esc(offer.name)} على أمازون مصر.">
<meta name="theme-color" content="#0f253d">
<link rel="icon" href="../logo.jpg">
${tracker()}
<style>${HEAD_CSS}${DETAIL_CSS}</style></head><body>
${siteHeader('../')}
<main class="wrap">
<a class="back" href="../index.html">← الرجوع لقائمة الميكروويف</a>
<div class="card surface-card">
  <div class="pic"><img src="${esc(offer.img)}" alt="${esc(offer.name)}"></div>
  <div>
    <p class="name">${esc(offer.name)}</p>
    <div class="price">${formatPrice(offer.price)} ج.م</div>
    <dl>
      <dt>البراند</dt><dd>${brand}</dd>
      <dt>السعة</dt><dd>${cap}</dd>
      <dt>القدرة</dt><dd>${watt}</dd>
      <dt>النوع</dt><dd>${variant}</dd>
      <dt>الموديل</dt><dd>${model}</dd>
      <dt>الضمان</dt><dd>${warranty}</dd>
      <dt>الشحن</dt><dd>${ship}</dd>
    </dl>
    <a class="buy" href="${url}" target="_blank" rel="nofollow sponsored">اشترِ من أمازون</a>
  </div>
</div>
<div class="note" style="color:var(--b);font-weight:700">تنويه: يجب مراجعة السعر والمواصفات الفنية من صفحة المنتج على أمازون قبل الشراء.</div>
<div class="note">آخر فحص تلقائي: ${esc(formatDate(updatedAt))} · السعر قد يتغير لحظة الشراء.</div>
</main>
<script>${themeScript()}</script>
</body></html>
`;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function renderCsv(offers) {
  const rows = visibleOffers(offers);
  const lines = [
    ['م', 'الصورة', 'الاسم', 'البراند', 'السعة (لتر)', 'القدرة (وات)', 'الضمان', 'الشحن', 'السعر', 'الرابط'],
  ];

  rows.forEach((offer, index) => {
    lines.push([
      index + 1,
      offer.img || '',
      offer.name || '',
      offer.brand || '',
      offer.cap || '',
      offer.watt || '',
      offer.warranty || emptyDash,
      offer.ship || emptyDash,
      offer.price,
      offer.url || '',
    ]);
  });

  return '\uFEFF' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}

export async function writePublic(offers, options = {}) {
  const rows = visibleOffers(offers);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, 'index.html'), renderHtml(offers, options), 'utf8');
  await writeFile(join(OUT_DIR, 'all-microwaves.csv'), renderCsv(offers), 'utf8');
  await writeFile(join(OUT_DIR, '.nojekyll'), '', 'utf8');

  const detailDir = join(OUT_DIR, 'p');
  await rm(detailDir, { recursive: true, force: true });
  await mkdir(detailDir, { recursive: true });
  await Promise.all(
    rows.map((offer) =>
      writeFile(join(detailDir, `${offer.asin}.html`), renderDetail(offer, options), 'utf8'),
    ),
  );
  return rows.length;
}

async function main() {
  const raw = await readFile(join(DATA_DIR, 'offers.json'), 'utf8');
  const offers = JSON.parse(raw);
  const count = await writePublic(offers);
  console.log(`تم بناء الصفحة: ${count} منتج`);
}

if (process.argv[1] && process.argv[1].endsWith('render.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
