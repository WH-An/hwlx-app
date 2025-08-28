// api 基础地址 - 自动检测环境
const API_BASE = (() => {
  // 如果是本地开发环境
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return "http://localhost:3001/api";
  }
  // 如果是生产环境（Render），使用相对路径
  return "/api";
})();

// sha256 加密
function hashPassword(pwd) {
    return sha256(pwd);
}

// 登录
async function login(email, password) {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: hashPassword(password) })
    });
    return res.json();
}

// 注册
async function register(email, password) {
    const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: hashPassword(password) })
    });
    return res.json();
}

// 发帖
async function createPost(content) {
    const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    return res.json();
}

// 加载帖子
async function loadPosts() {
    const res = await fetch(`${API_BASE}/posts`);
    return res.json();
}
