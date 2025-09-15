const https = require('https');

// 强化版保活脚本 - 处理网站可能暂时不可用的情况（使用 /__ping）
const URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

const req = https.get(URL, (res) => {
  // 检查状态码
  if (res.statusCode >= 200 && res.statusCode < 300) {
    console.log('OK');
    process.exit(0);
  } else if (res.statusCode >= 500) {
    // 服务器错误，但网站存在
    console.log('SERVER_ERROR');
    process.exit(0); // 仍然算作成功，因为网站存在
  } else {
    console.log('HTTP_' + res.statusCode);
    process.exit(0); // 其他HTTP状态码也算作成功
  }
});

req.on('error', (err) => {
  // 网络错误
  console.log('NETWORK_ERROR');
  process.exit(1);
});

// 增加超时时间到15秒
req.setTimeout(15000, () => {
  req.destroy();
  console.log('TIMEOUT');
  process.exit(1);
});

req.end();
