const https = require('https');

// 配置
const URL = 'https://hai-wai-liu-xue.onrender.com';
const TIMEOUT = 10000; // 10秒超时

// 极简保活脚本 - 最小输出
function keepAlive() {
  return new Promise((resolve, reject) => {
    const req = https.get(URL, (res) => {
      // 只输出状态码，不输出其他信息
      console.log(res.statusCode);
      resolve(res.statusCode);
    });
    
    req.on('error', (err) => {
      // 只输出错误代码
      console.log('ERROR');
      reject(err);
    });
    
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      console.log('TIMEOUT');
      reject(new Error('timeout'));
    });
    
    req.end();
  });
}

// 主函数 - 静默执行
async function main() {
  try {
    await keepAlive();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
