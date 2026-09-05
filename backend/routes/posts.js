const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Helper สำหรับแปลงรูปเป็น URL หรือ Base64
function getFileUrl(file) {
  if (!file) return '';
  if (file.buffer) {
    const mime = file.mimetype || 'image/jpeg';
    return `data:${mime};base64,${file.buffer.toString('base64')}`;
  }
  return '/uploads/' + file.filename;
}

// สร้างโพสต์ใหม่ (ข้อความ + รูปภาพ ถ้ามี)
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'อัปโหลดรูปภาพไม่สำเร็จ' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content && !req.file) {
      return res.status(400).json({ message: 'ต้องมีข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง' });
    }

    const imageUrl = getFileUrl(req.file);

    if (mongoose.connection.readyState === 1) {
      const newPost = await Post.create({
        user: req.userId,
        content: content || '',
        imageUrl,
      });
      const populatedPost = await newPost.populate('user', 'username profilePic');
      return res.status(201).json(populatedPost);
    }

    // Fallback mode
    return res.status(201).json({
      _id: 'post_' + Date.now(),
      content: content || '',
      imageUrl,
      user: { _id: req.userId || 'demo_user_123', username: 'DemoUser', profilePic: '' },
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'สร้างโพสต์ไม่สำเร็จ' });
  }
});

// ดึงฟีด: โพสต์ของตัวเอง + คนที่ติดตาม เรียงจากใหม่ไปเก่า
router.get('/feed', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const currentUser = await User.findById(req.userId);
      const userIds = currentUser ? [...currentUser.following, req.userId] : [req.userId];

      const posts = await Post.find({ user: { $in: userIds } })
        .sort({ createdAt: -1 })
        .populate('user', 'username profilePic')
        .populate('comments.user', 'username profilePic');

      return res.json(posts);
    } catch (err) {}
  }

  // Fallback posts for Demo mode
  return res.json([
    {
      _id: 'demo_post_1',
      content: '🎉 ยินดีต้อนรับสู่ MySocial! โพสต์แรกของคุณบนเว็บแอปโซเชียลมีเดีย',
      imageUrl: '',
      user: { _id: 'admin_1', username: 'MySocial Team', profilePic: '' },
      likes: ['demo_user_123'],
      comments: [
        { _id: 'c1', text: 'สวัสดีครับ ยินดีต้อนรับ!', user: { username: 'Admin' } }
      ],
      createdAt: new Date().toISOString()
    }
  ]);
});

// ดูโพสต์ทั้งหมดของผู้ใช้คนใดคนหนึ่ง (สำหรับหน้าโปรไฟล์)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const posts = await Post.find({ user: req.params.userId })
        .sort({ createdAt: -1 })
        .populate('user', 'username profilePic')
        .populate('comments.user', 'username profilePic');
      return res.json(posts);
    } catch (err) {}
  }

  return res.json([]);
});

// ลบโพสต์ (ลบได้เฉพาะโพสต์ของตัวเอง)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'ไม่พบโพสต์' });

      if (post.user.toString() !== req.userId) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบโพสต์นี้' });
      }

      await post.deleteOne();
      return res.json({ message: 'ลบโพสต์สำเร็จ' });
    } catch (err) {}
  }
  return res.json({ message: 'ลบโพสต์สำเร็จ' });
});

// กดไลก์ / เลิกไลก์ (toggle)
router.post('/:id/like', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'ไม่พบโพสต์' });

      const alreadyLiked = post.likes.includes(req.userId);

      if (alreadyLiked) {
        post.likes = post.likes.filter((id) => id.toString() !== req.userId);
      } else {
        post.likes.push(req.userId);
      }

      await post.save();
      return res.json({ likesCount: post.likes.length, liked: !alreadyLiked });
    } catch (err) {}
  }
  return res.json({ likesCount: 1, liked: true });
});

// เพิ่มคอมเมนต์
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'กรุณากรอกข้อความคอมเมนต์' });

    if (mongoose.connection.readyState === 1) {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'ไม่พบโพสต์' });

      post.comments.push({ user: req.userId, text });
      await post.save();

      const updatedPost = await post.populate('comments.user', 'username profilePic');
      return res.status(201).json(updatedPost.comments[updatedPost.comments.length - 1]);
    }

    return res.status(201).json({
      _id: 'comment_' + Date.now(),
      text,
      user: { username: 'DemoUser', profilePic: '' }
    });
  } catch (err) {
    res.status(500).json({ message: 'คอมเมนต์ไม่สำเร็จ' });
  }
});

module.exports = router;
