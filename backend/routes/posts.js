const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// In-Memory storage สำหรับ Demo mode บน Vercel พร้อมสถานที่ท่องเที่ยวจริงในไทย
let memoryPosts = [
  {
    _id: 'news_post_1',
    content: '🛕 ชมความสวยงามของ "วัดสิรินธรวรารามภูพร้าว" (วัดเรืองแสง) อ.สิรินธร จ.อุบลราชธานี ยามเย็นสวยตระการตามากครับ! 🌟✨ #TravelThailand #UbonRatchathani #MADOO',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    locationName: 'วัดสิรินธรวรารามภูพร้าว (วัดเรืองแสง), อุบลราชธานี',
    lat: 15.2286,
    lng: 104.8563,
    user: { 
      _id: 'travel_world_id', 
      username: 'Travel World 🧳', 
      profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' 
    },
    likes: ['demo_user_123', 'u2', 'u3'],
    comments: [
      { _id: 'c101', text: 'บรรยากาศยามเย็นเรืองแสงสวยงามมากครับ!', user: { username: 'Dev_Sonic', profilePic: '' } },
      { _id: 'c102', text: 'เคยกดปุ่มนำทางไปมาแล้ว เดินทางสะดวกมาก 🗺️✨', user: { username: 'Ploy_Traveler', profilePic: '' } }
    ],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    _id: 'news_post_2',
    content: '🏔️ ประตูท่าแพ เชียงใหม่ อากาศยามเช้าเย็นสบาย ถ่ายรูปกับฝูงนกพิราบและกำแพงเมืองโบราณอันเป็นเอกลักษณ์ 📸🕊️ #ChiangMai #ThaPhaeGate',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    locationName: 'ประตูท่าแพ, เชียงใหม่',
    lat: 18.7877,
    lng: 98.9931,
    user: { 
      _id: 'chiangmai_explorer', 
      username: 'Chiang Mai Explorer 🍃', 
      profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' 
    },
    likes: ['u1', 'u2'],
    comments: [
      { _id: 'c201', text: 'ไปเชียงใหม่ทีไรต้องแวะที่นี่ทุกครั้งครับ!', user: { username: 'Ploy_Traveler', profilePic: '' } }
    ],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    _id: 'news_post_3',
    content: '🌅 แหลมพรหมเทพ ภูเก็ต จุดชมพระอาทิตย์ตกดินที่สวยที่สุดในประเทศไทย ลมทะเลเย็นสบาย 🌊☀️ #Phuket #PhromthepCape',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    locationName: 'แหลมพรหมเทพ, ภูเก็ต',
    lat: 7.7607,
    lng: 98.3054,
    user: { 
      _id: 'island_hopper', 
      username: 'Phuket Hopper 🏖️', 
      profilePic: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80' 
    },
    likes: ['demo_user_123'],
    comments: [],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

function getFileUrl(file) {
  if (!file) return '';
  if (file.buffer) {
    const mime = file.mimetype || 'image/jpeg';
    return `data:${mime};base64,${file.buffer.toString('base64')}`;
  }
  return '/uploads/' + file.filename;
}

// สร้างโพสต์ใหม่ (ข้อความ + รูปภาพ + พิกัดนำทาง)
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'อัปโหลดรูปภาพไม่สำเร็จ' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { content, locationName, lat, lng } = req.body;
    if (!content && !req.file) {
      return res.status(400).json({ message: 'ต้องมีข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง' });
    }

    const imageUrl = getFileUrl(req.file);
    const latitude = lat ? parseFloat(lat) : null;
    const longitude = lng ? parseFloat(lng) : null;

    if (mongoose.connection.readyState === 1) {
      const newPost = await Post.create({
        user: req.userId,
        content: content || '',
        imageUrl,
        locationName: locationName || '',
        lat: latitude,
        lng: longitude
      });
      const populatedPost = await newPost.populate('user', 'username profilePic');
      return res.status(201).json(populatedPost);
    }

    // Fallback In-Memory Mode
    const newMemoryPost = {
      _id: 'post_' + Date.now(),
      content: content || '',
      imageUrl,
      locationName: locationName || '',
      lat: latitude,
      lng: longitude,
      user: { _id: req.userId || 'demo_user_123', username: 'DemoUser', profilePic: '' },
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    memoryPosts.unshift(newMemoryPost);
    return res.status(201).json(newMemoryPost);
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

  // Return memoryPosts
  return res.json(memoryPosts);
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

  const userPosts = memoryPosts.filter(p => p.user._id === req.params.userId || req.params.userId === 'demo_user_123');
  return res.json(userPosts);
});

// ลบโพสต์
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

  memoryPosts = memoryPosts.filter(p => p._id !== req.params.id);
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

  // Memory mode like toggle
  const targetPost = memoryPosts.find(p => p._id === req.params.id);
  if (targetPost) {
    const userId = req.userId || 'demo_user_123';
    const index = targetPost.likes.indexOf(userId);
    let liked = false;
    if (index > -1) {
      targetPost.likes.splice(index, 1);
    } else {
      targetPost.likes.push(userId);
      liked = true;
    }
    return res.json({ likesCount: targetPost.likes.length, liked });
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

    const newComment = {
      _id: 'comment_' + Date.now(),
      text,
      user: { username: 'DemoUser', profilePic: '' }
    };

    const targetPost = memoryPosts.find(p => p._id === req.params.id);
    if (targetPost) {
      targetPost.comments.push(newComment);
    }

    return res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: 'คอมเมนต์ไม่สำเร็จ' });
  }
});

module.exports = router;
