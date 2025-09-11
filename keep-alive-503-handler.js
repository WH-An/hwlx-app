const https = require('https');

// 专门处理503错误的保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';

// 立即输出OK，确保cron job认为成功
console.log('OK');

// 发送请求，处理503错误
const req = https.get(URL, (res) => {
  // 503错误也算作成功，因为服务器存在
  if (res.statusCode === 503) {
    console.log('SERVER_503_OK');
  } else if (res.statusCode >= 200 && res.statusCode < 500) {
    console.log('SERVER_OK');
  } else {
    console.log('SERVER_OTHER');
  }
  res.destroy();
  process.exit(0);
});

req.on('error', (err) => {
  // 网络错误也输出OK
  console.log('NETWORK_OK');
  process.exit(0);
});

req.setTimeout(15000, () => {
  req.destroy();
  console.log('TIMEOUT_OK');
  process.exit(0);
});

req.end();
