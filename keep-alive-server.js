// 服务器端保活增强脚本
// 这个脚本可以添加到您的服务器中，提供更好的保活支持

const express = require('express');
const app = express();

// 轻量级保活端点 - 专门为 cron job 优化
app.get('/keepalive', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// 超轻量级保活端点 - 只返回文本
app.get('/alive', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('text/plain').send('alive');
});

// 健康检查端点 - 包含更多信息
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 保活统计端点
let keepAliveStats = {
  totalRequests: 0,
  lastRequest: null,
  startTime: new Date()
};

app.get('/keepalive-stats', (req, res) => {
  res.json({
    ...keepAliveStats,
    uptime: process.uptime(),
    currentTime: new Date().toISOString()
  });
});

// 中间件：记录保活请求
app.use('/keepalive', (req, res, next) => {
  keepAliveStats.totalRequests++;
  keepAliveStats.lastRequest = new Date().toISOString();
  next();
});

app.use('/alive', (req, res, next) => {
  keepAliveStats.totalRequests++;
  keepAliveStats.lastRequest = new Date().toISOString();
  next();
});

module.exports = app;
