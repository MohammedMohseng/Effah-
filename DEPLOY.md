# 🚀 دليل الرفع — منصة نكاح

## الخطة الكاملة (مجاني 100%)

```
Frontend  → Vercel      (مجاني للأبد)
Backend   → Render      (مجاني، يدعم WebSocket)
Database  → Supabase    (PostgreSQL مجاني 500MB)
Chat DB   → MongoDB Atlas (مجاني 512MB)
```

---

## الخطوة 1 — إعداد Supabase (PostgreSQL)

1. اذهب إلى **https://supabase.com** → Create account
2. New Project → اختر اسم → اختر كلمة مرور قوية → Region: **Europe (Frankfurt)**
3. بعد الإنشاء اذهب إلى: **Settings → Database → Connection string**
4. اختر **URI** وانسخ الرابط، سيكون بالشكل:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
   ```
5. احتفظ بهذا الرابط — ستحتاجه لاحقاً

---

## الخطوة 2 — إعداد MongoDB Atlas (للدردشة)

1. اذهب إلى **https://mongodb.com/atlas** → Create account
2. Free Cluster → اختر **AWS / Frankfurt**
3. Database Access → Add user → username + password قوية
4. Network Access → Add IP Address → **Allow access from anywhere** (0.0.0.0/0)
5. Clusters → Connect → Drivers → انسخ الرابط:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/nikah_chat
   ```

---

## الخطوة 3 — رفع الباك اند على Render

### أ) ارفع المشروع على GitHub
```bash
cd nikah-api
git init
git add .
git commit -m "initial commit"
# أنشئ repo على github.com وارفعه
git remote add origin https://github.com/USERNAME/nikah-api.git
git push -u origin main
```

### ب) أنشئ Web Service على Render
1. اذهب إلى **https://render.com** → New → Web Service
2. Connect your GitHub repo → اختر `nikah-api`
3. اضبط الإعدادات:
   ```
   Name:          nikah-api
   Runtime:       Node
   Build Command: npm install && npx prisma generate && npm run build
   Start Command: npx prisma migrate deploy && npm start
   ```
4. اضبط متغيرات البيئة (Environment Variables):
   ```
   NODE_ENV         = production
   DATABASE_URL     = [رابط Supabase من الخطوة 1]
   MONGO_URI        = [رابط Atlas من الخطوة 2]
   JWT_SECRET       = [أي نص عشوائي طويل 64 حرف]
   JWT_REFRESH_SECRET = [أي نص عشوائي طويل آخر]
   JWT_EXPIRES_IN   = 7d
   JWT_REFRESH_EXPIRES_IN = 30d
   CLIENT_URL       = https://nikah-web.vercel.app  ← ستعرفه بعد رفع الفرونت
   ```
5. Create Web Service
6. انتظر الـ deploy → ستحصل على رابط مثل:
   ```
   https://nikah-api.onrender.com
   ```
7. تحقق: افتح `https://nikah-api.onrender.com/health` يجب أن يظهر `{"status":"ok"}`

---

## الخطوة 4 — رفع الفرونت اند على Vercel

### أ) حدّث ملف `.env.production` في nikah-web
```env
VITE_API_URL=https://nikah-api.onrender.com/api
VITE_SOCKET_URL=https://nikah-api.onrender.com
```

### ب) ارفع المشروع على GitHub
```bash
cd nikah-web
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/USERNAME/nikah-web.git
git push -u origin main
```

### ج) أنشئ مشروع على Vercel
1. اذهب إلى **https://vercel.com** → New Project
2. Import Git Repository → اختر `nikah-web`
3. Framework Preset: **Vite**
4. اضبط Environment Variables:
   ```
   VITE_API_URL   = https://nikah-api.onrender.com/api
   VITE_SOCKET_URL = https://nikah-api.onrender.com
   ```
5. Deploy
6. ستحصل على رابط مثل:
   ```
   https://nikah-web.vercel.app
   ```

---

## الخطوة 5 — تحديث CORS في الباك اند

بعد معرفة رابط Vercel، ارجع إلى Render وحدّث:
```
CLIENT_URL = https://nikah-web.vercel.app
```

---

## ✅ التحقق النهائي

افتح `https://nikah-web.vercel.app` ويجب أن:
- [ ] تفتح صفحة الـ Landing
- [ ] تسجيل حساب جديد يعمل
- [ ] تسجيل الدخول يعمل
- [ ] الصفحات تحمّل بيانات حقيقية من الباك اند

---

## ⚠️ ملاحظات مهمة

**Render Free Plan:**
- الخادم ينام بعد 15 دقيقة من عدم الاستخدام
- أول طلب بعد النوم يأخذ ~30 ثانية
- الحل للإنتاج: استخدم Render Paid ($7/شهر) أو Railway

**Supabase Free Plan:**
- 500MB تخزين
- المشروع يُوقف بعد أسبوع من عدم الاستخدام (يمكن تفعيله مرة أخرى)

**MongoDB Atlas Free:**
- 512MB تخزين
- لا ينام أبداً

---

## 🔑 توليد JWT Secret قوي

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
