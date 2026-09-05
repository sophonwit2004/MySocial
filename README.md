# MySocial — เว็บโซเชียลมีเดีย (คล้าย Facebook/Instagram)

โปรเจกต์นี้เป็นเว็บแอปโซเชียลมีเดียง่ายๆ สำหรับส่งงานอาจารย์ ประกอบด้วย:
- **Backend**: Node.js + Express + MongoDB (Mongoose) + JWT Authentication
- **Frontend**: HTML/CSS/JavaScript ธรรมดา (ไม่ต้อง build ไม่ต้องติดตั้งอะไรเพิ่มฝั่ง frontend)

## ฟีเจอร์ที่มี

- สมัครสมาชิก / เข้าสู่ระบบ (เข้ารหัสรหัสผ่านด้วย bcrypt)
- โพสต์ข้อความ + แนบรูปภาพ / ลบโพสต์ของตัวเอง
- กดไลก์ / เลิกไลก์
- คอมเมนต์ใต้โพสต์
- ติดตาม / เลิกติดตาม ผู้ใช้คนอื่น
- ฟีดข่าว แสดงโพสต์ของตัวเองและคนที่ติดตาม เรียงจากใหม่ไปเก่า
- หน้าโปรไฟล์ (แก้ไข bio, เปลี่ยนรูปโปรไฟล์)
- ค้นหาผู้ใช้จาก username

---

## วิธีติดตั้งและรันบนเครื่องตัวเอง

### 1. เตรียม MongoDB

สมัครบัญชีฟรีที่ [MongoDB Atlas](https://www.mongodb.com/atlas) → สร้าง Cluster ฟรี → กด "Connect" → เลือก "Connect your application" → คัดลอก connection string มา (จะหน้าตาประมาณ `mongodb+srv://user:password@cluster0.xxxx.mongodb.net/...`)

### 2. ตั้งค่า Backend

```bash
cd backend
npm install
```

คัดลอกไฟล์ `.env.example` แล้วเปลี่ยนชื่อเป็น `.env` จากนั้นใส่ค่าจริง:

```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/socialapp
JWT_SECRET=ใส่ข้อความลับยาวๆของตัวเอง
PORT=5000
```

รันเซิร์ฟเวอร์:

```bash
npm run dev
```

ถ้าขึ้นข้อความ `เชื่อมต่อ MongoDB สำเร็จ` และ `เซิร์ฟเวอร์กำลังทำงานที่พอร์ต 5000` แปลว่าใช้งานได้แล้ว

### 3. เปิด Frontend

โฟลเดอร์ `frontend` เป็น HTML ธรรมดา เปิดไฟล์ `frontend/login.html` ด้วย Live Server (VS Code extension) หรือรันคำสั่งนี้ในโฟลเดอร์ `frontend`:

```bash
npx serve .
```

แล้วเปิดเบราว์เซอร์ไปที่ URL ที่ขึ้นมา (เช่น `http://localhost:3000/login.html`)

> **สำคัญ**: ถ้า backend รันคนละพอร์ตหรือคนละเครื่อง ให้แก้ไขค่า `API_BASE` ในไฟล์ `frontend/js/api.js` ให้ตรงกับ URL ของ backend

---

## วิธี Deploy ให้คนอื่นเข้าถึงได้จริง (สำหรับส่งอาจารย์)

### Deploy Backend (แนะนำ Render.com — ฟรี)

1. อัปโหลดโค้ดขึ้น GitHub (อย่าลืมใส่ `.env` ใน `.gitignore` ไม่ให้หลุดขึ้นไป)
2. ไปที่ [render.com](https://render.com) → New → Web Service → เชื่อมกับ repo GitHub
3. ตั้งค่า Build Command: `npm install` และ Start Command: `npm start`
4. ไปที่ Environment → เพิ่มตัวแปร `MONGODB_URI`, `JWT_SECRET`, `PORT` เหมือนในไฟล์ `.env`
5. กด Deploy จะได้ URL เช่น `https://mysocial-backend.onrender.com`

### Deploy Frontend (แนะนำ Netlify หรือ Vercel — ฟรี)

1. แก้ไขค่า `API_BASE` ในไฟล์ `frontend/js/api.js` ให้เป็น URL ของ backend ที่ deploy ไว้ (เช่น `https://mysocial-backend.onrender.com/api`)
2. อัปโหลดโฟลเดอร์ `frontend` ขึ้น [Netlify Drop](https://app.netlify.com/drop) (ลากไฟล์วางได้เลย) หรือเชื่อมกับ GitHub repo
3. จะได้ URL เว็บสาธารณะ เช่น `https://mysocial.netlify.app` — ส่งลิงก์นี้ให้อาจารย์เปิดได้เลย

---

## โครงสร้างโปรเจกต์

```
social-app/
├── backend/
│   ├── models/         → โครงสร้างข้อมูล (User, Post)
│   ├── routes/          → API endpoints (auth, users, posts)
│   ├── middleware/      → ตรวจสอบล็อกอิน (auth.js), อัปโหลดรูป (upload.js)
│   ├── uploads/         → ที่เก็บไฟล์รูปที่ผู้ใช้อัปโหลด
│   ├── server.js        → ไฟล์หลักของ backend
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── login.html, register.html, index.html, profile.html, search.html
    ├── css/style.css
    └── js/ (api.js, feed.js, profile.js, search.js)
```

## หมายเหตุด้านความปลอดภัย

- รหัสผ่านถูกเข้ารหัสด้วย bcrypt ก่อนเก็บลงฐานข้อมูลเสมอ ไม่มีการเก็บรหัสผ่านตรงๆ
- ทุก API ที่ต้องล็อกอิน (โพสต์, ไลก์, คอมเมนต์, ติดตาม) ถูกป้องกันด้วย JWT middleware
- ห้าม commit ไฟล์ `.env` ขึ้น GitHub เพราะมีรหัสลับของฐานข้อมูลอยู่ในนั้น
