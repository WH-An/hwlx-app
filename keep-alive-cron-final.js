const https = require('https');

// Cron Job 最终版保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com/ping';

// 立即输出OK，确保cron job成功
console.log('OK');

// 异步发送保活请求
const req = https.get(URL, () => {});
req.on('error', () => {});
req.setTimeout(5000, () => req.destroy());

// 立即退出
process.exit(0);
