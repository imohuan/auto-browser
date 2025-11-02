// src/handlers/views.js
// 视图管理功能处理器

import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';

const logger = createLogger('handlers/views');

/**
 * 注册视图处理器
 * @param {ViewManager} viewManager - 视图管理器实例
 * @param {WebContentsView} mainView - 主视图（用于发送 IPC 消息到主渲染进程）
 */
export function registerViewHandlers(viewManager, mainView) {
  logger.debug('注册视图管理处理器');

  ipcManager.registerBatch({
    /**
     * 创建新视图
     */
    'views:create': async (options = {}) => {
      const viewId = viewManager.createView(options);

      // 通知主渲染进程视图已创建
      if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
        mainView.webContents.send('views:sync', {
          action: 'created',
          viewId,
          views: viewManager.getAllViews()
        });
        logger.debug('已通知主渲染进程视图创建', { viewId });
      }

      return { viewId };
    },

    /**
     * 移除视图
     */
    'views:remove': async (viewId) => {
      const success = viewManager.removeView(viewId);

      // 通知主渲染进程视图已移除
      if (success && mainView?.webContents && !mainView.webContents.isDestroyed()) {
        mainView.webContents.send('views:sync', {
          action: 'removed',
          viewId,
          views: viewManager.getAllViews()
        });
        logger.debug('已通知主渲染进程视图移除', { viewId });
      }

      return { success };
    },

    /**
     * 获取所有视图
     */
    'views:getAll': {
      handler: async () => {
        const views = viewManager.getAllViews();
        return { views };
      },
      options: { logArgs: false },
    },

    /**
     * 更新视图位置和大小
     */
    'views:updateBounds': async (viewId, bounds) => {
      const newBounds = viewManager.updateViewBounds(viewId, bounds);
      return { bounds: newBounds };
    },

    /**
     * 加载 URL
     */
    'views:loadURL': async (viewId, url) => {
      await viewManager.loadURL(viewId, url);
      return { success: true, url };
    },

    /**
     * 刷新视图
     */
    'views:reload': async (viewId) => {
      viewManager.reloadView(viewId);
      return { success: true };
    },

    /**
     * 切换开发工具
     */
    'views:toggleDevTools': async (viewId) => {
      viewManager.toggleDevTools(viewId);
      return { success: true };
    },

    /**
     * 设置活动视图
     */
    'views:setActive': async (viewId) => {
      viewManager.setActiveView(viewId);
      return { success: true, viewId };
    },

    /**
     * 获取活动视图 ID
     */
    'views:getActive': {
      handler: async () => {
        const activeViewId = viewManager.getActiveViewId();
        return { id: activeViewId };
      },
      options: { logArgs: false },
    },

    /**
     * 设置视图显示/隐藏
     */
    'views:setVisible': async (viewId, visible) => {
      viewManager.setViewVisible(viewId, visible);
      return { success: true };
    },
  });

  logger.debug('视图管理处理器注册完成');
}

