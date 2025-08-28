const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 配置Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 创建Cloudinary存储
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hwlx-avatars', // 存储文件夹名称
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // 允许的文件格式
    transformation: [
      { width: 300, height: 300, crop: 'fill' }, // 自动调整图片大小
      { quality: 'auto' } // 自动优化质量
    ]
  }
});

// 创建multer实例
const upload = multer({ storage });

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
  deleteFile,
  getFileUrl
};
