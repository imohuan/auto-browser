// src/utils/secure-store.js
// 安全的键值存储工具类（类似 electron-store，支持加密）

import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createLogger } from '../core/logger.js';
import { encrypt, decrypt } from './crypto-utils.js';
import { ensureDir } from './file-utils.js';

const logger = createLogger('utils/secure-store');

/**
 * 安全存储类（类似 electron-store）
 * 支持加密存储敏感数据
 */
export class SecureStore {
  /**
   * @param {Object} options - 配置选项
   * @param {string} options.path - 存储文件路径
   * @param {boolean} options.encrypt - 是否加密存储，默认 true
   * @param {string} options.password - 加密密码（可选，默认使用应用唯一标识）
   * @param {Object} options.defaults - 默认值对象
   */
  constructor(options = {}) {
    this._path = options.path;
    this.encrypt = options.encrypt !== false; // 默认加密
    this.password = options.password || null;
    this.defaults = options.defaults || {};
    this._data = null;
    this._watchers = new Set(); // 文件监听器集合

    if (!this._path) {
      throw new Error('SecureStore: 必须提供存储文件路径');
    }

    // 初始化：加载数据
    this._load();
  }

  /**
   * 从文件加载数据
   * @private
   */
  _load() {
    try {
      // 确保目录存在
      const dir = path.dirname(this._path);
      if (!existsSync(dir)) {
        ensureDir(dir);
      }

      // 如果文件不存在，使用默认值
      if (!existsSync(this._path)) {
        this._data = { ...this.defaults };
        this._save();
        return;
      }

      // 读取文件
      const fileContent = readFileSync(this._path, 'utf-8');

      if (!fileContent.trim()) {
        this._data = { ...this.defaults };
        this._save();
        return;
      }

      // 解析 JSON
      let data;
      if (this.encrypt) {
        // 解密后解析
        const decrypted = decrypt(fileContent, this.password);
        data = JSON.parse(decrypted);
      } else {
        // 直接解析
        data = JSON.parse(fileContent);
      }

      // 合并默认值（只添加不存在的键）
      this._data = { ...this.defaults, ...data };
    } catch (error) {
      logger.warn('加载存储文件失败，使用默认值', {
        path: this._path,
        error: error.message,
      });
      this._data = { ...this.defaults };
      this._save();
    }
  }

  /**
   * 保存数据到文件
   * @private
   */
  _save() {
    try {
      // 确保目录存在
      const dir = path.dirname(this._path);
      if (!existsSync(dir)) {
        ensureDir(dir);
      }

      // 序列化数据
      const json = JSON.stringify(this._data, null, 2);

      // 加密（如果需要）
      const content = this.encrypt ? encrypt(json, this.password) : json;

      // 写入文件
      writeFileSync(this._path, content, 'utf-8');

      logger.debug('保存存储文件', { path: this._path });
    } catch (error) {
      logger.error('保存存储文件失败', {
        path: this._path,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 获取值
   * @param {string} key - 键名（支持点号分隔的嵌套路径，如 'user.name'）
   * @param {any} defaultValue - 默认值
   * @returns {any} 值
   */
  get(key, defaultValue = undefined) {
    if (key === undefined) {
      return this.store;
    }

    const keys = key.split('.');
    let value = this._data;

    for (const k of keys) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[k];
    }

    return value === undefined ? defaultValue : value;
  }

  /**
   * 设置值
   * @param {string} key - 键名（支持点号分隔的嵌套路径，如 'user.name'）
   * @param {any} value - 值
   */
  set(key, value) {
    if (key === undefined) {
      throw new Error('SecureStore.set: 键名不能为空');
    }

    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this._data;

    // 创建嵌套对象路径
    for (const k of keys) {
      if (target[k] === null || target[k] === undefined || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    // 设置值
    target[lastKey] = value;

    // 保存到文件
    this._save();
  }

  /**
   * 删除键
   * @param {string} key - 键名（支持点号分隔的嵌套路径）
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    if (key === undefined) {
      throw new Error('SecureStore.delete: 键名不能为空');
    }

    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this._data;

    // 遍历到目标对象的父对象
    for (const k of keys) {
      if (target[k] === null || target[k] === undefined || typeof target[k] !== 'object') {
        return false; // 路径不存在
      }
      target = target[k];
    }

    // 删除键
    if (lastKey in target) {
      delete target[lastKey];
      this._save();
      return true;
    }

    return false;
  }

  /**
   * 检查键是否存在
   * @param {string} key - 键名（支持点号分隔的嵌套路径）
   * @returns {boolean}
   */
  has(key) {
    if (key === undefined) {
      return false;
    }

    const keys = key.split('.');
    let value = this._data;

    for (const k of keys) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return false;
      }
      value = value[k];
    }

    return value !== undefined;
  }

  /**
   * 清空所有数据
   */
  clear() {
    this._data = { ...this.defaults };
    this._save();
  }

  /**
   * 重置为默认值
   */
  reset() {
    this._data = { ...this.defaults };
    this._save();
  }

  /**
   * 获取所有数据
   * @returns {Object}
   */
  get store() {
    return this._data;
  }

  /**
   * 设置所有数据（替换整个存储）
   * @param {Object} data - 数据对象
   */
  set store(data) {
    this._data = { ...this.defaults, ...data };
    this._save();
  }

  /**
   * 获取存储大小（键的数量）
   * @returns {number}
   */
  get size() {
    return Object.keys(this._data).length;
  }

  /**
   * 获取存储文件路径
   * @returns {string}
   */
  get path() {
    return this._path;
  }

  /**
   * 重新加载数据（从文件）
   */
  reload() {
    this._load();
  }
}

