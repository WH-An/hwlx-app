const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  type: {
    type: String,
    enum: ['register', 'reset-password', 'change-email'],
    default: 'register'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // 自动过期
  },
  used: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
verificationCodeSchema.index({ email: 1, type: 1 });
verificationCodeSchema.index({ expiresAt: 1 });

// 验证码是否有效
verificationCodeSchema.methods.isValid = function() {
  return !this.used && 
         this.attempts < this.maxAttempts && 
         new Date() < this.expiresAt;
};

// 验证验证码
verificationCodeSchema.methods.verify = function(inputCode) {
  if (!this.isValid()) {
    return { valid: false, reason: '验证码已过期或已被使用' };
  }
  
  if (this.code !== inputCode) {
    this.attempts += 1;
    return { valid: false, reason: '验证码错误' };
  }
  
  this.used = true;
  return { valid: true };
};

// 创建验证码
verificationCodeSchema.statics.createCode = async function(email, type = 'register') {
  // 删除旧的验证码
  await this.deleteMany({ email, type });
  
  // 生成6位数字验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 5分钟后过期
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  const verificationCode = new this({
    email,
    code,
    type,
    expiresAt
  });
  
  return await verificationCode.save();
};

// 查找有效的验证码
verificationCodeSchema.statics.findValidCode = async function(email, type = 'register') {
  return await this.findOne({
    email,
    type,
    used: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 }
  });
};

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
