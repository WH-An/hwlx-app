# MongoDB 数据库设置指南

## 1. 创建 MongoDB Atlas 账户

1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 点击 "Try Free" 创建免费账户
3. 选择 "Shared" 计划（免费）

## 2. 创建数据库集群

1. 选择云提供商：AWS、Google Cloud 或 Azure（推荐 AWS）
2. 选择地区：选择离您最近的地区
3. 选择集群类型：M0 Sandbox（免费）
4. 点击 "Create"

## 3. 设置数据库访问

1. 在左侧菜单点击 "Database Access"
2. 点击 "Add New Database User"
3. 创建用户名和密码（请记住这些信息）
4. 权限选择：Read and write to any database
5. 点击 "Add User"

## 4. 设置网络访问

1. 在左侧菜单点击 "Network Access"
2. 点击 "Add IP Address"
3. 选择 "Allow Access from Anywhere"（输入 0.0.0.0/0）
4. 点击 "Confirm"

## 5. 获取连接字符串

1. 在左侧菜单点击 "Database"
2. 点击 "Connect"
3. 选择 "Connect your application"
4. 复制连接字符串

连接字符串格式：
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hwlx-app?retryWrites=true&w=majority
```

## 6. 设置环境变量

### 本地开发
创建 `.env` 文件：
```
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hwlx-app?retryWrites=true&w=majority
```

### Render 部署
在 Render 控制台：
1. 进入您的服务
2. 点击 "Environment"
3. 添加环境变量：
   - Key: `MONGODB_URI`
   - Value: 您的连接字符串

## 7. 运行数据迁移

```bash
npm run migrate
```

## 8. 启动服务器

```bash
npm start
```

## 注意事项

- 请妥善保管数据库用户名和密码
- 生产环境建议使用更强的密码
- 定期备份数据库
- 监控数据库使用量（免费版有 512MB 限制）
