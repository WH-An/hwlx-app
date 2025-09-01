const https = require('https');

// 配置
const URL = 'https://hai-wai-liu-xue.onrender.com';
const TIMEOUT = 30000;

// 检查网站
function checkWebsite() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = https.get(URL, (res) => {
      const responseTime = Date.now() - startTime;
      console.log(`✅ 网站正常 - HTTP ${res.statusCode} - ${responseTime}ms`);
      resolve({ success: true, statusCode: res.statusCode, responseTime });
    });
    
    req.on('error', (err) => {
      console.log(`❌ 检查失败: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(TIMEOUT, () => {
      console.log(`⏰ 请求超时 (${TIMEOUT}ms)`);
      req.destroy();
      reject(new Error('超时'));
    });
    
    req.end();
  });
}

// 主函数
async function main() {
  try {
    await checkWebsite();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
