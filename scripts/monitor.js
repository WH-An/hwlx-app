#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// 监控配置
const CONFIG = {
  url: 'https://hai-wai-liu-xue.onrender.com',
  checkInterval: 60000, // 1分钟检查一次
  timeout: 10000, // 10秒超时
  logFile: path.join(__dirname, '../logs/monitor.log'),
  alertThreshold: 3, // 连续3次失败才报警
};

// 监控状态
let failureCount = 0;
let lastCheckTime = null;
let isHealthy = true;

// 确保日志目录存在
const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  fs.appendFileSync(CONFIG.logFile, logMessage);
}

// 检查网站健康状态
function checkHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(CONFIG.url + '/ping', {
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'HealthMonitor/1.0'
      }
    }, (res) => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      res.destroy();
      
      if (statusCode === 200 || statusCode === 503) {
        // 200表示正常，503表示休眠但服务器存在
        resolve({
          success: true,
          statusCode,
          responseTime,
          message: statusCode === 503 ? '服务器休眠中' : '服务器正常'
        });
      } else {
        resolve({
          success: false,
          statusCode,
          responseTime,
          message: `HTTP ${statusCode}`
        });
      }
    });
    
    req.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        error: err.message,
        responseTime,
        message: '连接失败'
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        success: false,
        error: 'timeout',
        responseTime,
        message: '请求超时'
      });
    });
  });
}

// 执行健康检查
async function performHealthCheck() {
  try {
    lastCheckTime = new Date();
    const result = await checkHealth();
    
    if (result.success) {
      if (failureCount > 0) {
        log(`✅ 服务恢复 - 响应时间: ${result.responseTime}ms, 状态: ${result.statusCode}`);
        failureCount = 0;
        isHealthy = true;
      } else {
        log(`✅ 服务正常 - 响应时间: ${result.responseTime}ms, 状态: ${result.statusCode}`);
      }
    } else {
      failureCount++;
      log(`❌ 服务异常 (${failureCount}/${CONFIG.alertThreshold}) - ${result.message}, 响应时间: ${result.responseTime}ms`);
      
      if (failureCount >= CONFIG.alertThreshold && isHealthy) {
        log(`🚨 服务持续异常，开始报警 - 连续失败 ${failureCount} 次`);
        isHealthy = false;
        await sendAlert(result);
      }
    }
  } catch (error) {
    failureCount++;
    log(`❌ 检查失败 (${failureCount}/${CONFIG.alertThreshold}) - ${error.message}`);
    
    if (failureCount >= CONFIG.alertThreshold && isHealthy) {
      log(`🚨 检查持续失败，开始报警 - 连续失败 ${failureCount} 次`);
      isHealthy = false;
      await sendAlert({ error: error.message });
    }
  }
}

// 发送报警（这里可以集成邮件、短信等通知方式）
async function sendAlert(result) {
  log(`📧 发送报警通知 - 服务异常: ${JSON.stringify(result)}`);
  
  // 这里可以添加实际的报警逻辑
  // 例如：发送邮件、短信、Slack通知等
  console.log('🚨 报警：服务异常！');
  console.log('详情：', result);
}

// 生成监控报告
function generateReport() {
  const now = new Date();
  const uptime = process.uptime();
  
  const report = {
    timestamp: now.toISOString(),
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    status: isHealthy ? 'healthy' : 'unhealthy',
    failureCount,
    lastCheck: lastCheckTime ? lastCheckTime.toISOString() : 'never',
    config: {
      url: CONFIG.url,
      checkInterval: CONFIG.checkInterval,
      timeout: CONFIG.timeout
    }
  };
  
  log(`📊 监控报告: ${JSON.stringify(report, null, 2)}`);
  return report;
}

// 清理旧日志
function cleanupLogs() {
  try {
    const logContent = fs.readFileSync(CONFIG.logFile, 'utf8');
    const lines = logContent.split('\n');
    
    // 保留最近1000行日志
    if (lines.length > 1000) {
      const recentLines = lines.slice(-1000);
      fs.writeFileSync(CONFIG.logFile, recentLines.join('\n'));
      log('🧹 清理旧日志完成');
    }
  } catch (error) {
    log(`❌ 清理日志失败: ${error.message}`);
  }
}

// 主监控循环
async function startMonitoring() {
  log('🚀 开始监控服务');
  log(`📡 监控目标: ${CONFIG.url}`);
  log(`⏱️ 检查间隔: ${CONFIG.checkInterval / 1000}秒`);
  
  // 立即执行一次检查
  await performHealthCheck();
  
  // 设置定时检查
  const interval = setInterval(performHealthCheck, CONFIG.checkInterval);
  
  // 每小时生成一次报告
  const reportInterval = setInterval(generateReport, 60 * 60 * 1000);
  
  // 每天清理一次日志
  const cleanupInterval = setInterval(cleanupLogs, 24 * 60 * 60 * 1000);
  
  // 优雅关闭
  process.on('SIGINT', () => {
    log('🛑 收到停止信号，正在关闭监控...');
    clearInterval(interval);
    clearInterval(reportInterval);
    clearInterval(cleanupInterval);
    generateReport();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('🛑 收到终止信号，正在关闭监控...');
    clearInterval(interval);
    clearInterval(reportInterval);
    clearInterval(cleanupInterval);
    generateReport();
    process.exit(0);
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  startMonitoring().catch(error => {
    log(`❌ 监控启动失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkHealth,
  performHealthCheck,
  generateReport,
  startMonitoring
};
