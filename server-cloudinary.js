require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// 导入数据库配置
const { connectDB } = require('./config/database');

// 导入Cloudinary配置
const { upload, deleteFile, getFileUrl } = require('./config/cloudinary');

// 导入模型
const User = require('./models/User');
const Post = require('./models/Post');
const Message = require('./models/Message');
const Comment = require('./models/Comment');

const app = express();
const PORT = process.env.PORT || 10000;

// ====== 前端允许的域名 ======
const FRONTEND_ALLOWED = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://hai-wai-liu-xue.onrender.com',
];

// ====== 中间件 ======
app.use(cors({
  origin: FRONTEND_ALLOWED,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

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

// ====== API路由 ======

// 健康检查
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: 'Cloudinary服务器运行正常',
    mode: 'cloudinary',
    env: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '已设置' : '未设置',
      apiKey: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
    }
  });
});

// Cloudinary连接测试
app.get('/api/test-cloudinary', async (req, res) => {
  try {
    console.log('开始Cloudinary连接测试...');
    console.log('环境变量检查:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
    });
    
    const { cloudinary } = require('./config/cloudinary');
    
    // 测试Cloudinary连接
    console.log('尝试ping Cloudinary...');
    const result = await cloudinary.api.ping();
    console.log('Cloudinary ping结果:', result);
    
    res.json({
      success: true,
      message: 'Cloudinary连接正常',
      result: result,
      env: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeySet: !!process.env.CLOUDINARY_API_KEY,
        apiSecretSet: !!process.env.CLOUDINARY_API_SECRET
      }
    });
  } catch (error) {
    console.error('Cloudinary连接测试失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      statusCode: error.http_code,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Cloudinary连接失败',
      error: error.message,
      code: error.code,
      statusCode: error.http_code,
      env: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKeySet: !!process.env.CLOUDINARY_API_KEY,
        apiSecretSet: !!process.env.CLOUDINARY_API_SECRET
      }
    });
  }
});

// 注册
app.post('/api/register', async (req, res) => {
  try {
    let { nickname, email, password, area = '', degree = '', isAdmin = false } = req.body || {};
    email = normalizeEmail(email);
    
    if (!email || !password) {
      return res.status(400).json({ msg: '邮箱与密码必填' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ msg: '该邮箱已注册' });
    }

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

    if (!email || !password) {
      return res.status(400).json({ msg: '邮箱与密码必填' });
    }

    // 管理员登录
    if (isFixedAdmin(email)) {
      if (password === 'admin123') {
        res.cookie('admin_email', email, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000 
        });
        return res.json({ msg: '管理员登录成功' });
      }
      return res.status(401).json({ msg: '管理员密码错误' });
    }

    // 普通用户登录
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ msg: '邮箱或密码错误' });
    }

    res.cookie('email', email, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ msg: '登录成功', user: userResponse });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ msg: '登录失败' });
  }
});

// 登出
app.post('/api/logout', (req, res) => {
  res.clearCookie('email');
  res.clearCookie('admin_email');
  res.json({ msg: '登出成功' });
});

