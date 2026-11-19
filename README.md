# الميكروويف على أمازون مصر — تحديث تلقائي

نفس طريقة مشروع الإير فراير، لكن لفئة **الميكروويف**: صفحة عربية تقارن الأسعار على `amazon.eg` وتتحدث كل 6 ساعات عبر **GitHub Actions** وتتنشر على **GitHub Pages**.

- الأسعار والتوفر والصور بتتحدث من **Amazon Creators API** (الرسمي، مش سكرابينج).
- المنتج اللي يخلص أو يختفي بيتشال من الجدول تلقائيًا، ويرجع لوحده لو رجع متاح.
- منتجات جديدة بتتضاف تلقائيًا من البحث، مع استثناء الإكسسوارات والبراندات المستثناة وحدود السعر.
- كل الروابط فيها `?tag=fineartslab-21`.
- نفس هوية "مشترياتك صح": اللوجو، البانر، صفحة الفيسبوك/الجروب/واتساب، وGoogle Analyzer (نفس الـ ID).
- التاب الإضافية ("ترشيحاتنا الموثوقة" و"إكسسوارات الميكروويف") بتظهر تلقائيًا لما تضيف ASINs في `config.mjs`.

> **الحالة الابتدائية:** `data/offers.json` فاضي عن قصد. أول تشغيل للـ workflow هيبحث في أمازون ويضيف المنتجات تلقائيًا (لحد 25 منتج في كل دورة).

## الملفات

```
microwaves-site/
├─ scripts/
│  ├─ config.mjs       الإعدادات: كلمات الفئة، الإكسسوارات، البراندات، حدود السعر، الترشيحات…
│  ├─ amazon.mjs       توكن Creators API + GetItems + SearchItems (مطابق للمشروع القديم)
│  ├─ naming.mjs       استخراج البراند/السعة/الوات/النوع والموديل وبناء الاسم العربي
│  ├─ update.mjs       التحديث: أسعار، حذف المنتهي، إضافة الجديد
│  └─ render.mjs       بناء index.html و all-microwaves.csv وصفحات التفاصيل
├─ data/
│  ├─ offers.json      المنتجات (فاضي في البداية) + حالة كل منتج
│  └─ history.json     تاريخ الأسعار
├─ public/             اللي بيتنشر على Pages (بيتولد تلقائيًا)
└─ .github/workflows/update.yml
```

## خطوات التشغيل (مرة واحدة)

1. اعمل ريبو **Public** على GitHub (اسم مقترح: `microwaves-eg`) وارفع **محتويات مجلد `microwaves-site`** نفسها، يعني يبقى في الجذر: `package.json` و `scripts/` و `data/` و `.github/`.
   - من غير Git: GitHub → **Add file → Upload files** → اسحب كل الملفات → Commit.
2. Settings → **Pages** → **Build and deployment** → Source = **GitHub Actions**.
3. Settings → **Secrets and variables → Actions** → **New repository secret**:
   - `CREATORS_CLIENT_ID`
   - `CREATORS_CLIENT_SECRET`
   - (اختياري) Variables → `PARTNER_TAG` = `fineartslab-21`.
4. Actions → **تحديث أسعار الميكروويف** → **Run workflow** → Run.

بعد ما يخلص، الصفحة هتكون على `https://<اسم-حسابك>.github.io/<اسم-الريبو>/` والـ CSV على `.../all-microwaves.csv`.

من غير مفاتيح الـ API، الصفحة هتنشر بآخر بيانات محفوظة (في البداية: حالة فاضية).

## إزاي بيشتغل

| الخطوة | التفاصيل |
|---|---|
| **إضافة** | `searchItems` بكلمات: `microwave`, `microwave oven`, `ميكروويف`, `مايكروويف`, `digital microwave` × 3 صفحات، مع فلترة الإكسسوارات والبراندات المستثناة وحدود السعر (1000–60000 ج.م) |
| **تحديث** | `getItems` لكل الـ ASINs (10 في الطلب) → سعر + توفر + صورة |
| **حذف** | لو المنتج خلص/مش متاح دورتين ورا بعض (≈12 ساعة) → `active=false` ويتشال. لو رجع متاح → يرجع تلقائي |
| **تكرار** | نفس المنتج بأكتر من ASIN → يظهر الأرخص بس |
| **النشر** | يبني `public/` → يرفعها Artifact → ينشرها على Pages، ويكومّت `data/` في الريبو |

الجدول الزمني: `cron: '0 */6 * * *'` (UTC) = **كل 6 ساعات**، وتقدر تشغّله يدويًا في أي وقت.

## تخصيص

| عايز تعدّل | المكان |
|---|---|
| كلمات البحث | `scripts/update.mjs` → `SEARCH_QUERIES` |
| كلمة تدل إن المنتج ميكروويف | `scripts/config.mjs` → `MICROWAVE_RE` |
| إكسسوارات مستثناة | `scripts/config.mjs` → `ACCESSORY_RE` |
| براند مستثنى | `scripts/config.mjs` → `EXCLUDED_BRANDS` |
| حدود السعر | `scripts/config.mjs` → `MIN_PRICE` / `MAX_PRICE` / `SEARCH_MAX_PRICE` |
| الترشيحات والإكسسوارات | `scripts/config.mjs` → `FEATURED_ASINS` / `ACCESSORIES` |
| المواعيد | `.github/workflows/update.yml` → `cron` |
| شكل الصفحة والأعمدة | `scripts/render.mjs` |

## تجربة محليًا (اختياري)

محتاج Node 20+:

```bash
npm run update        # تحديث كامل (محتاج المفاتيح في متغيرات البيئة)
npm run render:only   # إعادة بناء الصفحة من آخر بيانات محفوظة
```

```powershell
$env:CREATORS_CLIENT_ID="..."; $env:CREATORS_CLIENT_SECRET="..."; npm run update
```

## ملاحظات مهمة

- **الأسعار لازم تيجي من الـ API**: برنامج أمازون الأفلييت بيمنع عرض أسعار مسحوبة (scraped)، فالمشروع بيستخدم Creators API فقط.
- **الضمان والشحن** مش موجودين في الـ API، فهما قيم ثابتة (seed) بتفضل زي ما هم.
- **الأسماء عربية** وبتتبني من عنوان المنتج: `براند + سعة + وات + نوع (تاتش/رقمي/جريل…) + موديل`.
- الصفحة فيها سطر إفصاح بأفلييت أمازون تحت الجدول (مطلوب من برنامج الأفلييت).
