# 网站保活设置指南

为了防止Render免费服务自动休眠，我们提供了多种保活解决方案。

## 🚀 已配置的保活方案

### 1. GitHub Actions 自动保活（推荐）

✅ **已配置完成**

- **频率**: 每5分钟自动访问一次
- **主脚本**: `.github/workflows/keep-alive.yml`
- **简化脚本**: `.github/workflows/keep-alive-simple.yml`
- **最简脚本**: `.github/workflows/keep-alive-minimal.yml`
- **超简脚本**: `.github/workflows/keep-alive-ultra-simple.yml`
- **HTTP脚本**: `.github/workflows/keep-alive-http.yml`
- **可靠脚本**: `.github/workflows/keep-alive-reliable.yml`
- **基础脚本**: `.github/workflows/keep-alive-basic.yml`
- **Actions脚本**: `.github/workflows/keep-alive-actions.yml`
- **内部脚本**: `.github/workflows/keep-alive-internal.yml`
- **修复脚本**: `.github/workflows/keep-alive-fixed.yml` (新增)
- **GitHub Actions脚本**: `.github/workflows/keep-alive-github-actions.yml` (新增)
- **Wget脚本**: `.github/workflows/keep-alive-wget.yml` (新增)
- **状态**: 自动运行，无需手动操作
- **监控**: 可在GitHub Actions页面查看运行日志

#### 查看运行状态：
1. 访问您的GitHub仓库
2. 点击 "Actions" 标签
3. 查看 "Keep Alive" 工作流的运行历史

#### 手动触发：
1. 在GitHub仓库页面点击 "Actions"
2. 选择 "Keep Alive" 工作流
3. 点击 "Run workflow" 手动执行

## 🔧 其他保活方案（可选）

### 2. UptimeRobot（免费监控服务）

**设置步骤：**
1. 访问 https://uptimerobot.com/
2. 注册免费账号
3. 添加新监控：
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://hai-wai-liu-xue.onrender.com`
   - **Monitoring Interval**: 5 minutes
   - **Alert When Down**: 可选

### 3. Cron-job.org（免费定时任务）

**设置步骤：**
1. 访问 https://cron-job.org/
2. 注册免费账号
3. 创建定时任务：
   - **Title**: `海外留学网站保活`
   - **URL**: `https://hai-wai-liu-xue.onrender.com`
   - **Schedule**: Every 5 minutes

### 4. 手动保活（临时方案）

如果其他方案不可用，可以手动访问：
```
https://hai-wai-liu-xue.onrender.com
```

## 📊 保活效果

- ✅ 防止Render服务自动休眠
- ✅ 减少首次访问的冷启动时间
- ✅ 提供网站可用性监控
- ✅ 免费且自动化

## 🔍 故障排除

### 如果保活失败：

1. **检查GitHub Actions日志**
   - 访问GitHub仓库 → Actions → Keep Alive
   - 查看具体的错误信息和日志
   - 确认cron表达式是否正确

2. **常见问题及解决方案**

   **问题1：date命令不兼容**
   - 症状：脚本执行失败，date命令错误
   - 解决：已修复，使用兼容的date命令

   **问题2：网络连接超时**
   - 症状：curl超时或网络错误
   - 解决：已添加重试机制和错误处理

   **问题3：网站响应异常**
   - 症状：HTTP状态码不是200
   - 解决：已优化，非200状态码不会导致工作流失败

3. **备选方案**
   - 如果主保活脚本持续失败，可以使用其他备用脚本：
     - `keep-alive-fixed.yml` - 修复版本，使用最简单的curl -I命令
     - `keep-alive-github-actions.yml` - 使用GitHub Actions内置HTTP请求
     - `keep-alive-wget.yml` - 使用wget替代curl
     - `keep-alive-basic.yml` - 最基础的内部检查
     - `keep-alive-internal.yml` - 不依赖外部网络
     - `keep-alive-actions.yml` - 使用GitHub Actions内置功能
     - `keep-alive-reliable.yml` - 多种方法确保成功

4. **手动测试**
   ```bash
   curl -I https://hai-wai-liu-xue.onrender.com
   ```

5. **检查网站状态**
   - 手动访问网站确认是否正常
   - 检查Render部署状态
   - 确认网站是否在维护中

6. **重新部署**
   - 如果网站无法访问，可能需要重新部署

7. **GitHub Actions权限问题**
   - 如果所有脚本都失败，可能是GitHub Actions权限问题
   - 解决方案：
     - 检查仓库设置 → Actions → General → Workflow permissions
     - 确保设置为 "Read and write permissions"
     - 或者使用外部服务如UptimeRobot作为替代

8. **网络连接问题**
   - GitHub Actions可能在某些地区网络连接不稳定
   - 建议同时使用多个保活方案
   - 可以尝试使用不同的GitHub Actions runner区域

## 📝 注意事项

- GitHub Actions的免费额度每月有2000分钟
- 每5分钟运行一次，每月约需要 30天 × 24小时 × 12次 = 8640次
- 每次运行约需10秒，每月总时间约144分钟，远低于免费额度
- 建议同时使用多个保活方案作为备份

## 🎯 推荐配置

**主要方案**: GitHub Actions（已配置）
**备份方案**: UptimeRobot 或 Cron-job.org

这样即使其中一个方案失效，其他方案仍能保持网站活跃。
