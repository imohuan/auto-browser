// src/utils/process-utils.js
// 进程管理工具

import { spawn } from 'child_process';
import path from 'path';
import { createLogger } from '../core/logger.js';
import { fileExists } from './file-utils.js';

const logger = createLogger('utils/process-utils');

// 全局进程管理器：记录所有启动的进程
const processRegistry = new Set();

/**
 * 启动进程并监听日志（通用函数）
 * @param {Object} options - 配置选项
 * @param {string} options.exePath - 可执行文件路径（必需）
 * @param {string[]} options.args - 启动参数数组（可选）
 * @param {string} options.workingDir - 工作目录（可选，默认使用 exePath 所在目录）
 * @param {Object} options.env - 环境变量（可选）
 * @param {Function} options.onLog - 日志回调函数 (level, message) => void
 * @param {Function} options.onError - 错误回调函数 (error) => void
 * @param {Function} options.onExit - 退出回调函数 (code, signal) => void
 * @param {Function} options.onSpawn - 启动成功回调函数 (pid) => void
 * @returns {Promise<Object>} 返回进程对象和启动信息
 */
export async function startProcess(options = {}) {
  const {
    exePath,
    args = [],
    workingDir,
    env,
    onLog,
    onError,
    onExit,
    onSpawn,
  } = options;

  if (!exePath) {
    const error = new Error('可执行文件路径不能为空');
    logger.error('启动进程失败', error);
    if (onError) onError(error);
    throw error;
  }

  // 检查文件是否存在
  if (!fileExists(exePath)) {
    const error = new Error(`可执行文件不存在: ${exePath}`);
    logger.error('启动进程失败', error);
    if (onError) onError(error);
    throw error;
  }

  // 确定工作目录
  const cwd = workingDir || path.dirname(exePath);

  logger.info('启动进程', {
    exePath,
    args,
    cwd,
  });

  // 启动进程
  const childProcess = spawn(exePath, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ['ignore', 'pipe', 'pipe'], // 忽略 stdin，捕获 stdout 和 stderr
    shell: false,
  });

  // 进程状态
  let isRunning = true;

  // 监听标准输出
  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.debug('进程 stdout', { message });
        if (onLog) onLog('info', message);
      }
    });
  }

  // 监听标准错误
  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.warn('进程 stderr', { message });
        if (onLog) onLog('warn', message);
      }
    });
  }

  // 监听进程错误
  childProcess.on('error', (error) => {
    isRunning = false;
    logger.error('进程错误', error);
    if (onError) onError(error);
  });

  // 监听进程退出
  childProcess.on('exit', (code, signal) => {
    isRunning = false;
    logger.warn('进程退出', { code, signal });
    if (onExit) onExit(code, signal);
  });

  // 等待进程启动（监听 spawn 事件）
  return new Promise((resolve, reject) => {
    childProcess.on('spawn', () => {
      logger.info('进程已启动', { pid: childProcess.pid, exePath });
      if (onSpawn) onSpawn(childProcess.pid);

      // 创建进程管理对象
      const processInfo = {
        process: childProcess,
        pid: childProcess.pid,
        exePath,
        args,
        cwd,
        isRunning: () => isRunning && !childProcess.killed && childProcess.pid !== null,
        stop: () => {
          if (isRunning && !childProcess.killed) {
            logger.info('停止进程', { pid: childProcess.pid });
            childProcess.kill('SIGTERM');
            // 如果 5 秒后还没退出，强制终止
            setTimeout(() => {
              if (!childProcess.killed) {
                logger.warn('强制终止进程', { pid: childProcess.pid });
                childProcess.kill('SIGKILL');
              }
            }, 5000);
          }
        },
      };

      // 注册到全局进程管理器
      processRegistry.add(processInfo);

      // 监听进程退出，自动从注册表中移除
      childProcess.on('exit', () => {
        processRegistry.delete(processInfo);
      });

      resolve(processInfo);
    });

    // 如果启动失败，延迟一下再检查
    setTimeout(() => {
      if (childProcess.killed || childProcess.exitCode !== null) {
        const error = new Error('进程启动失败');
        logger.error('进程启动失败', error);
        reject(error);
      }
    }, 1000);
  });
}

/**
 * 清理所有已启动的进程
 * 应该在应用退出前调用，确保所有子进程都被正确关闭
 * @param {Object} options - 清理选项
 * @param {number} options.timeout - 等待进程退出的超时时间（毫秒），默认 5000
 * @returns {Promise<void>}
 */
export async function cleanupAllProcesses(options = {}) {
  const { timeout = 5000 } = options;
  const processes = Array.from(processRegistry);

  if (processes.length === 0) {
    logger.debug('没有需要清理的进程');
    return;
  }

  logger.info(`开始清理 ${processes.length} 个子进程`);

  // 先尝试优雅退出（SIGTERM）
  processes.forEach((processInfo) => {
    if (processInfo.isRunning()) {
      logger.info('发送 SIGTERM 信号', { pid: processInfo.pid, exePath: processInfo.exePath });
      processInfo.process.kill('SIGTERM');
    }
  });

  // 等待所有进程退出
  const startTime = Date.now();
  while (processRegistry.size > 0 && Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 如果还有进程未退出，强制终止
  const remainingProcesses = Array.from(processRegistry);
  if (remainingProcesses.length > 0) {
    logger.warn(`强制终止 ${remainingProcesses.length} 个未退出的进程`);
    remainingProcesses.forEach((processInfo) => {
      if (processInfo.isRunning() && !processInfo.process.killed) {
        logger.warn('强制终止进程', { pid: processInfo.pid, exePath: processInfo.exePath });
        processInfo.process.kill('SIGKILL');
      }
      processRegistry.delete(processInfo);
    });
  }

  logger.info('所有进程已清理完成');
}

/**
 * 获取当前注册的进程数量
 * @returns {number}
 */
export function getProcessCount() {
  return processRegistry.size;
}

