// src/plugins/base-plugin.js
// 插件基类

import { createLogger } from '../core/logger.js';

/**
 * 插件基类
 * 所有插件都应该继承此类或实现相同接口
 */
export class BasePlugin {
  constructor(name) {
    this.name = name;
    this.logger = createLogger(`Plugin:${name}`);
  }

  /**
   * 获取插件名称
   */
  getName() {
    return this.name;
  }

  /**
   * 初始化插件
   * 子类必须实现此方法
   */
  async init() {
    throw new Error(`插件 ${this.name} 必须实现 init() 方法`);
  }

  /**
   * 清理插件资源
   * 子类必须实现此方法
   */
  async cleanup() {
    throw new Error(`插件 ${this.name} 必须实现 cleanup() 方法`);
  }

  /**
   * 获取插件信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version || '1.0.0',
      description: this.description || '',
    };
  }
}

