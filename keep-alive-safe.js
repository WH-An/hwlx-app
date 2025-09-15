const https = require('https');

// 安全保活脚本 - 最小输出（使用 /__ping）
const URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

const req = https.get(URL, (res) => {
  // 只输出一个简单的成功标识
  console.log('OK');
  process.exit(0);
});

req.on('error', () => {
  console.log('FAIL');
  process.exit(1);
});

req.setTimeout(8000, () => {
  req.destroy();
  console.log('TIMEOUT');
  process.exit(1);
});

req.end();
