// src/plugins/plugin-manager.js
// 插件管理器

import { createLogger } from '../core/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('PluginManager');

/**
 * 插件管理器
 */
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.pluginDir = path.join(__dirname);
  }

  /**
   * 加载所有插件
   */
  async loadPlugins() {
    logger.info('开始加载插件...');

    try {
      // 获取插件目录下的所有子目录
      const entries = fs.readdirSync(this.pluginDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'plugin-manager.js' || entry.name === 'base-plugin.js' || entry.name.startsWith('.')) continue;

        const pluginPath = path.join(this.pluginDir, entry.name, 'index.js');

        if (!fs.existsSync(pluginPath)) {
          logger.warn(`插件目录 ${entry.name} 中没有找到 index.js，跳过`);
          continue;
        }

        try {
          await this.loadPlugin(entry.name, pluginPath);
        } catch (error) {
          logger.error(`加载插件 ${entry.name} 失败`, {
            error: error.message,
            stack: error.stack,
          });
        }
      }

      logger.info(`插件加载完成，共加载 ${this.plugins.size} 个插件`);
    } catch (error) {
      logger.error('加载插件失败', { error: error.message });
    }
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(pluginName, pluginPath) {
    try {
      logger.debug(`加载插件: ${pluginName}`, { path: pluginPath });

      // 动态导入插件
      const pluginModule = await import(`file://${pluginPath}`);
      const PluginClass = pluginModule.default || pluginModule[pluginName];

      if (!PluginClass) {
        throw new Error(`插件 ${pluginName} 没有导出默认类或同名类`);
      }

      // 创建插件实例
      const plugin = new PluginClass();

      // 验证插件接口
      if (typeof plugin.init !== 'function') {
        throw new Error(`插件 ${pluginName} 必须实现 init() 方法`);
      }
      if (typeof plugin.cleanup !== 'function') {
        throw new Error(`插件 ${pluginName} 必须实现 cleanup() 方法`);
      }
      if (typeof plugin.getName !== 'function') {
        throw new Error(`插件 ${pluginName} 必须实现 getName() 方法`);
      }

      // 注册插件
      this.plugins.set(pluginName, {
        name: pluginName,
        instance: plugin,
        enabled: true,
      });

      logger.info(`插件 ${pluginName} 加载成功`);
    } catch (error) {
      logger.error(`加载插件 ${pluginName} 失败`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 初始化所有插件
   */
  async initPlugins() {
    logger.info('开始初始化插件...');

    const initPromises = [];

    for (const [name, plugin] of this.plugins) {
      if (!plugin.enabled) {
        logger.debug(`插件 ${name} 已禁用，跳过初始化`);
        continue;
      }

      initPromises.push(
        (async () => {
          try {
            logger.debug(`初始化插件: ${name}`);
            await plugin.instance.init();
            logger.info(`插件 ${name} 初始化成功`);
          } catch (error) {
            logger.error(`插件 ${name} 初始化失败`, {
              error: error.message,
              stack: error.stack,
            });
            // 标记为禁用，但不阻止其他插件初始化
            plugin.enabled = false;
          }
        })()
      );
    }

    await Promise.all(initPromises);
    logger.info('插件初始化完成');
  }

  /**
   * 清理所有插件
   */
  async cleanupPlugins() {
    logger.info('开始清理插件...');

    const cleanupPromises = [];

    for (const [name, plugin] of this.plugins) {
      if (!plugin.enabled) {
        continue;
      }

      cleanupPromises.push(
        (async () => {
          try {
            logger.debug(`清理插件: ${name}`);
            await plugin.instance.cleanup();
            logger.info(`插件 ${name} 清理完成`);
          } catch (error) {
            logger.error(`插件 ${name} 清理失败`, {
              error: error.message,
              stack: error.stack,
            });
          }
        })()
      );
    }

    await Promise.all(cleanupPromises);
    logger.info('插件清理完成');
  }

  /**
   * 获取插件
   */
  getPlugin(name) {
    const plugin = this.plugins.get(name);
    return plugin?.enabled ? plugin.instance : null;
  }

  /**
   * 获取所有插件
   */
  getAllPlugins() {
    return Array.from(this.plugins.values())
      .filter((p) => p.enabled)
      .map((p) => p.instance);
  }

  /**
   * 启用插件
   */
  enablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = true;
      logger.info(`插件 ${name} 已启用`);
    }
  }

  /**
   * 禁用插件
   */
  disablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = false;
      logger.info(`插件 ${name} 已禁用`);
    }
  }
}

// 创建单例
export const pluginManager = new PluginManager();

