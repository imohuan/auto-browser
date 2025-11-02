// src/core/logger.js
// 增强日志系统（支持相对路径:行号:列号）

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LOG_LEVEL, APP_CONFIG } from './constants.js';
import { ensureDir } from '../utils/file-utils.js';

// 获取当前文件目录（用于计算相对路径）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * 获取调用者信息（相对路径:行号:列号）
 * @returns {string} 格式：'src/handlers/browser.js:45:12'
 */
function getCallerInfo() {
  try {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');

    // 找到第一个不是 logger.js 的调用
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];

      // 匹配文件路径和位置信息
      // 支持两种格式：
      // 1. file:///path/to/file.js:line:col （ESM 格式）
      // 2. (E:\path\to\file.js:line:col) 或 E:\path\to\file.js:line:col （Windows 格式）
      // 3. (/path/to/file.js:line:col) 或 /path/to/file.js:line:col （Unix 格式）

      let filePath, lineNum, colNum;

      // 尝试匹配 file:/// 格式
      const fileUrlMatch = line.match(/\(?(file:\/\/\/[^:)]+):(\d+):(\d+)\)?/);
      if (fileUrlMatch) {
        filePath = fileURLToPath(fileUrlMatch[1]);
        lineNum = fileUrlMatch[2];
        colNum = fileUrlMatch[3];
      } else {
        // 尝试匹配绝对路径格式（Windows: C:\... 或 Unix: /...）
        const absPathMatch = line.match(/\(?([A-Z]:[\\\/].*?\.(?:js|mjs|cjs)|\/.*?\.(?:js|mjs|cjs)):(\d+):(\d+)\)?/);
        if (absPathMatch) {
          filePath = absPathMatch[1];
          lineNum = absPathMatch[2];
          colNum = absPathMatch[3];
        }
      }

      if (filePath) {
        // 跳过 logger.js 本身
        if (filePath.includes('logger.js')) continue;

        // 转换为相对路径，并统一使用正斜杠
        let relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');

        // 确保路径以 src/ 开头（移除 ../../ 等前缀）
        if (relativePath.includes('src/')) {
          relativePath = relativePath.substring(relativePath.indexOf('src/'));
        }

        return `${relativePath}:${lineNum}:${colNum}`;
      }
    }

    return 'unknown';
  } catch (error) {
    return 'error-parsing-stack';
  }
}

/**
 * 去除 ANSI 转义序列（颜色代码）
 * @param {string} str - 可能包含 ANSI 转义序列的字符串
 * @returns {string} 去除转义序列后的字符串
 */
function stripAnsiCodes(str) {
  // 匹配 ANSI 转义序列：\x1b[...m 或 \x1b[数字m 等格式
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 格式化日志消息
 * @param {string} level - 日志级别
 * @param {string} message - 消息内容
 * @param {any} data - 附加数据
 * @param {string} callerInfo - 调用者信息
 * @param {string} moduleName - 模块名称
 * @returns {string} 格式化后的日志字符串
 */
function formatMessage(level, message, data, callerInfo, moduleName) {
  const timestamp = new Date().toISOString();
  const moduleTag = moduleName ? `[${moduleName}] ` : '';

  let logMessage = `[${timestamp}] [${level}] [${callerInfo}] ${moduleTag}${message}`;

  // 如果有附加数据，格式化输出
  if (data !== undefined && data !== null) {
    if (data instanceof Error) {
      logMessage += `\n${data.stack || data.message}`;
    } else if (typeof data === 'object') {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    } else {
      logMessage += ` ${data}`;
    }
  }

  return logMessage;
}


function writeLogOriginal(logMessage) {
  try {
    const fileMessage = stripAnsiCodes(logMessage);
    const logFilePath = APP_CONFIG.LOG_FILE;

    // 确保日志目录存在
    const logDir = path.dirname(logFilePath);
    ensureDir(logDir);

    fs.appendFileSync(logFilePath, fileMessage + '\n', 'utf-8');
  } catch (error) {
    console.error('写入日志文件失败:', error.message);
  }
}

/**
 * 写入日志
 * @param {string} level - 日志级别
 * @param {string} message - 消息内容
 * @param {any} data - 附加数据
 * @param {string} moduleName - 模块名称
 */
function writeLog(level, message, data, moduleName) {
  const callerInfo = getCallerInfo();
  const logMessage = formatMessage(level, message, data, callerInfo, moduleName);

  // 根据级别使用不同颜色输出到控制台
  const colors = {
    [LOG_LEVEL.INFO]: '\x1b[36m',    // 青色
    [LOG_LEVEL.WARN]: '\x1b[33m',    // 黄色
    [LOG_LEVEL.ERROR]: '\x1b[31m',   // 红色
    [LOG_LEVEL.DEBUG]: '\x1b[90m',   // 灰色
  };
  const reset = '\x1b[0m';

  console.log(`${colors[level] || ''}${logMessage}${reset}`);

  // 追加写入日志文件（去除 ANSI 转义序列）
  try {
    const fileMessage = stripAnsiCodes(logMessage);
    const logFilePath = APP_CONFIG.LOG_FILE;

    // 确保日志目录存在
    const logDir = path.dirname(logFilePath);
    ensureDir(logDir);

    fs.appendFileSync(logFilePath, fileMessage + '\n', 'utf-8');
  } catch (error) {
    console.error('写入日志文件失败:', error.message);
  }
}

/**
 * 创建带模块名的 Logger
 * @param {string} moduleName - 模块名称（如 'main', 'handlers/browser'）
 * @returns {Logger} Logger 实例
 */
export function createLogger(moduleName) {
  return {
    info: (message, data) => writeLog(LOG_LEVEL.INFO, message, data, moduleName),
    warn: (message, data) => writeLog(LOG_LEVEL.WARN, message, data, moduleName),
    error: (message, data) => writeLog(LOG_LEVEL.ERROR, message, data, moduleName),
    debug: (message, data) => writeLog(LOG_LEVEL.DEBUG, message, data, moduleName),
    log: (message) => writeLogOriginal(message),
  };
}

/**
 * 默认 Logger（向后兼容）
 */
const defaultLogger = {
  ...createLogger(null),

  /**
   * 清空日志文件
   */
  clear: () => {
    try {
      const logFilePath = APP_CONFIG.LOG_FILE;
      const logDir = path.dirname(logFilePath);
      ensureDir(logDir);
      fs.writeFileSync(logFilePath, '', 'utf-8');
      console.log('日志文件已清空');
    } catch (error) {
      console.error('清空日志文件失败:', error.message);
    }
  },
};

export default defaultLogger;

