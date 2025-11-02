// src/handlers/automation.js
// 自动化增强功能处理器

import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';
import { CDPService } from '../services/cdp-service.js';

const logger = createLogger('handlers/automation');

/**
 * 注册自动化处理器
 * @param {ViewManager} viewManager - 视图管理器实例
 */
export function registerAutomationHandlers(viewManager) {
  logger.debug('注册自动化处理器');

  ipcManager.registerBatch({
    /**
     * CDP 真实点击
     */
    'automation:click': async (viewId, selector) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      await cdpService.click(selector);
      return { success: true, selector };
    },

    /**
     * CDP 真实输入
     */
    'automation:type': async (viewId, selector, text) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      await cdpService.type(selector, text);
      return { success: true, selector, text };
    },

    /**
     * CDP 滚动
     */
    'automation:scroll': async (viewId, x, y) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      await cdpService.scroll(x, y);
      return { success: true, x, y };
    },

    /**
     * CDP 等待选择器
     */
    'automation:waitForSelector': async (viewId, selector, timeout = 5000) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      await cdpService.waitForSelector(selector, timeout);
      return { success: true, selector };
    },

    /**
     * CDP 获取元素文本
     */
    'automation:getText': async (viewId, selector) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const text = await cdpService.getText(selector);
      return { text };
    },

    /**
     * CDP 文件上传
     */
    'automation:uploadFile': async (viewId, selector, filePath) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      await cdpService.uploadFile(selector, filePath);
      return { success: true, selector, filePath };
    },

    /**
     * 增强版点击（使用辅助脚本）
     */
    'automation:enhancedClick': async (viewId, selector, options = {}) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const result = await cdpService.enhancedClick(selector, options);
      return result;
    },

    /**
     * 表单填充
     */
    'automation:fillForm': async (viewId, selector, value) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const result = await cdpService.fillForm(selector, value);
      return result;
    },

    /**
     * 键盘输入模拟
     */
    'automation:simulateKeyboard': async (viewId, keys, selector = null, delay = 0) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const result = await cdpService.simulateKeyboard(keys, selector, delay);
      return result;
    },

    /**
     * 获取交互元素
     */
    'automation:getInteractiveElements': async (viewId, options = {}) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const elements = await cdpService.getInteractiveElements(options);
      return { elements };
    },

    /**
     * 查找包含文本的元素
     */
    'automation:findElementsByText': async (viewId, textQuery, options = {}) => {
      const view = viewManager.getView(viewId);
      if (!view) {
        throw new Error(`视图不存在: ${viewId}`);
      }

      const cdpService = new CDPService(view.webContents);
      const elements = await cdpService.findElementsByText(textQuery, options);
      return { elements };
    },
  });

  logger.debug('自动化处理器注册完成');
}

