// server.js — 固定管理员账号版
// 依赖：npm i express cors multer cookie-parser
// 启动：node server.js  （默认端口 3001）

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
// === Fixed admin (hardcoded) start ===
const FIXED_ADMIN = { email: "hwlx@hwlx.com", password: "hwlx" };

// Normalize email helper (if not present, define a safe fallback)
function normalizeEmailSafe(e) {
  try {
    return (e || "").trim().toLowerCase();
  } catch { return ""; }
}

// Unified admin check: fixed admin OR ADMIN_EMAILS env-list
function isAdminUserSafe(userOrEmail) {
  const email = typeof userOrEmail === "string" ? userOrEmail : (userOrEmail && (userOrEmail.email || userOrEmail.username || userOrEmail.userEmail));
  const normalized = normalizeEmailSafe(email);
  const fixed = normalizeEmailSafe(FIXED_ADMIN.email);
  // Try to read ADMIN_EMAILS if defined
  let envAdmins = [];
  try {
    if (typeof ADMIN_EMAILS !== "undefined" && ADMIN_EMAILS && Array.isArray(ADMIN_EMAILS)) {
      envAdmins = ADMIN_EMAILS.map(normalizeEmailSafe);
    }
  } catch {}
  return normalized === fixed || envAdmins.includes(normalized);
}
// === Fixed admin (hardcoded) end ===

const app = express();

// ====== 固定管理员账号（硬编码） ======
const ADMIN_FIXED = {
  email: 'admin@123.com',
  password: '123456'
};

// ====== 配置 ======
const PORT = process.env.PORT || 3001;
const FRONTEND_ALLOWED = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  // Render 部署域名
  'https://hwlx-app.onrender.com',
  'https://hwlx-app.render.com',
  'https://hai-wai-liu-xue.onrender.com',
];
const DATA_FILE     = path.join(__dirname, 'users.json');
const UPLOADS_DIR   = path.join(__dirname, 'uploads');
const POSTS_FILE    = path.join(__dirname, 'posts.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json'); // ✅ 消息持久化文件
const COMMENTS_FILE = path.join(__dirname, 'comments.json'); // ✅ 评论持久化文件
const COUPONS_FILE  = path.join(__dirname, 'coupons.json');  // ✅ 优惠券持久化文件

// ====== 工具：邮箱规范化（小写 + 去空格 + 尝试解码 %40） ======
function normalizeEmail(v) {
  if (!v) return '';
  let s = String(v).trim();
  try { s = decodeURIComponent(s); } catch {}
  return s.toLowerCase();
}
function isFixedAdmin(email) {
  return normalizeEmail(email) === normalizeEmail(ADMIN_FIXED.email) || 
         normalizeEmail(email) === normalizeEmail(FIXED_ADMIN.email);
}

// 检查是否为管理员（包括固定管理员和用户表中的管理员）
function isAdmin(email) {
  if (isFixedAdmin(email)) return true;
  
  const users = readUsers();
  const user = users.find(u => normalizeEmail(u.email) === normalizeEmail(email));
  return user && Boolean(user.isAdmin);
}

// 获取当前登录用户信息（支持管理员和普通用户）
function getCurrentUser(req) {
  // 优先检查普通用户cookie
  let email = normalizeEmail(req.cookies.email);
  let isAdminUser = false;
  
  if (!email) {
    // 如果没有普通用户cookie，再检查管理员cookie
    email = normalizeEmail(req.cookies.admin_email);
    if (email) {
      isAdminUser = true;
    }
  }
  
  return { email, isAdmin: isAdminUser };
}

// ====== CORS / 中间件 ======
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (FRONTEND_ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    if (req.headers.origin) res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.headers['access-control-request-headers']) {
      res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
    }
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态资源
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// 静态文件服务 - 提供public目录中的HTML文件
app.use(express.static(path.join(__dirname, 'public')));

// 默认路由 - 当访问根路径时返回主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main page.html'));
});

