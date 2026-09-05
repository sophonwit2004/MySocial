const jwt = require('jsonwebtoken');

// middleware นี้ใช้เช็คว่า request มี token ที่ถูกต้องไหม
// ถ้าถูกต้อง จะแปะข้อมูล req.userId ไว้ให้ route ถัดไปใช้
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization; // รูปแบบ: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ไม่พบ token กรุณาเข้าสู่ระบบ' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'mysocialapp_secret_key_2026_super_secure';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

module.exports = authMiddleware;
