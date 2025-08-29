// server-fallback.js — 回退版本（MongoDB失败时使用JSON文件）
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// ====== 配置 ======
const PORT = process.env.PORT || 3001;
const FRONTEND_ALLOWED = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'https://hwlx-app.onrender.com',
  'https://hwlx-app.render.com',
  'https://hai-wai-liu-xue.onrender.com',
];
const DATA_FILE = path.join(__dirname, 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const POSTS_FILE = path.join(__dirname, 'posts.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const COMMENTS_FILE = path.join(__dirname, 'comments.json');

// ====== 中间件 ======
app.use(cors({
  origin: FRONTEND_ALLOWED,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// 默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main page.html'));
});

// ====== JSON "数据库"工具 ======
function readUsers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf-8');
}
function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}
function readPosts() {
  try { return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8')); }
  catch { return []; }
}
function writePosts(list) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(list, null, 2));
}
function readMsgs() {
  try { return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeMsgs(arr) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2));
}
function readComments(){
  try { return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeComments(arr){
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(arr, null, 2));
}

// ====== 工具函数 ======
function normalizeEmail(v) {
  if (!v) return '';
  let s = String(v).trim();
  try { s = decodeURIComponent(s); } catch {}
  return s.toLowerCase();
}

function isFixedAdmin(email) {
  return normalizeEmail(email) === 'hwlx@hwlx.com';
}

function isAdmin(email) {
  if (isFixedAdmin(email)) return true;
  return false;
}

function getCurrentUser(req) {
  let email = normalizeEmail(req.cookies.email);
  let isAdminUser = false;
  
  if (!email) {
    email = normalizeEmail(req.cookies.admin_email);
    if (email) {
      isAdminUser = true;
    }
  }
  
  return { email, isAdmin: isAdminUser };
}

// ====== 上传配置 ======
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(16).slice(2) + ext);
  }
});
const upload = multer({ storage });

// ====== API路由 ======

// 注册
app.post('/api/register', (req, res) => {
  let { nickname, email, password, area = '', degree = '', isAdmin = false } = req.body || {};
  email = normalizeEmail(email);
  if (!email || !password) return res.status(400).json({ msg: '邮箱与密码必填' });

  const users = readUsers();
  if (users.some(u => normalizeEmail(u.email) === email)) {
    return res.status(409).json({ msg: '该邮箱已注册' });
  }
  const user = {
    id: Date.now(),
    nickname: nickname || (email.split('@')[0]),
    email,
    password,
    area,
    degree,
    avatarPath: '',
    isAdmin: Boolean(isAdmin)
  };
  users.push(user);
  writeUsers(users);
  res.json({ msg: '注册成功', user: { ...publicUser(user), isAdmin: user.isAdmin } });
});

// 登录
app.post('/api/login', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password || '';

  // 固定管理员检查
  if (isFixedAdmin(email) && password === 'hwlx') {
    res.cookie('admin_email', email, { httpOnly: false, sameSite: 'Lax' });
    return res.json({
      msg: '登录成功',
      user: {
        id: 1,
        nickname: '海外留学',
        email: email,
        area: '',
        degree: '',
        avatarPath: '',
        isAdmin: true
      }
    });
  }

  // 普通用户登录
  const users = readUsers();
  const found = users.find(u => normalizeEmail(u.email) === email && u.password === password);
  if (!found) return res.status(401).json({ msg: '邮箱或密码错误' });

  res.cookie('email', found.email, { httpOnly: false, sameSite: 'Lax' });
  res.json({ msg: '登录成功', user: { ...publicUser(found), isAdmin: Boolean(found.isAdmin) } });
});

// 退出登录
app.post('/api/logout', (req, res) => {
  res.clearCookie('email', { sameSite: 'Lax' });
  res.clearCookie('admin_email', { sameSite: 'Lax' });
  res.json({ msg: '已退出登录' });
});

// 获取当前用户信息
app.get('/api/users/me', (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  
  if (!email) return res.status(401).json({ msg: '未登录' });

  // 固定管理员
  if (isFixedAdmin(email)) {
    return res.json({
      id: 1,
      nickname: '海外留学',
      email: email,
      area: '',
      degree: '',
      avatarPath: '',
      isAdmin: true
    });
  }

  // 普通用户
  const users = readUsers();
  const found = users.find(u => normalizeEmail(u.email) === email);
  if (!found) return res.status(404).json({ msg: '用户不存在' });

  res.json({ ...publicUser(found), isAdmin: Boolean(found.isAdmin) });
});

// 管理员专用API
app.get('/api/admin/me', (req, res) => {
  const email = normalizeEmail(req.cookies.admin_email);
  
  if (!email) return res.status(401).json({ msg: '管理员未登录' });

  return res.json({
    id: 1,
    nickname: '海外留学',
    email: email,
    area: '',
    degree: '',
    avatarPath: '',
    isAdmin: true
  });
});

