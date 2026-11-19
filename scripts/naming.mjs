import { BRAND_MAP, EXCLUDED_BRANDS, GENERIC_RE } from './config.mjs';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// تحويل الأرقام العربية/الفارسية لأرقام إنجليزية
export function toEnglishDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (d) => {
    const i = AR_DIGITS.indexOf(d);
    if (i >= 0) return String(i);
    const fa = '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);
    return fa >= 0 ? String(fa) : d;
  });
}

export function extractCapacity(text) {
  const t = toEnglishDigits(text).replace(/,/g, '.');
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:l\b|ltr\b|liter|litre|liters|litres|لتر)/i,
    /(\d+(?:\.\d+)?)\s*ل\b/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 60) return trimNumber(n);
    }
  }
  return '';
}

export function extractWattage(text) {
  const t = toEnglishDigits(text).replace(/,/g, '.');
  const m = t.match(/(\d{3,4})\s*(?:w\b|watt|watts|وات)/i);
  if (!m) return '';
  const n = Number(m[1]);
  if (n >= 200 && n <= 5000) return String(n);
  return '';
}

export function extractVariant(text) {
  const t = toEnglishDigits(text).toLowerCase();
  const traits = [];
  if (/تاتش|\btouch\b|touch\s*panel|digital\s*touch/.test(t)) traits.push('تاتش');
  else if (/\bdigital\b|ديجيتال|رقمي/.test(t)) traits.push('رقمي');
  if (/بكر|\bdial\b|\bbakr\b/.test(t)) traits.push('بكر');
  if (/convection|كونفيكشن/.test(t)) traits.push('كونفيكشن');
  else if (/grill|جريل|شواية/.test(t)) traits.push('جريل');
  return traits.join(' ');
}

export function extractModel(text) {
  const t = toEnglishDigits(text).toUpperCase();
  const inParens = t.match(/\(([A-Z0-9][A-Z0-9\-/]{3,})\)/);
  if (inParens) return inParens[1];
  const dashed = t.match(/\b([A-Z]{1,4}\d{2,4}[A-Z0-9\-/]{0,6})\b/);
  if (dashed) return dashed[1];
  return '';
}

function trimNumber(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

function cleanBrandToken(token) {
  return String(token || '')
    .replace(/[®™©]/g, '')
    .replace(/micro\s?wave|microwave|مايكروويف|ميكروويف|oven|فرن/gi, '')
    .replace(/[^\p{L}\p{N}&\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// أسماء براندات عربية بتظهر في عناوين أمازون مصر (الأطول الأول)
const ARABIC_BRANDS = [
  'إل جي',
  'ويستينهاوس',
  'وايت',
  'بلاك آند وايت',
  'بلاك أند ديكر',
  'دي إس بي',
  'هاي واي',
  'باناسونيك',
  'نيوتريكوك',
  'سيلفرتين',
  'ديلونجي',
  'تورنيدو',
  'سامسونج',
  'كينوود',
  'فيليبس',
  'تيفال',
  'نينجا',
  'شاومي',
  'سوكاني',
  'جاماكي',
  'أورايمو',
  'أريون',
  'ميديا',
  'شارب',
  'فريش',
  'أكاي',
  'سيلفر',
  'كابري',
  'مينتا',
  'بوش',
  'بنز',
];

const LATIN_BRANDS = ['Silvertine', 'GEOVINA', 'Multifunctional', 'Dollar', 'White', 'LG', 'Westinghouse'];

export function detectBrand(title, byLine = '') {
  const haystack = `${title || ''} ${byLine || ''}`;
  for (const [re, arabic] of BRAND_MAP) {
    if (re.test(haystack)) return arabic;
  }
  for (const arabic of ARABIC_BRANDS) {
    if (haystack.includes(arabic)) return arabic;
  }
  for (const latin of LATIN_BRANDS) {
    const word = new RegExp(`(^|[^a-z])${latin}([^a-z]|$)`, 'i');
    const start = new RegExp(`^\\s*(?:the\\s+)?${latin}\\b`, 'i');
    if (word.test(byLine || '') || start.test(title || '')) return latin;
  }

  const fallback = cleanBrandToken(byLine) || cleanBrandToken(String(title || '').split(/[\s,|/]+/)[0]);
  return fallback;
}

export function isExcludedBrand(brand) {
  if (!brand) return true;
  const b = String(brand).trim();
  if (EXCLUDED_BRANDS.includes(b)) return true;
  return GENERIC_RE.test(b);
}

// بناء اسم عربي موحّد: "إل جي 25 لتر 900 وات رقمي جريل (MH6565)"
export function buildName({ brand, cap, watt, variant, model, fallback = '' }) {
  const parts = [];
  if (brand) parts.push(brand);
  if (cap) parts.push(`${cap} لتر`);
  if (watt) parts.push(`${watt} وات`);
  if (variant) parts.push(variant);

  let name = parts.join(' ').trim();
  if (model) name = `${name} (${model})`.trim();

  if (!name) {
    name = String(fallback || '').replace(/\s+/g, ' ').trim().slice(0, 90);
  }
  return name;
}

// يستخرج كل بيانات التسمية من عنوان المنتج
export function describeProduct({ title, byLine }) {
  const brand = detectBrand(title, byLine);
  const cap = extractCapacity(title);
  const watt = extractWattage(title);
  const variant = extractVariant(title);
  const model = extractModel(title);
  const name = buildName({ brand, cap, watt, variant, model, fallback: title });
  return { brand, cap, watt, variant, model, name };
}

// مفتاح تمييز المنتج (مقاس/قدرة/نسخة/موديل)
export function productKey(offer) {
  return [
    offer.brand || '',
    offer.cap || '',
    offer.watt || '',
    offer.variant || '',
    offer.model || '',
    String(offer.name || '').replace(/\s+/g, ' ').trim(),
  ].join('|');
}
