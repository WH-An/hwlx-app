const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 配置Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 创建头像上传存储（300x300像素）
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hwlx-avatars', // 存储文件夹名称
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // 允许的文件格式
    transformation: [
      { width: 300, height: 300, crop: 'fill' }, // 头像固定尺寸
      { quality: 'auto' } // 自动优化质量
    ]
  }
});

// 创建帖子图片上传存储（保持高质量）
const postImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hwlx-posts', // 帖子图片文件夹
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // 允许的文件格式
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // 最大尺寸限制，保持比例
      { quality: 'auto:good' } // 高质量压缩
    ]
  }
});

// 创建消息图片上传存储（中等质量）
const messageImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hwlx-messages', // 消息图片文件夹
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // 允许的文件格式
    transformation: [
      { width: 800, height: 800, crop: 'limit' }, // 中等尺寸限制
      { quality: 'auto' } // 自动优化质量
    ]
  }
});

// 创建multer实例
const upload = multer({ storage: avatarStorage }); // 默认使用头像存储
const uploadAvatar = multer({ storage: avatarStorage });
const uploadPostImages = multer({ storage: postImageStorage });
const uploadMessageImages = multer({ storage: messageImageStorage });

// 删除文件函数
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('删除Cloudinary文件失败:', error);
    throw error;
  }
};

// 获取文件URL函数
const getFileUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...options
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadAvatar,
  uploadPostImages,
  uploadMessageImages,
  deleteFile,
  getFileUrl
};