// ====== JSON “数据库”工具 ======
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
// ✅ 消息读写
function readMsgs() {
  try { return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeMsgs(arr) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(arr, null, 2));
}
// ✅ 评论读写
function readComments(){
  try { return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf8') || '[]'); }
  catch { return []; }
}
function writeComments(arr){
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(arr, null, 2));
}

// ====== 上传（头像/图片） ======
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename:   (_, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(16).slice(2) + ext);
  }
});
const upload = multer({ storage });

// 健康检查
app.get('/__ping', (req, res) => res.json({ ok: true, ts: Date.now() }));
// 轻量保活端点（纯文本，最小开销）
app.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('text/plain').send('ok');
});

// 自检：看当前 cookie 身份是否固定管理员
app.get('/__whoami', (req, res) => {
  const { email, isAdmin: isAdminUser } = getCurrentUser(req);
  res.json({ email, isAdmin: isAdminUser || isAdmin(email) });
});

// ====== 用户：注册/登录/退出/我的资料/按邮箱查/上传头像 ======
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
    password,         // 示例环境明文；生产请用哈希
    area,
    degree,
    avatarPath: '',
    isAdmin: Boolean(isAdmin)  // 添加管理员标识
  };
  users.push(user);
  writeUsers(users);
  res.json({ msg: '注册成功', user: { ...publicUser(user), isAdmin: user.isAdmin } });
});

