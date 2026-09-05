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
    saveAuth('demo_token_123', { username: 'DemoUser', id: 'demo_user_123' });
  }
}

// ==== ฟังก์ชันบีบอัดรูปภาพก่อนเก็บลงดิสก์/LocalStorage เพื่อไม่ให้เกิน Quota ====
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file || !(file instanceof File || file instanceof Blob)) {
      return resolve('');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// ==== ระบบสำรองข้อมูลโพสต์ถาวรผ่าน IndexedDB + LocalStorage + SessionStorage ====
const DB_NAME = 'MADOO_AppDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

function openIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => resolve(null);
  });
}

async function savePostToIndexedDB(post) {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(post);
  } catch (err) {
    console.error('IndexedDB Save Error:', err);
  }
}

async function getPostsFromIndexedDB() {
  try {
    const db = await openIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

async function deletePostFromIndexedDB(postId) {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(postId);
  } catch (err) {}
}

function getSavedLocalPostsSync() {
  try {
    const data = localStorage.getItem('madoo_saved_posts');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    return [];
  }
}

async function getSavedLocalPostsAsync() {
  const dbPosts = await getPostsFromIndexedDB();
  const lsPosts = getSavedLocalPostsSync();
  let ssPosts = [];
  try {
    const ssData = sessionStorage.getItem('madoo_backup_posts');
    ssPosts = ssData ? JSON.parse(ssData) : [];
  } catch (e) {}

  const map = new Map();
  dbPosts.forEach(p => { if (p && p._id) map.set(p._id, p); });
  lsPosts.forEach(p => { if (p && p._id) map.set(p._id, p); });
  ssPosts.forEach(p => { if (p && p._id) map.set(p._id, p); });

  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
  return merged;
}

function getSavedLocalPosts() {
  return getSavedLocalPostsSync();
}

async function saveLocalPost(post) {
  if (!post || !post._id) return;

  // 1. บันทึกลง IndexedDB (ความจุระดับ GB)
  await savePostToIndexedDB(post);

  // 2. บันทึกลง LocalStorage
  try {
    const posts = getSavedLocalPostsSync();
    const filtered = posts.filter(p => p._id !== post._id);
    filtered.unshift(post);

    try {
      localStorage.setItem('madoo_saved_posts', JSON.stringify(filtered));
    } catch (quotaErr) {
      const trimmed = filtered.slice(0, 30);
      localStorage.setItem('madoo_saved_posts', JSON.stringify(trimmed));
    }
  } catch (err) {}

  // 3. บันทึกลง SessionStorage
  try {
    const posts = getSavedLocalPostsSync();
    sessionStorage.setItem('madoo_backup_posts', JSON.stringify(posts.slice(0, 30)));
  } catch (e) {}
}

async function removeSavedLocalPost(postId) {
  deletePostFromIndexedDB(postId);
  try {
    let posts = getSavedLocalPostsSync();
    posts = posts.filter(p => p._id !== postId);
    localStorage.setItem('madoo_saved_posts', JSON.stringify(posts));
  } catch (err) {}
  try {
    let ssPosts = JSON.parse(sessionStorage.getItem('madoo_backup_posts') || '[]');
    ssPosts = ssPosts.filter(p => p._id !== postId);
    sessionStorage.setItem('madoo_backup_posts', JSON.stringify(ssPosts));
  } catch (err) {}
}

// ==== ฟังก์ชัน Export / Import ไฟล์สำรองข้อมูล JSON ====
async function exportPostsBackup() {
  const posts = await getSavedLocalPostsAsync();
  const jsonStr = JSON.stringify(posts, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `MADOO_Backup_Posts_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImportBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        for (const post of imported) {
          if (post && post._id) {
            await saveLocalPost(post);
          }
        }
        alert(`🎉 นำเข้าสำรองข้อมูลสำเร็จ ${imported.length} โพสต์!`);
        if (typeof loadFeed === 'function') loadFeed();
      } else {
        alert('ไฟล์สำรองไม่ถูกต้อง');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอ่านไฟล์สำรอง: ' + err.message);
    }
  };
  reader.readAsText(file);
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
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return {
        token: 'demo_token_123',
        user: { username: (body && body.username) || 'DemoUser', id: 'demo_user_123' }
      };
    }
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
    const currentUser = getCurrentUser();
    const content = formData.get('content') || '';
    const locationName = formData.get('locationName') || '';
    const lat = formData.get('lat') || null;
    const lng = formData.get('lng') || null;

    return {
      _id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      content,
      locationName,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      imageUrl: '',
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
