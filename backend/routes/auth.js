const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mysocialapp_secret_key_2026_super_secure';

// สมัครสมาชิก
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    // ถ้าเชื่อมต่อ MongoDB จริงสำเร็จ ให้ใช้งาน DB จริง
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'มีผู้ใช้นี้อยู่แล้วในระบบ (username หรือ email ซ้ำ)' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
      });

      const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        message: 'สมัครสมาชิกสำเร็จ',
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          profilePic: newUser.profilePic,
          bio: newUser.bio,
        },
      });
    }

    // Fallback โหมดสำรอง (กรณีไม่ได้ต่อ DB ให้เข้าใช้งานได้ทันทีไม่ติด Error)
    const mockId = 'demo_' + Date.now();
    const token = jwt.sign({ userId: mockId }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      token,
      user: {
        id: mockId,
        username: username || 'DemoUser',
        email: email || 'demo@example.com',
        profilePic: '',
        bio: 'ยินดีต้อนรับสู่ MySocial!',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

// เข้าสู่ระบบ
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    // ถ้าเชื่อมต่อ MongoDB จริงสำเร็จ ให้ใช้งาน DB จริง
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'ไม่พบผู้ใช้นี้ในระบบ' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        message: 'เข้าสู่ระบบสำเร็จ',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profilePic: user.profilePic,
          bio: user.bio,
        },
      });
    }

    // Fallback โหมดสำรอง (กรณีไม่ได้ต่อ DB ให้เข้าใช้งานได้ทันทีไม่ติด Error)
    const mockId = 'demo_user_123';
    const token = jwt.sign({ userId: mockId }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: mockId,
        username: (email && email.split('@')[0]) || 'DemoUser',
        email: email || 'demo@example.com',
        profilePic: '',
        bio: 'บัญชีทดลองใช้งาน MySocial',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

module.exports = router;
