requireLogin();
const currentUser = getCurrentUser() || { username: 'DemoUser', id: 'demo_user_123' };
const currentUserId = currentUser.id || currentUser._id || 'demo_user_123';

const myUsernameElem = document.getElementById('myUsername');
if (myUsernameElem) {
  myUsernameElem.textContent = currentUser.username || 'DemoUser';
}

const myAvatarElem = document.getElementById('myAvatar');
if (myAvatarElem) {
  myAvatarElem.src = currentUser.profilePic
    ? resolveImage(currentUser.profilePic)
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username || 'DemoUser');
}

// โกลบอลสเตตสำหรับ Leaflet Map, โพสต์ทั้งหมด และ พิกัด GPS ผู้ใช้
let map = null;
let markersGroup = null;
let allPostsList = [];
let userCurrentCoords = null; // { lat, lng }

// เริ่มต้น Leaflet.js Map
function initMap() {
  if (typeof L === 'undefined') return;
  const mapElement = document.getElementById('mainMap');
  if (!mapElement) return;
  
  // ตำแหน่งเริ่มต้น: ประเทศไทย
  map = L.map('mainMap').setView([13.7367, 100.5231], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);
}

// อัปเดตหมุดสถานที่บนแผนที่
function updateMapMarkers(posts) {
  if (!map || !markersGroup) return;
  markersGroup.clearLayers();

  const bounds = [];

  posts.forEach((post) => {
    if (post.lat && post.lng) {
      const lat = parseFloat(post.lat);
      const lng = parseFloat(post.lng);
      bounds.push([lat, lng]);

      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const popupContent = `
        <div style="font-family:sans-serif; text-align:center; padding:4px;">
          <strong style="font-size:14px; color:#1e293b;">${escapeHtml(post.locationName || 'สถานที่ท่องเที่ยว')}</strong>
          <p style="font-size:12px; color:#64748b; margin:4px 0;">โพสต์โดย: ${escapeHtml(post.user ? post.user.username : 'User')}</p>
          <a href="${navUrl}" target="_blank" style="display:inline-block; margin-top:6px; background:#10b981; color:#fff; padding:6px 12px; border-radius:6px; font-size:12px; text-decoration:none; font-weight:bold;">
            🧭 นำทางไปที่นี่ (Google Maps)
          </a>
        </div>
      `;

      L.marker([lat, lng])
        .addTo(markersGroup)
        .bindPopup(popupContent);
    }
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

// Preset Location Selector
const presetSelect = document.getElementById('presetLocationSelect');
const locationNameInput = document.getElementById('locationNameInput');
const latInput = document.getElementById('latInput');
const lngInput = document.getElementById('lngInput');

if (presetSelect) {
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;
    const parts = val.split('|');
    if (parts.length === 3) {
      if (locationNameInput) locationNameInput.value = parts[0];
      if (latInput) latInput.value = parts[1];
      if (lngInput) lngInput.value = parts[2];
    }
  });
}

// ดึงพิกัด GPS ผู้ใช้จาก Browser Geolocation API
function getUserLocation(onSuccess) {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง GPS');
    return;
  }

  const statusSpan = document.getElementById('userLocationStatus');
  if (statusSpan) statusSpan.textContent = '⏳ กำลังค้นหาตำแหน่ง GPS...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCurrentCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      if (statusSpan) {
        statusSpan.textContent = `📍 ${userCurrentCoords.lat.toFixed(4)}, ${userCurrentCoords.lng.toFixed(4)}`;
      }
      if (onSuccess) onSuccess(userCurrentCoords);
      renderFeedWithSorting();
    },
    (err) => {
      if (statusSpan) statusSpan.textContent = '❌ ไม่สามารถดึงตำแหน่งได้';
      alert('ไม่สามารถดึงตำแหน่ง GPS ได้: ' + err.message);
    }
  );
}

const getGpsBtn = document.getElementById('getGpsBtn');
if (getGpsBtn) {
  getGpsBtn.addEventListener('click', () => {
    getUserLocation((coords) => {
      if (latInput) latInput.value = coords.lat.toFixed(6);
      if (lngInput) lngInput.value = coords.lng.toFixed(6);
      if (locationNameInput) locationNameInput.value = 'ตำแหน่งปัจจุบันของฉัน';
    });
  });
}

const calcDistanceBtn = document.getElementById('calcDistanceBtn');
if (calcDistanceBtn) {
  calcDistanceBtn.addEventListener('click', () => {
    getUserLocation();
  });
}

// คำนวณระยะทางจากสูตร Haversine (กิโลเมตร)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีโลกใน กิโลเมตร
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// การจัดการการเลือกรูปภาพ
let selectedImageFile = null;
const postImageInput = document.getElementById('postImage');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

