require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// 导入数据库配置
const { connectDB } = require('./config/database');

// 导入Cloudinary配置
const { upload, uploadAvatar, uploadPostImages, uploadMessageImages, deleteFile, getFileUrl } = require('./config/cloudinary');

// 导入mongoose
const mongoose = require('mongoose');

// 导入模型
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

// 清除Message模型缓存并重新导入
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}
const Message = require('./models/Message');

// 调试：检查Message模型的schema定义
console.log('Message模型content字段定义:', Message.schema.paths.content);

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

// ====== 数据统计相关变量和持久化 ======
const STATS_FILE = path.join(__dirname, 'analytics.json');

// 读取统计数据
function readVisitStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('读取统计数据失败:', error);
  }
  return {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  };
}

// 保存统计数据
function saveVisitStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.warn('保存统计数据失败:', error);
  }
}

let visitStats = readVisitStats();

// 访问量统计中间件
app.use((req, res, next) => {
  // 跳过静态文件和API请求的统计
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  
  // 统计页面访问
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const weekKey = weekStart.toISOString().split('T')[0];
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearKey = now.getFullYear().toString();
  
  // 更新总访问量
  visitStats.total++;
  
  // 更新日访问量
  if (!visitStats.daily[today]) visitStats.daily[today] = 0;
  visitStats.daily[today]++;
  
  // 更新周访问量
  if (!visitStats.weekly[weekKey]) visitStats.weekly[weekKey] = 0;
  visitStats.weekly[weekKey]++;
  
  // 更新月访问量
  if (!visitStats.monthly[monthKey]) visitStats.monthly[monthKey] = 0;
  visitStats.monthly[monthKey]++;
  
  // 更新年访问量
  if (!visitStats.yearly[yearKey]) visitStats.yearly[yearKey] = 0;
  visitStats.yearly[yearKey]++;
  
  // 保存统计数据到文件
  saveVisitStats(visitStats);
  
  next();
});

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
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail === 'hwlx@hwlx.com' || normalizedEmail === '1753429393@qq.com';
}

function isAdmin(email) {
  if (isFixedAdmin(email)) return true;
  return false;
}

async function getCurrentUser(req) {
  console.log('getCurrentUser调试:', { cookies: req.cookies });
  
  let email = normalizeEmail(req.cookies.email);
  let isAdminUser = false;
  
  // 优先检查管理员cookie
  const adminEmail = normalizeEmail(req.cookies.admin_email);
  console.log('getCurrentUser检查cookie:', { email, adminEmail });
  
  if (adminEmail) {
    email = adminEmail;
    isAdminUser = true;
    console.log('getCurrentUser使用管理员cookie:', { email, isAdminUser });
  }
  
  // 检查数据库中的用户是否为管理员
  if (email && !isAdminUser) {
    try {
      const user = await User.findOne({ email });
      if (user && user.isAdmin) {
        isAdminUser = true;
        console.log('getCurrentUser数据库检查管理员:', { email, isAdminUser });
      }
    } catch (error) {
      console.warn('检查用户管理员权限失败:', error);
    }
  }
  
  console.log('getCurrentUser返回:', { email, isAdmin: isAdminUser });
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
    let { nickname, email, verificationCode, password, area = '', degree = '', isAdmin = false } = req.body || {};
    email = normalizeEmail(email);
    
    if (!email || !password || !verificationCode) {
      return res.status(400).json({ msg: '邮箱、密码和验证码必填' });
    }

    // 验证验证码
    const codeRecord = await VerificationCode.findValidCode(email, 'register');
    if (!codeRecord) {
      return res.status(400).json({ msg: '验证码不存在或已过期，请重新发送' });
    }
    
    const codeResult = codeRecord.verify(verificationCode);
    if (!codeResult.valid) {
      return res.status(400).json({ msg: codeResult.reason });
    }
    
    // 保存验证码使用状态
    await codeRecord.save();

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
          httpOnly: false, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'Lax'
        });
        return res.json({ 
          msg: '管理员登录成功',
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
      return res.status(401).json({ msg: '管理员密码错误' });
    }

    // 普通用户登录
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ msg: '邮箱或密码错误' });
    }

    res.cookie('email', email, { 
      httpOnly: false, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'Lax'
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
  res.clearCookie('email', { sameSite: 'Lax' });
  res.clearCookie('admin_email', { sameSite: 'Lax' });
  res.json({ msg: '登出成功' });
});

