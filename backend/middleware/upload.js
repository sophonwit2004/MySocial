const multer = require('multer');
const path = require('path');

// ตั้งค่าที่เก็บไฟล์และชื่อไฟล์ที่อัปโหลด
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// รับเฉพาะไฟล์รูปภาพ และจำกัดขนาดไม่เกิน 5MB
function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น'));
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;
