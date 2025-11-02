// src/services/view-manager.js
// 视图管理服务

import { WebContentsView } from 'electron';
import fs from 'fs';
import { createLogger } from '../core/logger.js';
import { VIEW_CONFIG } from '../core/constants.js';
import { setupWindowShortcuts } from '../utils/window-shortcuts.js';
import { resolve } from '../utils/path-resolver.js';

const logger = createLogger('services/view-manager');

/**
 * 视图管理器类
 */
class ViewManager {
  constructor(baseWindow) {
    this.baseWindow = baseWindow;
    this.views = new Map(); // viewId -> { view, config }
    this.activeViewId = null;
    this.viewCounter = 0;
    this.mainView = null; // 主视图引用，用于发送 IPC 通知

    logger.debug('视图管理器初始化完成');
  }

  /**
   * 设置主视图引用（用于发送 IPC 通知）
   * @param {WebContentsView} mainView - 主视图实例
   */
  setMainView(mainView) {
    this.mainView = mainView;
    logger.debug('已设置主视图引用');
  }

  /**
   * 通知主渲染进程视图已创建
   * @param {string} viewId - 视图ID
   */
  notifyViewCreated(viewId) {
    if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
      this.mainView.webContents.send('views:sync', {
        action: 'created',
        viewId,
        views: this.getAllViews()
      });
      logger.debug('已通知主渲染进程视图创建', { viewId });
    }
  }

  /**
   * 创建新视图
   */
  createView(options = {}) {
    const viewId = `view_${++this.viewCounter}`;

    const config = {
      title: options.title || `视图 ${this.viewCounter}`,
      url: options.url || 'about:blank',
      bounds: options.bounds || {
        x: VIEW_CONFIG.DEFAULT_BOUNDS.X,
        y: VIEW_CONFIG.DEFAULT_BOUNDS.Y,
        width: VIEW_CONFIG.DEFAULT_BOUNDS.WIDTH,
        height: VIEW_CONFIG.DEFAULT_BOUNDS.HEIGHT,
      },
      visible: options.visible !== false,
    };

    // 创建 WebContentsView
    const view = new WebContentsView({
      webPreferences: {
        sandbox: false,
        preload: resolve('preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // 确保每个视图的缩放设置独立（防止共享缩放因子）
    // 初始化时设置默认缩放因子 1.0
    view.webContents.setZoomFactor(1.0);

    // 禁用右键菜单（防止快捷键冲突）
    view.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });

    // 拦截打开新窗口的请求，改为创建新的 view
    view.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
      logger.info('拦截到打开新窗口请求，创建新的 view', { url, frameName, features, sourceViewId: viewId });

      // 创建新的 view 来显示目标 URL
      const newViewId = this.createView({
        url: url,
        title: frameName || undefined, // 如果有 frameName 则使用，否则让 createView 自动生成
        visible: true, // 自动显示新创建的 view
      });

      logger.info('已创建新 view 替代新窗口', { newViewId, url });

      // 通知主渲染进程新视图已创建
      this.notifyViewCreated(newViewId);

      // 阻止默认的打开新窗口行为
      return { action: 'deny' };
    });

    setupWindowShortcuts(view, {
      name: viewId,
      enableReload: true,
      enableDevTools: true,
      enableZoom: true,
      rebindOnLoad: false, // 由外部手动在 did-finish-load 中重新绑定
    });

    // 监听页面标题更新
    view.webContents.on('page-title-updated', (_event, title) => {
      config.title = title;
      logger.debug(`页面标题更新: ${viewId}`, { title });
      // 通知主渲染进程标题已更新
      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:title-updated', {
          viewId,
          title,
        });
      }
    });

    // 监听Favicon更新
    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      if (favicons && favicons.length > 0) {
        config.favicon = favicons[0]; // 使用第一个favicon
        logger.debug(`Favicon更新: ${viewId}`, { favicon: favicons[0] });
        // 通知主渲染进程favicon已更新
        if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
          this.mainView.webContents.send('views:favicon-updated', {
            viewId,
            favicon: favicons[0],
          });
        }
      }
    });

    // 监听页面加载完成，重新绑定快捷键
    view.webContents.on('did-finish-load', () => {
      logger.debug(`页面加载完成，快捷键已重新绑定: ${viewId}`);
      this.baseWindow.contentView.addChildView(view);
      // 如果是第一个视图或设置为可见，则自动设为活动视图
      if (this.views.size === 1 || config.visible) {
        this.setActiveView(viewId);
      } else {
        // 否则隐藏该视图
        view.setVisible(false);
      }
    });

    // 保存视图配置
    this.views.set(viewId, { view, config });

    // 添加到 baseWindow（先设置为隐藏状态）
    view.setVisible(false);

    // 设置初始位置
    view.setBounds(config.bounds);

    logger.info('创建新视图', { viewId, title: config.title, url: config.url, isActive: this.activeViewId === viewId });

    // 加载 URL（如果提供）
    if (config.url !== 'about:blank') {
      // 判断是否使用loadFile
      if (fs.existsSync(config.url)) {
        view.webContents.loadFile(config.url).catch(error => {
          logger.error(`加载文件失败: ${config.url}`, error);
        });
      } else {
        view.webContents.loadURL(config.url).catch(error => {
          logger.error(`加载 URL 失败: ${config.url}`, error);
        });
      }
    }

    return viewId;
  }

  /**
   * 移除视图
   */
  removeView(viewId) {
    const viewData = this.views.get(viewId);
    if (!viewData) {
      logger.warn(`视图不存在: ${viewId}`);
      return false;
    }

    const { view } = viewData;

    // 从 baseWindow 移除
    this.baseWindow.contentView.removeChildView(view);

    // 清理事件监听器
    view.webContents.removeAllListeners();

    // 从 Map 中移除
    this.views.delete(viewId);

    // 如果是活动视图，清空活动视图 ID
    if (this.activeViewId === viewId) {
      this.activeViewId = null;
    }

    logger.info('移除视图', { viewId });
    return true;
  }

  /**
   * 获取视图实例
   */
  getView(viewId) {
    const viewData = this.views.get(viewId);
    return viewData ? viewData.view : null;
  }

  /**
   * 更新视图位置和大小
   */
  updateViewBounds(viewId, bounds) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    const currentBounds = view.getBounds();
    const newBounds = {
      x: bounds.x !== undefined ? bounds.x : currentBounds.x,
      y: bounds.y !== undefined ? bounds.y : currentBounds.y,
      width: bounds.width !== undefined ? bounds.width : currentBounds.width,
      height: bounds.height !== undefined ? bounds.height : currentBounds.height,
    };

    view.setBounds(newBounds);

    // 更新配置
    const viewData = this.views.get(viewId);
    viewData.config.bounds = newBounds;

    logger.debug('更新视图位置', { viewId, bounds: newBounds });
    return newBounds;
  }

  /**
   * 加载 URL
   */
  async loadURL(viewId, url) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    logger.info('视图开始加载', { viewId, url });
    await view.webContents.loadURL(url);

    // 更新配置
    const viewData = this.views.get(viewId);
    viewData.config.url = url;

    logger.info('视图加载完成', { viewId, url });
  }

  /**
   * 刷新视图
   */
  reloadView(viewId) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    view.webContents.reload();
    logger.debug('刷新视图', { viewId });
  }

  /**
   * 切换开发工具
   */
  toggleDevTools(viewId) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    if (view.webContents.isDevToolsOpened()) {
      view.webContents.closeDevTools();
      logger.debug('关闭开发工具', { viewId });
    } else {
      view.webContents.openDevTools();
      logger.debug('打开开发工具', { viewId });
    }
  }

  /**
   * 获取所有视图信息
   */
  getAllViews() {
    const viewsInfo = [];

    for (const [viewId, viewData] of this.views) {
      viewsInfo.push({
        id: viewId,
        title: viewData.config.title,
        url: viewData.view.webContents.getURL(),
        bounds: viewData.config.bounds,
        canGoBack: viewData.view.webContents.canGoBack(),
        canGoForward: viewData.view.webContents.canGoForward(),
        isActive: viewId === this.activeViewId,
        isVisible: viewData.view.webContents.isVisible ? viewData.view.webContents.isVisible() : true,
      });
    }

    logger.debug('查询视图列表', { count: viewsInfo.length, activeViewId: this.activeViewId });
    return viewsInfo;
  }

  /**
   * 设置活动视图（注意：现在支持多视图同时显示，不再隐藏其他视图）
   * @param {string|null} viewId - 视图ID，null表示清除活动视图（仅用于记录，不影响显示）
   */
  setActiveView(viewId) {
    // 如果传入null，仅清除活动视图ID
    if (viewId === null) {
      this.activeViewId = null;
      logger.info('清除活动视图（不影响其他视图显示）');
      return;
    }

    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    // 显示并置顶当前视图（不隐藏其他视图）
    view.setVisible(true);

    // 将视图移到最顶层（移除后重新添加）
    this.baseWindow.contentView.removeChildView(view);
    this.baseWindow.contentView.addChildView(view);

    this.activeViewId = viewId;
    logger.info('切换活动视图（多视图模式）', { viewId });
  }

  /**
   * 单独显示/隐藏视图
   * @param {string} viewId - 视图ID
   * @param {boolean} visible - 是否可见
   */
  setViewVisible(viewId, visible) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    view.setVisible(visible);
    logger.debug('切换视图显示状态', { viewId, visible });
  }

  /**
   * 获取活动视图 ID
   */
  getActiveViewId() {
    return this.activeViewId;
  }
}

export { ViewManager };

