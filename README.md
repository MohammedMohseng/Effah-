# nikah-api — Backend API

منصة الزواج الإسلامية - خادم API مبني بـ Node.js + TypeScript

## 🗄️ التقنيات
- **Express.js** + TypeScript
- **PostgreSQL** via Prisma ORM (بيانات المستخدمين)
- **MongoDB** via Mongoose (رسائل الدردشة)
- **Socket.io** (الدردشة الفورية)
- **JWT** (المصادقة + RBAC)

---

## 🚀 التشغيل المحلي

### 1. المتطلبات
- Node.js >= 18
- PostgreSQL >= 14
- MongoDB >= 6

### 2. التثبيت
```bash
npm install
cp .env.example .env
# عدّل .env بمعلومات قاعدة بياناتك
```

### 3. قاعدة البيانات
```bash
npm run db:generate   # توليد Prisma Client
npm run db:migrate    # تطبيق الـ migrations
npm run db:seed       # (اختياري) بيانات تجريبية
```

### 4. التشغيل
```bash
npm run dev           # وضع التطوير
npm run build         # بناء للإنتاج
npm start             # تشغيل الإنتاج
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| POST | `/api/auth/refresh` | تجديد التوكن |
| GET  | `/api/auth/me` | معلومات المستخدم الحالي |
| POST | `/api/auth/change-password` | تغيير كلمة المرور |

### Verification
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/verification/id` | رفع وثيقة الهوية |
| POST | `/api/verification/payment` | رفع إيصال الدفع |
| GET  | `/api/verification/pending` | 🔐 الوثائق المعلّقة |
| PATCH | `/api/verification/id/:userId/review` | 🔐 مراجعة هوية |
| PATCH | `/api/verification/payment/:id/review` | 🔐 مراجعة دفع |

### Matching
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/matching/candidates` | قائمة المرشحين مع نسبة التوافق |

### Groups
| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/groups/request` | إرسال طلب مطابقة |
| GET  | `/api/groups/my` | مجموعاتي |
| PATCH | `/api/groups/request/:id/guardian-review` | موافقة الولي |
| PATCH | `/api/groups/:id/activate` | 🔐 تفعيل مجموعة |
| PATCH | `/api/groups/:id/close` | 🔐 إغلاق مجموعة |

### Chat
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/chat/:groupId/messages` | سجل الرسائل |
| DELETE | `/api/chat/message/:id` | 🔐 حذف رسالة |

### Notifications
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/notifications` | إشعاراتي |
| PATCH | `/api/notifications/:id/read` | قراءة إشعار |
| PATCH | `/api/notifications/read-all` | قراءة الكل |

### Admin 🔐
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/admin/stats` | إحصائيات النظام |
| GET | `/api/admin/users` | قائمة المستخدمين |
| PATCH | `/api/admin/users/:id/status` | تغيير حالة حساب |
| POST | `/api/admin/supervisors` | إنشاء مشرف جديد |

> 🔐 = يتطلب صلاحية مشرف أو رئيس

---

## 🔌 Socket.io Events

### Client → Server
```
group:join      (groupId)
group:leave     (groupId)
message:send    ({ groupId, content, type? })
typing:start    (groupId)
typing:stop     (groupId)
```

### Server → Client
```
message:new     (ChatMessage)
message:deleted (messageId)
notification:new (PushNotification)
user:online     (userId)
user:offline    (userId)
```

---

## 🏗️ هيكل المشروع
```
src/
├── modules/
│   ├── auth/           ← تسجيل + JWT + RBAC
│   ├── users/          ← الملفات الشخصية
│   ├── verification/   ← التحقق اليدوي
│   ├── matching/       ← محرك التوافق
│   ├── groups/         ← المجموعات المشرفة
│   ├── chat/           ← Socket.io + MongoDB
│   ├── notifications/  ← الإشعارات
│   └── admin/          ← لوحة الإدارة
├── middleware/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── upload.middleware.ts
├── config/
│   ├── database.ts     ← Postgres + MongoDB
│   └── mongo.schemas.ts
├── types/index.ts
├── utils/
│   ├── logger.ts
│   └── validate.ts
├── app.ts
└── server.ts
```

---

## 🚢 النشر على Railway

1. ارفع المشروع على GitHub
2. أنشئ مشروعاً جديداً على [Railway](https://railway.app)
3. أضف خدمتي **PostgreSQL** و**MongoDB**
4. أضف متغيرات البيئة من `.env.example`
5. اضبط الأمر: `npm run build && npm start`