// ✅ 登录：固定管理员优先匹配，其它用户为普通账号
app.post('/api/login', (req, res) => {

// Fixed admin short-circuit
try {
  const body = req.body || {};
  const emailIn = normalizeEmailSafe(body.email || body.username || body.userEmail);
  const passIn = (body.password || "").toString();
  // Fixed admin short-circuit
if (emailIn === normalizeEmailSafe(FIXED_ADMIN.email) && passIn === FIXED_ADMIN.password) {
  // 设置管理员cookie
  res.cookie('admin_email', FIXED_ADMIN.email, { httpOnly: false, sameSite: 'Lax' });
  const userPayload = { email: FIXED_ADMIN.email, role: 'admin', name: '海外留学' };
  ensureUser(FIXED_ADMIN.email);
  return res.json({ success: true, user: userPayload, role: 'admin' });
}

} catch (e) { /* swallow */ }

  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password || '';

  // 固定管理员：直接放行
  if (email === normalizeEmail(ADMIN_FIXED.email) && password === ADMIN_FIXED.password) {
    // 只设置管理员cookie，不清除普通用户cookie
    res.cookie('admin_email', ADMIN_FIXED.email, { httpOnly: false, sameSite: 'Lax' });
    return res.json({
      msg: '登录成功',
      user: {
        id: 1,
        nickname: '管理员',
        email: ADMIN_FIXED.email,
        area: '',
        degree: '',
        avatarPath: '',
        isAdmin: true
      }
    });
  }

  // 其它用户：按用户表校验
  const users = readUsers();
  const found = users.find(u => normalizeEmail(u.email) === email && u.password === password);
  if (!found) return res.status(401).json({ msg: '邮箱或密码错误' });

  res.cookie('email', found.email, { httpOnly: false, sameSite: 'Lax' });
  res.json({ msg: '登录成功', user: { ...publicUser(found), isAdmin: Boolean(found.isAdmin) } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('email', { sameSite: 'Lax' });
  res.clearCookie('admin_email', { sameSite: 'Lax' });
  res.json({ msg: '已退出登录' });
});

app.get('/api/users/me', (req, res) => {
  // 只检查普通用户cookie，不检查管理员cookie
  const email = normalizeEmail(req.cookies.email);
  
  if (!email) return res.status(401).json({ msg: '未登录' });

  // 检查是否是固定管理员
  if (isFixedAdmin(email)) {
    return res.json({
      id: 1,
      nickname: '管理员',
      email: email, // 使用实际的email
      area: '',
      degree: '',
      avatarPath: '',
      isAdmin: true
    });
  }

  // 普通用户：从用户表查找
  const users = readUsers();
  const found = users.find(u => normalizeEmail(u.email) === email);
  if (!found) return res.status(404).json({ msg: '用户不存在' });

  res.json({ ...publicUser(found), isAdmin: Boolean(found.isAdmin) });
});

// 新增：管理员专用的用户信息API
app.get('/api/admin/me', (req, res) => {
  // 只检查管理员cookie
  const email = normalizeEmail(req.cookies.admin_email);
  
  if (!email) return res.status(401).json({ msg: '管理员未登录' });

  // 管理员：直接返回
  return res.json({
    id: 1,
    nickname: '管理员',
    email: ADMIN_FIXED.email,
    area: '',
    degree: '',
    avatarPath: '',
    isAdmin: true
  });
});

// ⭐ 通过邮箱查任意用户（用于他人主页）
app.get('/api/users/by-email', (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) return res.status(400).json({ msg: '缺少 email 参数' });

  const users = readUsers();
  const found = users.find(u => normalizeEmail(u.email) === email);
  if (!found) return res.status(404).json({ msg: '用户不存在' });

  // 这里不返回 isAdmin（仅管理端口或 /me 才需要）
  res.json(publicUser(found));
});

// 当前用户上传头像
app.post('/api/users/me/avatar', upload.single('avatar'), (req, res) => {
  const { email, isAdmin } = getCurrentUser(req);
  if (!email) return res.status(401).json({ msg: '未登录' });
  if (!req.file) return res.status(400).json({ msg: '未选择文件' });

  const relPath = '/uploads/' + req.file.filename;
  
  // 如果是管理员，直接返回文件路径（不更新用户表）
  if (isAdmin || isFixedAdmin(email)) {
    return res.json({ msg: '头像已上传', avatarPath: relPath, url: relPath });
  }

  // 普通用户：更新用户表
  const users = readUsers();
  const idx = users.findIndex(u => normalizeEmail(u.email) === email);
  if (idx === -1) return res.status(404).json({ msg: '用户不存在' });

  users[idx].avatarPath = relPath;
  writeUsers(users);
  res.json({ msg: '头像已更新', avatarPath: relPath, url: relPath });
});

// 通用文件上传API
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { email } = getCurrentUser(req);
  if (!email) return res.status(401).json({ msg: '未登录' });
  if (!req.file) return res.status(400).json({ msg: '未选择文件' });

  const relPath = '/uploads/' + req.file.filename;
  res.json({ 
    msg: '文件上传成功', 
    url: relPath,
    path: relPath,
    file: relPath,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// 支持多个文件上传
app.post('/api/uploads', upload.array('files', 10), (req, res) => {
  const { email } = getCurrentUser(req);
  if (!email) return res.status(401).json({ msg: '未登录' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ msg: '未选择文件' });

  const files = req.files.map(f => ({
    url: '/uploads/' + f.filename,
    path: '/uploads/' + f.filename,
    file: '/uploads/' + f.filename,
    filename: f.filename,
    size: f.size,
    mimetype: f.mimetype
  }));

  res.json({ 
    msg: '文件上传成功', 
    files: files,
    count: files.length
  });
});

// ====== 帖子：列表 & 发布（方案A） ======

// ✅ 关键改动：读取帖子时始终以“用户表”为准覆盖作者资料
// GET /api/posts?category=life|study|enroll|share|fun
app.get('/api/posts', (req, res) => {
  const list = readPosts();
  const cat = (req.query.category || '').trim();

  const users = readUsers();
  const userMap = Object.fromEntries(users.map(u => [normalizeEmail(u.email), u]));

  const enriched = list.map(p => {
    const e = normalizeEmail(p.authorEmail);
    if (e && userMap[e]) {
      const u = userMap[e];
      return {
        ...p,
        authorName:   u.nickname || u.email,   // 始终覆盖为最新昵称
        authorAvatar: u.avatarPath || '',      // 始终覆盖为最新头像
      };
    }
    return p; // 没有 authorEmail 的老帖保持原样
  });

  const filtered = cat ? enriched.filter(p => (p.category || '') === cat) : enriched;
  res.json(filtered);
});
console.log('[WIRE] GET /api/posts wired');

// ✅ 单帖读取（同样覆盖作者资料）
app.get('/api/posts/:id', (req, res) => {
  const id = String(req.params.id || '');
  const list = readPosts();
  const post = list.find(p => String(p.id) === id);
  if (!post) return res.status(404).json({ msg: '帖子不存在' });

  const users = readUsers();
  const userMap = Object.fromEntries(users.map(u => [normalizeEmail(u.email), u]));
  const e = normalizeEmail(post.authorEmail);
  let out = { ...post };
  if (e && userMap[e]) {
    const u = userMap[e];
    out.authorName   = u.nickname || u.email;
    out.authorAvatar = u.avatarPath || '';
  }
  res.json(out);
});
console.log('[WIRE] GET /api/posts/:id wired');

app.post('/api/posts', upload.array('images', 9), (req, res) => {
  const title = (req.body?.title || '');
  const desc = (req.body?.desc || '');
  const category = (req.body?.category || 'life');
  const files = (req.files || []).map(f => '/uploads/' + path.basename(f.path));

  // 作者：以 cookie 登录用户为权威（管理员和普通用户都可发帖）
  const { email: authorEmail, isAdmin } = getCurrentUser(req);
  let authorName   = '';
  let authorAvatar = '';

  if (authorEmail) {
    if (isAdmin || isFixedAdmin(authorEmail)) {
      authorName = '管理员';
      authorAvatar = '';
    } else {
      const users = readUsers();
      const found = users.find(u => normalizeEmail(u.email) === authorEmail);
      if (found) {
        authorName   = found.nickname || found.email;
        authorAvatar = found.avatarPath || '';
      }
    }
  }

  // 兜底：未登录但前端传了字段（不推荐）
  if (!authorEmail && req.body.authorEmail)   authorEmail  = normalizeEmail(req.body.authorEmail);
  if (!authorName && req.body.authorName)     authorName   = String(req.body.authorName).trim();
  if (!authorAvatar && req.body.authorAvatar) authorAvatar = String(req.body.authorAvatar).trim();

  const post = {
    id: Date.now().toString(36),
    createdAt: new Date().toISOString(),
    title, desc, category,
    images: files,
    authorEmail, authorName, authorAvatar,
  };

  const list = readPosts();
  list.unshift(post); // 最新在前
  writePosts(list);
  res.json(post);
});
console.log('[WIRE] POST /api/posts wired');

// ====== ✅ 评论：列表 / 发布 / 删除 ======

// Utils: 便捷获取帖子与用户
function findPostById(id){
  const list = readPosts();
  return list.find(p => String(p.id) === String(id)) || null;
}
function findUserByEmail(email){
  const e = normalizeEmail(email);
  const users = readUsers();
  return users.find(u => normalizeEmail(u.email) === e) || null;
}

// GET /api/posts/:id/comments?offset=0&limit=10
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = String(req.params.id || '');
  const offset = parseInt(req.query.offset) || 0;
  const limit  = parseInt(req.query.limit)  || 10;

  const all = readComments().filter(c => String(c.postId) === postId);
  const total = all.length;

  const items = all
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)) // 新的在前
    .slice(offset, offset + limit)
    .map(c => {
      const u = findUserByEmail(c.userEmail) || {};
      return {
        ...c,
        user: {
          name:   u.nickname || u.username || u.email || c.userName || '用户',
          avatar: u.avatarPath || c.userAvatar || '',
          email:  u.email || c.userEmail || ''
        }
      };
    });

  res.json({ items, total });
});
console.log('[WIRE] GET /api/posts/:id/comments wired');

