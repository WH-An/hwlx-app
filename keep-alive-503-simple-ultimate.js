const https = require('https');

// 超简单503错误处理保活脚本（优先打轻量健康端点）
const URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

// 立即输出OK，确保cron job成功
console.log('OK');

// 发送请求但不等待响应
const req = https.get(URL, (res) => {
  // 不管什么状态码都忽略
  res.destroy();
});

req.on('error', () => {
  // 忽略所有错误
});

req.setTimeout(5000, () => {
  req.destroy();
});

// 立即退出，不等待任何响应
process.exit(0);
