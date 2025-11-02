// src/handlers/network.js
// 网络监控功能处理器

import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';
import { NetworkMonitor } from '../services/network-service.js';

const logger = createLogger('handlers/network');

// 存储每个视图的网络监控器实例
const networkMonitors = new Map();

/**
 * 获取或创建网络监控器
 * @param {WebContents} webContents - WebContents 实例
 * @returns {NetworkMonitor} 网络监控器实例
 */
function getNetworkMonitor(webContents) {
  // 使用 webContents.id 作为唯一标识
  const id = webContents.id;
  if (!networkMonitors.has(id)) {
    networkMonitors.set(id, new NetworkMonitor(webContents));
    logger.debug('创建网络监控器', { id });
  }
  return networkMonitors.get(id);
}

/**
 * 注册网络处理器
 * @param {ViewManager} viewManager - 视图管理器实例
 */
export function registerNetworkHandlers(viewManager) {
  logger.debug('注册网络处理器');

  ipcManager.registerBatch({
    /**
     * 启动 WebRequest 网络捕获（不含响应体）
     */
    'network:startWebRequestCapture': async (viewId, options = {}) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const result = await monitor.startWebRequestCapture(options);
      logger.info('启动 WebRequest 捕获', { viewId, result });
      return result;
    },

    /**
     * 停止 WebRequest 网络捕获
     */
    'network:stopWebRequestCapture': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const result = await monitor.stopWebRequestCapture();
      logger.info('停止 WebRequest 捕获', { viewId, requestCount: result.requestCount });
      return result;
    },

    /**
     * 启动 Debugger 网络捕获（含响应体）
     */
    'network:startDebuggerCapture': async (viewId, options = {}) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const result = await monitor.startDebuggerCapture(options);
      logger.info('启动 Debugger 捕获', { viewId, result });
      return result;
    },

    /**
     * 停止 Debugger 网络捕获
     */
    'network:stopDebuggerCapture': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const result = await monitor.stopDebuggerCapture();
      logger.info('停止 Debugger 捕获', { viewId, requestCount: result.requestCount });
      return result;
    },

    /**
     * 发送网络请求
     */
    'network:sendRequest': async (viewId, url, method = 'GET', headers = {}, body = null, timeout = 30000) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const result = await monitor.sendRequest({
        url,
        method,
        headers,
        body,
        timeout
      });
      logger.info('发送网络请求', { viewId, url, method, success: result.success });
      return result;
    },

    /**
     * 获取网络监控状态
     */
    'network:getStatus': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const monitor = getNetworkMonitor(view.webContents);
      const status = monitor.getStatus();
      logger.debug('获取网络状态', { viewId, status });
      return { success: true, data: status };
    },
  });

  logger.debug('网络处理器注册完成');
}