// 获取当前用户信息
app.get('/api/users/me', async (req, res) => {
  try {
    const { email, isAdmin } = await getCurrentUser(req);
    
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
app.post('/api/upload/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    console.log('开始头像上传处理...');
    console.log('环境变量检查:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '已设置' : '未设置',
      apiKey: process.env.CLOUDINARY_API_KEY ? '已设置' : '未设置',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '已设置' : '未设置'
    });
    
    // 支持普通用户和管理员
    let email = normalizeEmail(req.cookies.email);
    const adminEmail = normalizeEmail(req.cookies.admin_email);
    
    // 如果是管理员，使用管理员邮箱
    if (adminEmail) {
      email = adminEmail;
      console.log('管理员头像上传:', email);
    } else if (email) {
      console.log('普通用户头像上传:', email);
    } else {
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
app.post('/api/posts', uploadPostImages.array('images', 5), async (req, res) => {
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
    console.log('=== 删除帖子请求开始 ===');
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    console.log('请求参数:', req.params);
    
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    console.log('删除帖子权限检查:', { me, isAdminUser, cookies: req.cookies });
    
    if (!me) {
      console.log('❌ 未登录');
      return res.status(401).json({ msg: '请先登录' });
    }

    const { id } = req.params;
    let reason = '';
    
    // 处理JSON body
    if (req.body && typeof req.body === 'object') {
      reason = req.body.reason || '';
    } else if (req.body && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        reason = parsed.reason || '';
      } catch (e) {
        reason = req.body;
      }
    }
    
    if (!id) {
      return res.status(400).json({ msg: '帖子ID必填' });
    }

    // 查找帖子
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: '帖子不存在' });
    }

    // 检查权限：作者可以删除自己的帖子，管理员可以删除任何帖子
    const isAuthor = post.authorEmail === me;
    const isAdmin = isAdminUser || isFixedAdmin(me);
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ msg: '只有作者或管理员可以删除帖子' });
    }

    // 如果是管理员删除帖子，发送消息给作者
    if (isAdmin && !isAuthor && post.authorEmail && reason) {
      try {
        const message = new Message({
          from: 'hwlx@hwlx.com', // 管理员邮箱
          to: post.authorEmail,
          content: `您的帖子"${post.title}"已被删除。原因：${reason}`,
          images: [],
          isRead: false
        });
        await message.save();
        console.log('已发送删除通知给作者:', post.authorEmail);
      } catch (messageError) {
        console.warn('发送删除通知失败:', messageError);
        // 继续删除帖子，即使消息发送失败
      }
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

// 置顶/取消置顶帖子
app.patch('/api/posts/:id', async (req, res) => {
  try {
    console.log('=== 置顶请求开始 ===');
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    console.log('请求参数:', req.params);
    
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    console.log('置顶帖子权限检查:', { me, isAdminUser, cookies: req.cookies });
    
    if (!me) {
      console.log('❌ 未登录');
      return res.status(401).json({ msg: '未登录' });
    }
    
    // 只有管理员可以置顶帖子
    if (!isAdminUser && !isFixedAdmin(me)) {
      console.log('❌ 权限不足:', { me, isAdminUser, isFixedAdmin: isFixedAdmin(me) });
      return res.status(403).json({ msg: '只有管理员可以置顶帖子' });
    }
    
    console.log('✅ 权限检查通过');

    const { id } = req.params;
    let pinned, pinnedAt;
    
    // 处理JSON body
    if (req.body && typeof req.body === 'object') {
      pinned = req.body.pinned;
      pinnedAt = req.body.pinnedAt;
    } else if (req.body && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        pinned = parsed.pinned;
        pinnedAt = parsed.pinnedAt;
      } catch (e) {
        console.warn('解析置顶请求body失败:', e);
      }
    }
    
    console.log('置顶操作:', { id, pinned, pinnedAt, body: req.body });
    
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ msg: '帖子不存在' });
    }

    post.pinned = Boolean(pinned);
    if (pinned) {
      post.pinnedAt = pinnedAt || new Date().toISOString();
    } else {
      post.pinnedAt = null;
    }

    await post.save();
    console.log('置顶成功:', { postId: post._id, pinned: post.pinned });
    res.json(post);
  } catch (error) {
    console.error('置顶帖子失败:', error);
    res.status(500).json({ msg: '置顶帖子失败' });
  }
});

