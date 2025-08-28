const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// 导入模型
const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Comment = require('../models/Comment');

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwlx-app';

async function migrateData() {
  try {
    // 连接数据库
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 数据库连接成功');

    // 迁移用户数据
    await migrateUsers();
    
    // 迁移帖子数据
    await migratePosts();
    
    // 迁移消息数据
    await migrateMessages();
    
    // 迁移评论数据
    await migrateComments();
    
    console.log('✅ 数据迁移完成');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    process.exit(1);
  }
}

// 迁移用户数据
async function migrateUsers() {
  try {
    const usersPath = path.join(__dirname, '..', 'users.json');
    
    if (!fs.existsSync(usersPath)) {
      console.log('⚠️ users.json 文件不存在，跳过用户数据迁移');
      return;
    }
    
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    
    for (const userData of usersData) {
      // 检查用户是否已存在
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = new User({
          nickname: userData.nickname || userData.email.split('@')[0],
          email: userData.email,
          password: userData.password,
          area: userData.area || '',
          degree: userData.degree || '',
          avatarPath: userData.avatarPath || '',
          isAdmin: Boolean(userData.isAdmin || userData.role === 'admin')
        });
        
        await user.save();
        console.log(`✅ 用户迁移成功: ${userData.email}`);
      } else {
        console.log(`⚠️ 用户已存在，跳过: ${userData.email}`);
      }
    }
    
    console.log('✅ 用户数据迁移完成');
  } catch (error) {
    console.error('❌ 用户数据迁移失败:', error);
  }
}

// 迁移帖子数据
async function migratePosts() {
  try {
    const postsPath = path.join(__dirname, '..', 'posts.json');
    
    if (!fs.existsSync(postsPath)) {
      console.log('⚠️ posts.json 文件不存在，跳过帖子数据迁移');
      return;
    }
    
    const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
    
    for (const postData of postsData) {
      // 查找作者用户
      const author = await User.findOne({ email: postData.authorEmail || postData.email });
      
      if (author) {
        const post = new Post({
          title: postData.title,
          content: postData.content,
          category: postData.category,
          author: author._id,
          authorName: postData.authorName || author.nickname,
          authorEmail: postData.authorEmail || author.email,
          authorAvatar: postData.authorAvatar || author.avatarPath,
          images: postData.images || [],
          likes: postData.likes || 0,
          views: postData.views || 0,
          createdAt: new Date(postData.createdAt || Date.now()),
          updatedAt: new Date(postData.updatedAt || Date.now())
        });
        
        await post.save();
        console.log(`✅ 帖子迁移成功: ${postData.title}`);
      } else {
        console.log(`⚠️ 找不到作者，跳过帖子: ${postData.title}`);
      }
    }
    
    console.log('✅ 帖子数据迁移完成');
  } catch (error) {
    console.error('❌ 帖子数据迁移失败:', error);
  }
}

// 迁移消息数据
async function migrateMessages() {
  try {
    const messagesPath = path.join(__dirname, '..', 'messages.json');
    
    if (!fs.existsSync(messagesPath)) {
      console.log('⚠️ messages.json 文件不存在，跳过消息数据迁移');
      return;
    }
    
    const messagesData = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));
    
    for (const messageData of messagesData) {
      // 查找发送者和接收者
      const fromUser = await User.findOne({ email: messageData.from });
      const toUser = await User.findOne({ email: messageData.to });
      
      if (fromUser && toUser) {
        const message = new Message({
          from: fromUser._id,
          to: toUser._id,
          content: messageData.content,
          isRead: messageData.isRead || false,
          createdAt: new Date(messageData.createdAt || Date.now())
        });
        
        await message.save();
        console.log(`✅ 消息迁移成功: ${fromUser.email} -> ${toUser.email}`);
      } else {
        console.log(`⚠️ 找不到用户，跳过消息: ${messageData.from} -> ${messageData.to}`);
      }
    }
    
    console.log('✅ 消息数据迁移完成');
  } catch (error) {
    console.error('❌ 消息数据迁移失败:', error);
  }
}

// 迁移评论数据
async function migrateComments() {
  try {
    const commentsPath = path.join(__dirname, '..', 'comments.json');
    
    if (!fs.existsSync(commentsPath)) {
      console.log('⚠️ comments.json 文件不存在，跳过评论数据迁移');
      return;
    }
    
    const commentsData = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'));
    
    for (const commentData of commentsData) {
      // 查找帖子和作者
      const post = await Post.findOne({ title: commentData.postTitle });
      const author = await User.findOne({ email: commentData.authorEmail });
      
      if (post && author) {
        const comment = new Comment({
          post: post._id,
          author: author._id,
          content: commentData.content,
          authorName: commentData.authorName || author.nickname,
          authorEmail: commentData.authorEmail || author.email,
          authorAvatar: commentData.authorAvatar || author.avatarPath,
          createdAt: new Date(commentData.createdAt || Date.now())
        });
        
        await comment.save();
        console.log(`✅ 评论迁移成功: ${author.email} -> ${post.title}`);
      } else {
        console.log(`⚠️ 找不到帖子或作者，跳过评论`);
      }
    }
    
    console.log('✅ 评论数据迁移完成');
  } catch (error) {
    console.error('❌ 评论数据迁移失败:', error);
  }
}

// 运行迁移
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
