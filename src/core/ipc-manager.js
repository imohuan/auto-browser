// src/core/ipc-manager.js
// 统一 IPC 管理器

import { ipcMain } from 'electron';
import fs from 'fs';
import { createLogger } from './logger.js';
import { IPC_CONFIG, APP_CONFIG } from './constants.js';

const logger = createLogger('core/ipc-manager');

/**
 * IPC 管理器类
 * 负责统一管理所有 IPC 通信
 */
class IPCManager {
  constructor() {
    // 处理器映射表：{ channel: { handler, options } }
    this.handlers = new Map();

    logger.debug('IPC 管理器初始化');
  }

  /**
   * 注册单个 IPC 处理函数
   * @param {string} channel - IPC 通道名称（格式：'模块:操作'，如 'browser:click'）
   * @param {Function} handler - 处理函数
   * @param {Object} options - 配置项
   * @param {boolean} options.logArgs - 是否记录参数，默认 true
   * @param {boolean} options.logResult - 是否记录结果，默认 true
   * @param {number} options.timeout - 超时时间（毫秒），默认 30000
   */
  register(channel, handler, options = {}) {
    if (this.handlers.has(channel)) {
      logger.warn(`IPC 通道已存在，将被覆盖: ${channel}`);
    }

    const config = {
      handler,
      logArgs: options.logArgs !== undefined ? options.logArgs : IPC_CONFIG.LOG_ARGS,
      logResult: options.logResult !== undefined ? options.logResult : IPC_CONFIG.LOG_RESULT,
      timeout: options.timeout || IPC_CONFIG.DEFAULT_TIMEOUT,
    };

    this.handlers.set(channel, config);
    logger.debug(`注册 IPC 处理器: ${channel}`);
  }

  /**
   * 批量注册 IPC 处理函数
   * @param {Object} handlers - 通道到处理器的映射对象
   * @example
   * registerBatch({
   *   'browser:click': async (selector) => { ... },
   *   'browser:type': {
   *     handler: async (selector, text) => { ... },
   *     options: { logArgs: true, logResult: false }
   *   }
   * })
   */
  registerBatch(handlers) {
    for (const [channel, config] of Object.entries(handlers)) {
      if (typeof config === 'function') {
        // 简写形式：直接是处理函数
        this.register(channel, config);
      } else if (config && typeof config.handler === 'function') {
        // 完整形式：包含 handler 和 options
        this.register(channel, config.handler, config.options || {});
      } else {
        logger.error(`无效的处理器配置: ${channel}`, config);
      }
    }
  }

  /**
   * 执行 IPC 处理函数
   * @param {string} channel - 通道名称
   * @param {...any} args - 参数列表
   * @returns {Promise<Object>} 统一格式的响应对象
   */
  async execute(channel, ...args) {
    const startTime = Date.now();

    // 1. 查找处理器配置
    const config = this.handlers.get(channel);
    if (!config) {
      const duration = Date.now() - startTime;
      logger.error(`IPC 通道不存在: ${channel}`);
      return {
        success: false,
        error: `IPC 通道不存在: ${channel}`,
        duration,
        channel,
      };
    }

    // browser:getInfo 不记录日志 因为他会频繁调用
    try {
      // 2. 记录开始日志（可选包含参数）
      if (channel !== "browser:getInfo") {
        if (config.logArgs && args.length > 0) {
          logger.debug(`[${channel}] 开始执行`, { args });
        } else {
          logger.debug(`[${channel}] 开始执行`);
        }
      }

      // 3. 使用 Promise.race 执行处理函数（支持超时）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('操作超时')), config.timeout);
      });

      const result = await Promise.race([
        config.handler(...args),
        timeoutPromise,
      ]);

      // 4. 记录成功日志和执行时长
      const duration = Date.now() - startTime;

      if (channel !== "browser:getInfo") {
        if (config.logResult) {
          logger.debug(`[${channel}] 执行成功 (${duration}ms)`, { result });
        } else {
          logger.debug(`[${channel}] 执行成功 (${duration}ms)`);
        }
      }

      // 5. 写入结果文件
      const response = {
        success: true,
        data: result,
        duration,
        channel,
      };

      if (channel !== "browser:getInfo") {
        this._writeResult(response);
      }

      return response;
    } catch (error) {
      // 6. 捕获异常，记录错误日志
      const duration = Date.now() - startTime;

      logger.error(`[${channel}] 执行失败 (${duration}ms)`, error);

      const response = {
        success: false,
        error: error.message || String(error),
        stack: error.stack,
        duration,
        channel,
      };

      this._writeResult(response);

      return response;
    }
  }

  /**
   * 写入结果到文件
   * @private
   */
  _writeResult(result) {
    try {
      fs.writeFileSync(APP_CONFIG.RESULT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    } catch (error) {
      logger.error('写入结果文件失败', error);
    }
  }

  /**
   * 为所有已注册的通道创建 Electron IPC 处理器
   */
  setupHandlers() {
    logger.info('开始设置 IPC 处理器');

    // 注册统一执行通道
    ipcMain.handle(IPC_CONFIG.EXECUTE_CHANNEL, async (event, channel, ...args) => {
      return await this.execute(channel, ...args);
    });
    logger.debug(`注册统一执行通道: ${IPC_CONFIG.EXECUTE_CHANNEL}`);

    // 注册获取通道列表接口
    ipcMain.handle(IPC_CONFIG.GET_CHANNELS_CHANNEL, () => {
      const channels = Array.from(this.handlers.keys());
      return {
        success: true,
        data: {
          channels,
          count: channels.length,
        },
      };
    });
    logger.debug(`注册获取通道列表接口: ${IPC_CONFIG.GET_CHANNELS_CHANNEL}`);

    logger.info(`IPC 处理器设置完成，共注册 ${this.handlers.size} 个通道`);
  }

  /**
   * 获取所有已注册的通道
   * @returns {string[]} 通道名称列表
   */
  getChannels() {
    return Array.from(this.handlers.keys());
  }

  /**
   * 检查通道是否已注册
   * @param {string} channel - 通道名称
   * @returns {boolean}
   */
  hasChannel(channel) {
    return this.handlers.has(channel);
  }

  /**
   * 移除通道注册
   * @param {string} channel - 通道名称
   */
  unregister(channel) {
    if (this.handlers.has(channel)) {
      this.handlers.delete(channel);
      logger.debug(`移除 IPC 处理器: ${channel}`);
    }
  }

  /**
   * 清空所有注册的处理器
   */
  clear() {
    this.handlers.clear();
    logger.debug('清空所有 IPC 处理器');
  }
}

// 导出单例
export const ipcManager = new IPCManager();

