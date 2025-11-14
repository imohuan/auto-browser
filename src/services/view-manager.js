// src/services/view-manager.js
// 视图管理服务

import { WebContentsView } from 'electron';
import fs from 'fs';
import { createLogger } from '../core/logger.js';
import { VIEW_CONFIG } from '../core/constants.js';
import { setupWindowShortcuts } from '../utils/window-shortcuts.js';
import { resolve } from '../utils/path-resolver.js';
import { attachWebContentsStealth, createStealthUserAgent } from '../stealth/index.js';

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
      hasLoadError: false, // 标记是否发生了加载错误
    };

    // 创建 WebContentsView
    const view = new WebContentsView({
      webPreferences: {
        sandbox: false,
        preload: resolve('preload.js'),
        // contextIsolation: true,
        contextIsolation: false,
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

    attachWebContentsStealth(view.webContents);

    const ua = createStealthUserAgent(view.webContents.getUserAgent());
    view.webContents.setUserAgent(ua);
    logger.info('设置用户代理', { ua });

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

    // 监听页面开始加载
    view.webContents.on('did-start-loading', () => {
      logger.debug(`页面开始加载: ${viewId}`);
      // 清除错误标志
      config.hasLoadError = false;
      // 仅通知渲染进程，不在此强制更改可见性（由渲染进程控制）
      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:loading-state-changed', {
          viewId,
          loading: true,
        });
      }
    });

    // 监听页面加载完成
    view.webContents.on('did-finish-load', () => {
      logger.debug(`页面加载完成: ${viewId}`);
      // 确保视图已添加到窗口（不改变可见性或活动状态，由渲染进程控制）
      this.baseWindow.contentView.addChildView(view);

      if (config.hasLoadError) {
        logger.warn(`页面加载失败，保持隐藏状态: ${viewId}`);
        view.setVisible(false);
        return;
      }

      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:loading-state-changed', {
          viewId,
          loading: false,
          error: null,
        });
      }
    });

    // 监听页面停止加载（有些站点会触发 stop 而非 finish）
    view.webContents.on('did-stop-loading', () => {
      logger.debug(`页面停止加载: ${viewId}`);
      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:loading-state-changed', {
          viewId,
          loading: false,
          error: null,
        });
      }
    });

    // 处理单页应用内导航（不触发完整加载）
    view.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
      logger.debug(`页面内导航: ${viewId}`, { url, isMainFrame });
      // 通知渲染进程停止加载指示器（若有）
      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:loading-state-changed', {
          viewId,
          loading: false,
          error: null,
        });
      }
    });

    // 监听页面加载失败
    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // 只处理主框架的加载失败（忽略iframe等子框架）
      if (!isMainFrame) return;

      // 忽略一些可以忽略的错误
      // -3: ERR_ABORTED (用户取消加载)
      // -27: ERR_BLOCKED_BY_CLIENT (被客户端拦截，通常是广告拦截)
      const ignoredErrors = [-3, -27];
      if (ignoredErrors.includes(errorCode)) {
        logger.debug(`忽略的加载错误: ${viewId}`, { errorCode, errorDescription });
        return;
      }

      logger.error(`页面加载失败: ${viewId}`, {
        errorCode,
        errorDescription,
        validatedURL
      });

      // 设置错误标志，防止 did-finish-load 覆盖错误状态
      config.hasLoadError = true;

      // 通知主渲染进程加载失败
      if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
        this.mainView.webContents.send('views:load-failed', {
          viewId,
          errorCode,
          errorDescription,
          validatedURL,
        });
        // 同时更新加载状态
        this.mainView.webContents.send('views:loading-state-changed', {
          viewId,
          loading: false,
          error: {
            errorCode,
            errorDescription,
            validatedURL,
          },
        });
      }
    });

    // 监听webContents销毁事件（重要：防止登录窗口关闭导致渲染进程崩溃）
    view.webContents.on('destroyed', () => {
      logger.info(`webContents已销毁: ${viewId}`);

      // 自动清理view资源
      try {
        // 从baseWindow移除（如果还未移除）
        if (this.baseWindow.contentView.children.includes(view)) {
          this.baseWindow.contentView.removeChildView(view);
        }

        // 从Map中移除
        this.views.delete(viewId);

        // 如果是活动视图，清空活动视图ID
        if (this.activeViewId === viewId) {
          this.activeViewId = null;
        }

        // 通知主渲染进程视图已销毁
        if (this.mainView?.webContents && !this.mainView.webContents.isDestroyed()) {
          this.mainView.webContents.send('views:sync', {
            action: 'removed',
            viewId,
            views: this.getAllViews()
          });
        }

        logger.info(`视图资源已自动清理: ${viewId}`);
      } catch (error) {
        logger.error(`清理视图资源失败: ${viewId}`, error);
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

    // 检查webContents是否已被销毁
    if (view.webContents.isDestroyed()) {
      logger.warn(`视图的webContents已销毁，仅清理引用: ${viewId}`);
      // 从Map中移除引用
      this.views.delete(viewId);
      // 如果是活动视图，清空活动视图ID
      if (this.activeViewId === viewId) {
        this.activeViewId = null;
      }
      logger.info('已清理已销毁视图的引用', { viewId });
      return true;
    }

    // 从 baseWindow 移除
    try {
      if (this.baseWindow.contentView.children.includes(view)) {
        this.baseWindow.contentView.removeChildView(view);
      }
    } catch (error) {
      logger.error(`从baseWindow移除视图失败: ${viewId}`, error);
    }

    // 清理事件监听器
    try {
      view.webContents.removeAllListeners();
    } catch (error) {
      logger.error(`清理事件监听器失败: ${viewId}`, error);
    }

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
    if (!viewData) {
      return null;
    }

    // 检查webContents是否已被销毁
    if (viewData.view.webContents.isDestroyed()) {
      logger.warn(`视图的webContents已销毁: ${viewId}`);
      return null;
    }

    return viewData.view;
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
   * @param {string} viewId - 视图ID
   * @param {string} url - 要加载的URL
   * @param {boolean} waitForLoad - 是否等待加载完成，默认false
   * @param {number} timeout - 超时时间（毫秒），默认30000
   */
  async loadURL(viewId, url, waitForLoad = false, timeout = 30000) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    logger.info('视图开始加载', { viewId, url, waitForLoad, timeout });
    await view.webContents.loadURL(url);

    // 更新配置
    const viewData = this.views.get(viewId);
    viewData.config.url = url;

    // 如果需要等待加载完成
    if (waitForLoad) {
      const loaded = await this.waitViewLoaded(viewId, timeout);
      if (!loaded) {
        logger.warn('视图加载超时或失败', { viewId, url, timeout });
        throw new Error(`视图加载超时或失败: ${viewId}`);
      }
      logger.info('视图加载完成', { viewId, url });
    } else {
      logger.info('视图URL已设置（未等待加载完成）', { viewId, url });
    }
  }

  /**
   * 等待视图加载完成
   * @param {string} viewId - 视图ID
   * @param {number} timeout - 超时时间（毫秒），默认30000
   * @returns {Promise<boolean>} 返回true表示加载成功，false表示超时或失败
   */
  async waitViewLoaded(viewId, timeout = 30000) {
    const view = this.getView(viewId);
    if (!view) {
      throw new Error(`视图不存在: ${viewId}`);
    }

    const webContents = view.webContents;

    // 检查是否已经加载完成
    if (!webContents.isLoading()) {
      // 检查是否有加载错误
      const viewData = this.views.get(viewId);
      if (viewData?.config.hasLoadError) {
        logger.warn(`视图加载失败: ${viewId}`);
        return false;
      }
      logger.debug(`视图已加载完成: ${viewId}`);
      return true;
    }

    return new Promise((resolve) => {
      let isResolved = false;
      let timeoutId = null;
      let finishHandler = null;
      let stopHandler = null;
      let failHandler = null;

      // 清理函数
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (finishHandler) {
          webContents.removeListener('did-finish-load', finishHandler);
          finishHandler = null;
        }
        if (stopHandler) {
          webContents.removeListener('did-stop-loading', stopHandler);
          stopHandler = null;
        }
        if (failHandler) {
          webContents.removeListener('did-fail-load', failHandler);
          failHandler = null;
        }
      };

      // 完成处理函数
      const handleFinish = (success = true) => {
        if (isResolved) return;
        isResolved = true;
        cleanup();
        logger.debug(`视图加载${success ? '完成' : '失败'}: ${viewId}`);
        resolve(success);
      };

      // 加载完成事件
      finishHandler = () => {
        const viewData = this.views.get(viewId);
        if (viewData?.config.hasLoadError) {
          handleFinish(false);
        } else {
          handleFinish(true);
        }
      };

      // 停止加载事件（某些页面可能不触发 did-finish-load）
      stopHandler = () => {
        // 延迟一小段时间，确保 did-finish-load 有机会先触发
        setTimeout(() => {
          if (!isResolved && !webContents.isLoading()) {
            const viewData = this.views.get(viewId);
            if (viewData?.config.hasLoadError) {
              handleFinish(false);
            } else {
              handleFinish(true);
            }
          }
        }, 100);
      };

      // 加载失败事件
      failHandler = (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        // 只处理主框架的加载失败
        if (!isMainFrame) return;

        // 忽略一些可以忽略的错误
        const ignoredErrors = [-3, -27]; // ERR_ABORTED, ERR_BLOCKED_BY_CLIENT
        if (ignoredErrors.includes(errorCode)) {
          logger.debug(`忽略的加载错误: ${viewId}`, { errorCode, errorDescription });
          return;
        }

        logger.warn(`视图加载失败: ${viewId}`, {
          errorCode,
          errorDescription,
          validatedURL,
        });
        handleFinish(false);
      };

      // 注册事件监听器
      webContents.once('did-finish-load', finishHandler);
      webContents.once('did-stop-loading', stopHandler);
      webContents.once('did-fail-load', failHandler);

      // 设置超时
      timeoutId = setTimeout(() => {
        logger.warn(`等待视图加载超时: ${viewId}`, { timeout });
        handleFinish(false);
      }, timeout);

      // 额外检查：如果页面在注册监听器后立即完成加载
      // 使用 setImmediate 确保事件已经触发
      setImmediate(() => {
        if (!isResolved && !webContents.isLoading()) {
          const viewData = this.views.get(viewId);
          if (viewData?.config.hasLoadError) {
            handleFinish(false);
          } else {
            handleFinish(true);
          }
        }
      });
    });
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
    const destroyedViewIds = [];

    for (const [viewId, viewData] of this.views) {
      // 检查webContents是否已被销毁
      if (viewData.view.webContents.isDestroyed()) {
        logger.warn(`发现已销毁的视图，将被过滤: ${viewId}`);
        destroyedViewIds.push(viewId);
        continue;
      }

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

    // 清理已销毁视图的引用
    destroyedViewIds.forEach(viewId => {
      this.views.delete(viewId);
      if (this.activeViewId === viewId) {
        this.activeViewId = null;
      }
    });

    if (destroyedViewIds.length > 0) {
      logger.info(`已清理${destroyedViewIds.length}个已销毁视图的引用`);
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

