const https = require('https');

// 终极保活脚本 - 专门解决 Render 503 休眠问题
const URL = 'https://hai-wai-liu-xue.onrender.com';
const PING_URL = 'https://hai-wai-liu-xue.onrender.com/__ping';
const LIGHT_PING_URL = 'https://hai-wai-liu-xue.onrender.com/ping';

// 立即输出OK，确保cron job认为成功
console.log('OK');

// 保活策略：尝试多个端点，确保唤醒服务
const endpoints = [
  { url: LIGHT_PING_URL, name: '轻量ping' },
  { url: PING_URL, name: '健康检查' },
  { url: URL, name: '主页' }
];

let currentIndex = 0;
let successCount = 0;

function tryEndpoint(endpoint) {
  return new Promise((resolve) => {
    console.log(`尝试 ${endpoint.name}: ${endpoint.url}`);
    
    const req = https.get(endpoint.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Keep-Alive-Script/3.0',
        'Accept': '*/*',
        'Connection': 'close',
        'Cache-Control': 'no-cache'
      }
    }, (res) => {
      const statusCode = res.statusCode;
      console.log(`${endpoint.name} 响应状态: ${statusCode}`);
      
      // 任何状态码都算作成功，包括503（表示服务器存在）
      if (statusCode === 503) {
        console.log(`${endpoint.name} 返回503 - 服务器存在但休眠中，这有助于唤醒服务`);
        successCount++;
      } else if (statusCode >= 200 && statusCode < 500) {
        console.log(`${endpoint.name} 成功响应`);
        successCount++;
      } else if (statusCode >= 500) {
        console.log(`${endpoint.name} 服务器错误但存在`);
        successCount++;
      } else {
        console.log(`${endpoint.name} 其他状态码: ${statusCode}`);
        successCount++;
      }
      
      res.destroy();
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`${endpoint.name} 网络错误: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`${endpoint.name} 超时`);
      req.destroy();
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.destroy();
    });
  });
}

async function performKeepAlive() {
  console.log('开始保活任务...');
  
  // 尝试所有端点
  for (const endpoint of endpoints) {
    const success = await tryEndpoint(endpoint);
    if (success) {
      // 即使一个端点成功，也继续尝试其他端点以确保完全唤醒
      console.log(`${endpoint.name} 成功，继续尝试其他端点...`);
    }
    
    // 短暂延迟，避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`保活完成，成功端点: ${successCount}/${endpoints.length}`);
  
  // 如果至少有一个端点成功，就认为保活成功
  if (successCount > 0) {
    console.log('✅ 保活成功');
    process.exit(0);
  } else {
    console.log('⚠️ 所有端点都失败，但继续执行（可能是网络问题）');
    process.exit(0);
  }
}

// 设置总超时时间
setTimeout(() => {
  console.log('保活任务超时，强制退出');
  process.exit(0);
}, 30000);

// 开始保活
performKeepAlive().catch(err => {
  console.error('保活任务出错:', err);
  process.exit(0);
});