// POST /api/posts/:id/comments  body: { content }
app.post('/api/posts/:id/comments', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });

  const postId  = String(req.params.id || '');
  const post    = findPostById(postId);
  if (!post) return res.status(404).json({ msg: '帖子不存在' });

  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ msg: '内容不能为空' });

  const u = findUserByEmail(me) || {};
  const now = new Date().toISOString();
  const cmt = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    postId,
    userEmail: me, // 用邮箱标识评论作者
    content,
    createdAt: now
  };

  const all = readComments();
  all.unshift(cmt); // 新的在前
  writeComments(all);

  res.json({
    ...cmt,
    user: isFixedAdmin(me) ? {
      name: '管理员', avatar: '', email: ADMIN_FIXED.email
    } : {
      name:   u.nickname || u.username || u.email || '我',
      avatar: u.avatarPath || '',
      email:  u.email || me
    }
  });
});
console.log('[WIRE] POST /api/posts/:id/comments wired');

// DELETE /api/posts/:id/comments/:cid
// 允许：① 评论作者本人；② 帖子作者（post.authorEmail）
app.delete('/api/posts/:id/comments/:cid', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });

  const postId = String(req.params.id || '');
  const cid    = String(req.params.cid || '');
  const post   = findPostById(postId);
  if (!post) return res.status(404).json({ msg: '帖子不存在' });

  const all = readComments();
  const idx = all.findIndex(x => String(x.id) === cid && String(x.postId) === postId);
  if (idx === -1) return res.status(404).json({ msg: '评论不存在' });

  const c = all[idx];
  const isCommentOwner = normalizeEmail(c.userEmail) === me;
  const isPostAuthor   = normalizeEmail(post.authorEmail) === me;

  if (!isCommentOwner && !isPostAuthor) {
    return res.status(403).json({ msg: '无权删除' });
  }

  all.splice(idx, 1);
  writeComments(all);
  res.json({ msg: '已删除' });
});
console.log('[WIRE] DELETE /api/posts/:id/comments/:cid wired');

