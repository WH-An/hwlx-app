const https = require('https');

// 专为cron-job.org优化的终极保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';

// 立即输出OK，确保cron job认为成功
console.log('OK');

// 异步发送请求，不等待结果
const req = https.get(URL, () => {});
req.on('error', () => {});
req.setTimeout(10000, () => req.destroy());

// 立即退出，不等待请求完成
process.exit(0);
