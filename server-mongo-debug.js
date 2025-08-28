// server-mongo-debug.js — MongoDB连接诊断版本
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

// 详细的环境变量诊断
app.get('/api/debug-env-detailed', (req, res) => {
  const mongoUri = process.env.MONGODB_URI;
  res.json({
    mongoUri: mongoUri ? '已设置' : '未设置',
    mongoUriLength: mongoUri ? mongoUri.length : 0,
    mongoUriPreview: mongoUri ? mongoUri.substring(0, 100) + '...' : '无',
    mongoUriEnd: mongoUri ? mongoUri.substring(mongoUri.length - 50) : '无',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('MONGO')),
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

// 详细的MongoDB连接测试
app.get('/api/test-mongo-detailed', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const MONGODB_URI = process.env.MONGODB_URI;
    
    console.log('🔍 详细MongoDB连接测试...');
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
        message: '连接字符串必须以mongodb+srv://开头',
        actualStart: MONGODB_URI.substring(0, 20)
      });
    }
    
    // 尝试连接，设置更长的超时时间
    console.log('🔄 尝试连接MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30秒超时
      socketTimeoutMS: 45000, // 45秒超时
      connectTimeoutMS: 30000, // 30秒连接超时
    });
    
    console.log('✅ MongoDB连接成功');
    
    // 测试数据库操作
    const testCollection = mongoose.connection.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ 数据库写入测试成功');
    
    await testCollection.deleteOne({ test: true });
    console.log('✅ 数据库删除测试成功');
    
    res.json({ 
      success: true, 
      message: 'MongoDB连接和操作测试成功',
      connectionState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    res.json({ 
      success: false, 
      error: error.message,
      details: error.toString(),
      code: error.code,
      name: error.name
    });
  }
});

// 测试网络连接
app.get('/api/test-network', async (req, res) => {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // 测试DNS解析
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.json({ success: false, error: 'MONGODB_URI未设置' });
    }
    
    // 提取主机名
    const hostMatch = mongoUri.match(/@([^.]+)\.mongodb\.net/);
    if (!hostMatch) {
      return res.json({ success: false, error: '无法解析主机名' });
    }
    
    const hostname = hostMatch[1] + '.mongodb.net';
    
    try {
      const { stdout } = await execAsync(`nslookup ${hostname}`);
      res.json({
        success: true,
        message: 'DNS解析成功',
        hostname: hostname,
        dnsResult: stdout
      });
    } catch (dnsError) {
      res.json({
        success: false,
        error: 'DNS解析失败',
        details: dnsError.message,
        hostname: hostname
      });
    }
    
  } catch (error) {
    res.json({
      success: false,
      error: '网络测试失败',
      details: error.message
    });
  }
});

// 健康检查
app.get('/__ping', (req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    message: 'MongoDB诊断服务器运行正常',
    mode: 'mongo-debug'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 MongoDB诊断服务器运行在端口 ${PORT}`);
  console.log(`📱 本地访问: http://localhost:${PORT}`);
  console.log(`🔍 MongoDB URI: ${process.env.MONGODB_URI ? '已设置' : '未设置'}`);
  if (process.env.MONGODB_URI) {
    console.log(`📡 连接字符串长度: ${process.env.MONGODB_URI.length}`);
    console.log(`📡 连接字符串预览: ${process.env.MONGODB_URI.substring(0, 100)}...`);
  }
});
