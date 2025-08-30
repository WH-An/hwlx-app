const https = require('https');

// 监控配置
const config = {
  url: 'https://hai-wai-liu-xue.onrender.com',
  interval: 5 * 60 * 1000, // 5分钟
  timeout: 30000 // 30秒
};

// 检查网站状态
function checkWebsite() {
  const startTime = Date.now();
  
  console.log(`[${new Date().toISOString()}] 开始检查网站...`);
  
  const req = https.get(config.url, (res) => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`[${new Date().toISOString()}] ✅ 网站正常 - HTTP ${res.statusCode} - 响应时间: ${responseTime}ms`);
    
    // 这里可以添加通知逻辑，比如发送邮件或webhook
    if (res.statusCode !== 200) {
      console.log(`[${new Date().toISOString()}] ⚠️ 警告: 状态码异常 ${res.statusCode}`);
    }
  });
  
  req.on('error', (err) => {
    console.log(`[${new Date().toISOString()}] ❌ 网站检查失败: ${err.message}`);
    // 这里可以添加错误通知逻辑
  });
  
  req.setTimeout(config.timeout, () => {
    console.log(`[${new Date().toISOString()}] ⏰ 请求超时 (${config.timeout}ms)`);
    req.destroy();
  });
  
  req.end();
}

// 启动监控
console.log('🚀 网站监控服务启动');
console.log(`📡 监控URL: ${config.url}`);
console.log(`⏰ 检查间隔: ${config.interval / 1000}秒`);
console.log('');

// 立即执行一次
checkWebsite();

// 设置定时执行
setInterval(checkWebsite, config.interval);

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 监控服务停止');
  process.exit(0);
});
