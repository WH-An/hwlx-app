require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// 导入配置和模型
const { connectDB } = require('./config/database');
const { upload, uploadAvatar, uploadPostImages, uploadMessageImages, deleteFile, getFileUrl } = require('./config/cloudinary');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Analytics = require('./models/Analytics');
const Message = require('./models/Message');
const VerificationCode = require('./models/VerificationCode');
const { sendVerificationEmail, verifyEmailConfig } = require('./config/email');

const app = express();
const PORT = process.env.PORT || 10000;

// ====== 安全配置 ======
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"]
    }
  }
}));

// ====== 性能优化 ======
app.use(compression());

// 请求频率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 登录尝试限制
  message: '登录尝试过于频繁，请15分钟后再试',
  skipSuccessfulRequests: true,
});

// ====== 中间件配置 ======
const FRONTEND_ALLOWED = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://hai-wai-liu-xue.onrender.com',
];

app.use(cors({
  origin: FRONTEND_ALLOWED,
  credentials: true
}));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // 静态文件缓存1天
  etag: true,
  lastModified: true
}));

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
  let email = normalizeEmail(req.cookies.email);
  let isAdminUser = false;
  
  const adminEmail = normalizeEmail(req.cookies.admin_email);
  
  if (adminEmail) {
    email = adminEmail;
    isAdminUser = true;
  }
  
  if (email && !isAdminUser) {
    try {
      const user = await User.findOne({ email });
      if (user && user.isAdmin) {
        isAdminUser = true;
      }
    } catch (error) {
      console.warn('检查用户管理员权限失败:', error);
    }
  }
  
  return { email, isAdmin: isAdminUser };
}

// ====== 数据统计优化 ======
let visitStatsCache = {
  total: 0,
  daily: {},
  weekly: {},
  monthly: {},
  yearly: {}
};

// 使用内存缓存和批量更新
let statsUpdateQueue = [];
let statsUpdateTimer = null;

function scheduleStatsUpdate() {
  if (statsUpdateTimer) return;
  
  statsUpdateTimer = setTimeout(async () => {
    if (statsUpdateQueue.length > 0) {
      try {
        await saveVisitStats();
        statsUpdateQueue = [];
      } catch (error) {
        console.warn('批量保存统计数据失败:', error);
      }
    }
    statsUpdateTimer = null;
  }, 5000); // 5秒后批量保存
}

async function loadVisitStats() {
  try {
    const analytics = await Analytics.getOrCreate();
    visitStatsCache = {
      total: analytics.total || 0,
      daily: analytics.daily ? Object.fromEntries(analytics.daily) : {},
      weekly: analytics.weekly ? Object.fromEntries(analytics.weekly) : {},
      monthly: analytics.monthly ? Object.fromEntries(analytics.monthly) : {},
      yearly: analytics.yearly ? Object.fromEntries(analytics.yearly) : {}
    };
  } catch (error) {
    console.warn('从数据库读取统计数据失败:', error);
  }
}

async function saveVisitStats() {
  try {
    const analytics = await Analytics.getOrCreate();
    analytics.total = visitStatsCache.total;
    analytics.daily = new Map(Object.entries(visitStatsCache.daily));
    analytics.weekly = new Map(Object.entries(visitStatsCache.weekly));
    analytics.monthly = new Map(Object.entries(visitStatsCache.monthly));
    analytics.yearly = new Map(Object.entries(visitStatsCache.yearly));
    analytics.lastUpdated = new Date();
    await analytics.save();
  } catch (error) {
    console.warn('保存统计数据到数据库失败:', error);
  }
}

// 初始化统计数据
loadVisitStats();

// ====== 访问统计中间件优化 ======
app.use((req, res, next) => {
  // 跳过静态文件和API请求的统计
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearKey = now.getFullYear().toString();
  
  // 更新缓存
  visitStatsCache.total++;
  if (!visitStatsCache.daily[today]) visitStatsCache.daily[today] = 0;
  visitStatsCache.daily[today]++;
  if (!visitStatsCache.weekly[weekKey]) visitStatsCache.weekly[weekKey] = 0;
  visitStatsCache.weekly[weekKey]++;
  if (!visitStatsCache.monthly[monthKey]) visitStatsCache.monthly[monthKey] = 0;
  visitStatsCache.monthly[monthKey]++;
  if (!visitStatsCache.yearly[yearKey]) visitStatsCache.yearly[yearKey] = 0;
  visitStatsCache.yearly[yearKey]++;
  
  // 添加到更新队列
  statsUpdateQueue.push({ today, weekKey, monthKey, yearKey });
  scheduleStatsUpdate();
  
  next();
});

// ====== 路由定义 ======

// 默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main page.html'));
});

// 健康检查端点
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: '服务器运行正常',
    mode: 'optimized',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/ping', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('text/plain').send('ok');
});

// 保活端点
app.get('/keepalive', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ====== API 路由 ======

// 用户认证相关
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

app.post('/api/login', authLimiter, async (req, res) => {
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

app.post('/api/logout', (req, res) => {
  res.clearCookie('email', { sameSite: 'Lax' });
  res.clearCookie('admin_email', { sameSite: 'Lax' });
  res.json({ msg: '登出成功' });
});

// 用户信息相关
app.get('/api/users/me', async (req, res) => {
  try {
    const { email, isAdmin } = await getCurrentUser(req);
    
    if (!email) {
      return res.status(401).json({ msg: '请先登录' });
    }

    if (isAdmin) {
      let adminUser = await User.findOne({ email });
      if (!adminUser) {
        adminUser = new User({
          email: email,
          nickname: '海外留学',
          password: 'admin',
          isAdmin: true
        });
        await adminUser.save();
      }
      
      return res.json({
        id: adminUser._id || 1,
        nickname: adminUser.nickname || '海外留学',
        email: email,
        area: adminUser.area || '',
        degree: adminUser.degree || '',
        avatarPath: adminUser.avatarPath || '',
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

// 帖子相关API
app.get('/api/posts', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
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
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await Post.find(query)
      .populate('author', 'nickname email avatarPath')
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Post.countDocuments(query);
    
    res.json({
      posts,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + posts.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('获取帖子失败:', error);
    res.status(500).json({ msg: '获取帖子失败' });
  }
});

// 其他API路由保持不变...
// (为了简洁，这里省略了其他路由，实际项目中应该包含所有必要的路由)

// ====== 错误处理中间件 ======
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    msg: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : '服务器错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ msg: '页面不存在' });
});

// ====== 启动服务器 ======
async function startServer() {
  try {
    await connectDB();
    console.log('✅ MongoDB连接成功');
    
    const emailConfigValid = await verifyEmailConfig();
    if (emailConfigValid) {
      console.log('✅ 邮件服务配置成功');
    } else {
      console.log('⚠️ 邮件服务配置失败，验证码功能可能无法正常工作');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 优化版服务器运行在端口 ${PORT}`);
      console.log(`📱 本地访问: http://localhost:${PORT}`);
      console.log(`☁️ 使用Cloudinary存储文件`);
      console.log(`🔒 安全防护已启用`);
      console.log(`⚡ 性能优化已启用`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
