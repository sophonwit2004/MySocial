requireLogin();
const currentUser = getCurrentUser();
document.getElementById('myUsername').textContent = currentUser.username;
document.getElementById('myAvatar').src = currentUser.profilePic
  ? resolveImage(currentUser.profilePic)
  : 'https://ui-avatars.com/api/?name=' + currentUser.username;

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

  if (!content && !selectedImageFile) {
    errorBox.textContent = 'กรุณาพิมพ์ข้อความหรือแนบรูปภาพ';
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
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'โพสต์';
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
  const liked = likesArray.includes(currentUser.id);
  const avatarUrl = post.user && post.user.profilePic
    ? resolveImage(post.user.profilePic)
    : 'https://ui-avatars.com/api/?name=' + (post.user ? post.user.username : 'User');

  const username = post.user ? post.user.username : 'User';
  const userId = post.user ? post.user._id : '';

  card.innerHTML = `
    <div class="post-header">
      <a href="profile.html?id=${userId}">
        <img class="avatar" src="${avatarUrl}">
      </a>
      <div>
        <a href="profile.html?id=${userId}" class="post-user" style="text-decoration:none;color:inherit;font-weight:bold">
          ${username}
        </a>
        <div class="post-time">${timeAgo(post.createdAt || new Date())}</div>
      </div>
      ${userId === currentUser.id ? `<button class="delete-btn" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#e41e3f;font-weight:bold">✕ ลบ</button>` : ''}
    </div>
    ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img class="post-image" src="${resolveImage(post.imageUrl)}">` : ''}
    <div class="post-actions">
      <button class="like-btn ${liked ? 'liked' : ''}">👍 ถูกใจ (<span class="like-count">${likesArray.length}</span>)</button>
      <button class="comment-toggle-btn">💬 คอมเมนต์ (${(post.comments || []).length})</button>
    </div>
    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-form">
        <input type="text" placeholder="เขียนคอมเมนต์...">
        <button class="btn" style="width:auto;padding:8px 16px;border-radius:16px">ส่ง</button>
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

  // ปุ่มลบ
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('ต้องการลบโพสต์นี้ใช่ไหม?')) return;
      try {
        await apiRequest(`/posts/${post._id}`, 'DELETE');
        card.remove();
      } catch (err) {
        card.remove();
      }
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

  // ส่งคอมเมนต์
  const commentInput = card.querySelector('.comment-form input');
  card.querySelector('.comment-form button').addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    try {
      const newComment = await apiRequest(`/posts/${post._id}/comment`, 'POST', { text });
      post.comments = post.comments || [];
      post.comments.push(newComment);
      renderComments(commentsList, post.comments);
      commentInput.value = '';
      card.querySelector('.comment-toggle-btn').textContent = `💬 คอมเมนต์ (${post.comments.length})`;
    } catch (err) {}
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
        <div class="comment">
          <img class="avatar-sm" src="${avatarUrl}">
          <div class="comment-bubble">
            <strong>${username}</strong><br>${escapeHtml(c.text)}
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
