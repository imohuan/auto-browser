import { Menu } from 'electron';
import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';

const logger = createLogger('handlers/ui');

export function registerUIHandlers(viewManager, mainWindow, mainView) {
  ipcManager.registerBatch({
    'ui:showTabContextMenu': async ({ screenX, screenY, viewId, backendId, currentIndex, totalCount }) => {
      logger.debug('显示标签页右键菜单', { viewId, currentIndex, totalCount });

      const template = [
        {
          label: '刷新',
          accelerator: 'F5',
          click: () => {
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:tab-menu-action', {
                action: 'reload',
                viewId,
              });
            }
          },
        },
        { type: 'separator' },
        {
          label: '关闭标签页',
          accelerator: 'Ctrl+W',
          click: () => {
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:tab-menu-action', {
                action: 'close',
                viewId,
              });
            }
          },
        },
        {
          label: '关闭其他标签页',
          enabled: totalCount > 1,
          click: () => {
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:tab-menu-action', {
                action: 'closeOthers',
                viewId,
              });
            }
          },
        },
        {
          label: '关闭左侧标签页',
          enabled: currentIndex > 0,
          click: () => {
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:tab-menu-action', {
                action: 'closeLeft',
                viewId,
              });
            }
          },
        },
        {
          label: '关闭右侧标签页',
          enabled: currentIndex < totalCount - 1,
          click: () => {
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:tab-menu-action', {
                action: 'closeRight',
                viewId,
              });
            }
          },
        },
      ];

      const menu = Menu.buildFromTemplate(template);
      // 不传递坐标，让菜单自动显示在鼠标位置
      menu.popup({
        window: mainWindow,
      });

      return { success: true };
    },

    'ui:showViewMenu': async ({ screenX, screenY, viewId, backendId }) => {
      const view = backendId ? viewManager.getView(backendId) : null;

      const changeZoom = (delta) => {
        if (!view) return;
        const current = view.webContents.getZoomFactor();
        let next = current;
        if (delta === 'reset') {
          next = 1;
        } else {
          next = Math.min(3, Math.max(0.25, current + delta));
        }
        view.webContents.setZoomFactor(next);
        logger.debug('调整缩放', { backendId, next });
      };

      const template = [
        {
          label: '缩放',
          enabled: !!view,
          submenu: [
            {
              label: '放大',
              accelerator: 'Ctrl+Plus',
              click: () => changeZoom(0.1),
            },
            {
              label: '缩小',
              accelerator: 'Ctrl+-',
              click: () => changeZoom(-0.1),
            },
            {
              label: '重置',
              click: () => changeZoom('reset'),
            },
          ],
        },
        { type: 'separator' },
        {
          label: '退出 WebContentsView',
          enabled: !!view,
          click: () => {
            if (!backendId) return;
            viewManager.removeView(backendId);
            // 使用 mainView 发送消息到主渲染进程
            if (mainView?.webContents && !mainView.webContents.isDestroyed()) {
              mainView.webContents.send('ui:view-hidden', { viewId });
            }
          },
        },
        {
          label: '打开控制台',
          enabled: !!view,
          click: () => {
            if (!view) return;
            if (view.webContents.isDevToolsOpened()) {
              view.webContents.closeDevTools();
            } else {
              view.webContents.openDevTools({ mode: 'detach' });
            }
          },
        },
      ];

      const menu = Menu.buildFromTemplate(template);
      menu.popup({
        window: mainWindow,
        x: Math.round(screenX),
        y: Math.round(screenY),
      });

      return { success: true };
    },

    // 窗口最小化
    'ui:window-minimize': async () => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      mainWindow.minimize();
      logger.debug('窗口已最小化');
      return { success: true };
    },

    // 窗口最大化/还原切换
    'ui:window-toggle-maximize': async () => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        logger.debug('窗口已还原');
      } else {
        mainWindow.maximize();
        logger.debug('窗口已最大化');
      }
      return { success: true };
    },

    // 窗口关闭
    'ui:window-close': async () => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      mainWindow.close();
      logger.debug('窗口已关闭');
      return { success: true };
    },

    // 获取窗口状态
    'ui:window-state': async () => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      return {
        success: true,
        data: {
          isMaximized: mainWindow.isMaximized(),
          isMinimized: mainWindow.isMinimized(),
          isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
        },
      };
    },

    // 窗口顶置切换
    'ui:window-toggle-always-on-top': async () => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      const currentState = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!currentState);
      logger.debug(`窗口顶置已${!currentState ? '开启' : '关闭'}`);
      return { success: true };
    },

    // 窗口移动
    'ui:window-move': async ({ x, y }) => {
      if (!mainWindow) {
        return { success: false, error: '主窗口不存在' };
      }
      mainWindow.setPosition(Math.round(x), Math.round(y));
      return { success: true };
    },
  });
}
