/**
 * PocketBase 缓存处理器 - 服务端
 * 使用 ipcManager.registerBatch() 注册处理器
 * 参考: src/handlers/automation.js
 */

import PocketBase from 'pocketbase';
import { createLogger } from '../../core/logger.js';
import { ipcManager } from '../../core/ipc-manager.js';

const logger = createLogger('cache-handler-server');

const DEFAULT_NAMESPACE = 'app';

/**
 * 构建存储键名
 * @param {string} key - 原始键名
 * @param {string} namespace - 命名空间
 * @returns {string} 构建后的键名
 */
function buildStorageKey(key, namespace) {
  const ns = namespace || DEFAULT_NAMESPACE;
  return `ctx:${ns}:${key}`;
}

/**
 * 创建缓存处理器实例
 * @param {Object} options - 配置选项
 * @param {string} options.pbUrl - PocketBase 服务器地址
 * @param {string} options.collectionName - 集合名称
 * @returns {Object} 缓存处理器实例
 */
function createCacheHandlerInstance(options = {}) {
  const collectionName = options.collectionName || 'app_cache';
  const pb = new PocketBase(options.pbUrl);

  /**
   * 获取缓存记录
   * @param {string} storageKey - 存储键名
   * @returns {Promise<Object|null>} 返回记录对象或 null
   */
  async function getCacheRecord(storageKey) {
    try {
      const record = await pb
        .collection(collectionName)
        .getFirstListItem(`key = "${storageKey}"`);

      // 检查是否过期
      if (record.expireAt) {
        const expireTime = new Date(record.expireAt).getTime();
        if (Date.now() > expireTime) {
          // 已过期，删除记录
          await pb.collection(collectionName).delete(record.id);
          return null;
        }
      }

      return record;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  return {
    /**
     * 获取缓存值
     */
    async get(key, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const record = await getCacheRecord(storageKey);

        if (!record) {
          return undefined;
        }

        return record.value;
      } catch (error) {
        logger.error('读取缓存失败:', error);
        throw error;
      }
    },

    /**
     * 设置缓存值
     */
    async set(key, value, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const expireAt = options?.ttlMs
          ? new Date(Date.now() + options.ttlMs).toISOString()
          : null;

        const recordData = {
          key: storageKey,
          namespace: options?.namespace || DEFAULT_NAMESPACE,
          value: value,
          expireAt: expireAt,
        };

        // 检查是否已存在
        try {
          const existing = await getCacheRecord(storageKey);
          if (existing) {
            // 更新现有记录
            await pb.collection(collectionName).update(existing.id, recordData);
          } else {
            // 创建新记录
            await pb.collection(collectionName).create(recordData);
          }
        } catch (error) {
          if (error.status === 404 || !error.status) {
            // 记录不存在，创建新记录
            await pb.collection(collectionName).create(recordData);
          } else {
            throw error;
          }
        }
      } catch (error) {
        logger.error('保存缓存失败:', error);
        throw error;
      }
    },

    /**
     * 删除缓存
     */
    async remove(key, options = {}) {
      try {
        const storageKey = buildStorageKey(key, options?.namespace);
        const record = await getCacheRecord(storageKey);

        if (record) {
          await pb.collection(collectionName).delete(record.id);
        }
      } catch (error) {
        if (error.status !== 404) {
          logger.error('删除缓存失败:', error);
          throw error;
        }
      }
    },

    /**
     * 清空缓存
     */
    async clear(options = {}) {
      try {
        const namespace = options?.namespace || DEFAULT_NAMESPACE;
        const prefix = `ctx:${namespace}:`;

        // 获取所有匹配的记录
        const records = await pb.collection(collectionName).getFullList({
          filter: `key ~ "${prefix}"`,
        });

        // 删除所有匹配的记录
        for (const record of records) {
          if (record.key.startsWith(prefix)) {
            await pb.collection(collectionName).delete(record.id);
          }
        }
      } catch (error) {
        logger.error('清空缓存失败:', error);
        throw error;
      }
    },
  };
}

/**
 * 注册缓存处理器
 * @param {Object} options - 配置选项
 * @param {string} options.pbUrl - PocketBase 服务器地址
 * @param {string} options.collectionName - 集合名称
 */
export function registerCacheHandlers(options = {}) {
  logger.debug('注册缓存处理器');

  const handler = createCacheHandlerInstance(options);

  ipcManager.registerBatch({
    /**
     * 获取缓存
     */
    'cache:get': async (key, options) => {
      const value = await handler.get(key, options);
      return { success: true, value };
    },

    /**
     * 设置缓存
     */
    'cache:set': async (key, value, options) => {
      await handler.set(key, value, options);
      return { success: true };
    },

    /**
     * 删除缓存
     */
    'cache:remove': async (key, options) => {
      await handler.remove(key, options);
      return { success: true };
    },

    /**
     * 清空缓存
     */
    'cache:clear': async (options) => {
      await handler.clear(options);
      return { success: true };
    },
  });

  logger.debug('缓存处理器注册完成');
}

export { createCacheHandlerInstance };
