require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB连接配置优化
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwlx-app';

// 连接选项优化
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // 连接池大小
  serverSelectionTimeoutMS: 5000, // 服务器选择超时
  socketTimeoutMS: 45000, // Socket超时
  bufferMaxEntries: 0, // 禁用mongoose缓冲
  bufferCommands: false, // 禁用mongoose缓冲
  retryWrites: true, // 启用重试写入
  retryReads: true, // 启用重试读取
};

// 连接数据库
async function connectDB() {
  try {
    // 设置mongoose选项
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('✅ MongoDB连接成功');
    
    // 设置连接事件监听
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB连接错误:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB连接断开');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB重新连接成功');
    });
    
    // 初始化默认数据
    await initializeDefaultData();
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
}

// 初始化默认数据
async function initializeDefaultData() {
  try {
    const User = require('../models/User');
    const Analytics = require('../models/Analytics');
    
    // 检查并创建默认管理员
    await createDefaultAdmin(User);
    
    // 初始化统计数据
    await initializeAnalytics(Analytics);
    
    // 创建数据库索引
    await createIndexes();
    
  } catch (error) {
    console.error('❌ 初始化默认数据失败:', error);
  }
}

// 创建默认管理员
async function createDefaultAdmin(User) {
  try {
    const existingAdmin = await User.findOne({ 
      email: 'hwlx@hwlx.com' 
    });
    
    if (!existingAdmin) {
      const adminUser = new User({
        nickname: '海外留学',
        email: 'hwlx@hwlx.com',
        password: 'hwlx',
        isAdmin: true,
        area: '',
        degree: '',
        avatarPath: ''
      });
      
      await adminUser.save();
      console.log('✅ 默认管理员账号创建成功');
    } else {
      console.log('✅ 默认管理员账号已存在');
    }
  } catch (error) {
    console.error('❌ 创建默认管理员失败:', error);
  }
}

// 初始化统计数据
async function initializeAnalytics(Analytics) {
  try {
    const existingAnalytics = await Analytics.findOne();
    
    if (!existingAnalytics) {
      const analytics = new Analytics({
        total: 0,
        daily: new Map(),
        weekly: new Map(),
        monthly: new Map(),
        yearly: new Map(),
        lastUpdated: new Date()
      });
      
      await analytics.save();
      console.log('✅ 统计数据初始化成功');
    }
  } catch (error) {
    console.error('❌ 初始化统计数据失败:', error);
  }
}

// 创建数据库索引
async function createIndexes() {
  try {
    const User = require('../models/User');
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Message = require('../models/Message');
    
    // 用户索引
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ isAdmin: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    // 帖子索引
    await Post.collection.createIndex({ author: 1 });
    await Post.collection.createIndex({ category: 1 });
    await Post.collection.createIndex({ createdAt: -1 });
    await Post.collection.createIndex({ pinned: -1, createdAt: -1 });
    await Post.collection.createIndex({ title: 'text', content: 'text' });
    
    // 评论索引
    await Comment.collection.createIndex({ post: 1 });
    await Comment.collection.createIndex({ author: 1 });
    await Comment.collection.createIndex({ createdAt: -1 });
    
    // 消息索引
    await Message.collection.createIndex({ from: 1 });
    await Message.collection.createIndex({ to: 1 });
    await Message.collection.createIndex({ createdAt: -1 });
    await Message.collection.createIndex({ isRead: 1 });
    await Message.collection.createIndex({ from: 1, to: 1, createdAt: -1 });
    
    console.log('✅ 数据库索引创建成功');
  } catch (error) {
    console.error('❌ 创建数据库索引失败:', error);
  }
}

// 数据库健康检查
async function checkDatabaseHealth() {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      status: 'healthy',
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      uptime: process.uptime()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// 优雅关闭数据库连接
async function closeDatabase() {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB连接已关闭');
  } catch (error) {
    console.error('❌ 关闭MongoDB连接失败:', error);
  }
}

// 进程退出时关闭数据库连接
process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭数据库连接...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭数据库连接...');
  await closeDatabase();
  process.exit(0);
});

module.exports = { 
  connectDB, 
  checkDatabaseHealth, 
  closeDatabase 
};
