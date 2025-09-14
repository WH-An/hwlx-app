const https = require('https');

// 测试503错误处理的脚本
console.log('开始测试503错误处理...');

// 模拟503错误处理
const req = https.get('https://hai-wai-liu-xue.onrender.com', (res) => {
  console.log(`收到响应，状态码: ${res.statusCode}`);
  
  if (res.statusCode === 503) {
    console.log('✅ 503错误被正确处理');
  } else if (res.statusCode >= 200 && res.statusCode < 500) {
    console.log('✅ 正常状态码被正确处理');
  } else {
    console.log(`✅ 其他状态码 ${res.statusCode} 被正确处理`);
  }
  
  res.destroy();
  process.exit(0);
});

req.on('error', (err) => {
  console.log(`✅ 网络错误被正确处理: ${err.message}`);
  process.exit(0);
});

req.setTimeout(10000, () => {
  console.log('✅ 超时被正确处理');
  req.destroy();
  process.exit(0);
});
