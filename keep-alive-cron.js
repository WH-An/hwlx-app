const https = require('https');

// 专门为cron-job.org优化的保活脚本（命中 /__ping）
const URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

const req = https.get(URL, (res) => {
  console.log('OK');
  process.exit(0);
});

req.on('error', () => {
  console.log('FAIL');
  process.exit(1);
});

req.setTimeout(10000, () => {
  req.destroy();
  console.log('TIMEOUT');
  process.exit(1);
});

req.end();
