require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function updateAdminAvatar() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hwlx-app');
    console.log('✅ 数据库连接成功');

    // 查找管理员用户
    const adminEmail = 'hwlx@hwlx.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('❌ 未找到管理员用户');
      return;
    }

    console.log('📋 当前管理员信息:', {
      email: adminUser.email,
      nickname: adminUser.nickname,
      avatarPath: adminUser.avatarPath
    });

    // 设置默认头像
    const defaultAvatar = 'https://raw.githubusercontent.com/WH-An/hwlx-app/2df4e97b395bebb7977074fbb31741f3c35da9a0/assets-task_01k3v2vy06fra8er06x602xnpe-1756476933_img_1.webp';
    
    adminUser.avatarPath = defaultAvatar;
    await adminUser.save();

    console.log('✅ 管理员头像已更新:', defaultAvatar);
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

updateAdminAvatar();
