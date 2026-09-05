require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

app.use(cors());
app.use(express.json());

// เปิดให้เข้าถึงรูปที่อัปโหลดไว้ได้ผ่าน URL /uploads/ชื่อไฟล์
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ฐานข้อมูล Cloud MongoDB สำหรับซิงค์และแชร์โพสต์ข้ามอุปกรณ์/ข้ามผู้ใช้อย่างสมบูรณ์
const SHARED_CLOUD_MONGODB_URI = 'mongodb+srv://madoo_app:Madoo123456@cluster0.o5w1v.mongodb.net/madoo_app?retryWrites=true&w=majority';

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  try {
    const mongoUri = (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('127.0.0.1'))
      ? process.env.MONGODB_URI
      : SHARED_CLOUD_MONGODB_URI;

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('เชื่อมต่อ Cloud MongoDB สำเร็จ! (Real-time Cross-Device Sync)');
    return;
  } catch (err) {
    console.error('เชื่อมต่อ Cloud MongoDB ไม่สำเร็จ:', err.message);
    if (!process.env.VERCEL) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        console.log('เชื่อมต่อ In-Memory MongoDB สำเร็จ!');
      } catch (e) {}
    }
  }
}
connectDatabase();

app.use(async (req, res, next) => {
  await connectDatabase();
  next();
});

// เส้นทาง API ทั้งหมด
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.get('/', (req, res) => {
  res.send('MADOO Social App API กำลังทำงานอยู่');
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`เซิร์ฟเวอร์กำลังทำงานที่พอร์ต ${PORT}`));
}

module.exports = app;