// 上传头像
app.post('/api/upload/avatar', upload.single('avatar'), (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

  if (!req.file) return res.status(400).json({ msg: '请选择文件' });

  const avatarPath = '/uploads/' + req.file.filename;
  const users = readUsers();
  const userIndex = users.findIndex(u => normalizeEmail(u.email) === email);
  
  if (userIndex !== -1) {
    users[userIndex].avatarPath = avatarPath;
    writeUsers(users);
  }

  res.json({ msg: '头像上传成功', avatarPath });
});

// 获取帖子列表
app.get('/api/posts', (req, res) => {
  const { category, search } = req.query;
  let posts = readPosts();
  
  if (category) {
    posts = posts.filter(p => p.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    posts = posts.filter(p => 
      p.title.toLowerCase().includes(searchLower) || 
      p.content.toLowerCase().includes(searchLower)
    );
  }
  
  res.json(posts);
});

// 发布帖子
app.post('/api/posts', upload.array('images', 5), (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

      const { title, content, desc, category } = req.body;
    const postContent = content || desc;
    if (!title || !postContent || !category) {
      return res.status(400).json({ msg: '标题、内容和分类必填' });
    }

  const users = readUsers();
  const user = users.find(u => normalizeEmail(u.email) === email);
  if (!user) return res.status(404).json({ msg: '用户不存在' });

  const images = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];

  const post = {
    id: Date.now(),
    title,
    content: postContent,
    category,
    author: user.id,
    authorName: user.nickname,
    authorEmail: user.email,
    authorAvatar: user.avatarPath,
    images,
    likes: 0,
    views: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const posts = readPosts();
  posts.unshift(post);
  writePosts(posts);
  
  res.json({ msg: '发布成功', post });
});

// 删除帖子
app.delete('/api/posts/:id', (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ msg: '帖子ID必填' });

  const posts = readPosts();
  const postIndex = posts.findIndex(p => String(p.id) === String(id));
  
  if (postIndex === -1) {
    return res.status(404).json({ msg: '帖子不存在' });
  }

  const post = posts[postIndex];
  
  // 检查权限：只有作者可以删除自己的帖子
  if (post.authorEmail !== email) {
    return res.status(403).json({ msg: '只有作者可以删除自己的帖子' });
  }

  // 删除帖子
  posts.splice(postIndex, 1);
  writePosts(posts);
  
  res.json({ msg: '帖子删除成功' });
});

// 获取消息列表
app.get('/api/messages', (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

  const users = readUsers();
  const user = users.find(u => normalizeEmail(u.email) === email);
  if (!user) return res.status(404).json({ msg: '用户不存在' });

  const messages = readMsgs();
  const userMessages = messages.filter(m => 
    normalizeEmail(m.from) === email || normalizeEmail(m.to) === email
  );

  res.json(userMessages);
});

// 发送消息
app.post('/api/messages', (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

  const { toEmail, content } = req.body;
  if (!toEmail || !content) {
    return res.status(400).json({ msg: '收件人和内容必填' });
  }

  const users = readUsers();
  const fromUser = users.find(u => normalizeEmail(u.email) === email);
  const toUser = users.find(u => normalizeEmail(u.email) === normalizeEmail(toEmail));

  if (!fromUser || !toUser) {
    return res.status(404).json({ msg: '用户不存在' });
  }

  const message = {
    id: Date.now(),
    from: fromUser.email,
    to: toUser.email,
    content,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  const messages = readMsgs();
  messages.unshift(message);
  writeMsgs(messages);
  
  res.json({ msg: '发送成功', message });
});

// 获取评论列表
app.get('/api/comments/:postId', (req, res) => {
  const { postId } = req.params;
  const comments = readComments();
  const postComments = comments.filter(c => c.postId == postId);
  res.json(postComments);
});

// 发表评论
app.post('/api/comments', (req, res) => {
  const email = normalizeEmail(req.cookies.email);
  if (!email) return res.status(401).json({ msg: '请先登录' });

  const { postId, content } = req.body;
  if (!postId || !content) {
    return res.status(400).json({ msg: '帖子ID和内容必填' });
  }

  const users = readUsers();
  const user = users.find(u => normalizeEmail(u.email) === email);
  if (!user) return res.status(404).json({ msg: '用户不存在' });

  const comment = {
    id: Date.now(),
    postId: parseInt(postId),
    author: user.id,
    content,
    authorName: user.nickname,
    authorEmail: user.email,
    authorAvatar: user.avatarPath,
    createdAt: new Date().toISOString()
  };

  const comments = readComments();
  comments.unshift(comment);
  writeComments(comments);
  
  res.json({ msg: '评论成功', comment });
});

// 健康检查
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: '回退服务器运行正常（使用JSON文件存储）',
    mode: 'fallback'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 回退服务器运行在端口 ${PORT}`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`💾 使用JSON文件存储数据`);
});
