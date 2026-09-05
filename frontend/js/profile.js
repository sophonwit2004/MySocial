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
  document.getElementById('followersCount').textContent = user.followers.length;
  document.getElementById('followingCount').textContent = user.following.length;

  if (isOwnProfile) {
    document.getElementById('ownProfileActions').style.display = 'block';
    document.getElementById('bioInput').value = user.bio || '';
  } else {
    const followBtn = document.getElementById('followBtn');
    followBtn.style.display = 'inline-block';
    const isFollowing = user.followers.includes(me.id);
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

document.getElementById('profilePicInput')?.addEventListener('change', (e) => {
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

  if (posts.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align:center">ยังไม่มีโพสต์</p>';
    return;
  }

  posts.forEach((post) => container.appendChild(renderSimplePost(post)));
}

function renderSimplePost(post) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="post-time">${timeAgo(post.createdAt)}</div>
    ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img class="post-image" src="${resolveImage(post.imageUrl)}">` : ''}
    <div class="text-muted">👍 ${post.likes.length} ถูกใจ · 💬 ${post.comments.length} คอมเมนต์</div>
  `;
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadProfile();
