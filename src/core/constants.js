// src/core/constants.js
// 全局常量定义

import { isPackaged, resolveUserData, resolveRoot } from '../utils/path-resolver.js';
import { IPC_CONFIG } from "./config.js";

/**
 * 日志级别
 */
export const LOG_LEVEL = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

export { IPC_CONFIG };

/**
 * 应用配置（根据环境自动调整路径）
 */
export const APP_CONFIG = {
  // 日志文件路径：使用用户数据目录，确保可写
  get LOG_FILE() {
    return isPackaged() ? resolveUserData('logs', 'app.log') : resolveRoot('logs', 'app.log');
  },
  // 错误日志文件路径：单独存储 error 级别的日志
  get ERROR_LOG_FILE() {
    return isPackaged() ? resolveUserData('logs', 'error.log') : resolveRoot('logs', 'error.log');
  },
  get STORE_FILE() {
    return resolveUserData('store');
  },
  // 结果文件路径：使用用户数据目录
  get RESULT_FILE() {
    return resolveUserData('result.json');
  },
  HTTP_PORT: IPC_CONFIG.HTTP_PORT, // HTTP 服务端口
  WS_PORT: IPC_CONFIG.WS_PORT, // WebSocket 服务端口
  VITE_DEV_SERVER: `http://localhost:${IPC_CONFIG.VITE_PORT}`, // Vite 开发服务器地址
  POCKETBASE_URL: `http://127.0.0.1:${IPC_CONFIG.POCKETBASE_PORT}`, // PocketBase 服务器地址
};

/**
 * 窗口配置
 */
export const WINDOW_CONFIG = {
  MAIN_WINDOW: {
    WIDTH: 1400,
    HEIGHT: 900,
    TITLE: 'AutoBrowser Canvas',
    BACKGROUND_COLOR: '#1e1e1e',
  },
  CONTROL_PANEL: {
    WIDTH: 1200,
    HEIGHT: 800,
    TITLE: 'AutoBrowser 控制面板',
    BACKGROUND_COLOR: '#ffffff',
  },
};

/**
 * 视图配置
 */
export const VIEW_CONFIG = {
  DEFAULT_BOUNDS: {
    X: 100,
    Y: 100,
    WIDTH: 800,
    HEIGHT: 600,
  },
  PRELOAD_PATH: 'src/preload.js',
};

/**
 * HTTP 配置
 */
export const HTTP_CONFIG = {
  BODY_LIMIT: '50mb', // 请求体大小限制
  CORS_ORIGIN: '*', // CORS 跨域配置
};

/**
 * PocketBase 配置
 */
export const POCKETBASE_CONFIG = {
  // spread 集合的字段定义
  SPREAD_COLLECTION_SCHEMA: {
    name: 'spread',
    type: 'base',
    fields: [
      {
        name: 'sheet_id',
        type: 'text',
        required: false,
      },
      {
        name: 'row',
        type: 'number',
        required: false,
      },
      {
        name: 'col',
        type: 'number',
        required: false,
      },
      {
        name: 'value',
        type: 'text',
        required: false,
      },
      {
        name: 'computed_value',
        type: 'text',
        required: false,
      },
      {
        name: 'formula',
        type: 'text',
        required: false,
      },
      {
        name: 'data_type',
        type: 'text',
        required: false,
      },
      {
        name: 'status',
        type: 'text',
        required: false,
      },
      {
        name: 'error_message',
        type: 'text',
        required: false,
      },
    ],
    // 访问规则：允许匿名读取与写入（Demo 环境），生产环境请加鉴权
    listRule: '',    // 空字符串表示所有人都可以列表查看
    viewRule: '',    // 空字符串表示所有人都可以查看单条记录
    createRule: '',  // Demo：允许匿名创建
    updateRule: '',  // Demo：允许匿名更新
    deleteRule: '',  // Demo：允许匿名删除
  },
};

