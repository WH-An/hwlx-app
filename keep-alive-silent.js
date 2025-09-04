const https = require('https');

// 静默保活脚本 - 几乎无输出
const URL = 'https://hai-wai-liu-xue.onrender.com';

const req = https.get(URL, (res) => {
  // 完全静默，不输出任何内容
  process.exit(0);
});

req.on('error', () => {
  // 静默失败
  process.exit(1);
});

req.setTimeout(10000, () => {
  req.destroy();
  process.exit(1);
});

req.end();
