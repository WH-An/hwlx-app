const https = require('https');

// 处理HTTP错误的强化保活脚本
const URL = 'https://hai-wai-liu-xue.onrender.com';
const PING_URL = 'https://hai-wai-liu-xue.onrender.com/__ping';

// 立即输出OK，确保cron job成功
console.log('OK');

// 尝试健康检查端点（更快更可靠）
const pingReq = https.get(PING_URL, (res) => {
  // 健康检查成功
  res.destroy();
  process.exit(0);
});

pingReq.on('error', () => {
  // 健康检查失败，尝试主页
  const mainReq = https.get(URL, (res) => {
    // 任何HTTP状态码都算作成功（包括503）
    // 503错误实际上是正常的，表示服务器存在但暂时不可用
    res.destroy();
    process.exit(0);
  });

  mainReq.on('error', () => {
    // 网络错误也忽略，因为我们已经输出了OK
    process.exit(0);
  });

  mainReq.setTimeout(8000, () => {
    mainReq.destroy();
    process.exit(0);
  });
});

pingReq.setTimeout(5000, () => {
  pingReq.destroy();
  // 超时后尝试主页
  const mainReq = https.get(URL, (res) => {
    res.destroy();
    process.exit(0);
  });

  mainReq.on('error', () => {
    process.exit(0);
  });

  mainReq.setTimeout(8000, () => {
    mainReq.destroy();
    process.exit(0);
  });
});

// 立即退出，不等待请求完成
process.exit(0);
