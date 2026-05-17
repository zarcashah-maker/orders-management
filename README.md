# نظام إدارة الطلبات

منصة متكاملة لإدارة طلبات الإنتاج مع المصانع مع دعم الذكاء الاصطناعي.

## التقنيات
- **Next.js 15** (App Router)
- **Supabase** (قاعدة البيانات + المصادقة)
- **Tailwind CSS** (التصميم)
- **Claude AI** (المساعد الذكي)
- **Vercel** (الاستضافة)

## الإعداد

### 1. تثبيت المكتبات
```bash
npm install
```

### 2. متغيرات البيئة
انسخ الملف وأضف بياناتك:
```bash
cp .env.local.example .env.local
```

أضف هذه القيم في `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
```

### 3. تشغيل المشروع
```bash
npm run dev
```

## المتغيرات في Vercel
في لوحة Vercel → Settings → Environment Variables أضف:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `ANTHROPIC_API_KEY`

## الصفحات
- `/login` — تسجيل الدخول
- `/admin` — لوحة الإدارة
- `/admin/orders` — قائمة الطلبات
- `/admin/orders/[id]` — تفاصيل الطلب + مساعد AI
- `/admin/factories` — المصانع
- `/factory` — بوابة المصنع

## الأدوار
- **admin** — يرى جميع الطلبات ويديرها
- **factory** — يرى فقط طلبات مصنعه
