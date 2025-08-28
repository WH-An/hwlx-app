// server-debug.js — 调试版本
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// 配置
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

// 中间件
app.use(cors({
  origin: FRONTEND_ALLOWED,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'main page.html'));
});

// 调试环境变量
app.get('/api/debug-env', (req, res) => {
  const mongoUri = process.env.MONGODB_URI;
  res.json({
    mongoUri: mongoUri ? '已设置' : '未设置',
    mongoUriLength: mongoUri ? mongoUri.length : 0,
    mongoUriPreview: mongoUri ? mongoUri.substring(0, 100) + '...' : '无',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('MONGO'))
  });
});

// 测试MongoDB连接
app.get('/api/test-mongo', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const MONGODB_URI = process.env.MONGODB_URI;
    
    console.log('🔍 测试MongoDB连接...');
    console.log('📡 连接字符串长度:', MONGODB_URI ? MONGODB_URI.length : 0);
    console.log('📡 连接字符串预览:', MONGODB_URI ? MONGODB_URI.substring(0, 100) + '...' : '无');
    
    if (!MONGODB_URI) {
      return res.json({ 
        success: false, 
        error: 'MONGODB_URI环境变量未设置',
        message: '请在Render中设置MONGODB_URI环境变量'
      });
    }
    
    // 检查连接字符串格式
    if (!MONGODB_URI.includes('mongodb+srv://')) {
      return res.json({
        success: false,
        error: '连接字符串格式错误',
        message: '连接字符串必须以mongodb+srv://开头'
      });
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    res.json({ 
      success: true, 
      message: 'MongoDB连接成功'
    });
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    res.json({ 
      success: false, 
      error: error.message,
      details: error.toString()
    });
  }
});

// 健康检查
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: '调试服务器运行正常',
    mongoUri: process.env.MONGODB_URI ? '已设置' : '未设置'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 调试服务器运行在端口 ${PORT}`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`🔍 MongoDB URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
  if (process.env.MONGODB_URI) {
    console.log(`📡 连接字符串长度: ${process.env.MONGODB_URI.length}`);
    console.log(`📡 连接字符串预览: ${process.env.MONGODB_URI.substring(0, 100)}...`);
  }
});
