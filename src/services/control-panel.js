// src/services/control-panel.js
// 控制面板窗口管理服务

import { BrowserWindow } from 'electron';
import { createLogger } from '../core/logger.js';
import { WINDOW_CONFIG } from '../core/constants.js';
import { setupWindowShortcuts } from '../utils/window-shortcuts.js';
import { resolve } from '../utils/path-resolver.js';

const logger = createLogger('services/control-panel');

/**
 * 控制面板类
 */
class ControlPanel {
  constructor() {
    this.window = null;
    logger.debug('控制面板服务初始化');
  }

  /**
   * 创建控制面板窗口
   */
  create() {
    // 如果窗口已存在，则聚焦
    if (this.window) {
      if (this.window.isMinimized()) {
        this.window.restore();
      }
      this.window.focus();
      logger.debug('控制面板窗口已存在，聚焦');
      return;
    }

    // 创建新窗口
    this.window = new BrowserWindow({
      width: WINDOW_CONFIG.CONTROL_PANEL.WIDTH,
      height: WINDOW_CONFIG.CONTROL_PANEL.HEIGHT,
      title: WINDOW_CONFIG.CONTROL_PANEL.TITLE,
      backgroundColor: WINDOW_CONFIG.CONTROL_PANEL.BACKGROUND_COLOR,
      webPreferences: {
        sandbox: false,
        preload: resolve('preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // 加载控制面板页面
    const controlPanelPath = resolve('web', 'control-panel.html');
    this.window.loadFile(controlPanelPath);

    // 设置快捷键（Ctrl+R 刷新，Ctrl+Shift+I 开发工具）
    setupWindowShortcuts(this.window, {
      name: '控制面板',
      enableReload: true,
      enableDevTools: true,
      enableZoom: false,
      rebindOnLoad: true,
    });

    logger.info('控制面板窗口创建成功');

    // 监听页面加载完成
    this.window.webContents.on('did-finish-load', () => {
      logger.debug('控制面板页面加载完成');
    });

    // 监听窗口关闭
    this.window.on('closed', () => {
      logger.debug('控制面板窗口已关闭');
      this.window = null;
    });
  }

  /**
   * 关闭控制面板
   */
  close() {
    if (this.window) {
      this.window.close();
      logger.debug('关闭控制面板');
    }
  }

  /**
   * 显示/隐藏控制面板
   */
  toggle() {
    if (!this.window) {
      this.create();
      return;
    }

    if (this.window.isVisible()) {
      this.window.hide();
      logger.debug('隐藏控制面板');
    } else {
      this.window.show();
      logger.debug('显示控制面板');
    }
  }

  /**
   * 获取窗口实例
   */
  getWindow() {
    return this.window;
  }
}

// 导出单例
export const controlPanel = new ControlPanel();

