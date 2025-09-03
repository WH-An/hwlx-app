const https = require('https');
const http = require('http');

// 配置
const URL = process.env.KEEP_ALIVE_URL || 'https://your-app-name.onrender.com';
const INTERVAL = 14 * 60 * 1000; // 14分钟
const MAX_RETRIES = 3;

// 简化的日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// 发送保活请求
function keepAlive() {
    const protocol = URL.startsWith('https') ? https : http;
    
    const req = protocol.get(URL, (res) => {
        const status = res.statusCode;
        if (status === 200) {
            log(`✅ 保活成功 - 状态码: ${status}`);
        } else {
            log(`⚠️  保活响应异常 - 状态码: ${status}`);
        }
        res.resume(); // 释放内存
    });

    req.on('error', (err) => {
        log(`❌ 保活失败: ${err.message}`);
    });

    req.setTimeout(10000, () => {
        req.destroy();
        log(`⏰ 请求超时`);
    });

    req.end();
}

// 主循环
function startKeepAlive() {
    log('🚀 启动保活服务');
    log(`目标URL: ${URL}`);
    log(`间隔时间: ${INTERVAL / 1000}秒`);
    
    // 立即执行一次
    keepAlive();
    
    // 设置定时器
    setInterval(keepAlive, INTERVAL);
}

// 错误处理
process.on('uncaughtException', (err) => {
    log(`💥 未捕获异常: ${err.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 未处理的Promise拒绝: ${reason}`);
});

// 启动服务
if (require.main === module) {
    startKeepAlive();
}

module.exports = { keepAlive, startKeepAlive };
