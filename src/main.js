// src/main.js
// Electron 主进程入口

import { app, BaseWindow, WebContentsView, Menu } from 'electron';
import { createLogger } from './core/logger.js';
import { ipcManager } from './core/ipc-manager.js';
import { APP_CONFIG, IPC_CONFIG, WINDOW_CONFIG } from './core/constants.js';
import { ViewManager } from './services/view-manager.js';
import { HTTPServer } from './services/http-server.js';
import { controlPanel } from './services/control-panel.js';
import { registerLoggerHandlers } from './handlers/logger.js';
import { registerBrowserHandlers } from './handlers/browser.js';
import { registerAutomationHandlers } from './handlers/automation.js';
import { registerContentHandlers } from './handlers/content.js';
import { registerNetworkHandlers } from './handlers/network.js';
import { registerViewHandlers } from './handlers/views.js';
import { registerUIHandlers } from './handlers/ui.js';
import { setupWindowShortcuts } from './utils/window-shortcuts.js';
import { pluginManager } from './plugins/plugin-manager.js';
import { resolve } from './utils/path-resolver.js';
import { cleanupAllProcesses } from './utils/process-utils.js';

const logger = createLogger('main');

let mainWindow;
let mainView;
let viewManager;
let httpServer;


/**
 * 创建主窗口
 */
async function createWindow() {
  logger.info('==================== 应用启动 ====================');

  // 1. 创建 BaseWindow（无限画布容器）
  mainWindow = new BaseWindow({
    width: WINDOW_CONFIG.MAIN_WINDOW.WIDTH,
    height: WINDOW_CONFIG.MAIN_WINDOW.HEIGHT,
    title: WINDOW_CONFIG.MAIN_WINDOW.TITLE,
    backgroundColor: WINDOW_CONFIG.MAIN_WINDOW.BACKGROUND_COLOR,
    frame: false,
    // Windows 上 transparent: true 会禁用原生的窗口调整大小功能
    // transparent: true,
    resizable: true,
    minWidth: 400,
    minHeight: 300,
  });

  // 禁止顶部菜单栏
  Menu.setApplicationMenu(null);

  logger.info('主窗口创建成功');

  // 2. 创建主视图并加载无限画布页面
  mainView = new WebContentsView({
    webPreferences: {
      sandbox: false,
      preload: resolve('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 立即设置缩放因子（在加载页面之前）
  mainView.webContents.setZoomFactor(1.0);

  // 禁止页面缩放
  mainView.webContents.setVisualZoomLevelLimits(1, 1);

  // 设置快捷键（Ctrl+R 刷新，Ctrl+Shift+I 开发工具）
  // 主视图阻止缩放快捷键（不允许缩放）
  setupWindowShortcuts(mainView, {
    name: '主视图',
    enableReload: true,
    enableDevTools: true,
    enableZoom: false,
    blockZoom: true, // 阻止缩放快捷键
    rebindOnLoad: true,
  });

  // 监听页面加载完成后再次确保缩放正确
  mainView.webContents.on('did-finish-load', () => {
    mainView.webContents.setZoomFactor(1.0);
    logger.debug('页面加载完成，缩放因子已设置为 1.0');
  });

  // 将主视图添加到窗口并设置大小
  mainWindow.contentView.addChildView(mainView);
  mainView.setBounds({
    x: 0,
    y: 0,
    width: WINDOW_CONFIG.MAIN_WINDOW.WIDTH,
    height: WINDOW_CONFIG.MAIN_WINDOW.HEIGHT
  });
  logger.info(`主视图大小已设置: ${WINDOW_CONFIG.MAIN_WINDOW.WIDTH}x${WINDOW_CONFIG.MAIN_WINDOW.HEIGHT}`);

  // 监听窗口大小变化，调整主视图大小
  mainWindow.on('resize', () => {
    const bounds = mainWindow.getBounds();
    mainView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  });

  // 3. 初始化视图管理器（必须在加载页面之前初始化，因为注册处理器需要）
  viewManager = new ViewManager(mainWindow);
  viewManager.setMainView(mainView); // 设置主视图引用，用于发送 IPC 通知
  logger.debug('视图管理器初始化完成');

  // 4. 注册所有 IPC 处理器（必须在加载页面之前注册，避免渲染进程调用时找不到处理器）
  logger.info('注册 IPC 处理器');
  registerLoggerHandlers();
  registerBrowserHandlers(viewManager);
  registerAutomationHandlers(viewManager);
  registerContentHandlers(viewManager);
  registerNetworkHandlers(viewManager);
  registerViewHandlers(viewManager, mainView);
  registerUIHandlers(viewManager, mainWindow, mainView);
  logger.debug('所有处理器注册完成');

  // 5. 设置 IPC 处理器（必须在加载页面之前完成）
  ipcManager.setupHandlers();
  logger.info('IPC 处理器设置完成，可以安全加载页面');

  // 6. 加载页面（此时所有 IPC 处理器已就绪）
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // 开发环境：加载 Vite 开发服务器
    await mainView.webContents.loadURL(APP_CONFIG.VITE_DEV_SERVER);
    logger.info(`已加载 Vite 开发服务器: ${APP_CONFIG.VITE_DEV_SERVER}`);
    // 打开开发工具
    // mainView.webContents.openDevTools();
  } else {
    // 生产环境：加载构建后的文件
    const rendererPath = resolve('renderer', 'dist', 'index.html');
    await mainView.webContents.loadFile(rendererPath);
    logger.info(`已加载生产构建: ${rendererPath}`);
  }

  // 7. 启动 HTTP 服务
  httpServer = new HTTPServer(APP_CONFIG.HTTP_PORT);
  await httpServer.start();

  // 8. 创建控制面板（独立窗口）
  // controlPanel.create();
  viewManager.createView({ url: resolve('web', 'control-panel.html') })
  viewManager.createView({ url: resolve('web', 'multidimensional_table.html') })
  viewManager.createView({ url: `http://localhost:${IPC_CONFIG.HTTP_PORT}/web?mode=server&serverUrl=${encodeURIComponent(`ws://localhost:${IPC_CONFIG.WS_PORT}`)}` })

  // 9. 加载并初始化插件
  await pluginManager.loadPlugins();
  await pluginManager.initPlugins();

  logger.info('==================== 应用初始化完成 ====================');
}

/**
 * Electron 应用生命周期
 */
app.whenReady().then(async () => {
  logger.info('Electron 应用就绪');
  await createWindow();
});

app.on('window-all-closed', async () => {
  logger.info('所有窗口已关闭');

  if (process.platform !== 'darwin') {
    // 停止 HTTP 服务
    if (httpServer) {
      httpServer.stop().catch(error => {
        logger.error('停止 HTTP 服务失败', error);
      });
    }

    // 清理插件
    await pluginManager.cleanupPlugins();

    logger.info('退出应用');
    app.quit();
  }
});

app.on('activate', () => {
  logger.debug('应用激活');

  if (mainWindow === null) {
    createWindow();
  }
});

// 应用退出前清理资源
app.on('before-quit', async () => {
  logger.info('应用即将退出');

  // 清理所有子进程
  try {
    await cleanupAllProcesses({ timeout: 5000 });
  } catch (error) {
    logger.error('清理子进程失败', error);
  }

  // 清理插件
  await pluginManager.cleanupPlugins();
});

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝', { reason, promise });
});

