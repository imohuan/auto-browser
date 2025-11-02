import { Menu } from 'electron';
import { ipcManager } from '../core/ipc-manager.js';
import { createLogger } from '../core/logger.js';

export function registerLoggerHandlers() {
  // 注册 logger IPC 处理器（供渲染进程使用）
  const logger = createLogger('handlers/logger');

  ipcManager.registerBatch({
    'logger:info': async (message, data) => {
      logger.info(message, data);
      return { success: true };
    },
    'logger:warn': async (message, data) => {
      logger.warn(message, data);
      return { success: true };
    },
    'logger:error': async (message, data) => {
      logger.error(message, data);
      return { success: true };
    },
    'logger:debug': async (message, data) => {
      logger.debug(message, data);
      return { success: true };
    },
  });
}
