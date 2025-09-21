const logger = require('../utils/logger');

// 性能监控中间件
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  // 监听响应完成事件
  res.on('finish', () => {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const responseTime = endTime - startTime;
    
    // 记录性能数据
    const performanceData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      memoryUsage: {
        rss: `${Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024)}MB`,
        heapUsed: `${Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024)}MB`
      },
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };
    
    // 根据响应时间决定日志级别
    if (responseTime > 5000) {
      logger.warn('慢请求警告', performanceData);
    } else if (responseTime > 1000) {
      logger.info('性能监控', performanceData);
    } else {
      logger.debug('性能监控', performanceData);
    }
    
    // 如果响应时间过长，记录详细信息
    if (responseTime > 3000) {
      logger.warn('响应时间过长', {
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        memoryDelta: performanceData.memoryUsage
      });
    }
  });
  
  next();
}

// 内存监控中间件
function memoryMonitorMiddleware(req, res, next) {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  // 如果内存使用过高，记录警告
  if (memoryUsageMB.heapUsed > 200) { // 200MB
    logger.warn('内存使用过高', {
      memoryUsage: memoryUsageMB,
      url: req.url,
      method: req.method
    });
  }
  
  // 将内存信息添加到请求对象
  req.memoryUsage = memoryUsageMB;
  
  next();
}

// 数据库查询监控
function databaseMonitorMiddleware(req, res, next) {
  const originalQuery = require('mongoose').Query.prototype.exec;
  const originalAggregate = require('mongoose').Aggregate.prototype.exec;
  
  // 监控查询执行时间
  require('mongoose').Query.prototype.exec = function() {
    const startTime = Date.now();
    const query = this;
    
    return originalQuery.apply(this, arguments).then(result => {
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        logger.warn('慢查询警告', {
          collection: query.model.collection.name,
          operation: 'find',
          duration: `${duration}ms`,
          filter: query.getFilter(),
          options: query.getOptions()
        });
      } else {
        logger.debug('数据库查询', {
          collection: query.model.collection.name,
          operation: 'find',
          duration: `${duration}ms`
        });
      }
      
      return result;
    }).catch(error => {
      const duration = Date.now() - startTime;
      logger.error('数据库查询错误', {
        collection: query.model.collection.name,
        operation: 'find',
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    });
  };
  
  // 监控聚合查询执行时间
  require('mongoose').Aggregate.prototype.exec = function() {
    const startTime = Date.now();
    const aggregate = this;
    
    return originalAggregate.apply(this, arguments).then(result => {
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        logger.warn('慢聚合查询警告', {
          collection: aggregate.model.collection.name,
          operation: 'aggregate',
          duration: `${duration}ms`,
          pipeline: aggregate.pipeline()
        });
      } else {
        logger.debug('数据库聚合查询', {
          collection: aggregate.model.collection.name,
          operation: 'aggregate',
          duration: `${duration}ms`
        });
      }
      
      return result;
    }).catch(error => {
      const duration = Date.now() - startTime;
      logger.error('数据库聚合查询错误', {
        collection: aggregate.model.collection.name,
        operation: 'aggregate',
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    });
  };
  
  next();
}

// 错误监控中间件
function errorMonitorMiddleware(err, req, res, next) {
  logger.logError(err, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  next(err);
}

// 健康检查中间件
function healthCheckMiddleware(req, res, next) {
  if (req.path === '/health' || req.path === '/__health') {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    res.json(healthData);
    return;
  }
  
  next();
}

// 请求统计中间件
function requestStatsMiddleware() {
  const stats = {
    total: 0,
    errors: 0,
    slowRequests: 0,
    startTime: Date.now()
  };
  
  return (req, res, next) => {
    stats.total++;
    
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (res.statusCode >= 400) {
        stats.errors++;
      }
      
      if (duration > 1000) {
        stats.slowRequests++;
      }
    });
    
    // 每分钟输出统计信息
    if (stats.total % 100 === 0) {
      const uptime = Math.round((Date.now() - stats.startTime) / 1000);
      logger.info('请求统计', {
        total: stats.total,
        errors: stats.errors,
        slowRequests: stats.slowRequests,
        uptime: `${uptime}s`,
        errorRate: `${((stats.errors / stats.total) * 100).toFixed(2)}%`
      });
    }
    
    next();
  };
}

module.exports = {
  performanceMiddleware,
  memoryMonitorMiddleware,
  databaseMonitorMiddleware,
  errorMonitorMiddleware,
  healthCheckMiddleware,
  requestStatsMiddleware
};
