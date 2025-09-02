const nodemailer = require('nodemailer');

// 邮件配置
const emailConfig = {
  // 使用Gmail SMTP (您需要替换为真实的邮箱和密码)
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// 创建邮件传输器
const transporter = nodemailer.createTransporter(emailConfig);

// 发送验证码邮件
async function sendVerificationEmail(toEmail, verificationCode) {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: toEmail,
      subject: '海外留学网站 - 邮箱验证码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #16a34a; text-align: center; margin-bottom: 30px;">邮箱验证码</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              您好！感谢您注册海外留学网站。
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              您的邮箱验证码是：
            </p>
            
            <div style="background-color: #16a34a; color: white; font-size: 24px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; letter-spacing: 5px;">
              ${verificationCode}
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              ⚠️ 注意事项：
            </p>
            <ul style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 20px; padding-left: 20px;">
              <li>验证码有效期为5分钟</li>
              <li>请勿将验证码泄露给他人</li>
              <li>如果这不是您的操作，请忽略此邮件</li>
            </ul>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              如果验证码无法使用，请重新发送。
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              <p style="color: #999; font-size: 12px;">
                此邮件由系统自动发送，请勿回复
              </p>
            </div>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ 验证码邮件发送成功:', { to: toEmail, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ 验证码邮件发送失败:', error);
    return { success: false, error: error.message };
  }
}

// 验证邮件配置
async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ 邮件配置验证成功');
    return true;
  } catch (error) {
    console.error('❌ 邮件配置验证失败:', error);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  verifyEmailConfig,
  transporter
};