// 获取未读消息数量
app.get('/api/messages/unread-count', async (req, res) => {
  try {
    const { email } = await getCurrentUser(req);
    if (!email) {
      return res.json({ unreadCount: 0 });
    }

    // 简单计算：发给当前用户且未读的消息数量
    const unreadCount = await Message.countDocuments({
      to: email,
      isRead: { $ne: true }
    });

    console.log(`📧 用户 ${email} 的未读消息数量: ${unreadCount}`);
    res.json({ unreadCount });
  } catch (error) {
    console.error('获取未读消息数量失败:', error);
    res.json({ unreadCount: 0 });
  }
});

// 获取消息列表
app.get('/api/messages', async (req, res) => {
  try {
    const { email, isAdmin } = await getCurrentUser(req);
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    const { peer } = req.query;
    
    if (peer) {
      // 获取与特定用户的对话
      const query = {
        $or: [
          { from: email, to: peer },
          { from: peer, to: email }
        ]
      };
      
      console.log('获取对话消息查询条件:', { email, peer, query });
      
      const messages = await Message.find(query).sort({ createdAt: 1 }); // 按时间正序排列
      
      console.log('查询结果数量:', messages.length);
      console.log('查询结果示例:', messages.slice(0, 3).map(m => ({ from: m.from, to: m.to, content: m.content })));

      // 标记消息为已读
      await Message.updateMany(
        { from: peer, to: email, isRead: false },
        { isRead: true }
      );

            res.json(messages);
    } else {
      console.log('没有peer参数，获取所有消息');
      // 获取所有消息（兼容旧API）
      const messages = await Message.find({
        $or: [
          { from: email },
          { to: email }
        ]
      }).sort({ createdAt: -1 });

      res.json(messages);
    }
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ msg: '获取消息失败' });
  }
});

