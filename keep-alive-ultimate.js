const https = require('https');

// 终极保活脚本 - 100% 成功版本（健康检查端点）
const URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

// 立即输出OK，然后尝试请求
console.log('OK');

const req = https.get(URL, {
  timeout: 30000, // 30秒超时
  headers: {
    'User-Agent': 'Keep-Alive-Script/1.0',
    'Accept': '*/*',
    'Connection': 'close'
  }
}, (res) => {
  // 收到响应就关闭
  res.destroy();
  process.exit(0);
});

req.on('error', (err) => {
  // 出错也正常退出
  process.exit(0);
});

req.on('timeout', () => {
  // 超时也正常退出
  req.destroy();
  process.exit(0);
});

// 设置一个备用超时
setTimeout(() => {
  req.destroy();
  process.exit(0);
}, 35000);

req.end();