// ====== ✅ 帖子：置顶/取消置顶、删除 ======

// PATCH /api/posts/:id - 置顶/取消置顶帖子
app.patch('/api/posts/:id', (req, res) => {
  const { email: me, isAdmin: isAdminUser } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });
  
  // 只有管理员可以置顶帖子
  if (!isAdminUser && !isAdmin(me)) {
    return res.status(403).json({ msg: '只有管理员可以置顶帖子' });
  }

  const id = String(req.params.id || '');
  const { pinned, pinnedAt } = req.body || {};
  
  const list = readPosts();
  const idx = list.findIndex(p => String(p.id) === id);
  if (idx === -1) return res.status(404).json({ msg: '帖子不存在' });

  const post = list[idx];
  post.pinned = Boolean(pinned);
  if (pinned) {
    post.pinnedAt = pinnedAt || new Date().toISOString();
  } else {
    delete post.pinnedAt;
  }

  writePosts(list);
  res.json(post);
});
console.log('[WIRE] PATCH /api/posts/:id wired');

// PUT /api/posts/:id - 更新帖子（作者或管理员）
app.put('/api/posts/:id', (req, res) => {
  const { email: me, isAdmin: isAdminUser } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });

  const id = String(req.params.id || '');
  const list = readPosts();
  const idx = list.findIndex(p => String(p.id) === id);
  if (idx === -1) return res.status(404).json({ msg: '帖子不存在' });

  const post = list[idx];
  const isPostAuthor = normalizeEmail(post.authorEmail) === normalizeEmail(me);
  const isAdminUserFromDB = isAdmin(me);
  if (!isPostAuthor && !isAdminUser && !isAdminUserFromDB) {
    return res.status(403).json({ msg: '无权编辑此帖子' });
  }

  const { title, desc, content, category } = req.body || {};
  if (typeof title === 'string') post.title = title;
  if (typeof desc === 'string') post.desc = desc;
  if (typeof content === 'string') post.content = content; // 兼容字段
  if (typeof category === 'string') post.category = category;

  // 可选：记录更新时间
  post.updatedAt = new Date().toISOString();

  list[idx] = post;
  writePosts(list);
  res.json(post);
});
console.log('[WIRE] PUT /api/posts/:id wired');

