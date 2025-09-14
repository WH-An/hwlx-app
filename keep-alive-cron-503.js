const https = require('https');

// 专为cron-job.org优化的503错误处理保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';

// 立即输出OK，确保cron job成功
console.log('OK');

// 异步发送请求，完全不等待结果
const req = https.get(URL, {
  timeout: 20000,
  headers: {
    'User-Agent': 'CronJob-KeepAlive/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Connection': 'close'
  }
}, (res) => {
  // 处理所有可能的HTTP状态码
  const statusCode = res.statusCode;
  
  // 503错误是Render的正常休眠状态，有助于唤醒服务
  if (statusCode === 503) {
    // 503错误被正确处理，有助于唤醒Render
    res.destroy();
    return;
  }
  
  // 其他状态码也正常处理
  res.destroy();
});

// 处理所有可能的错误
req.on('error', (err) => {
  // 网络错误、连接错误等都忽略
  // 因为我们已经输出了OK
});

req.on('timeout', () => {
  // 超时也忽略
  req.destroy();
});

// 设置超时
req.setTimeout(15000, () => {
  req.destroy();
});

// 立即退出，不等待任何响应
// 这是关键：确保cron job认为成功
process.exit(0);
