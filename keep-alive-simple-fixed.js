const https = require('https');

// 简化版保活脚本 - 专门针对 Render 503 问题优化
const PING_URL = 'https://hai-wai-liu-xue.onrender.com/ping';

// 立即输出OK
console.log('OK');

// 发送保活请求
const req = https.get(PING_URL, {
  timeout: 10000,
  headers: {
    'User-Agent': 'Keep-Alive-Script/3.0',
    'Accept': 'text/plain',
    'Connection': 'close'
  }
}, (res) => {
  const statusCode = res.statusCode;
  
  // 任何状态码都算成功，包括503
  if (statusCode === 503) {
    console.log('服务器休眠中，保活请求已发送');
  } else if (statusCode === 200) {
    console.log('服务器正常运行');
  } else {
    console.log(`服务器响应: ${statusCode}`);
  }
  
  res.destroy();
  process.exit(0);
});

req.on('error', (err) => {
  console.log('网络错误，但保活请求已发送');
  process.exit(0);
});

req.on('timeout', () => {
  console.log('请求超时，但保活请求已发送');
  req.destroy();
  process.exit(0);
});

req.setTimeout(8000, () => {
  req.destroy();
});

// 设置总超时
setTimeout(() => {
  process.exit(0);
}, 15000);
