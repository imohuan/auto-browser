// src/utils/session-utils.js
// Session 工具函数：登录信息和缓存管理

import { session } from 'electron';
import { createLogger } from '../core/logger.js';

const logger = createLogger('utils/session-utils');

/**
 * Session Cookie 管理工具类
 */
export class SessionCookieManager {
  constructor(webContents) {
    this.webContents = webContents;
    this.session = webContents.session;
  }

  /**
   * 获取指定 URL 的所有 Cookies
   * @param {string} url - 目标 URL
   * @returns {Promise<Array>} Cookies 数组
   */
  async getCookies(url) {
    try {
      const cookies = await this.session.cookies.get({ url });
      logger.debug(`获取 Cookies: ${url}`, { count: cookies.length });
      return cookies;
    } catch (error) {
      logger.error(`获取 Cookies 失败: ${url}`, error);
      throw error;
    }
  }

  /**
   * 设置 Cookie（用于登录）
   * @param {Object} cookieDetails - Cookie 详细信息
   * @returns {Promise<void>}
   */
  async setCookie(cookieDetails) {
    try {
      await this.session.cookies.set(cookieDetails);
      logger.info(`设置 Cookie: ${cookieDetails.name}`, { url: cookieDetails.url });
    } catch (error) {
      logger.error(`设置 Cookie 失败`, error);
      throw error;
    }
  }

  /**
   * 批量设置 Cookies（导入登录状态）
   * @param {Array} cookies - Cookie 数组
   * @returns {Promise<void>}
   */
  async setCookies(cookies) {
    try {
      for (const cookie of cookies) {
        await this.session.cookies.set(cookie);
      }
      logger.info(`批量设置 Cookies`, { count: cookies.length });
    } catch (error) {
      logger.error(`批量设置 Cookies 失败`, error);
      throw error;
    }
  }

  /**
   * 删除 Cookie（登出）
   * @param {string} url - Cookie 所属 URL
   * @param {string} name - Cookie 名称
   * @returns {Promise<void>}
   */
  async removeCookie(url, name) {
    try {
      await this.session.cookies.remove(url, name);
      logger.info(`删除 Cookie: ${name}`, { url });
    } catch (error) {
      logger.error(`删除 Cookie 失败`, error);
      throw error;
    }
  }

  /**
   * 清除指定域名的所有 Cookies（登出）
   * @param {string} domain - 域名（如 'example.com'）
   * @returns {Promise<void>}
   */
  async clearDomainCookies(domain) {
    try {
      const cookies = await this.session.cookies.get({});
      const domainCookies = cookies.filter(cookie =>
        cookie.domain === domain || cookie.domain === `.${domain}`
      );

      for (const cookie of domainCookies) {
        await this.session.cookies.remove(cookie.url || `https://${domain}`, cookie.name);
      }

      logger.info(`清除域名 Cookies: ${domain}`, { count: domainCookies.length });
    } catch (error) {
      logger.error(`清除域名 Cookies 失败`, error);
      throw error;
    }
  }

  /**
   * 导出所有 Cookies（用于保存登录状态）
   * @returns {Promise<Array>} Cookies 数组
   */
  async exportCookies() {
    try {
      const cookies = await this.session.cookies.get({});
      logger.info(`导出 Cookies`, { count: cookies.length });
      return cookies;
    } catch (error) {
      logger.error(`导出 Cookies 失败`, error);
      throw error;
    }
  }

  /**
   * 检查是否已登录（通过检查是否存在登录相关的 Cookie）
   * @param {string} url - 目标 URL
   * @param {Array<string>} loginCookieNames - 登录 Cookie 名称列表（如 ['session', 'token', 'auth']）
   * @returns {Promise<boolean>} 是否已登录
   */
  async isLoggedIn(url, loginCookieNames = ['session', 'token', 'auth', 'login']) {
    try {
      const cookies = await this.getCookies(url);
      const hasLoginCookie = cookies.some(cookie =>
        loginCookieNames.some(name => cookie.name.toLowerCase().includes(name.toLowerCase()))
      );
      logger.debug(`检查登录状态: ${url}`, { isLoggedIn: hasLoginCookie });
      return hasLoginCookie;
    } catch (error) {
      logger.error(`检查登录状态失败`, error);
      return false;
    }
  }
}

/**
 * Session 缓存管理工具类
 */
export class SessionCacheManager {
  constructor(webContents) {
    this.webContents = webContents;
    this.session = webContents.session;
  }

  /**
   * 获取当前缓存大小
   * @returns {Promise<number>} 缓存大小（字节）
   */
  async getCacheSize() {
    try {
      const size = await this.session.getCacheSize();
      logger.debug(`获取缓存大小`, { size, sizeMB: (size / 1024 / 1024).toFixed(2) });
      return size;
    } catch (error) {
      logger.error(`获取缓存大小失败`, error);
      throw error;
    }
  }

  /**
   * 清除所有缓存
   * @returns {Promise<void>}
   */
  async clearCache() {
    try {
      await this.session.clearCache();
      logger.info('清除缓存完成');
    } catch (error) {
      logger.error('清除缓存失败', error);
      throw error;
    }
  }

  /**
   * 清除指定 URL 的缓存和存储
   * @param {string} origin - 源地址（如 'https://example.com'）
   * @param {Array<string>} storages - 要清除的存储类型
   * @returns {Promise<void>}
   */
  async clearStorageData(origin, storages = ['cache', 'cookies', 'localStorage']) {
    try {
      await this.session.clearStorageData({
        origin,
        storages,
      });
      logger.info(`清除存储数据: ${origin}`, { storages });
    } catch (error) {
      logger.error(`清除存储数据失败`, error);
      throw error;
    }
  }

  /**
   * 清除所有缓存和存储数据（完整清理）
   * @param {Array<string>} storages - 要清除的存储类型
   * @returns {Promise<void>}
   */
  async clearAll(storages = ['cache', 'cookies', 'localStorage', 'indexeddb', 'serviceworkers']) {
    try {
      await this.session.clearData({
        storages,
      });
      logger.info('清除所有数据完成', { storages });
    } catch (error) {
      logger.error('清除所有数据失败', error);
      throw error;
    }
  }

  /**
   * 刷新存储数据（将内存中的数据写入磁盘）
   * @returns {Promise<void>}
   */
  async flushStorageData() {
    try {
      await this.session.flushStorageData();
      logger.debug('刷新存储数据完成');
    } catch (error) {
      logger.error('刷新存储数据失败', error);
      throw error;
    }
  }
}

/**
 * 创建持久化 Session（用于保持登录状态）
 * @param {string} partitionName - Session 分区名称（不含 'persist:' 前缀）
 * @param {boolean} enableCache - 是否启用缓存
 * @returns {Session} Session 实例
 */
export function createPersistentSession(partitionName, enableCache = true) {
  const ses = session.fromPartition(`persist:${partitionName}`, {
    cache: enableCache,
  });
  logger.info(`创建持久化 Session: ${partitionName}`, { cache: enableCache });
  return ses;
}

/**
 * 创建临时 Session（应用关闭即清除）
 * @param {string} partitionName - Session 分区名称
 * @param {boolean} enableCache - 是否启用缓存
 * @returns {Session} Session 实例
 */
export function createTemporarySession(partitionName, enableCache = true) {
  const ses = session.fromPartition(partitionName, {
    cache: enableCache,
  });
  logger.info(`创建临时 Session: ${partitionName}`, { cache: enableCache });
  return ses;
}

