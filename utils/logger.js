const fs = require('fs');
const path = require('path');

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// 当前日志级别
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'INFO';

// 日志颜色
const COLORS = {
  ERROR: '\x1b[31m', // 红色
  WARN: '\x1b[33m',  // 黄色
  INFO: '\x1b[36m',  // 青色
  DEBUG: '\x1b[90m', // 灰色
  RESET: '\x1b[0m'   // 重置
};

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  // 确保日志目录存在
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 格式化日志消息
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    return `[${timestamp}] [${level}] [PID:${pid}] ${message}${metaStr}`;
  }

  // 写入日志文件
  writeToFile(level, message, meta) {
    const logFile = path.join(this.logDir, `${level.toLowerCase()}.log`);
    const formattedMessage = this.formatMessage(level, message, meta) + '\n';
    
    fs.appendFile(logFile, formattedMessage, (err) => {
      if (err) {
        console.error('写入日志文件失败:', err);
      }
    });
  }

  // 控制台输出
  logToConsole(level, message, meta) {
    const color = COLORS[level] || COLORS.RESET;
    const reset = COLORS.RESET;
    const formattedMessage = this.formatMessage(level, message, meta);
    
    console.log(`${color}${formattedMessage}${reset}`);
  }

  // 通用日志方法
  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] <= LOG_LEVELS[CURRENT_LEVEL]) {
      this.logToConsole(level, message, meta);
      this.writeToFile(level, message, meta);
    }
  }

  // 错误日志
  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  // 警告日志
  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  // 信息日志
  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  // 调试日志
  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // API请求日志
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (res.statusCode >= 400) {
      this.warn('API请求', meta);
    } else {
      this.info('API请求', meta);
    }
  }

  // 数据库操作日志
  logDatabase(operation, collection, query, result) {
    const meta = {
      operation,
      collection,
      query: JSON.stringify(query),
      resultCount: Array.isArray(result) ? result.length : 1
    };
    
    this.debug('数据库操作', meta);
  }

  // 错误处理日志
  logError(error, context = {}) {
    const meta = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    };
    
    this.error('应用程序错误', meta);
  }

  // 性能监控日志
  logPerformance(operation, duration, meta = {}) {
    const performanceMeta = {
      operation,
      duration: `${duration}ms`,
      ...meta
    };
    
    if (duration > 1000) {
      this.warn('性能警告', performanceMeta);
    } else {
      this.debug('性能监控', performanceMeta);
    }
  }

  // 清理旧日志文件
  cleanOldLogs(daysToKeep = 7) {
    const files = fs.readdirSync(this.logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    files.forEach(file => {
      if (file.endsWith('.log')) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`删除旧日志文件: ${file}`);
        }
      }
    });
  }
}

// 创建全局日志实例
const logger = new Logger();

// 定期清理旧日志（每天执行一次）
setInterval(() => {
  logger.cleanOldLogs();
}, 24 * 60 * 60 * 1000);

module.exports = logger;
