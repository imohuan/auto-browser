// src/plugins/multidimensional_table/pocketbase/index.js
// PocketBase 进程管理

import { startProcess } from '../../../utils/process-utils.js';
import { resolveRoot } from '../../../utils/path-resolver.js';
import { createLogger } from '../../../core/logger.js';
import { APP_CONFIG } from '../../../core/constants.js';

import path from 'path';

import { createRegisterWindow, PocketBaseInitializer } from "./init-pocketbase.js"
const logger = createLogger('plugins/pocketbase');

let pocketbaseProcess = null;
const pocketBaseInitializer = new PocketBaseInitializer();

const watchNeedCreateSuperUser = async (message) => {
  // "(!) Launch the URL below in the browser if it hasn't been open already to create your first superuser account:\nhttp://127.0.0.1:8090/_/#/pbinstal/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc2MTk5NDgxNiwiaWQiOiJqdzI0NDlqYmhrYjdwY28iLCJyZWZyZXNoYWJsZSI6ZmFsc2UsInR5cGUiOiJhdXRoIn0.EbK7R0wRmQ8f3KWBwodfigynRIf1yqzoP8M02hNIKzM\n(you can also create your first superuser by running: E:\\Code\\AutoBrowser\\pocketbase-db\\pocketbase.exe superuser upsert EMAIL PASS)"
  if (message.includes('create your first superuser account')) {
    const urlMatch = message.match(/https?:\/\/[^\s\n]*\/_\/#\/pbinstal\/([^\s\n]*)/);
    if (urlMatch && urlMatch?.[1]) {
      const token = urlMatch[1];
      const { username, password } = await createRegisterWindow();
      await pocketBaseInitializer.setCredentials(username, password);
      const pb = await pocketBaseInitializer.createSuperUserAccount(token, username, password);
      if (pb) await pocketBaseInitializer.initPocketBase();
    }
  }
}

/**
 * 启动 PocketBase 服务
 * @param {Object} options - 配置选项
 * @param {string} options.host - 监听地址（默认 '127.0.0.1'）
 * @param {number} options.port - 监听端口（默认 8090）
 * @param {Function} options.onLog - 日志回调函数
 * @param {Function} options.onError - 错误回调函数
 * @param {Function} options.onExit - 退出回调函数
 * @returns {Promise<Object>} 返回进程管理对象
 */
export async function start(options = {}) {
  if (pocketbaseProcess && pocketbaseProcess.isRunning()) {
    logger.warn('PocketBase 已在运行中', { pid: pocketbaseProcess.pid });
    return pocketbaseProcess;
  }

  try {
    logger.info('启动 PocketBase 服务...');

    // 指定 PocketBase 可执行文件路径
    const exePath = resolveRoot('pocketbase-db', 'pocketbase.exe');
    const workingDir = path.dirname(exePath);
    const url = options.url || APP_CONFIG.POCKETBASE_URL;

    // 从 URL 中提取主机和端口（PocketBase 的 --http 参数只需要 host:port，不需要协议前缀）
    let httpAddress = url;
    try {
      const urlObj = new URL(url);
      httpAddress = `${urlObj.hostname}:${urlObj.port}`;
    } catch (error) {
      // 如果 URL 解析失败，尝试直接使用（可能是已经是 host:port 格式）
      logger.debug('URL 解析失败，尝试直接使用', { url, error: error.message });
    }

    logger.debug('PocketBase 配置', { exePath, workingDir, url, httpAddress });

    // 构建启动参数
    const args = ['serve', `--http=${httpAddress}`];

    // 检查是否已创建超级用户（不阻塞启动流程）
    let isSuperUserCreated = false;
    try {
      await pocketBaseInitializer.getAuthenticatedPB();
      isSuperUserCreated = true;
      logger.debug('检测到已有超级用户账号');
    } catch (error) {
      logger.debug('未检测到超级用户账号，将在服务启动后等待创建');
    }

    // 用于等待服务就绪的 Promise
    let resolveReady, rejectReady;
    const readyPromise = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    // 调用通用启动函数
    const processInfo = await startProcess({
      exePath,
      args,
      workingDir,
      onLog: async (level, message) => {
        await watchNeedCreateSuperUser(message);
        logger.debug(`PocketBase [${level}]: ${message}`);

        // 如果之前没有超级用户，检查现在是否已创建
        if (!isSuperUserCreated) {
          try {
            await pocketBaseInitializer.getAuthenticatedPB();
            isSuperUserCreated = true;
            logger.info('超级用户账号创建成功，服务已就绪');
            resolveReady(processInfo);
          } catch {
            // 继续等待
          }
        }

        if (options.onLog) {
          options.onLog(level, message);
        }
      },
      onError: (error) => {
        logger.error('PocketBase 进程错误', error);
        if (options.onError) {
          options.onError(error);
        }
      },
      onExit: (code, signal) => {
        logger.warn('PocketBase 进程退出', { code, signal });
        pocketbaseProcess = null;
        if (options.onExit) {
          options.onExit(code, signal);
        }
        rejectReady(new Error(`PocketBase 进程退出: code=${code}, signal=${signal}`));
      },
      onSpawn: (pid) => {
        logger.info('PocketBase 服务启动成功', { pid, exePath, url });
        // 如果已经有超级用户，直接标记为就绪
        if (isSuperUserCreated) {
          logger.debug('服务已启动且超级用户已存在，标记为就绪');
          resolveReady(processInfo);
        } else {
          logger.debug('服务已启动，等待超级用户创建...');
        }
      },
    });

    // 保存进程信息
    pocketbaseProcess = processInfo;
    logger.debug('进程信息已保存', { pid: processInfo.pid });

    // 等待服务完全就绪（进程启动 + 超级用户创建完成）
    await readyPromise;
    logger.info('PocketBase 服务完全就绪');

    return processInfo;
  } catch (error) {
    logger.error('启动 PocketBase 失败', error);
    throw error;
  }
}

/**
 * 停止 PocketBase 服务
 */
export function stop() {
  if (pocketbaseProcess && pocketbaseProcess.isRunning()) {
    logger.info('停止 PocketBase 服务', { pid: pocketbaseProcess.pid });
    pocketbaseProcess.stop();
    pocketbaseProcess = null;
  } else {
    logger.warn('PocketBase 未运行');
  }
}

/**
 * 检查 PocketBase 是否正在运行
 * @returns {boolean}
 */
export function isRunning() {
  return pocketbaseProcess !== null && pocketbaseProcess.isRunning();
}

/**
 * 获取 PocketBase 进程信息
 * @returns {Object|null}
 */
export function getProcessInfo() {
  return pocketbaseProcess;
}

