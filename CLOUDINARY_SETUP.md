# Cloudinary 设置指南

## 1. 注册 Cloudinary 账户

1. 访问 [https://cloudinary.com/](https://cloudinary.com/)
2. 点击 "Sign Up For Free"
3. 填写注册信息并创建账户

## 2. 获取 API 密钥

1. 登录后进入 Dashboard
2. 在 Dashboard 中找到以下信息：
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## 3. 配置环境变量

在 Render 平台的环境变量中添加：

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 4. 切换服务器

将 `package.json` 中的启动脚本改为：

```json
{
  "scripts": {
    "start": "node server-cloudinary.js"
  }
}
```

## 5. 部署

提交代码并部署到 Render：

```bash
git add .
git commit -m "Switch to Cloudinary for file storage"
git push
```

## 优势

- ✅ **文件持久化** - 文件不会因为部署而丢失
- ✅ **自动优化** - 图片自动压缩和调整大小
- ✅ **CDN加速** - 全球CDN网络
- ✅ **免费额度** - 每月25GB存储和25GB带宽
- ✅ **安全可靠** - 企业级安全标准

## 注意事项

- 确保环境变量正确设置
- 免费账户有使用限制
- 图片会自动优化为300x300像素
