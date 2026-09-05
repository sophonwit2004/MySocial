requireLogin();
const currentUser = getCurrentUser();
document.getElementById('myUsername').textContent = currentUser.username;
document.getElementById('myAvatar').src = currentUser.profilePic
  ? resolveImage(currentUser.profilePic)
  : 'https://ui-avatars.com/api/?name=' + currentUser.username;

let selectedImageFile = null;

document.getElementById('postImage').addEventListener('change', (e) => {
  selectedImageFile = e.target.files[0];
});

document.getElementById('submitPostBtn').addEventListener('click', async () => {
  const content = document.getElementById('postContent').value.trim();
  const errorBox = document.getElementById('postError');
  errorBox.textContent = '';

  if (!content && !selectedImageFile) {
    errorBox.textContent = 'กรุณาพิมพ์ข้อความหรือแนบรูปภาพ';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (selectedImageFile) formData.append('image', selectedImageFile);

    await apiUpload('/posts', 'POST', formData);

    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    selectedImageFile = null;
    loadFeed();
  } catch (err) {
    errorBox.textContent = err.message;
  }
});

async function loadFeed() {
  const feedContainer = document.getElementById('feedContainer');
  const feedEmpty = document.getElementById('feedEmpty');

  try {
    const posts = await apiRequest('/posts/feed');
    feedContainer.innerHTML = '';

    if (posts.length === 0) {
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

  const liked = post.likes.includes(currentUser.id);
  const avatarUrl = post.user.profilePic
    ? resolveImage(post.user.profilePic)
    : 'https://ui-avatars.com/api/?name=' + post.user.username;

  card.innerHTML = `
    <div class="post-header">
      <a href="profile.html?id=${post.user._id}">
        <img class="avatar" src="${avatarUrl}">
      </a>
      <div>
        <a href="profile.html?id=${post.user._id}" class="post-user" style="text-decoration:none;color:inherit">
          ${post.user.username}
        </a>
        <div class="post-time">${timeAgo(post.createdAt)}</div>
      </div>
      ${post.user._id === currentUser.id ? `<button class="delete-btn" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#e41e3f">ลบ</button>` : ''}
    </div>
    ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
    ${post.imageUrl ? `<img class="post-image" src="${resolveImage(post.imageUrl)}">` : ''}
    <div class="post-actions">
      <button class="like-btn ${liked ? 'liked' : ''}">👍 ถูกใจ (<span class="like-count">${post.likes.length}</span>)</button>
      <button class="comment-toggle-btn">💬 คอมเมนต์ (${post.comments.length})</button>
    </div>
    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-form">
        <input type="text" placeholder="เขียนคอมเมนต์...">
        <button class="btn" style="width:auto;padding:8px 16px">ส่ง</button>
      </div>
    </div>
  `;

  // ปุ่มไลก์
  card.querySelector('.like-btn').addEventListener('click', async () => {
    const result = await apiRequest(`/posts/${post._id}/like`, 'POST');
    const btn = card.querySelector('.like-btn');
    btn.classList.toggle('liked', result.liked);
    card.querySelector('.like-count').textContent = result.likesCount;
  });

  // ปุ่มลบ
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('ต้องการลบโพสต์นี้ใช่ไหม?')) return;
      await apiRequest(`/posts/${post._id}`, 'DELETE');
      card.remove();
    });
  }

  // เปิด/ปิด กล่องคอมเมนต์
  const commentsSection = card.querySelector('.comments-section');
  const commentsList = card.querySelector('.comments-list');
  card.querySelector('.comment-toggle-btn').addEventListener('click', () => {
    const isHidden = commentsSection.style.display === 'none';
    commentsSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) renderComments(commentsList, post.comments);
  });

  // ส่งคอมเมนต์
  const commentInput = card.querySelector('.comment-form input');
  card.querySelector('.comment-form button').addEventListener('click', async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    const newComment = await apiRequest(`/posts/${post._id}/comment`, 'POST', { text });
    post.comments.push(newComment);
    renderComments(commentsList, post.comments);
    commentInput.value = '';
    card.querySelector('.comment-toggle-btn').textContent = `💬 คอมเมนต์ (${post.comments.length})`;
  });

  return card;
}

function renderComments(container, comments) {
  container.innerHTML = comments
    .map((c) => {
      const avatarUrl = c.user.profilePic
        ? resolveImage(c.user.profilePic)
        : 'https://ui-avatars.com/api/?name=' + c.user.username;
      return `
        <div class="comment">
          <img class="avatar-sm" src="${avatarUrl}">
          <div class="comment-bubble">
            <strong>${c.user.username}</strong><br>${escapeHtml(c.text)}
          </div>
        </div>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadFeed();