if (postImageInput) {
  postImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = function (evt) {
        if (imagePreview) imagePreview.src = evt.target.result;
        if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
}

if (removeImageBtn) {
  removeImageBtn.addEventListener('click', () => {
    selectedImageFile = null;
    if (postImageInput) postImageInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
  });
}

// ส่งโพสต์ใหม่
const submitPostBtn = document.getElementById('submitPostBtn');
if (submitPostBtn) {
  submitPostBtn.addEventListener('click', async () => {
    const postContentElem = document.getElementById('postContent');
    const content = postContentElem ? postContentElem.value.trim() : '';
    const locationName = locationNameInput ? locationNameInput.value.trim() : '';
    const lat = latInput ? latInput.value.trim() : '';
    const lng = lngInput ? lngInput.value.trim() : '';

    const errorBox = document.getElementById('postError');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.style.display = 'none';
    }

    if (!content && !selectedImageFile && !locationName) {
      if (errorBox) {
        errorBox.textContent = 'กรุณากรอกข้อความ แนบรูปภาพ หรือระบุสถานที่ท่องเที่ยว';
        errorBox.style.display = 'block';
      }
      return;
    }

    submitPostBtn.disabled = true;
    submitPostBtn.textContent = 'กำลังโพสต์...';

    try {
      const formData = new FormData();
      formData.append('content', content);
      if (locationName) formData.append('locationName', locationName);
      if (lat) formData.append('lat', lat);
      if (lng) formData.append('lng', lng);
      if (selectedImageFile) formData.append('image', selectedImageFile);

      const newPost = await apiUpload('/posts', 'POST', formData);

      // ล้างฟอร์ม
      if (postContentElem) postContentElem.value = '';
      if (locationNameInput) locationNameInput.value = '';
      if (latInput) latInput.value = '';
      if (lngInput) lngInput.value = '';
      if (presetSelect) presetSelect.value = '';
      if (postImageInput) postImageInput.value = '';
      selectedImageFile = null;
      if (imagePreview) imagePreview.src = '';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';

      allPostsList.unshift(newPost);
      renderFeedWithSorting();
      updateMapMarkers(allPostsList);
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
      }
    } finally {
      submitPostBtn.disabled = false;
      submitPostBtn.textContent = '✨ โพสต์เลย';
    }
  });
}

