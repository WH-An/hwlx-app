const https = require('https');

// 专为 cron-job.org 优化的轻量保活脚本
const PING_URL = 'https://hai-wai-liu-xue.onrender.com/ping';

// 立即输出OK，确保cron job成功
console.log('OK');

// 发送保活请求（异步，不等待结果）
const req = https.get(PING_URL, {
  timeout: 8000,
  headers: {
    'User-Agent': 'CronJob-KeepAlive/1.0',
    'Accept': 'text/plain',
    'Connection': 'close'
  }
}, (res) => {
  // 任何状态码都算成功，包括503
  res.destroy();
});

req.on('error', () => {
  // 忽略错误，保活请求已发送
});

req.on('timeout', () => {
  req.destroy();
});

req.setTimeout(6000, () => {
  req.destroy();
});

// 立即退出，不等待请求完成
process.exit(0);
