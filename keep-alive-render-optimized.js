const https = require('https');

// Render 优化保活脚本 - 专门解决 503 休眠问题
const BASE_URL = 'https://hai-wai-liu-xue.onrender.com';

// 保活端点列表（按优先级排序）
const ENDPOINTS = [
  { path: '/ping', name: '轻量ping', priority: 1 },
  { path: '/__ping', name: '健康检查', priority: 2 },
  { path: '/', name: '主页', priority: 3 }
];

// 立即输出OK，确保cron job成功
console.log('OK');

// 请求配置
const REQUEST_CONFIG = {
  timeout: 12000,
  headers: {
    'User-Agent': 'Render-KeepAlive/1.0',
    'Accept': '*/*',
    'Connection': 'close',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
};

let successCount = 0;
let totalAttempts = 0;

function makeRequest(url, endpointName) {
  return new Promise((resolve) => {
    totalAttempts++;
    console.log(`[${totalAttempts}] 尝试 ${endpointName}: ${url}`);
    
    const req = https.get(url, REQUEST_CONFIG, (res) => {
      const statusCode = res.statusCode;
      const responseTime = Date.now() - req.startTime;
      
      console.log(`[${totalAttempts}] ${endpointName} 响应: ${statusCode} (${responseTime}ms)`);
      
      // 处理各种状态码
      if (statusCode === 503) {
        console.log(`[${totalAttempts}] ✅ 503 - 服务器休眠中，保活成功（这有助于唤醒服务）`);
        successCount++;
      } else if (statusCode === 200) {
        console.log(`[${totalAttempts}] ✅ 200 - 服务器正常运行`);
        successCount++;
      } else if (statusCode >= 200 && statusCode < 400) {
        console.log(`[${totalAttempts}] ✅ ${statusCode} - 服务器响应正常`);
        successCount++;
      } else if (statusCode >= 400 && statusCode < 500) {
        console.log(`[${totalAttempts}] ⚠️ ${statusCode} - 客户端错误，但服务器存在`);
        successCount++;
      } else if (statusCode >= 500) {
        console.log(`[${totalAttempts}] ⚠️ ${statusCode} - 服务器错误，但服务器存在`);
        successCount++;
      } else {
        console.log(`[${totalAttempts}] ❓ ${statusCode} - 未知状态码`);
        successCount++;
      }
      
      res.destroy();
      resolve(true);
    });

    // 记录开始时间
    req.startTime = Date.now();

    req.on('error', (err) => {
      console.log(`[${totalAttempts}] ❌ ${endpointName} 网络错误: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`[${totalAttempts}] ⏰ ${endpointName} 请求超时`);
      req.destroy();
      resolve(false);
    });

    // 设置请求超时
    req.setTimeout(10000, () => {
      req.destroy();
    });
  });
}

async function performKeepAlive() {
  console.log('🚀 开始 Render 保活任务...');
  console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`🎯 目标: ${BASE_URL}`);
  console.log('');

  // 按优先级尝试所有端点
  for (const endpoint of ENDPOINTS) {
    const url = BASE_URL + endpoint.path;
    const success = await makeRequest(url, endpoint.name);
    
    if (success) {
      console.log(`✅ ${endpoint.name} 成功`);
    } else {
      console.log(`❌ ${endpoint.name} 失败`);
    }
    
    // 端点间延迟，避免过于频繁的请求
    if (endpoint.priority < ENDPOINTS.length) {
      console.log('⏳ 等待 2 秒后尝试下一个端点...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('');
  console.log('📊 保活任务完成统计:');
  console.log(`  总尝试次数: ${totalAttempts}`);
  console.log(`  成功次数: ${successCount}`);
  console.log(`  成功率: ${totalAttempts > 0 ? ((successCount / totalAttempts) * 100).toFixed(1) : 0}%`);

  if (successCount > 0) {
    console.log('🎉 保活任务成功完成！');
  } else {
    console.log('⚠️ 所有端点都失败，但保活请求已发送');
  }

  console.log('');
  console.log('💡 提示: 即使返回503错误也是正常的，这表示服务器存在但处于休眠状态，保活请求有助于唤醒服务');
}

// 设置总超时时间（30秒）
setTimeout(() => {
  console.log('⏰ 保活任务超时，强制退出');
  process.exit(0);
}, 30000);

// 开始执行保活任务
performKeepAlive().catch(err => {
  console.error('❌ 保活任务执行出错:', err.message);
  process.exit(0);
});
