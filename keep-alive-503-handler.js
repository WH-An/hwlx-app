const https = require('https');

// 专门处理HTTP 503错误的保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';

// 立即输出OK，确保cron job成功
console.log('OK');

// 异步发送请求，不等待结果
const req = https.get(URL, (res) => {
  // 处理各种HTTP状态码
  if (res.statusCode === 503) {
    // 503错误是正常的，表示服务器存在但暂时不可用
    // 这实际上有助于"唤醒"Render服务
    res.destroy();
    process.exit(0);
  } else if (res.statusCode >= 200 && res.statusCode < 500) {
    // 2xx-4xx状态码都算作成功
    res.destroy();
    process.exit(0);
  } else {
    // 5xx错误也忽略，因为服务器存在
    res.destroy();
    process.exit(0);
  }
});

req.on('error', (err) => {
  // 忽略所有网络错误
  process.exit(0);
});

req.setTimeout(10000, () => {
  req.destroy();
  process.exit(0);
});

// 立即退出，不等待请求完成
process.exit(0);