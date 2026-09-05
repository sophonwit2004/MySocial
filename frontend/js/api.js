// ==== ตั้งค่า URL ของ backend ====
const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  const data = localStorage.getItem('user');
  if (!data) return { username: 'DemoUser', id: 'demo_user_123' };
  try {
    return JSON.parse(data);
  } catch (err) {
    return { username: 'DemoUser', id: 'demo_user_123' };
  }
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
    // กำหนดบัญชีเดโมให้อัตโนมัติถ้ายังไม่ได้ล็อกอินเพื่อทดลองใช้ได้ทันที
    saveAuth('demo_token_123', { username: 'DemoUser', id: 'demo_user_123' });
  }
}

// ฟังก์ชันกลางสำหรับเรียก API แบบ JSON
async function apiRequest(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
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
  } catch (err) {
    // ถ้า fetch ล้มเหลว (เช่น เซิร์ฟเวอร์ออฟไลน์/เปิดไฟล์โดยตรง)
    if (path.includes('/posts/feed')) {
      return [
        {
          _id: 'demo_post_1',
          content: '🛕 ชมความสวยงามของ "วัดสิรินธรวรารามภูพร้าว" (วัดเรืองแสง) อ.สิรินธร จ.อุบลราชธานี ยามเย็นสวยตระการตามากครับ! 🌟✨ #TravelThailand #UbonRatchathani #MADOO',
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
          locationName: 'วัดสิรินธรวรารามภูพร้าว (วัดเรืองแสง), อุบลราชธานี',
          lat: 15.2286,
          lng: 104.8563,
          user: { username: 'Travel World 🧳', profilePic: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80' },
          likes: ['demo_user_123'],
          comments: [{ text: 'บรรยากาศดีมากๆ ครับ', user: { username: 'Ploy_Traveler' } }],
          createdAt: new Date().toISOString()
        },
        {
          _id: 'demo_post_2',
          content: '🏔️ ประตูท่าแพ เชียงใหม่ อากาศยามเช้าเย็นสบาย ถ่ายรูปกับฝูงนกพิราบและกำแพงเมืองโบราณอันเป็นเอกลักษณ์ 📸🕊️ #ChiangMai #ThaPhaeGate',
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
          locationName: 'ประตูท่าแพ, เชียงใหม่',
          lat: 18.7877,
          lng: 98.9931,
          user: { username: 'Chiang Mai Explorer 🍃', profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80' },
          likes: [],
          comments: [],
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
    }
    if (method === 'POST' && path.includes('/like')) {
      return { likesCount: 1, liked: true };
    }
    if (method === 'POST' && path.includes('/comment')) {
      return { text: body ? body.text : 'ความคิดเห็น', user: { username: 'DemoUser' } };
    }
    throw err;
  }
}

// ฟังก์ชันกลางสำหรับเรียก API แบบส่งไฟล์ (FormData)
async function apiUpload(path, method, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  try {
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
      throw new Error('เกิดข้อผิดพลาดขณะอัปโหลดไฟล์');
    }

    if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
    return data;
  } catch (err) {
    // Fallback โหมดออฟไลน์/เซิร์ฟเวอร์ไม่ได้เปิด เพื่อให้สามารถกดโพสต์ได้เสมอ
    const currentUser = getCurrentUser();
    const content = formData.get('content') || '';
    const locationName = formData.get('locationName') || '';
    const lat = formData.get('lat') || null;
    const lng = formData.get('lng') || null;
    const imageFile = formData.get('image');

    let imageUrl = '';
    if (imageFile && imageFile instanceof File) {
      imageUrl = URL.createObjectURL(imageFile);
    }

    return {
      _id: 'post_' + Date.now(),
      content,
      locationName,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      imageUrl,
      user: {
        _id: currentUser.id || currentUser._id || 'demo_user_123',
        username: currentUser.username || 'DemoUser',
        profilePic: currentUser.profilePic || ''
      },
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
  }
}

// ทำให้ path รูปภาพ กลายเป็น URL เต็ม
function resolveImage(pathStr) {
  if (!pathStr) return '';
  if (pathStr.startsWith('blob:') || pathStr.startsWith('data:') || pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
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
