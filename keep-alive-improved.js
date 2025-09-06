const https = require('https');

// 改进版保活脚本 - 增加超时时间和错误处理
const URL = 'https://hai-wai-liu-xue.onrender.com';

const req = https.get(URL, {
  timeout: 15000, // 15秒超时
  headers: {
    'User-Agent': 'Keep-Alive-Script/1.0'
  }
}, (res) => {
  // 立即输出结果，不等待响应体
  console.log('OK');
  res.destroy(); // 立即关闭连接
  process.exit(0);
});

req.on('error', (err) => {
  console.log('FAIL');
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.log('TIMEOUT');
  process.exit(1);
});

// 设置请求超时
req.setTimeout(15000);

req.end();
