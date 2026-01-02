# دليل النشر على GitHub Pages

## متطلبات النشر

1. **الملفات المطلوبة:**
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `sw.js` (Service Worker)
   - `icon-192.png`
   - `icon-512.png`

2. **إعدادات GitHub Pages:**
   - اذهب إلى Settings > Pages
   - اختر Source: Deploy from a branch
   - اختر Branch: main (أو master)
   - اختر Folder: / (root)

3. **ملف .nojekyll (اختياري):**
   - أنشئ ملف `.nojekyll` في المجلد الرئيسي
   - هذا يمنع Jekyll من معالجة الملفات
   - مفيد لتجنب مشاكل المسارات

## التحقق من النشر

بعد النشر، تحقق من:

1. ✅ الموقع يعمل على `https://username.github.io/repository-name/`
2. ✅ Manifest.json يحمل بدون أخطاء
3. ✅ Service Worker يسجل بنجاح
4. ✅ الأيقونات تظهر بشكل صحيح
5. ✅ PWA قابل للتثبيت على Android
6. ✅ iOS يمكن إضافته للشاشة الرئيسية

## اختبار PWA

### Android/Chrome:
- افتح الموقع في Chrome
- يجب أن يظهر زر "تثبيت" في شريط العنوان
- أو من الإعدادات > تثبيت التطبيق

### iOS/Safari:
- افتح الموقع في Safari
- اضغط على زر المشاركة (Share)
- اختر "إضافة إلى الشاشة الرئيسية"
- التطبيق سيظهر كتطبيق منفصل

## ملاحظات مهمة

- جميع المسارات نسبية (./) لضمان العمل على GitHub Pages
- Service Worker يعمل فقط على HTTPS (GitHub Pages يوفر HTTPS تلقائياً)
- Manifest.json يستخدم `start_url: "./index.html"` للتوافق مع GitHub Pages

