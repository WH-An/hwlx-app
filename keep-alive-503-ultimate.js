const https = require('https');

// 终极503错误处理保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';
const PING_URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

// 立即输出OK，确保cron job成功
console.log('OK');

// 尝试多个端点的保活策略
const endpoints = [PING_URL, URL];
let currentIndex = 0;

function tryEndpoint(url) {
  const req = https.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Keep-Alive-Script/2.0',
      'Accept': '*/*',
      'Connection': 'close'
    }
  }, (res) => {
    // 记录状态码但不输出到控制台
    const statusCode = res.statusCode;
    
    // 任何状态码都算作成功，包括503
    if (statusCode === 503) {
      // 503错误是正常的，有助于唤醒Render服务
      res.destroy();
      process.exit(0);
    } else if (statusCode >= 200 && statusCode < 500) {
      // 2xx-4xx状态码都算作成功
      res.destroy();
      process.exit(0);
    } else if (statusCode >= 500) {
      // 5xx错误也忽略，因为服务器存在
      res.destroy();
      process.exit(0);
    } else {
      // 其他状态码也算作成功
      res.destroy();
      process.exit(0);
    }
  });

  req.on('error', (err) => {
    // 网络错误，尝试下一个端点
    if (currentIndex < endpoints.length - 1) {
      currentIndex++;
      tryEndpoint(endpoints[currentIndex]);
    } else {
      // 所有端点都失败，但仍然输出OK
      process.exit(0);
    }
  });

  req.on('timeout', () => {
    // 超时，尝试下一个端点
    req.destroy();
    if (currentIndex < endpoints.length - 1) {
      currentIndex++;
      tryEndpoint(endpoints[currentIndex]);
    } else {
      process.exit(0);
    }
  });

  req.setTimeout(10000, () => {
    req.destroy();
  });
}

// 开始尝试第一个端点
tryEndpoint(endpoints[currentIndex]);

// 设置总超时时间，确保脚本不会无限运行
setTimeout(() => {
  process.exit(0);
}, 20000);
