// ==== ตั้งค่า URL ของ backend ====
const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:5000/api'
  : '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = 'login.html';
  }
}

// ฟังก์ชันกลางสำหรับเรียก API แบบ JSON
async function apiRequest(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('เกิดข้อผิดพลาดจากระบบ (Server Error)');
  }

  if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}

// ฟังก์ชันกลางสำหรับเรียก API แบบส่งไฟล์ (FormData)
async function apiUpload(path, method, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: formData,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('เกิดข้อผิดพลาดขณะอัปโหลดไฟล์ (Server Error)');
  }

  if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}

// ทำให้ path รูปภาพ (เช่น /uploads/xxx.jpg หรือ data:image/...) กลายเป็น URL เต็ม
function resolveImage(pathStr) {
  if (!pathStr) return '';
  if (pathStr.startsWith('data:') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr;
  }
  const base = API_BASE.replace('/api', '');
  return base + pathStr;
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const intervals = [
    ['ปี', 31536000],
    ['เดือน', 2592000],
    ['วัน', 86400],
    ['ชั่วโมง', 3600],
    ['นาที', 60],
  ];
  for (const [label, secs] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}ที่แล้ว`;
  }
  return 'เมื่อสักครู่';
}
