const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ใน Vercel Serverless ระบบไฟล์เป็น Read-Only ให้ใช้ Memory Storage
let storage;

if (process.env.VERCEL) {
  storage = multer.memoryStorage();
} else {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  });
}

function fileFilter(req, file, cb) {
  if (file && file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น'));
  }
}

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 5 * 1024 * 1024 } 
});

module.exports = upload;
