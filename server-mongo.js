// server-mongo.js — MongoDB版本
// 依赖：npm i express cors multer cookie-parser mongoose
// 启动：node server-mongo.js  （默认端口 3001）

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// 导入数据库配置和模型
const { connectDB } = require('./config/database');
const User = require('./models/User');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Comment = require('./models/Comment');

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
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// ====== 中间件 ======
app.use(cors({
  origin: FRONTEND_ALLOWED,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// 默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main page.html'));
});

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
  return false; // 其他管理员通过数据库字段判断
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
app.post('/api/register', async (req, res) => {
  try {
    let { nickname, email, password, area = '', degree = '', isAdmin = false } = req.body || {};
    email = normalizeEmail(email);
    
    if (!email || !password) {
      return res.status(400).json({ msg: '邮箱与密码必填' });
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: '该邮箱已注册' });
    }

    // 创建新用户
    const user = new User({
      nickname: nickname || email.split('@')[0],
      email,
      password,
      area,
      degree,
      avatarPath: '',
      isAdmin: Boolean(isAdmin)
    });

    await user.save();
    
    // 返回用户信息（不包含密码）
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ msg: '注册成功', user: userResponse });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ msg: '注册失败' });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
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
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ msg: '邮箱或密码错误' });
    }

    res.cookie('email', user.email, { httpOnly: false, sameSite: 'Lax' });
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ msg: '登录成功', user: userResponse });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ msg: '登录失败' });
  }
});

// 退出登录
app.post('/api/logout', (req, res) => {
  res.clearCookie('email', { sameSite: 'Lax' });
  res.clearCookie('admin_email', { sameSite: 'Lax' });
  res.json({ msg: '已退出登录' });
});

// 获取当前用户信息
app.get('/api/users/me', async (req, res) => {
  try {
    const { email, isAdmin } = getCurrentUser(req);
    
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    // 管理员
    if (isAdmin) {
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ msg: '获取用户信息失败' });
  }
});

// 根据邮箱获取用户信息
app.get('/api/users/by-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    
    if (!email) {
      return res.status(400).json({ msg: '邮箱参数必填' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('根据邮箱获取用户失败:', error);
    res.status(500).json({ msg: '获取用户信息失败' });
  }
});

// 管理员专用API
app.get('/api/admin/me', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.admin_email);
    
    if (!email) {
      return res.status(401).json({ msg: '管理员未登录' });
    }

    return res.json({
      id: 1,
      nickname: '海外留学',
      email: email,
      area: '',
      degree: '',
      avatarPath: '',
      isAdmin: true
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ msg: '获取管理员信息失败' });
  }
});

// 上传头像
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    if (!req.file) {
      return res.status(400).json({ msg: '请选择文件' });
    }

    const avatarPath = '/uploads/' + req.file.filename;
    
    // 检查文件是否成功保存
    const fs = require('fs');
    const filePath = path.join(UPLOADS_DIR, req.file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ msg: '文件保存失败，请重试' });
    }
    
    // 更新用户头像
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { avatarPath },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    res.json({ 
      msg: '头像上传成功', 
      avatarPath,
      filename: req.file.filename,
      fileExists: fs.existsSync(filePath)
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    res.status(500).json({ msg: '头像上传失败' });
  }
});

// 获取帖子列表
app.get('/api/posts', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    const posts = await Post.find(query)
      .populate('author', 'nickname email avatarPath')
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    console.error('获取帖子失败:', error);
    res.status(500).json({ msg: '获取帖子失败' });
  }
});

// 发布帖子
app.post('/api/posts', upload.array('images', 5), async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ msg: '标题、内容和分类必填' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const images = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];

    const post = new Post({
      title,
      content,
      category,
      author: user._id,
      authorName: user.nickname,
      authorEmail: user.email,
      authorAvatar: user.avatarPath,
      images
    });

    await post.save();
    res.json({ msg: '发布成功', post });
  } catch (error) {
    console.error('发布帖子失败:', error);
    res.status(500).json({ msg: '发布帖子失败' });
  }
});

// 获取消息列表
app.get('/api/messages', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const messages = await Message.find({
      $or: [{ from: user._id }, { to: user._id }]
    })
    .populate('from', 'nickname email avatarPath')
    .populate('to', 'nickname email avatarPath')
    .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ msg: '获取消息失败' });
  }
});

// 发送消息
app.post('/api/messages', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { toEmail, content } = req.body;
    if (!toEmail || !content) {
      return res.status(400).json({ msg: '收件人和内容必填' });
    }

    const fromUser = await User.findOne({ email });
    const toUser = await User.findOne({ email: normalizeEmail(toEmail) });

    if (!fromUser || !toUser) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const message = new Message({
      from: fromUser._id,
      to: toUser._id,
      content
    });

    await message.save();
    res.json({ msg: '发送成功', message });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ msg: '发送消息失败' });
  }
});

