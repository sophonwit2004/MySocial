requireLogin();
const me = getCurrentUser();
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
let debounceTimer;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(searchInput.value), 300);
});

async function runSearch(term) {
  const users = await apiRequest(`/users?search=${encodeURIComponent(term)}`);
  const others = users.filter((u) => u._id !== me.id);

  if (others.length === 0) {
    resultsList.innerHTML = '<p class="text-muted" style="text-align:center">ไม่พบผู้ใช้</p>';
    return;
  }

  resultsList.innerHTML = '';
  others.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'user-row';
    const avatarUrl = user.profilePic
      ? resolveImage(user.profilePic)
      : 'https://ui-avatars.com/api/?name=' + user.username;
    const isFollowing = user.followers.includes(me.id);

    row.innerHTML = `
      <a class="user-row-left" href="profile.html?id=${user._id}">
        <img class="avatar-sm" src="${avatarUrl}">
        <span>${user.username}</span>
      </a>
      <button class="follow-btn ${isFollowing ? 'following' : ''}">${isFollowing ? 'เลิกติดตาม' : 'ติดตาม'}</button>
    `;

    row.querySelector('button').addEventListener('click', async () => {
      const result = await apiRequest(`/users/${user._id}/follow`, 'POST');
      const btn = row.querySelector('button');
      btn.textContent = result.following ? 'เลิกติดตาม' : 'ติดตาม';
      btn.classList.toggle('following', result.following);
    });

    resultsList.appendChild(row);
  });
}

// โหลดรายชื่อผู้ใช้ทั้งหมดตอนเปิดหน้าครั้งแรก
runSearch('');
