// src/utils/path-resolver.js
// 路径解析工具 - 统一处理开发环境和生产环境的路径问题

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// 在 ES Module 中创建 require 函数
const require = createRequire(import.meta.url);

/**
 * 获取 app 对象（延迟导入，避免循环依赖）
 */
function getApp() {
  try {
    // 使用 require 导入 electron（已通过 createRequire 创建）
    const { app } = require('electron');
    return app;
  } catch (e) {
    // 如果 electron 模块不可用，返回 null
    return null;
  }
}

/**
 * 获取应用的根目录
 * - 开发环境：项目根目录（包含 src/ 的目录）
 * - 生产环境：app.asar 所在目录（resources 目录）
 */
function getAppRoot() {
  const app = getApp();
  if (app && app.isPackaged) {
    // 生产环境：app.asar 在 resources 目录中
    // process.resourcesPath 指向 resources 目录
    return process.resourcesPath || app.getAppPath();
  } else {
    // 开发环境：项目根目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '../..');
  }
}

/**
 * 获取 src 目录的绝对路径
 */
function getSrcDir() {
  const app = getApp();
  if (app && app.isPackaged) {
    return path.join(app.getAppPath(), 'src');
  }
  const root = getAppRoot();
  return path.join(root, 'src');
}

/**
 * 解析相对于 src 目录的路径
 * 类似 Node.js 的 path.resolve，但以 src 目录为基准
 * 
 * @param {...string} paths - 路径片段
 * @returns {string} 解析后的绝对路径
 * 
 * @example
 * resolve('web', 'control-panel.html')
 * // 开发环境: E:\Code\AutoBrowser\src\web\control-panel.html
 * // 生产环境: E:\Code\AutoBrowser\dist\win-unpacked\resources\app.asar\web\control-panel.html
 */
export function resolve(...paths) {
  const srcDir = getSrcDir();
  return path.join(srcDir, ...paths);
}

/**
 * 解析相对于应用根目录的路径
 * 
 * @param {...string} paths - 路径片段
 * @returns {string} 解析后的绝对路径
 * 
 * @example
 * resolveRoot('pocketbase-db', 'pocketbase.exe')
 * // 开发环境: E:\Code\AutoBrowser\pocketbase-db\pocketbase.exe
 * // 生产环境: E:\Code\AutoBrowser\dist\win-unpacked\resources\pocketbase-db\pocketbase.exe
 */
export function resolveRoot(...paths) {
  const root = getAppRoot();
  return path.join(root, ...paths);
}

/**
 * 解析用户数据目录的路径
 * Electron 应用的用户数据目录，用于存储日志、配置文件等
 * 
 * @param {...string} paths - 路径片段
 * @returns {string} 解析后的绝对路径
 * 
 * @example
 * resolveUserData('logs', 'app.log')
 * // Windows: C:\Users\用户名\AppData\Roaming\AutoBrowser\logs\app.log
 * // 生产环境回退: E:\path\to\exe\logs\app.log
 */
export function resolveUserData(...paths) {
  const app = getApp();

  if (app) {
    try {
      const userDataPath = app.getPath('userData');
      // 确保 userDataPath 不在 asar 包内
      if (userDataPath && !userDataPath.includes('.asar')) {
        return path.join(userDataPath, ...paths);
      }
    } catch (e) {
      // 忽略错误，继续尝试其他路径
    }

    // 打包环境回退方案：使用 exe 所在目录
    if (app.isPackaged) {
      try {
        const exeDir = path.dirname(app.getPath('exe'));
        return path.join(exeDir, ...paths);
      } catch (e) {
        console.error('获取 exe 路径失败:', e.message);
      }
    }
  }

  // 最终回退：开发环境或 app 不可用时使用项目根目录
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '../..');
  return path.join(projectRoot, 'userData', ...paths);
}

/**
 * 检查是否为生产环境
 * @returns {boolean}
 */
export function isPackaged() {
  const app = getApp();
  return app && app.isPackaged;
}

/**
 * 获取当前环境名称
 * @returns {'development' | 'production'}
 */
export function getEnvironment() {
  return isPackaged() ? 'production' : 'development';
}


