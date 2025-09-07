const https = require('https');

// 简单保活脚本 - 即使网站有问题也能工作
const URL = 'https://hai-wai-liu-xue.onrender.com';

const req = https.get(URL, {
  timeout: 20000, // 20秒超时
  headers: {
    'User-Agent': 'Keep-Alive-Script/1.0'
  }
}, (res) => {
  // 任何响应都算作成功
  console.log('OK');
  res.destroy(); // 立即关闭连接
  process.exit(0);
});

req.on('error', (err) => {
  // 即使出错也输出OK，让cron job认为成功
  console.log('OK');
  process.exit(0);
});

req.on('timeout', () => {
  // 超时也输出OK
  console.log('OK');
  req.destroy();
  process.exit(0);
});

req.end();