// 获取当前用户信息
app.get('/api/users/me', async (req, res) => {
  try {
    const { email, isAdmin } = getCurrentUser(req);
    
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

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

// 上传头像（使用Cloudinary）
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  try {
    console.log('开始头像上传处理...');
    console.log('环境变量检查:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '已设置' : '未设置',
      apiKey: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
    });
    
    const email = normalizeEmail(req.cookies.email);
    console.log('用户邮箱:', email);
    
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    if (!req.file) {
      console.log('没有接收到文件');
      return res.status(400).json({ msg: '请选择文件' });
    }

    console.log('文件信息:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // 获取Cloudinary URL
    const avatarUrl = req.file.path;
    
    // 更新用户头像
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { avatarPath: avatarUrl },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    console.log('头像上传成功:', avatarUrl);
    res.json({ 
      msg: '头像上传成功', 
      avatarPath: avatarUrl,
      cloudinaryUrl: avatarUrl
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      msg: '头像上传失败',
      error: error.message,
      stack: error.stack
    });
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

    const { title, content, desc, category } = req.body;
    const postContent = content || desc;
    if (!title || !postContent || !category) {
      return res.status(400).json({ msg: '标题、内容和分类必填' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const images = req.files ? req.files.map(file => file.path) : [];

    const post = new Post({
      title,
      content: postContent,
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

// 删除帖子
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ msg: '帖子ID必填' });
    }

    // 查找帖子
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: '帖子不存在' });
    }

    // 检查权限：只有作者可以删除自己的帖子
    if (post.authorEmail !== email) {
      return res.status(403).json({ msg: '只有作者可以删除自己的帖子' });
    }

    // 删除帖子中的图片（如果有的话）
    if (post.images && post.images.length > 0) {
      try {
        for (const imageUrl of post.images) {
          // 从Cloudinary删除图片
          if (imageUrl && imageUrl.includes('cloudinary')) {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (imageError) {
        console.warn('删除图片失败:', imageError);
        // 继续删除帖子，即使图片删除失败
      }
    }

    // 删除帖子
    await Post.findByIdAndDelete(id);
    
    res.json({ msg: '帖子删除成功' });
  } catch (error) {
    console.error('删除帖子失败:', error);
    res.status(500).json({ msg: '删除帖子失败' });
  }
});

// 获取消息列表
app.get('/api/messages', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const messages = await Message.find({
      $or: [
        { from: email },
        { to: email }
      ]
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ msg: '获取消息失败' });
  }
});

// 发送消息
app.post('/api/messages', upload.array('images', 9), async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { toEmail, content } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];
    
    if (!toEmail) {
      return res.status(400).json({ msg: '收件人必填' });
    }
    
    if (!content && images.length === 0) {
      return res.status(400).json({ msg: '请至少输入内容或选择图片' });
    }

    const fromUser = await User.findOne({ email });
    const toUser = await User.findOne({ email: normalizeEmail(toEmail) });

    if (!fromUser || !toUser) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const message = new Message({
      from: fromUser.email,
      to: toUser.email,
      content,
      images,
      isRead: false
    });

    await message.save();
    res.json({ msg: '发送成功', message });
  } catch (error) {
    console.error('发送消息失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files ? req.files.length : 0
    });
    res.status(500).json({ 
      msg: '发送消息失败',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 获取消息线程列表
app.get('/api/messages/threads', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    // 获取所有与当前用户相关的消息
    const messages = await Message.find({
      $or: [
        { from: email },
        { to: email }
      ]
    }).sort({ createdAt: -1 });

    // 按对话对方分组，获取最新的消息
    const threads = new Map();
    
    messages.forEach(message => {
      const peer = message.from === email ? message.to : message.from;
      
      if (!threads.has(peer) || threads.get(peer).createdAt < message.createdAt) {
        threads.set(peer, {
          peer,
          lastMessage: message.content,
          lastTime: message.createdAt,
          unreadCount: 0
        });
      }
    });

    // 计算未读消息数
    for (const [peer, thread] of threads) {
      const unreadMessages = await Message.countDocuments({
        from: peer,
        to: email,
        isRead: false
      });
      thread.unreadCount = unreadMessages;
    }

    res.json(Array.from(threads.values()));
  } catch (error) {
    console.error('获取消息线程失败:', error);
    res.status(500).json({ msg: '获取消息线程失败' });
  }
});

// 测试消息API
app.get('/api/test-messages', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.json({ 
        success: false, 
        message: '未登录',
        email: null,
        userExists: false
      });
    }

    const user = await User.findOne({ email });
    const userExists = !!user;
    
    res.json({ 
      success: true, 
      message: '消息API测试',
      email: email,
      userExists: userExists,
      messageCount: userExists ? await Message.countDocuments() : 0
    });
  } catch (error) {
    console.error('消息API测试失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '消息API测试失败',
      error: error.message 
    });
  }
});

// 测试简单消息发送（不涉及文件上传）
app.post('/api/test-send-message', async (req, res) => {
  try {
    const email = normalizeEmail(req.cookies.email);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { toEmail, content } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ msg: '收件人必填' });
    }
    
    if (!content) {
      return res.status(400).json({ msg: '内容必填' });
    }

    const fromUser = await User.findOne({ email });
    const toUser = await User.findOne({ email: normalizeEmail(toEmail) });

    if (!fromUser || !toUser) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const message = new Message({
      from: fromUser.email,
      to: toUser.email,
      content: content || '测试消息',
      images: [],
      isRead: false
    });

    await message.save();
    res.json({ msg: '测试发送成功', message });
  } catch (error) {
    console.error('测试发送消息失败:', error);
    res.status(500).json({ 
      msg: '测试发送消息失败',
      error: error.message
    });
  }
});

// 启动服务器
  try {
    await connectDB();
    console.log('✅ MongoDB连接成功');
    
    app.listen(PORT, () => {
      console.log(`🚀 Cloudinary服务器运行在端口 ${PORT}`);
      console.log(`📱 本地访问: http://localhost:${PORT}`);
      console.log(`☁️ 使用Cloudinary存储文件`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