// DELETE /api/posts/:id - 删除帖子
app.delete('/api/posts/:id', (req, res) => {
  const { email: me, isAdmin: isAdminUser } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });

  const id = String(req.params.id || '');
  const list = readPosts();
  const idx = list.findIndex(p => String(p.id) === id);
  if (idx === -1) return res.status(404).json({ msg: '帖子不存在' });

  const post = list[idx];
  
  // 只有帖子作者或管理员可以删除帖子
  const isPostAuthor = normalizeEmail(post.authorEmail) === me;
  const isAdminUserFromDB = isAdmin(me);
  
  if (!isPostAuthor && !isAdminUser && !isAdminUserFromDB) {
    return res.status(403).json({ msg: '无权删除此帖子' });
  }

  list.splice(idx, 1);
  writePosts(list);
  
  // 同时删除该帖子的所有评论
  const allComments = readComments();
  const filteredComments = allComments.filter(c => String(c.postId) !== id);
  writeComments(filteredComments);
  
  res.json({ msg: '已删除帖子' });
});
console.log('[WIRE] DELETE /api/posts/:id wired');

// ====== ✅ 优惠券：列表 / 创建 / 删除（管理员） ======
function readCoupons(){ try{ return JSON.parse(fs.readFileSync(COUPONS_FILE,'utf8')||'[]'); }catch{ return [] } }
function writeCoupons(list){ fs.writeFileSync(COUPONS_FILE, JSON.stringify(list, null, 2)); }

// ====== ✅ 消息：读写函数 ======
function readMessages(){ try{ return JSON.parse(fs.readFileSync(MESSAGES_FILE,'utf8')||'[]'); }catch{ return [] } }
function writeMessages(list){ fs.writeFileSync(MESSAGES_FILE, JSON.stringify(list, null, 2)); }

// GET /api/coupons - 列表
app.get('/api/coupons', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me || !isAdmin(me)) return res.status(401).json({ msg: '未登录或无权限' });
  return res.json(readCoupons());
});

// POST /api/coupons - 创建
app.post('/api/coupons', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me || !isAdmin(me)) return res.status(401).json({ msg: '未登录或无权限' });
  const { name = '', amount = 0, days = 30, email = '' } = req.body || {};
  if (!name || Number(amount) <= 0 || Number(days) <= 0) return res.status(400).json({ msg: '参数不完整' });
  const list = readCoupons();
  const now = Date.now();
  const item = { id: String(now), name: String(name), amount: Number(amount), email: String(email||''), createdAt: new Date(now).toISOString(), expiresAt: new Date(now + Number(days)*24*60*60*1000).toISOString() };
  list.unshift(item);
  writeCoupons(list);
  
  // 如果指定了目标用户邮箱，发送优惠券通知消息
  if (email && email.trim()) {
    try {
      console.log(`🔍 尝试发送优惠券通知给: ${email}`);
      const messages = readMessages();
      const message = {
        id: String(Date.now() + 1),
        from: 'hwlx@hwlx.com', // 管理员邮箱
        to: normalizeEmail(email),
        content: `🎫 您收到了一张新的优惠券！\n\n优惠券名称：${name}\n面额：${amount}元\n有效期至：${new Date(item.expiresAt).toLocaleDateString()}\n\n请及时使用，祝您使用愉快！`,
        images: [],
        time: new Date().toISOString(),
        isRead: false
      };
      messages.unshift(message);
      writeMessages(messages);
      console.log(`✅ 优惠券通知已发送给用户: ${email}`);
    } catch (error) {
      console.error('发送优惠券通知失败:', error);
      // 不影响优惠券创建，继续执行
    }
  } else {
    console.log(`⚠️ 没有指定目标用户邮箱，跳过通知发送`);
  }
  
  res.json(item);
});

