require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwlx-app';

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB连接成功');
    
    // 初始化默认管理员账号
    await initializeDefaultAdmin();
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
}

// 初始化默认管理员账号
async function initializeDefaultAdmin() {
  const User = require('../models/User');
  
  try {
    // 检查是否已存在默认管理员
    const existingAdmin = await User.findOne({ 
      email: 'hwlx@hwlx.com' 
    });
    
    if (!existingAdmin) {
      // 创建默认管理员账号
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
    }
  } catch (error) {
    console.error('❌ 初始化管理员账号失败:', error);
  }
}

module.exports = { connectDB };
