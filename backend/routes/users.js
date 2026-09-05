const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ดูข้อมูลผู้ใช้คนที่ล็อกอินอยู่ (ตัวเอง)
router.get('/me', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(req.userId).select('-password');
      if (user) return res.json(user);
    } catch (err) {}
  }
  res.json({
    _id: req.userId || 'demo_user_123',
    username: 'DemoUser',
    email: 'demo@example.com',
    bio: 'ยินดีต้อนรับสู่ MySocial!',
    profilePic: '',
    followers: [],
    following: [],
  });
});

// ดูโปรไฟล์ของผู้ใช้คนอื่นด้วย id
router.get('/:id', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      return res.json(user);
    } catch (err) {}
  }
  res.json({
    _id: req.params.id,
    username: 'User_' + req.params.id.slice(-4),
    bio: 'ผู้ใช้งาน MySocial',
    profilePic: '',
    followers: [],
    following: [],
  });
});

// ค้นหาผู้ใช้จาก username
router.get('/', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const { search } = req.query;
      const query = search ? { username: { $regex: search, $options: 'i' } } : {};
      const users = await User.find(query).select('-password').limit(20);
      return res.json(users);
    } catch (err) {}
  }
  res.json([
    { _id: 'demo_1', username: 'DemoUser', bio: 'ผู้ใช้ทดสอบ' }
  ]);
});

// แก้ไขโปรไฟล์ตัวเอง (bio, รูปโปรไฟล์)
router.put('/me', authMiddleware, upload.single('profilePic'), async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const updateData = {};
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.file) updateData.profilePic = '/uploads/' + req.file.filename;

      const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).select('-password');
      return res.json(updatedUser);
    } catch (err) {}
  }
  res.json({
    _id: req.userId || 'demo_user_123',
    username: 'DemoUser',
    bio: req.body.bio || 'ยินดีต้อนรับสู่ MySocial!',
    profilePic: req.file ? '/uploads/' + req.file.filename : '',
  });
});

// ติดตาม / เลิกติดตาม ผู้ใช้คนอื่น (toggle)
router.post('/:id/follow', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      if (req.params.id === req.userId) {
        return res.status(400).json({ message: 'ไม่สามารถติดตามตัวเองได้' });
      }

      const targetUser = await User.findById(req.params.id);
      const currentUser = await User.findById(req.userId);

      if (!targetUser) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

      const isFollowing = targetUser.followers.includes(req.userId);

      if (isFollowing) {
        targetUser.followers = targetUser.followers.filter((id) => id.toString() !== req.userId);
        currentUser.following = currentUser.following.filter((id) => id.toString() !== req.params.id);
      } else {
        targetUser.followers.push(req.userId);
        currentUser.following.push(req.params.id);
      }

      await targetUser.save();
      await currentUser.save();

      return res.json({ following: !isFollowing });
    } catch (err) {}
  }
  res.json({ following: true });
});

module.exports = router;
