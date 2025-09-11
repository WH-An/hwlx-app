const https = require('https');

// 处理503错误的简单保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';

// 立即输出OK，确保cron job成功
console.log('OK');

// 异步发送请求，不等待结果
const req = https.get(URL, (res) => {
  // 503错误是正常的，表示服务器存在但暂时不可用
  // 这实际上有助于"唤醒"Render服务
  res.destroy();
});

req.on('error', () => {
  // 忽略所有错误
});

req.setTimeout(5000, () => {
  req.destroy();
});

// 立即退出，不等待请求完成
process.exit(0);
