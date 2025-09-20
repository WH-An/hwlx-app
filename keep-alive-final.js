const https = require('https');

// 最终版保活脚本 - 专门解决 Render 503 问题
const URL = 'https://hai-wai-liu-xue.onrender.com/ping';

// 立即输出OK
console.log('OK');

// 发送保活请求，不等待响应
const req = https.get(URL, {
  timeout: 5000,
  headers: {
    'User-Agent': 'KeepAlive-Final/1.0',
    'Accept': 'text/plain',
    'Connection': 'close'
  }
}, (res) => {
  // 任何状态码都算成功
  res.destroy();
});

req.on('error', () => {
  // 忽略错误
});

req.on('timeout', () => {
  req.destroy();
});

req.setTimeout(3000, () => {
  req.destroy();
});

// 立即退出
process.exit(0);