// 发送消息
app.post('/api/messages', uploadMessageImages.array('images', 9), async (req, res) => {
  try {
    console.log('=== 发送消息请求开始 ===');
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    console.log('请求文件:', req.files);
    
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    console.log('发送消息权限检查:', { me, isAdminUser, cookies: req.cookies });
    
    if (!me) {
      console.log('❌ 未登录');
      return res.status(401).json({ msg: '请先登录' });
    }

    const { toEmail, content } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];
    
    console.log('消息参数:', { toEmail, content, images });
    
    if (!toEmail) {
      console.log('❌ 收件人必填');
      return res.status(400).json({ msg: '收件人必填' });
    }
    
    if (!content && images.length === 0) {
      console.log('❌ 请至少输入内容或选择图片');
      return res.status(400).json({ msg: '请至少输入内容或选择图片' });
    }

    // 如果是管理员发送消息，使用管理员邮箱
    const fromEmail = isAdminUser ? 'hwlx@hwlx.com' : me;
    const fromUser = await User.findOne({ email: fromEmail });
    const toUser = await User.findOne({ email: normalizeEmail(toEmail) });

    if (!toUser) {
      return res.status(404).json({ msg: '收件人不存在' });
    }

    const message = new Message({
      from: fromEmail,
      to: toUser.email,
      content: content || '',
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
    const { email, isAdmin } = await getCurrentUser(req);
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

// 管理员专用消息发送API（简化版）
app.post('/api/admin-message', async (req, res) => {
  try {
    console.log('=== 管理员消息发送请求 ===');
    console.log('请求体:', req.body);
    console.log('Cookie:', req.cookies);
    
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    console.log('管理员权限检查:', { me, isAdminUser });
    
    if (!me || (!isAdminUser && !isFixedAdmin(me))) {
      console.log('❌ 权限不足');
      return res.status(403).json({ msg: '只有管理员可以发送消息' });
    }

    const { toEmail, content } = req.body;
    
    if (!toEmail) {
      console.log('❌ 收件人必填');
      return res.status(400).json({ msg: '收件人必填' });
    }
    
    if (!content) {
      console.log('❌ 内容必填');
      return res.status(400).json({ msg: '内容必填' });
    }

    // 检查收件人是否存在
    const toUser = await User.findOne({ email: normalizeEmail(toEmail) });
    if (!toUser) {
      console.log('❌ 收件人不存在:', toEmail);
      return res.status(404).json({ msg: '收件人不存在' });
    }

    // 创建消息
    const message = new Message({
      from: 'hwlx@hwlx.com', // 管理员邮箱
      to: toUser.email,
      content,
      images: [],
      isRead: false
    });

    await message.save();
    console.log('✅ 消息发送成功');
    res.json({ msg: '消息发送成功' });
  } catch (error) {
    console.error('管理员消息发送失败:', error);
    res.status(500).json({ msg: '发送消息失败: ' + error.message });
  }
});

// 调试：检查当前用户状态
app.get('/api/debug-user-status', async (req, res) => {
  try {
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    const cookies = req.cookies;
    
    res.json({
      success: true,
      currentUser: { me, isAdminUser },
      cookies: {
        email: cookies.email,
        admin_email: cookies.admin_email,
        hasEmail: !!cookies.email,
        hasAdminEmail: !!cookies.admin_email
      },
      permissions: {
        isFixedAdmin: isFixedAdmin(me),
        canPinPosts: isAdminUser || isFixedAdmin(me)
      }
    });
  } catch (error) {
    console.error('调试用户状态失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 提升用户为管理员（仅限固定管理员使用）
app.post('/api/users/:email/promote-admin', async (req, res) => {
  try {
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    
    // 只有固定管理员可以提升其他用户为管理员
    if (!isFixedAdmin(me)) {
      return res.status(403).json({ msg: '只有超级管理员可以提升用户权限' });
    }

    const targetEmail = req.params.email;
    if (!targetEmail) {
      return res.status(400).json({ msg: '目标邮箱必填' });
    }

    const user = await User.findOne({ email: normalizeEmail(targetEmail) });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    user.isAdmin = true;
    await user.save();

    res.json({ 
      msg: '用户已提升为管理员',
      user: {
        email: user.email,
        nickname: user.nickname,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('提升用户权限失败:', error);
    res.status(500).json({ msg: '提升用户权限失败' });
  }
});

// ====== 评论API ======

// 获取评论列表
app.get('/api/comments', async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) {
      return res.status(400).json({ msg: '缺少postId参数' });
    }

    const comments = await Comment.find({ post: postId })
      .populate('author', 'nickname email avatarPath')
      .sort({ createdAt: -1 });

    const enriched = comments.map(c => ({
      _id: c._id,
      id: c._id,
      postId: c.post,
      content: c.content,
      text: c.content,
      createdAt: c.createdAt,
      time: c.createdAt,
      authorName: c.author?.nickname || c.author?.username || c.author?.email || '用户',
      authorEmail: c.author?.email || '',
      user: {
        name: c.author?.nickname || c.author?.username || c.author?.email || '用户',
        email: c.author?.email || '',
        avatar: c.author?.avatarPath || ''
      }
    }));

    res.json(enriched);
  } catch (error) {
    console.error('获取评论失败:', error);
    res.status(500).json({ msg: '获取评论失败' });
  }
});

// 获取帖子评论列表（兼容旧API）
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = req.params.id;
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const comments = await Comment.find({ post: postId })
      .populate('author', 'nickname email avatarPath')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Comment.countDocuments({ post: postId });

    const items = comments.map(c => ({
      _id: c._id,
      id: c._id,
      postId: c.post,
      content: c.content,
      createdAt: c.createdAt,
      userEmail: c.author?.email || '',
      user: {
        name: c.author?.nickname || c.author?.username || c.author?.email || '用户',
        email: c.author?.email || '',
        avatar: c.author?.avatarPath || ''
      }
    }));

    res.json({ items, total });
  } catch (error) {
    console.error('获取帖子评论失败:', error);
    res.status(500).json({ msg: '获取评论失败' });
  }
});

// 发表评论
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { email: me } = await getCurrentUser(req);
    if (!me) {
      return res.status(401).json({ msg: '未登录' });
    }

    const postId = req.params.id;
    const content = String(req.body?.content || '').trim();
    
    if (!content) {
      return res.status(400).json({ msg: '内容不能为空' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ msg: '帖子不存在' });
    }

    const user = await User.findOne({ email: me });
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    const comment = new Comment({
      post: postId,
      author: user._id,
      content: content
    });

    await comment.save();

    res.json({
      _id: comment._id,
      id: comment._id,
      postId: comment.post,
      content: comment.content,
      createdAt: comment.createdAt,
      userEmail: user.email,
      user: isFixedAdmin(me) ? {
        name: '管理员',
        avatar: '',
        email: 'hwlx@hwlx.com'
      } : {
        name: user.nickname || user.username || user.email || '我',
        avatar: user.avatarPath || '',
        email: user.email
      }
    });
  } catch (error) {
    console.error('发表评论失败:', error);
    res.status(500).json({ msg: '发表评论失败' });
  }
});

// 删除评论
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    if (!me) {
      return res.status(401).json({ msg: '未登录' });
    }

    const commentId = req.params.id;
    const comment = await Comment.findById(commentId).populate('author', 'email');
    
    if (!comment) {
      return res.status(404).json({ msg: '评论不存在' });
    }

    // 只有评论作者或管理员可以删除评论
    const isAuthor = comment.author?.email === me;
    const isAdmin = isAdminUser || isFixedAdmin(me);
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ msg: '只有评论作者或管理员可以删除评论' });
    }

    await Comment.findByIdAndDelete(commentId);
    res.json({ msg: '评论已删除' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ msg: '删除评论失败' });
  }
});

