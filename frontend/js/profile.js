requireLogin();
const me = getCurrentUser();

// ถ้ามี ?id=xxx ใน URL แปลว่ากำลังดูโปรไฟล์คนอื่น ถ้าไม่มีคือดูโปรไฟล์ตัวเอง
const params = new URLSearchParams(window.location.search);
const profileId = params.get('id') || me.id;
const isOwnProfile = profileId === me.id;

let selectedProfilePicFile = null;

async function loadProfile() {
  const user = await apiRequest(`/users/${profileId}`);

  document.getElementById('profileUsername').textContent = user.username;
  document.getElementById('profileBio').textContent = user.bio || 'ยังไม่มีคำอธิบายตัวเอง';
  document.getElementById('profileAvatar').src = user.profilePic
    ? resolveImage(user.profilePic)
    : 'https://ui-avatars.com/api/?name=' + user.username;
  document.getElementById('followersCount').textContent = (user.followers || []).length;
  document.getElementById('followingCount').textContent = (user.following || []).length;

  if (isOwnProfile) {
    document.getElementById('ownProfileActions').style.display = 'block';
    document.getElementById('bioInput').value = user.bio || '';
  } else {
    const followBtn = document.getElementById('followBtn');
    followBtn.style.display = 'inline-block';
    const isFollowing = (user.followers || []).includes(me.id);
    updateFollowBtn(followBtn, isFollowing);

    followBtn.onclick = async () => {
      const result = await apiRequest(`/users/${profileId}/follow`, 'POST');
      updateFollowBtn(followBtn, result.following);
      const countEl = document.getElementById('followersCount');
      countEl.textContent = parseInt(countEl.textContent) + (result.following ? 1 : -1);
    };
  }

  loadUserPosts();
}

function updateFollowBtn(btn, isFollowing) {
  btn.textContent = isFollowing ? 'เลิกติดตาม' : 'ติดตาม';
  btn.classList.toggle('following', isFollowing);
}

const changeProfilePicBtn = document.getElementById('changeProfilePicBtn');
const profilePicInput = document.getElementById('profilePicInput');

if (changeProfilePicBtn && profilePicInput) {
  changeProfilePicBtn.addEventListener('click', (e) => {
    e.preventDefault();
    profilePicInput.click();
  });
}

profilePicInput?.addEventListener('change', (e) => {
  selectedProfilePicFile = e.target.files[0];
});

document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
  const bio = document.getElementById('bioInput').value;
  const formData = new FormData();
  formData.append('bio', bio);
  if (selectedProfilePicFile) formData.append('profilePic', selectedProfilePicFile);

  const updatedUser = await apiUpload('/users/me', 'PUT', formData);
  saveAuth(getToken(), updatedUser); // อัปเดตข้อมูลใน localStorage ด้วย
  loadProfile();
});

async function loadUserPosts() {
  const container = document.getElementById('userPosts');
  const posts = await apiRequest(`/posts/user/${profileId}`);
  container.innerHTML = '';

  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center">ยังไม่มีโพสต์</p>';
    return;
  }

  posts.forEach((post) => container.appendChild(renderSimplePost(post)));
}

function renderSimplePost(post) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div class="post-time">${timeAgo(post.createdAt || new Date())}</div>
      <button class="delete-btn" style="background:#ffebe9; color:#e41e3f; border:none; padding:4px 12px; border-radius:12px; font-weight:bold; cursor:pointer; font-size:12px;">🗑️ ลบโพสต์</button>
    </div>
    ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img class="post-image" src="${resolveImage(post.imageUrl)}" style="max-width:100%; border-radius:8px; margin-top:8px;">` : ''}
    <div class="text-muted" style="margin-top:8px;">👍 ${(post.likes || []).length} ถูกใจ · 💬 ${(post.comments || []).length} คอมเมนต์</div>
  `;

  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('คุณต้องการลบโพสต์นี้ใช่หรือไม่?')) return;
      try {
        await apiRequest(`/posts/${post._id}`, 'DELETE');
      } catch (err) {}
      card.remove();
    });
  }

  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadProfile();
