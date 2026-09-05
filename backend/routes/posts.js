const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// สร้างโพสต์ใหม่ (ข้อความ + รูปภาพ ถ้ามี)
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content && !req.file) {
      return res.status(400).json({ message: 'ต้องมีข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง' });
    }

    const newPost = await Post.create({
      user: req.userId,
      content: content || '',
      imageUrl: req.file ? '/uploads/' + req.file.filename : '',
    });

    const populatedPost = await newPost.populate('user', 'username profilePic');
    res.status(201).json(populatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'สร้างโพสต์ไม่สำเร็จ' });
  }
});

// ดึงฟีด: โพสต์ของตัวเอง + คนที่ติดตาม เรียงจากใหม่ไปเก่า
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const userIds = [...currentUser.following, req.userId];

    const posts = await Post.find({ user: { $in: userIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePic')
      .populate('comments.user', 'username profilePic');

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'โหลดฟีดไม่สำเร็จ' });
  }
});

// ดูโพสต์ทั้งหมดของผู้ใช้คนใดคนหนึ่ง (สำหรับหน้าโปรไฟล์)
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePic')
      .populate('comments.user', 'username profilePic');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'โหลดโพสต์ไม่สำเร็จ' });
  }
});

// ลบโพสต์ (ลบได้เฉพาะโพสต์ของตัวเอง)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'ไม่พบโพสต์' });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบโพสต์นี้' });
    }

    await post.deleteOne();
    res.json({ message: 'ลบโพสต์สำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'ลบโพสต์ไม่สำเร็จ' });
  }
});

// กดไลก์ / เลิกไลก์ (toggle)
router.post('/:id/like', authMiddleware, async (req, res) => {
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
    res.json({ likesCount: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
  }
});

// เพิ่มคอมเมนต์
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'กรุณากรอกข้อความคอมเมนต์' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'ไม่พบโพสต์' });

    post.comments.push({ user: req.userId, text });
    await post.save();

    const updatedPost = await post.populate('comments.user', 'username profilePic');
    res.status(201).json(updatedPost.comments[updatedPost.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'คอมเมนต์ไม่สำเร็จ' });
  }
});

module.exports = router;