// DELETE /api/coupons/:id - 删除
app.delete('/api/coupons/:id', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me || !isAdmin(me)) return res.status(401).json({ msg: '未登录或无权限' });
  const id = String(req.params.id||'');
  const list = readCoupons();
  const idx = list.findIndex(c => String(c.id) === id);
  if (idx === -1) return res.status(404).json({ msg: '不存在' });
  list.splice(idx,1);
  writeCoupons(list);
  res.json({ msg: '已删除' });
});
console.log('[WIRE] /api/coupons wired');

// ====== ✅ 评论：独立API ======

// GET /api/comments?postId=xxx - 获取评论列表
app.get('/api/comments', (req, res) => {
  const postId = String(req.query.postId || '');
  if (!postId) return res.status(400).json({ msg: '缺少postId参数' });

  const all = readComments().filter(c => String(c.postId) === postId);
  const enriched = all.map(c => {
    const u = findUserByEmail(c.userEmail) || {};
    return {
      ...c,
      authorName: u.nickname || u.username || u.email || c.userName || '用户',
      authorEmail: u.email || c.userEmail || '',
      text: c.content || c.text || '',
      createdAt: c.createdAt || c.time
    };
  });

  res.json(enriched);
});
console.log('[WIRE] GET /api/comments wired');

// DELETE /api/comments/:id - 删除评论
app.delete('/api/comments/:id', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me) return res.status(401).json({ msg: '未登录' });

  const cid = String(req.params.id || '');
  const all = readComments();
  const idx = all.findIndex(x => String(x.id) === cid);
  if (idx === -1) return res.status(404).json({ msg: '评论不存在' });

  const c = all[idx];
  const post = findPostById(c.postId);
  
  const isCommentOwner = normalizeEmail(c.userEmail) === me;
  const isPostAuthor = post && normalizeEmail(post.authorEmail) === me;
  const isAdminUser = isAdmin(me);

  if (!isCommentOwner && !isPostAuthor && !isAdminUser) {
    return res.status(403).json({ msg: '无权删除此评论' });
  }

  all.splice(idx, 1);
  writeComments(all);
  res.json({ msg: '已删除评论' });
});
console.log('[WIRE] DELETE /api/comments/:id wired');

// ====== ✅ 私信：会话、消息列表、发送 ======

// 拉取与某人的消息（按时间升序）
// GET /api/messages?peer=<email>
app.get('/api/messages', (req, res) => {
  const { email: me } = getCurrentUser(req);
  const peer = normalizeEmail(req.query.peer);
  if (!me)   return res.status(401).json({ error: 'NOT_LOGIN' });
  if (!peer) return res.status(400).json({ error: 'PEER_REQUIRED' });

  const list = readMsgs()
    .filter(m => (normalizeEmail(m.from) === me && normalizeEmail(m.to) === peer)
              || (normalizeEmail(m.from) === peer && normalizeEmail(m.to) === me))
    .sort((a,b)=> new Date(a.time) - new Date(b.time));

  res.json(list);
});
console.log('[WIRE] GET /api/messages wired');

// 发送一条消息（支持文字 + 多图）
app.post('/api/messages', upload.array('images', 9), (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me) return res.status(401).json({ error: 'NOT_LOGIN' });

  const toEmail = normalizeEmail(req.body?.toEmail);
  const textRaw = String(req.body?.text ?? '');
  const text    = textRaw.trim();
  const images  = (req.files || []).map(f => '/uploads/' + path.basename(f.path));

  console.log('[POST /api/messages] from=%s to=%s textLen=%d files=%d',
    me, toEmail, text.length, images.length);

  if (!toEmail || (!text && images.length === 0)) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      reason: !toEmail ? 'toEmail missing' : 'empty text & no images',
      got: { toEmail, textLen: text.length, images: images.length }
    });
  }

  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    from: me,
    to: toEmail,
    text,
    images,                      // 可能为空数组
    time: new Date().toISOString()
  };

  const all = readMsgs();
  all.push(msg);
  writeMsgs(all);

  res.json(msg);
});
console.log('[WIRE] POST /api/messages wired');

