const https = require('https');

// 监控配置
const config = {
  url: 'https://hai-wai-liu-xue.onrender.com',
  timeout: 30000 // 30秒
};

// 检查网站状态
function checkWebsite() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    console.log(`[${new Date().toISOString()}] 开始检查网站...`);
    
    const req = https.get(config.url, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`[${new Date().toISOString()}] ✅ 网站正常 - HTTP ${res.statusCode} - 响应时间: ${responseTime}ms`);
      
      if (res.statusCode !== 200) {
        console.log(`[${new Date().toISOString()}] ⚠️ 警告: 状态码异常 ${res.statusCode}`);
      }
      
      resolve({ success: true, statusCode: res.statusCode, responseTime });
    });
    
    req.on('error', (err) => {
      console.log(`[${new Date().toISOString()}] ❌ 网站检查失败: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(config.timeout, () => {
      console.log(`[${new Date().toISOString()}] ⏰ 请求超时 (${config.timeout}ms)`);
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

// 主函数 - 只执行一次检查
async function main() {
  try {
    console.log('🚀 网站监控检查开始');
    console.log(`📡 监控URL: ${config.url}`);
    console.log('');
    
    await checkWebsite();
    
    console.log('');
    console.log('✅ 检查完成');
    process.exit(0);
  } catch (error) {
    console.log('');
    console.log('❌ 检查失败');
    process.exit(1);
  }
}

// 执行主函数
main();