// 删除帖子评论（兼容旧API）
app.delete('/api/posts/:id/comments/:cid', async (req, res) => {
  try {
    const { email: me, isAdmin: isAdminUser } = await getCurrentUser(req);
    if (!me) {
      return res.status(401).json({ msg: '未登录' });
    }

    const commentId = req.params.cid;
    const comment = await Comment.findById(commentId).populate('author', 'email');
    
    if (!comment) {
      return res.status(404).json({ msg: '评论不存在' });
    }

    // 只有评论作者或管理员可以删除评论
    const isAuthor = comment.author?.email === me;
    const isAdmin = isAdminUser || isFixedAdmin(me);
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ msg: '只有评论作者或管理员可以删除评论' });
    }

    await Comment.findByIdAndDelete(commentId);
    res.json({ msg: '评论已删除' });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({ msg: '删除评论失败' });
  }
});

// ====== 验证码相关API ======

// 导入验证码模型和邮件功能
const VerificationCode = require('./models/VerificationCode');
const { sendVerificationEmail, verifyEmailConfig } = require('./config/email');

// 发送验证码
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ msg: '请提供邮箱地址' });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ msg: '邮箱格式不正确' });
    }
    
    // 检查是否已有未过期的验证码
    const existingCode = await VerificationCode.findValidCode(email, 'register');
    if (existingCode) {
      const timeLeft = Math.ceil((existingCode.expiresAt - new Date()) / 1000 / 60);
      return res.status(429).json({ 
        msg: `请等待${timeLeft}分钟后再发送验证码`,
        timeLeft 
      });
    }
    
    // 创建新的验证码
    const verificationCode = await VerificationCode.createCode(email, 'register');
    
    // 发送验证码邮件
    const emailResult = await sendVerificationEmail(email, verificationCode.code);
    
    if (emailResult.success) {
      res.json({ 
        msg: '验证码已发送到您的邮箱，请注意查收',
        expiresIn: '5分钟'
      });
    } else {
      // 邮件发送失败，删除验证码记录
      await VerificationCode.findByIdAndDelete(verificationCode._id);
      res.status(500).json({ msg: '邮件发送失败，请稍后重试' });
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({ msg: '发送验证码失败，请稍后重试' });
  }
});

