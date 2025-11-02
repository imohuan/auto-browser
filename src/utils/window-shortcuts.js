// src/utils/window-shortcuts.js
// 窗口快捷键统一管理工具

import { createLogger } from '../core/logger.js';

const logger = createLogger('utils/window-shortcuts');

/**
 * 设置窗口快捷键
 * @param {BrowserWindow|WebContentsView} windowOrView - BrowserWindow 或 WebContentsView 实例
 * @param {Object} options - 配置选项
 * @param {string} [options.name] - 窗口名称（用于日志）
 * @param {boolean} [options.enableReload=true] - 是否启用 Ctrl+R 刷新
 * @param {boolean} [options.enableDevTools=true] - 是否启用 Ctrl+Shift+I 开发工具
 * @param {boolean} [options.enableZoom=false] - 是否启用 Ctrl+/-/= 缩放
 * @param {boolean} [options.blockZoom=false] - 是否阻止缩放快捷键（阻止默认行为）
 * @param {boolean} [options.rebindOnLoad=false] - 是否在页面加载完成后重新绑定
 */
export function setupWindowShortcuts(windowOrView, options = {}) {
  const {
    name = 'window',
    enableReload = true,
    enableDevTools = true,
    enableZoom = false,
    blockZoom = false,
    rebindOnLoad = false,
  } = options;

  // 获取 webContents
  const webContents = windowOrView.webContents || windowOrView;

  const handleBeforeInput = (event, input) => {
    const key = input.key?.toLowerCase?.();

    // 阻止缩放快捷键（如果启用）
    if (blockZoom && input.control && (key === '-' || key === '_' || key === '=' || key === '+' || key === 'add')) {
      event.preventDefault();
      return;
    }

    // Ctrl + R: 刷新
    if (enableReload && input.control && !input.shift && key === 'r') {
      event.preventDefault();
      webContents.reload();
      logger.debug(`快捷键触发刷新: ${name}`);
      return;
    }

    // Ctrl + Shift + I: 切换开发工具
    if (enableDevTools && input.control && input.shift && key === 'i') {
      event.preventDefault();
      if (webContents.isDevToolsOpened()) {
        webContents.closeDevTools();
      } else {
        webContents.openDevTools();
      }
      logger.debug(`快捷键切换开发工具: ${name}`);
      return;
    }

    // Ctrl + - / Ctrl + _ : 缩小
    if (enableZoom && input.control && !input.shift && (key === '-' || key === '_')) {
      event.preventDefault();
      const current = webContents.getZoomFactor();
      const next = Math.max(0.25, current - 0.1);
      webContents.setZoomFactor(next);
      logger.debug(`快捷键缩小: ${name} -> ${next}`);
      return;
    }

    // Ctrl + = / Ctrl + + : 放大
    if (enableZoom && input.control && (key === '=' || key === '+' || key === 'add')) {
      event.preventDefault();
      const current = webContents.getZoomFactor();
      const next = Math.min(3, current + 0.1);
      webContents.setZoomFactor(next);
      logger.debug(`快捷键放大: ${name} -> ${next}`);
      return;
    }
  };

  // 绑定快捷键的函数
  const bindShortcuts = () => {
    // 移除旧的监听器（如果存在）
    webContents.removeAllListeners('before-input-event');
    // 绑定新的监听器
    webContents.on('before-input-event', handleBeforeInput);
    logger.debug(`快捷键已绑定: ${name}`);
  };

  // 立即绑定
  bindShortcuts();

  // 如果需要在页面加载完成后重新绑定
  if (rebindOnLoad) {
    webContents.on('did-finish-load', () => {
      logger.debug(`页面加载完成，重新绑定快捷键: ${name}`);
      bindShortcuts();
    });
  }

  // 返回清理函数
  return () => {
    webContents.removeAllListeners('before-input-event');
    logger.debug(`快捷键已清理: ${name}`);
  };
}

