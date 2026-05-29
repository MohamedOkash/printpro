# برينت برو — PrintPro v2.0

حل متكامل لإدارة المستندات والأغلفة والـ PDF للمكتبات.

---

## 🚀 التشغيل السريع

```bash
# 1 — تثبيت الحزم
npm install

# 2 — تشغيل بيئة التطوير
npm run dev

# 3 — البناء للإنتاج
npm run build
```

---

## 📁 هيكل المشروع

```
printpro/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx              ← نقطة الدخول
    ├── App.jsx               ← الجذر: routing + sidebar + bottom nav
    ├── index.css             ← Tailwind + خطوط + custom CSS
    ├── constants.js          ← FILTER_PRESETS, FONTS, STICKERS, FRAMES
    ├── context/
    │   └── AppContext.jsx    ← Context + ترجمات (AR/EN)
    ├── utils/
    │   ├── imageProcessing.js ← Sharpen, Adaptive Threshold, Shadow Removal
    │   ├── scriptLoader.js    ← loadScript() + CDN URLs
    │   ├── history.js         ← localStorage helpers
    │   └── api.js             ← callClaudeAPI()
    └── components/
        ├── DocumentCleaner.jsx  ← معالج المستندات
        ├── CoverDesigner.jsx    ← مصمم الأغلفة
        ├── FileConverter.jsx    ← أدوات PDF
        ├── ProjectHistory.jsx   ← المشاريع المحفوظة
        └── CoverFrame.jsx       ← إطارات الأغلفة (SVG)
```

---

## ✨ المميزات

### معالج المستندات
- رفع صور متعددة → PDF متعدد الصفحات
- **كاميرا مباشرة** (environment camera)
- **7 فلاتر احترافية** مع preview حي لكل فلتر
- **قبل/بعد** slider تفاعلي
- Adaptive Thresholding (تبييض تكيّفي مثل CamScanner)
- إزالة الظل والإضاءة غير المتساوية
- HD Sharpen kernel
- قص، تدوير، علامة مائية
- OCR عربي + إنجليزي (Tesseract.js)

### مصمم الأغلفة
- 16 إطار ديكوري SVG
- عناصر قابلة للسحب (نصوص، صور، ملصقات)
- 6 خطوط عربية
- **AI** (Claude) لتوليد نصوص الغلاف تلقائياً
- تحميل PNG عالي الجودة (3x)، طباعة مباشرة

### أدوات PDF
- دمج عدة ملفات PDF
- تقسيم واستخراج صفحات
- **تحرير PDF**: ترقيم الصفحات + ختم
- PDF → صور عالية الجودة (ZIP)
- Excel → PDF مع جدول منسّق

### المشاريع
- حفظ تلقائي لكل عملية في localStorage
- فلترة حسب النوع، حذف فردي أو جماعي

---

## 🔑 Claude API

التطبيق يستخدم Claude API لتوليد نصوص الأغلفة.
في بيئة الإنتاج، أضف proxy أو endpoint يحمل الـ API key بأمان.

---

## 📦 CDN Libraries (تُحمَّل عند الطلب)

- **jsPDF** — حفظ PDF
- **pdf-lib** — تحرير/دمج/تقسيم PDF
- **PDF.js** — تحويل PDF إلى صور
- **Tesseract.js** — OCR
- **JSZip** — ضغط الصور
- **SheetJS (XLSX)** — قراءة Excel
- **html2canvas** — تصدير الأغلفة
