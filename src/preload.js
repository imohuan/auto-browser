// src/preload.js
// 预加载脚本（IPC 桥接）

import { contextBridge, ipcRenderer } from 'electron';
import { APP_CONFIG } from './core/constants.js';

// 不在 preload 中使用 logger，避免在 app 初始化前调用 resolveUserData
// 使用 console 进行简单日志输出
const logger = {
  info: (...args) => console.log('[preload:INFO]', ...args),
  warn: (...args) => console.warn('[preload:WARN]', ...args),
  error: (...args) => console.error('[preload:ERROR]', ...args),
  debug: (...args) => console.log('[preload:DEBUG]', ...args),
};

// 暴露日志工具到渲染进程（通过 IPC 调用主进程的 logger）
contextBridge.exposeInMainWorld('logger', {
  info: (message, data) => ipcRenderer.invoke('ipc:execute', 'logger:info', message, data),
  warn: (message, data) => ipcRenderer.invoke('ipc:execute', 'logger:warn', message, data),
  error: (message, data) => ipcRenderer.invoke('ipc:execute', 'logger:error', message, data),
  debug: (message, data) => ipcRenderer.invoke('ipc:execute', 'logger:debug', message, data),
});

const eventListeners = new Map();

contextBridge.exposeInMainWorld("pocketbaseAPI", {
  url: APP_CONFIG.POCKETBASE_URL,
});

/**
 * 暴露统一的 IPC 调用接口到渲染进程
 */
contextBridge.exposeInMainWorld('browserAPI', {
  /**
   * 通用 IPC 调用接口
   * @param {string} channel - IPC 通道名称（格式：'模块:操作'）
   * @param {...any} args - 参数列表
   * @returns {Promise<Object>} 统一格式的响应对象
   * 
   * 返回格式：
   * - 成功: { success: true, data: {...}, duration: 123, channel: 'xxx' }
   * - 失败: { success: false, error: 'xxx', stack: 'xxx', duration: 123, channel: 'xxx' }
   */
  invoke: (channel, ...args) => {
    logger.debug(`IPC 调用: ${channel}`, { argsCount: args.length });
    return ipcRenderer.invoke('ipc:execute', channel, ...args);
  },

  /**
   * 获取所有可用的 IPC 通道
   * @returns {Promise<Object>} { success: true, data: { channels: [...], count: 123 } }
   */
  getChannels: () => {
    logger.debug('获取所有 IPC 通道');
    return ipcRenderer.invoke('ipc:getChannels');
  },

  /**
   * 订阅主进程事件
   * @param {string} channel
   * @param {(payload: any) => void} listener
   */
  on: (channel, listener) => {
    const wrapped = (_event, payload) => listener(payload);
    const listeners = eventListeners.get(channel) || new Map();
    listeners.set(listener, wrapped);
    eventListeners.set(channel, listeners);
    ipcRenderer.on(channel, wrapped);
  },

  /**
   * 移除事件订阅
   * @param {string} channel
   * @param {(payload: any) => void} listener
   */
  off: (channel, listener) => {
    const listeners = eventListeners.get(channel);
    if (!listeners) return;
    const wrapped = listeners.get(listener);
    if (!wrapped) return;
    ipcRenderer.removeListener(channel, wrapped);
    listeners.delete(listener);
    if (listeners.size === 0) {
      eventListeners.delete(channel);
    }
  },
});

logger.info('browserAPI 已暴露到渲染进程');
logger.info('预加载脚本初始化完成');

