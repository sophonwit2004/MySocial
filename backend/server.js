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

// เชื่อมต่อฐานข้อมูล MongoDB
async function connectDatabase() {
  try {
    if (process.env.MONGODB_URI) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
        console.log('เชื่อมต่อ MongoDB สำเร็จ');
        return;
      } catch (err) {
        console.log('ไม่พบ MongoDB ในเครื่อง กำลังสลับไปใช้ In-Memory MongoDB...');
      }
    }
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('เชื่อมต่อ In-Memory MongoDB สำเร็จ!');
  } catch (err) {
    console.error('เชื่อมต่อ MongoDB ไม่สำเร็จ:', err.message);
  }
}
connectDatabase();

// เส้นทาง API ทั้งหมด
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.get('/', (req, res) => {
  res.send('Social App API กำลังทำงานอยู่');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`เซิร์ฟเวอร์กำลังทำงานที่พอร์ต ${PORT}`));
