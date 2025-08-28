// server-test.js — 简化测试版本
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

// 测试MongoDB连接
app.get('/api/test-mongo', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const MONGODB_URI = process.env.MONGODB_URI;
    
    console.log('🔍 测试MongoDB连接...');
    console.log('📡 连接字符串:', MONGODB_URI ? '已设置' : '未设置');
    
    if (!MONGODB_URI) {
      return res.json({ 
        success: false, 
        error: 'MONGODB_URI环境变量未设置',
        message: '请在Render中设置MONGODB_URI环境变量'
      });
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    res.json({ 
      success: true, 
      message: 'MongoDB连接成功',
      uri: MONGODB_URI.substring(0, 50) + '...' // 只显示前50个字符
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
    message: '服务器运行正常',
    mongoUri: process.env.MONGODB_URI ? '已设置' : '未设置'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 测试服务器运行在端口 ${PORT}`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`🔍 MongoDB URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
});
