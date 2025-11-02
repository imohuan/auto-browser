// src/handlers/content.js
// 内容提取功能处理器

import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';
import { CDPService } from '../services/cdp-service.js';

const logger = createLogger('handlers/content');

/**
 * 注册内容处理器
 * @param {ViewManager} viewManager - 视图管理器实例
 */
export function registerContentHandlers(viewManager) {
  logger.debug('注册内容处理器');

  ipcManager.registerBatch({
    /**
     * 获取文本内容（使用 Readability）
     */
    'content:getTextContent': {
      handler: async (viewId, selector = null) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const cdpService = new CDPService(view.webContents);
        const result = await cdpService.getTextContent(selector);
        return result;
      },
      options: { logResult: false },
    },

    /**
     * 获取 HTML 内容
     */
    'content:getHtmlContent': {
      handler: async (viewId, selector = null) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const cdpService = new CDPService(view.webContents);
        const result = await cdpService.getHtmlContent(selector);
        return result;
      },
      options: { logResult: false },
    },

    /**
     * CDP 获取页面 HTML
     */
    'content:getPageContent': {
      handler: async (viewId) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const cdpService = new CDPService(view.webContents);
        const html = await cdpService.getContent();
        return { html, length: html.length };
      },
      options: { logResult: false },
    },

    /**
     * 提取页面元数据
     */
    'content:extractMetadata': {
      handler: async (viewId) => {
        const view = viewManager.getView(viewId);
        if (!view) {
          throw new Error(`视图不存在: ${viewId}`);
        }

        const cdpService = new CDPService(view.webContents);
        const metadata = await cdpService.extractPageMetadata();
        return metadata;
      },
      options: { logArgs: false },
    },

    /**
     * 执行 JavaScript 并返回结果
     */
    'content:evaluate': async (viewId, script) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const result = await cdpService.evaluate(script);
      return { result };
    },
  });

  logger.debug('内容处理器注册完成');
}