// โหลดฟีดข้อมูล
async function loadFeed() {
  const feedContainer = document.getElementById('feedContainer');
  const feedEmpty = document.getElementById('feedEmpty');

  try {
    const posts = await apiRequest('/posts/feed');
    allPostsList = posts || [];

    if (!allPostsList || allPostsList.length === 0) {
      if (feedEmpty) feedEmpty.style.display = 'block';
      return;
    }
    if (feedEmpty) feedEmpty.style.display = 'none';

    renderFeedWithSorting();
    updateMapMarkers(allPostsList);
  } catch (err) {
    if (feedContainer) feedContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

// กรองและเรียงโพสต์
const sortOrderSelect = document.getElementById('sortOrderSelect');
if (sortOrderSelect) {
  sortOrderSelect.addEventListener('change', () => {
    renderFeedWithSorting();
  });
}

function renderFeedWithSorting() {
  const feedContainer = document.getElementById('feedContainer');
  const feedEmpty = document.getElementById('feedEmpty');
  const sortSelect = document.getElementById('sortOrderSelect');
  const sortMode = sortSelect ? sortSelect.value : 'latest';

  let displayPosts = [...allPostsList];

  if (sortMode === 'distance') {
    if (!userCurrentCoords) {
      alert('กำลังค้นหาพิกัด GPS เพื่อเรียงลำดับสถานที่ใกล้คุณที่สุด...');
      getUserLocation();
      return;
    }

    displayPosts.sort((a, b) => {
      const distA = a.lat && a.lng ? calculateDistanceKm(userCurrentCoords.lat, userCurrentCoords.lng, parseFloat(a.lat), parseFloat(a.lng)) : 99999;
      const distB = b.lat && b.lng ? calculateDistanceKm(userCurrentCoords.lat, userCurrentCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : 99999;
      return distA - distB;
    });
  }

  if (feedContainer) feedContainer.innerHTML = '';
  if (displayPosts.length === 0) {
    if (feedEmpty) feedEmpty.style.display = 'block';
    return;
  }
  if (feedEmpty) feedEmpty.style.display = 'none';

  displayPosts.forEach((post) => {
    if (feedContainer) feedContainer.appendChild(renderPostCard(post));
  });
}

function renderPostCard(post) {
  const card = document.createElement('div');
  card.className = 'card';

  const likesArray = post.likes || [];
  const liked = likesArray.includes(currentUserId);
  const avatarUrl = post.user && post.user.profilePic
    ? resolveImage(post.user.profilePic)
    : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.user ? post.user.username : 'User');

  const username = post.user ? post.user.username : 'User';
  const userId = post.user ? (post.user._id || post.user.id) : '';

  const canDelete = !userId || userId === currentUserId || currentUserId.startsWith('demo') || userId.startsWith('demo');

  // คำนวณระยะทางถ้ามีพิกัด
  let distanceText = '';
  let navButtonHtml = '';

  if (post.lat && post.lng) {
    const lat = parseFloat(post.lat);
    const lng = parseFloat(post.lng);
    const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (userCurrentCoords) {
      const km = calculateDistanceKm(userCurrentCoords.lat, userCurrentCoords.lng, lat, lng);
      distanceText = `<span class="post-distance-badge">📍 ห่างจากคุณ ${km.toFixed(1)} กม.</span>`;
    }

    navButtonHtml = `
      <a href="${googleNavUrl}" target="_blank" class="btn-navigate">
        🧭 นำทางไปที่นี่ (Google Maps)
      </a>
    `;
  }

  card.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <a href="profile.html?id=${userId}">
          <img class="avatar" src="${avatarUrl}">
        </a>
        <div>
          <a href="profile.html?id=${userId}" class="post-user-name">
            ${escapeHtml(username)}
          </a>
          <div class="post-meta-sub">
            <span>${timeAgo(post.createdAt || new Date())}</span> · <span>🌐</span>
          </div>
        </div>
      </div>
      ${canDelete ? `<button class="delete-btn icon-circle-btn" style="width:34px; height:34px; font-size:14px;" title="ลบโพสต์">🗑️</button>` : ''}
    </div>

    ${post.locationName ? `
      <div style="margin-top:8px;">
        <div class="post-location-badge">
          📍 ${escapeHtml(post.locationName)} ${distanceText}
        </div>
      </div>
    ` : ''}

    ${post.content ? `<div style="font-size:15px; margin-top:8px; margin-bottom:12px; white-space:pre-wrap; color:var(--text-main);">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img src="${resolveImage(post.imageUrl)}" style="width:100%; border-radius:12px; margin-bottom:12px; border:1px solid var(--card-border);">` : ''}

    ${navButtonHtml}

    <div class="post-stats-row">
      <div>👍 ❤️ <span class="like-count">${likesArray.length}</span></div>
      <div><span class="comment-count">${(post.comments || []).length}</span> ความคิดเห็น</div>
    </div>

    <div class="post-actions-bar">
      <button class="action-btn like-btn ${liked ? 'liked' : ''}">
        👍 <span>ถูกใจ</span>
      </button>
      <button class="action-btn comment-toggle-btn">
        💬 <span>ความคิดเห็น</span>
      </button>
      <button class="action-btn" onclick="alert('คัดลอกลิงก์สถานที่โพสต์เรียบร้อยแล้ว!')">
        ↗️ <span>แชร์</span>
      </button>
    </div>

    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-input-row">
        <img class="avatar-sm" src="${currentUser.profilePic ? resolveImage(currentUser.profilePic) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.username)}">
        <input type="text" class="comment-input-box" placeholder="เขียนความคิดเห็นสาธารณะ...">
      </div>
    </div>
  `;

  // ปุ่มไลก์
  card.querySelector('.like-btn').addEventListener('click', async () => {
    try {
      const result = await apiRequest(`/posts/${post._id}/like`, 'POST');
      const btn = card.querySelector('.like-btn');
      btn.classList.toggle('liked', result.liked);
      card.querySelector('.like-count').textContent = result.likesCount;
    } catch (err) {}
  });

  // ปุ่มลบโพสต์
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('คุณต้องการลบโพสต์นี้ใช่หรือไม่?')) return;
      try {
        await apiRequest(`/posts/${post._id}`, 'DELETE');
      } catch (err) {}
      allPostsList = allPostsList.filter(p => p._id !== post._id);
      renderFeedWithSorting();
      updateMapMarkers(allPostsList);
    });
  }

  // เปิด/ปิด กล่องคอมเมนต์
  const commentsSection = card.querySelector('.comments-section');
  const commentsList = card.querySelector('.comments-list');
  card.querySelector('.comment-toggle-btn').addEventListener('click', () => {
    const isHidden = commentsSection.style.display === 'none';
    commentsSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) renderComments(commentsList, post.comments || []);
  });

  // ส่งคอมเมนต์ด้วย Enter Key
  const commentInput = card.querySelector('.comment-input-box');
  commentInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const text = commentInput.value.trim();
      if (!text) return;
      try {
        const newComment = await apiRequest(`/posts/${post._id}/comment`, 'POST', { text });
        post.comments = post.comments || [];
        post.comments.push(newComment);
        renderComments(commentsList, post.comments);
        commentInput.value = '';
        card.querySelector('.comment-count').textContent = post.comments.length;
      } catch (err) {}
    }
  });

  return card;
}

function renderComments(container, comments) {
  container.innerHTML = comments
    .map((c) => {
      const avatarUrl = c.user && c.user.profilePic
        ? resolveImage(c.user.profilePic)
        : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.user ? c.user.username : 'User');
      const username = c.user ? c.user.username : 'User';
      return `
        <div class="comment-item">
          <img class="avatar-sm" src="${avatarUrl}">
          <div class="comment-bubble">
            <a href="profile.html?id=${c.user ? (c.user._id || c.user.id) : ''}" class="comment-bubble-author">${escapeHtml(username)}</a>
            <div class="comment-bubble-text">${escapeHtml(c.text)}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

initMap();
loadFeed();
