// إعدادات ثابتة للمشروع
export const MARKETPLACE = 'www.amazon.eg';
export const PARTNER_TAG = process.env.PARTNER_TAG || 'fineartslab-21';
export const CURRENCY = 'EGP';

// مصر تتبع منطقة أوروبا (EU 3.2) في الـ API
export const TOKEN_ENDPOINT = 'https://api.amazon.co.uk/auth/o2/token';
export const API_BASE = 'https://creatorsapi.amazon';

// حدود السعر (بالجنيه): MIN_PRICE أقل سعر مقبول، MAX_PRICE حد أمان ضد الأرقام الشاذة
export const MIN_PRICE = 1000;
export const MAX_PRICE = 600000;

// أقصى سعر للبحث عن منتجات جديدة
export const SEARCH_MAX_PRICE = 60000;

// لو منتج فضل غير متاح أكتر من كام يوم، يتشال من الجدول
export const MAX_STALE_DAYS = 7;

// حاجات تشيلها لو ظهرت في البحث (إكسسوارات الميكروويف مش الميكروويف نفسه)
export const ACCESSORY_RE =
  /micro\s?wave[\s-]*(cover|tray|rack|shelf|plate|mat|liner|guard|holder|stand)|turntable|waveguide|microwave\s*safe|cover\s*for\s*micro|silicone|parchment|baking\s*paper|mold|skewer|disposable|glove|tong|cleaner|book|guide|recipe|cookbook|kindle|manual/i;

// كلمات بتدل إن المنتج ميكروويف فعلي (مش إكسسوار)
export const MICROWAVE_RE = /micro\s?wave|مايكروويف|ميكروويف/i;

// ماركات عامة/كلمات مش ماركات
export const GENERIC_RE =
  /^(micro|microwave|oven|مايكروويف|ميكروويف|electric|digital|portable|multi|multifunction|smart|home|new|8|\d+)$/i;

// براندات مستثناة (تُقارن بالاسم العربي)
export const EXCLUDED_BRANDS = [
  'سيلفر',
  'إير فراير',
  'Dollar',
  'بنز',
  'Multifunctional',
  'White',
  'هاي واي',
  'بلاك آند وايت',
  'كابري',
  'GEOVINA',
  'Silvertine',
  'دي إس بي',
];

// ترشيحاتنا الموثوقة — ASINs بترتيب العرض في جدول "أفضل قيمة مقابل سعر"
// لسه فاضية: هتتعبى بعد أول تحديث تلقائي لما تتأكد من المنتجات
export const FEATURED_ASINS = [];

// إكسسوارات الميكروويف — أضف ASINs هنا لما تتأكد من إن الروابط بتتحول لصفحة منتج
export const ACCESSORIES = [];

// تحويل أسماء الماركات الإنجليزية لعربي
export const BRAND_MAP = [
  [/black\s*&?\s*decker|black\+decker/i, 'بلاك أند ديكر'],
  [/philips|versuni/i, 'فيليبس'],
  [/tefal/i, 'تيفال'],
  [/kenwood/i, 'كينوود'],
  [/midea/i, 'ميديا'],
  [/xiaomi/i, 'شاومي'],
  [/ninja/i, 'نينجا'],
  [/bosch/i, 'بوش'],
  [/panasonic/i, 'باناسونيك'],
  [/sharp/i, 'شارب'],
  [/tornado/i, 'تورنيدو'],
  [/fresh/i, 'فريش'],
  [/sokany|sokani/i, 'سوكاني'],
  [/akai/i, 'أكاي'],
  [/\bdsp\b/i, 'دي إس بي'],
  [/oraimo/i, 'أورايمو'],
  [/arion/i, 'أريون'],
  [/\bsilver\b/i, 'سيلفر'],
  [/capri/i, 'كابري'],
  [/\bbenz\b/i, 'بنز'],
  [/mienta/i, 'مينتا'],
  [/hi-?way/i, 'هاي واي'],
  [/black\s*&\s*white/i, 'بلاك آند وايت'],
  [/jamaki/i, 'جاماكي'],
  [/samsung/i, 'سامسونج'],
  [/nutricook/i, 'نيوتريكوك'],
  [/toshiba/i, 'توشيبا'],
  [/delonghi/i, 'ديلونجي'],
  [/\blg\b/i, 'إل جي'],
  [/westinghouse/i, 'ويستينهاوس'],
];
