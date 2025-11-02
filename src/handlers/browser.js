// src/handlers/browser.js
// 浏览器基础操作处理器

import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';

const logger = createLogger('handlers/browser');

/**
 * 注册浏览器处理器
 * @param {ViewManager} viewManager - 视图管理器实例
 */
export function registerBrowserHandlers(viewManager) {
  logger.debug('注册浏览器处理器');

  ipcManager.registerBatch({
    /**
     * 导航到指定 URL
     */
    'browser:navigate': {
      handler: async (viewId, url) => {
        await viewManager.loadURL(viewId, url);
        return { success: true, url };
      },
      options: { logResult: false },
    },

    /**
     * 获取页面信息
     */
    'browser:getInfo': {
      handler: async (viewId) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const webContents = view.webContents;
        return {
          url: webContents.getURL(),
          title: webContents.getTitle(),
          canGoBack: webContents.canGoBack(),
          canGoForward: webContents.canGoForward(),
          isLoading: webContents.isLoading(),
        };
      },
      options: { logArgs: false, logResult: false },
    },

    /**
     * 后退
     */
    'browser:goBack': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      if (view.webContents.canGoBack()) {
        view.webContents.goBack();
        return { success: true };
      }

      return { success: false, message: '无法后退' };
    },

    /**
     * 前进
     */
    'browser:goForward': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      if (view.webContents.canGoForward()) {
        view.webContents.goForward();
        return { success: true };
      }

      return { success: false, message: '无法前进' };
    },

    /**
     * 刷新
     */
    'browser:reload': async (viewId) => {
      viewManager.reloadView(viewId);
      return { success: true };
    },

    /**
     * 截图
     */
    'browser:screenshot': {
      handler: async (viewId, options = {}) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const image = await view.webContents.capturePage();
        const buffer = image.toPNG();
        const base64 = buffer.toString('base64');

        return {
          image: `data:image/png;base64,${base64}`,
          size: buffer.length,
        };
      },
      options: { logArgs: false, logResult: false },
    },

    /**
     * 切换开发工具
     */
    'browser:toggleDevTools': async (viewId) => {
      viewManager.toggleDevTools(viewId);
      return { success: true };
    },

    /**
     * 执行 JavaScript
     */
    'browser:executeScript': async (viewId, script) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const result = await view.webContents.executeJavaScript(script);
      return { result };
    },

    /**
     * 设置缩放级别
     */
    'browser:setZoom': async (viewId, zoomFactor) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      view.webContents.setZoomFactor(zoomFactor);
      logger.debug(`设置缩放级别: ${viewId} -> ${zoomFactor}`);
      return { success: true, zoomFactor };
    },

    /**
     * 获取缩放级别
     */
    'browser:getZoom': async (viewId) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const zoomFactor = view.webContents.getZoomFactor();
      return { zoomFactor };
    },
  });

  logger.debug('浏览器处理器注册完成');
}

