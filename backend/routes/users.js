const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ดูข้อมูลผู้ใช้คนที่ล็อกอินอยู่ (ตัวเอง)
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('-password');
  res.json(user);
});

// ดูโปรไฟล์ของผู้ใช้คนอื่นด้วย id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

// ค้นหาผู้ใช้จาก username
router.get('/', authMiddleware, async (req, res) => {
  const { search } = req.query;
  const query = search ? { username: { $regex: search, $options: 'i' } } : {};
  const users = await User.find(query).select('-password').limit(20);
  res.json(users);
});

// แก้ไขโปรไฟล์ตัวเอง (bio, รูปโปรไฟล์)
router.put('/me', authMiddleware, upload.single('profilePic'), async (req, res) => {
  try {
    const updateData = {};
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.file) updateData.profilePic = '/uploads/' + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'แก้ไขโปรไฟล์ไม่สำเร็จ' });
  }
});

// ติดตาม / เลิกติดตาม ผู้ใช้คนอื่น (toggle)
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'ไม่สามารถติดตามตัวเองได้' });
    }

    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.userId);

    if (!targetUser) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const isFollowing = targetUser.followers.includes(req.userId);

    if (isFollowing) {
      // เลิกติดตาม
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== req.userId);
      currentUser.following = currentUser.following.filter((id) => id.toString() !== req.params.id);
    } else {
      // ติดตาม
      targetUser.followers.push(req.userId);
      currentUser.following.push(req.params.id);
    }

    await targetUser.save();
    await currentUser.save();

    res.json({ following: !isFollowing });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