// 获取消息线程列表
app.get('/api/messages/threads', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    // 获取用户参与的所有消息线程
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [{ from: user._id }, { to: user._id }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$from', user._id] },
              '$to',
              '$from'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $project: {
          _id: 0,
          userId: '$otherUser._id',
          nickname: '$otherUser.nickname',
          email: '$otherUser.email',
          avatarPath: '$otherUser.avatarPath',
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            fromMe: { $eq: ['$lastMessage.from', user._id] }
          },
          messageCount: 1
        }
      }
    ]);

    res.json(threads);
  } catch (error) {
    console.error('获取消息线程失败:', error);
    res.status(500).json({ msg: '获取消息线程失败' });
  }
});

// 获取评论列表
app.get('/api/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const comments = await Comment.find({ post: postId })
      .populate('author', 'nickname email avatarPath')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ msg: '获取评论失败' });
  }
});

// 发表评论
app.post('/api/comments', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { postId, content } = req.body;
    if (!postId || !content) {
      return res.status(400).json({ msg: '帖子ID和内容必填' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const comment = new Comment({
      post: postId,
      author: user._id,
      content,
      authorName: user.nickname,
      authorEmail: user.email,
      authorAvatar: user.avatarPath
    });

    await comment.save();
    res.json({ msg: '评论成功', comment });
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json({ msg: '发表评论失败' });
  }
});

// 健康检查
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: '服务器运行正常',
    mode: 'production'
  });
});

// 文件上传测试
app.get('/api/test-upload', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'uploads');
  
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      uploadsDir: uploadsPath,
      fileCount: files.length,
      files: files.slice(0, 5), // 只显示前5个文件
      exists: fs.existsSync(uploadsPath)
    });
  } catch (error) {
    res.json({
      error: error.message,
      uploadsDir: uploadsPath,
      exists: fs.existsSync(uploadsPath)
    });
  }
});

// 测试当前用户头像路径
app.get('/api/test-avatar', async (req, res) => {
  try {
    const { email, isAdmin } = getCurrentUser(req);
    
    if (!email) {
      return res.json({ error: '未登录' });
    }
    
    if (isAdmin) {
      return res.json({
        user: 'admin',
        email,
        avatarPath: '/uploads/default-admin.jpg',
        isAdmin: true
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ error: '用户不存在' });
    }
    
    res.json({
      user: 'normal',
      email,
      avatarPath: user.avatarPath,
      nickname: user.nickname,
      isAdmin: false
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 测试设置用户头像
app.get('/api/test-set-avatar/:filename', async (req, res) => {
  try {
    const { email, isAdmin } = getCurrentUser(req);
    
    if (!email) {
      return res.json({ error: '未登录' });
    }
    
    if (isAdmin) {
      return res.json({ error: '管理员不支持此操作' });
    }
    
    const filename = req.params.filename;
    const avatarPath = '/uploads/' + filename;
    
    // 检查文件是否存在
    const fs = require('fs');
    const filePath = path.join(UPLOADS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.json({ error: '文件不存在', filePath });
    }
    
    // 更新用户头像
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { avatarPath },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.json({ error: '用户不存在' });
    }
    
    res.json({
      success: true,
      message: '头像设置成功',
      avatarPath: updatedUser.avatarPath,
      nickname: updatedUser.nickname
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 前端诊断工具
app.get('/api/debug-frontend', async (req, res) => {
  try {
    const { email, isAdmin } = getCurrentUser(req);
    
    // 获取所有用户信息
    const users = await User.find({}, 'email nickname avatarPath');
    
    // 检查uploads目录
    const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsPath);
    
    res.json({
      currentUser: {
        email,
        isAdmin,
        loggedIn: !!email
      },
      users: users.map(u => ({
        email: u.email,
        nickname: u.nickname,
        avatarPath: u.avatarPath,
        hasAvatar: !!u.avatarPath
      })),
      uploads: {
        path: uploadsPath,
        fileCount: files.length,
        sampleFiles: files.slice(0, 10)
      },
      staticRoutes: {
        uploads: '/uploads',
        public: '/public'
      }
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 检查文件是否存在
app.get('/api/check-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const fs = require('fs');
    const filePath = path.join(UPLOADS_DIR, filename);
    
    const exists = fs.existsSync(filePath);
    const stats = exists ? fs.statSync(filePath) : null;
    
    res.json({
      filename,
      exists,
      filePath,
      size: exists ? stats.size : null,
      modified: exists ? stats.mtime : null
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 获取可用头像文件列表
app.get('/api/available-avatars', (req, res) => {
  try {
    const fs = require('fs');
    const uploadsPath = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsPath);
    
    // 过滤图片文件
    const imageFiles = files.filter(file => {
      const ext = file.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });
    
    res.json({
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      availableAvatars: imageFiles.slice(0, 20) // 返回前20个
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDB();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在端口 ${PORT}`);
      console.log(`📱 本地访问: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