// 会话列表（每个对端一条，取最后一条，按时间倒序）
// GET /api/messages/threads  -> [{ peer, last, time }]
app.get('/api/messages/threads', (req, res) => {
  const { email: me } = getCurrentUser(req);
  if (!me) return res.status(401).json({ error: 'NOT_LOGIN' });

  const mine = readMsgs().filter(m => normalizeEmail(m.from) === me || normalizeEmail(m.to) === me);
  const map = new Map();

  for (const m of mine) {
    const peer = (normalizeEmail(m.from) === me) ? normalizeEmail(m.to) : normalizeEmail(m.from);
    const keep = map.get(peer);
    if (!keep || new Date(keep.time) < new Date(m.time)) {
      map.set(peer, { peer, last: m.text, time: m.time });
    }
  }
  const out = Array.from(map.values()).sort((a,b) => new Date(b.time) - new Date(a.time));
  res.json(out);
});
console.log('[WIRE] GET /api/messages/threads wired');

// 临时调试：列出所有已注册的路由
app.get('/__routes', (req, res) => {
  const out = [];
  // 简化版本，只返回已知的路由
  const knownRoutes = [
    'GET    /api/posts',
    'GET    /api/posts/:id', 
    'POST   /api/posts',
    'PATCH  /api/posts/:id',
    'DELETE /api/posts/:id',
    'GET    /api/posts/:id/comments',
    'POST   /api/posts/:id/comments',
    'DELETE /api/posts/:id/comments/:cid',
    'GET    /api/comments',
    'DELETE /api/comments/:id',
    'GET    /api/messages',
    'POST   /api/messages',
    'GET    /api/messages/threads',
    'POST   /api/users/me/avatar',
    'POST   /api/upload',
    'POST   /api/uploads',
    'PATCH  /api/users/me',
    'PUT    /api/users/me',
    'POST   /api/users/me'
  ];
  res.type('text/plain').send(knownRoutes.join('\n'));
});

// ====== 启动 ======

// === Shared handler: update current admin profile ===
function __updateMeHandler(req, res) {
  try {
    const { name, nickname, username, avatar, avatarUrl } = req.body || {};
    
    // 检查是否是管理员请求
    const adminEmail = normalizeEmail(req.cookies.admin_email);
    if (!adminEmail) {
      return res.status(401).json({ error: '只有管理员可以更新信息' });
    }
    
    const users = readUsers();
    const i = users.findIndex(u => String(u.email||'').toLowerCase() === String(FIXED_ADMIN.email).toLowerCase());
    if (i < 0) return res.status(404).json({ error: '未找到管理员' });
    const u = users[i];
    const newName = name || nickname || username;
    if (newName) u.nickname = newName;
    const av = avatarUrl || avatar;
    if (av) { 
      u.avatar = av; 
      u.avatarUrl = av; 
      u.avatarPath = av; // 添加 avatarPath 字段以保持一致性
    }
    writeUsers(users);
    res.json({ success: true, user: u });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}

app.listen(PORT, () => {
  console.log(`✅ API running at:`);
  console.log(` - http://127.0.0.1:${PORT}`);
  console.log(` - http://localhost:${PORT}`);
  console.log(`CORS allowed origins:\n - ${FRONTEND_ALLOWED.join('\n - ')}`);
});
// (Re)register profile update routes with a single safe handler
app.patch('/api/users/me', express.json(), __updateMeHandler);
app.put('/api/users/me', express.json(), __updateMeHandler);
app.post('/api/users/me', express.json(), __updateMeHandler);