// 验证验证码
app.post('/api/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ msg: '请提供邮箱和验证码' });
    }
    
    const verificationCode = await VerificationCode.findValidCode(email, 'register');
    
    if (!verificationCode) {
      return res.status(400).json({ msg: '验证码不存在或已过期' });
    }
    
    const result = verificationCode.verify(code);
    
    if (result.valid) {
      await verificationCode.save(); // 保存使用状态
      res.json({ msg: '验证码验证成功' });
    } else {
      res.status(400).json({ msg: result.reason });
    }
  } catch (error) {
    console.error('验证验证码失败:', error);
    res.status(500).json({ msg: '验证验证码失败，请稍后重试' });
  }
});



// 数据统计API
app.get('/api/analytics', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const now = new Date();
    
    let visits = 0;
    let users = 0;
    let posts = 0;
    let comments = 0;
    
    // 根据时间周期获取数据
    switch (period) {
      case 'day':
        const today = now.toISOString().split('T')[0];
        visits = visitStats.daily[today] || 0;
        break;
      case 'week':
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        visits = visitStats.weekly[weekKey] || 0;
        break;
      case 'month':
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        visits = visitStats.monthly[monthKey] || 0;
        break;
      case 'year':
        const yearKey = now.getFullYear().toString();
        visits = visitStats.yearly[yearKey] || 0;
        break;
    }
    
    // 获取用户、帖子、评论数量
    try {
      users = await User.countDocuments();
      posts = await Post.countDocuments();
      comments = await Comment.countDocuments();
    } catch (error) {
      console.warn('获取统计数据失败:', error);
    }
    
    // 计算趋势（简单实现，实际项目中应该有更复杂的算法）
    const trends = calculateTrends(period, visits, users, posts, comments);
    
    res.json({
      visits,
      users,
      posts,
      comments,
      ...trends
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ msg: '获取统计数据失败' });
  }
});

// 计算趋势的函数
function calculateTrends(period, visits, users, posts, comments) {
  // 这里可以实现更复杂的趋势计算逻辑
  // 目前使用简单的随机趋势作为示例
  const getRandomTrend = () => {
    const change = Math.random() * 20 - 10; // -10% 到 +10%
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };
  
  return {
    visitsTrend: getRandomTrend(),
    usersTrend: getRandomTrend(),
    postsTrend: getRandomTrend(),
    commentsTrend: getRandomTrend()
  };
}

// 启动服务器
async function startServer() {
  try {
    await connectDB();
    console.log('✅ MongoDB连接成功');
    
    // 验证邮件配置
    const emailConfigValid = await verifyEmailConfig();
    if (emailConfigValid) {
      console.log('✅ 邮件服务配置成功');
    } else {
      console.log('⚠️ 邮件服务配置失败，验证码功能可能无法正常工作');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Cloudinary服务器运行在端口 ${PORT}`);
      console.log(`📱 本地访问: http://localhost:${PORT}`);
      console.log(`☁️ 使用Cloudinary存储文件`);
      console.log(`📧 邮件服务: ${emailConfigValid ? '已启用' : '未配置'}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
