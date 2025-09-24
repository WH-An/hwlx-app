// 未读消息徽章通用模块
// 自动检测API基础URL
const UNREAD_API_BASE = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3001';
  }
  return '';
})();

async function getUnreadCount() {
  try {
    const res = await fetch(`${UNREAD_API_BASE}/api/messages/unread-count`, {
      credentials: 'include',
      cache: 'no-cache'
    });
    if (res.ok) {
      const data = await res.json();
      return data.count || 0;
    }
  } catch (e) {
    console.warn('获取未读消息数量失败:', e);
  }
  try {
    const cached = localStorage.getItem('unreadCount');
    return cached ? parseInt(cached) : 0;
  } catch (e) {
    return 0;
  }
}

async function updateUnreadBadge() {
  const chatFab = document.getElementById('chatFab');
  if (!chatFab) return;
  const badge = chatFab.querySelector('.badge');
  if (!badge) return;
  try {
    const unreadCount = await getUnreadCount();
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    try { localStorage.setItem('unreadCount', unreadCount.toString()); } catch {}
  } catch (error) {
    console.error('更新徽章时出错:', error);
    badge.style.display = 'none';
  }
}

// 初始化与暴露测试方法
document.addEventListener('DOMContentLoaded', () => {
  updateUnreadBadge();
  setInterval(updateUnreadBadge, 30000);
});
document.addEventListener('focus', updateUnreadBadge);
window.addEventListener('focus', updateUnreadBadge);

window.testBadge = function(count) {
  const badge = document.querySelector('#chatFab .badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count.toString();
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
};


