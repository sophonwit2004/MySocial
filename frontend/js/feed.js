requireLogin();
const currentUser = getCurrentUser();
const currentUserId = currentUser.id || currentUser._id || 'demo_user_123';

document.getElementById('myUsername').textContent = currentUser.username;
document.getElementById('myAvatar').src = currentUser.profilePic
  ? resolveImage(currentUser.profilePic)
  : 'https://ui-avatars.com/api/?name=' + currentUser.username;

if (document.getElementById('sidebarUsername')) {
  document.getElementById('sidebarUsername').textContent = currentUser.username;
}
if (document.getElementById('sidebarAvatar')) {
  document.getElementById('sidebarAvatar').src = currentUser.profilePic
    ? resolveImage(currentUser.profilePic)
    : 'https://ui-avatars.com/api/?name=' + currentUser.username;
}

let selectedImageFile = null;

const postImageInput = document.getElementById('postImage');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

postImageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = function (evt) {
      imagePreview.src = evt.target.result;
      imagePreviewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

removeImageBtn.addEventListener('click', () => {
  selectedImageFile = null;
  postImageInput.value = '';
  imagePreview.src = '';
  imagePreviewContainer.style.display = 'none';
});

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const content = document.getElementById('postContent').value.trim();
  const errorBox = document.getElementById('postError');
  const submitBtn = document.getElementById('submitPostBtn');
  errorBox.textContent = '';
  errorBox.style.display = 'none';

  if (!content && !selectedImageFile) {
    errorBox.textContent = 'กรุณาพิมพ์ข้อความหรือแนบรูปภาพ';
    errorBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังโพสต์...';

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (selectedImageFile) formData.append('image', selectedImageFile);

    const newPost = await apiUpload('/posts', 'POST', formData);

    // ล้างฟอร์ม
    document.getElementById('postContent').value = '';
    postImageInput.value = '';
    selectedImageFile = null;
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';

    // เพิ่มโพสต์ใหม่ไว้บนสุดของฟีดทันที
    const feedContainer = document.getElementById('feedContainer');
    const feedEmpty = document.getElementById('feedEmpty');
    feedEmpty.style.display = 'none';

    const card = renderPostCard(newPost);
    feedContainer.prepend(card);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✨ โพสต์เลย';
  }
});

async function loadFeed() {
  const feedContainer = document.getElementById('feedContainer');
  const feedEmpty = document.getElementById('feedEmpty');

  try {
    const posts = await apiRequest('/posts/feed');
    feedContainer.innerHTML = '';

    if (!posts || posts.length === 0) {
      feedEmpty.style.display = 'block';
      return;
    }
    feedEmpty.style.display = 'none';

    posts.forEach((post) => {
      feedContainer.appendChild(renderPostCard(post));
    });
  } catch (err) {
    feedContainer.innerHTML = `<p class="error-msg">${err.message}</p>`;
  }
}

function renderPostCard(post) {
  const card = document.createElement('div');
  card.className = 'card';

  const likesArray = post.likes || [];
  const liked = likesArray.includes(currentUserId);
  const avatarUrl = post.user && post.user.profilePic
    ? resolveImage(post.user.profilePic)
    : 'https://ui-avatars.com/api/?name=' + (post.user ? post.user.username : 'User');

  const username = post.user ? post.user.username : 'User';
  const userId = post.user ? (post.user._id || post.user.id) : '';

  const canDelete = !userId || userId === currentUserId || currentUserId.startsWith('demo') || userId.startsWith('demo');

  card.innerHTML = `
    <div class="post-header">
      <div class="post-header-left">
        <a href="profile.html?id=${userId}">
          <img class="avatar" src="${avatarUrl}">
        </a>
        <div>
          <a href="profile.html?id=${userId}" class="post-user-name">
            ${username}
          </a>
          <div class="post-meta-sub">
            <span>${timeAgo(post.createdAt || new Date())}</span> · <span>🌐</span>
          </div>
        </div>
      </div>
      ${canDelete ? `<button class="delete-btn icon-circle-btn" style="width:34px; height:34px; font-size:14px;" title="ลบโพสต์">🗑️</button>` : ''}
    </div>

    ${post.content ? `<div style="font-size:15px; margin-top:12px; margin-bottom:12px; white-space:pre-wrap; color:var(--text-main);">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img src="${resolveImage(post.imageUrl)}" style="width:100%; border-radius:12px; margin-bottom:12px; border:1px solid var(--card-border);">` : ''}

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
      <button class="action-btn" onclick="alert('คัดลอกลิงก์โพสต์เรียบร้อยแล้ว!')">
        ↗️ <span>แชร์</span>
      </button>
    </div>

    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-input-row">
        <img class="avatar-sm" src="${currentUser.profilePic ? resolveImage(currentUser.profilePic) : 'https://ui-avatars.com/api/?name=' + currentUser.username}">
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
      card.remove();
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
        : 'https://ui-avatars.com/api/?name=' + (c.user ? c.user.username : 'User');
      const username = c.user ? c.user.username : 'User';
      return `
        <div class="comment-item">
          <img class="avatar-sm" src="${avatarUrl}">
          <div class="comment-bubble">
            <a href="profile.html?id=${c.user ? (c.user._id || c.user.id) : ''}" class="comment-bubble-author">${username}</a>
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

loadFeed();
