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
    // 插件依赖配置：{ "插件名称": { 等待插件: [插件名称, ...] } }
    this.pluginDependencies = {
      "workflow-run": {
        waitPlugins: ["multidimensional_table"],
      },
    };
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
   * 设置插件依赖关系
   * @param {Object} dependencies - 插件依赖配置，格式：{ "插件名称": { 等待插件: [插件名称, ...] } }
   */
  setPluginDependencies(dependencies) {
    if (typeof dependencies !== 'object' || dependencies === null || Array.isArray(dependencies)) {
      logger.warn('插件依赖配置必须是对象，已忽略');
      return;
    }
    this.pluginDependencies = dependencies;
    logger.info('插件依赖关系已设置', { dependencies });
  }

  /**
   * 获取插件的依赖关系
   * @param {string} pluginName - 插件名称
   * @returns {string[]} 依赖的插件名称数组
   */
  getPluginDependencies(pluginName) {
    const config = this.pluginDependencies[pluginName];
    if (!config || !config.waitPlugins) {
      return [];
    }
    return Array.isArray(config.waitPlugins) ? config.waitPlugins : [];
  }

  /**
   * 构建依赖图并获取执行顺序
   * @returns {Array<Array<string>>} 按层级分组的插件名称数组，每层可以并发执行
   */
  getExecutionLayers() {
    const layers = [];
    const inDegree = new Map(); // 每个插件的入度（依赖数量）
    const dependencies = new Map(); // 每个插件依赖的其他插件
    const dependents = new Map(); // 每个插件被哪些插件依赖

    // 初始化所有已加载的插件
    for (const name of this.plugins.keys()) {
      inDegree.set(name, 0);
      dependencies.set(name, new Set());
      dependents.set(name, new Set());
    }

    // 构建依赖图
    for (const [pluginName, deps] of Object.entries(this.pluginDependencies)) {
      if (!this.plugins.has(pluginName)) {
        continue; // 跳过未加载的插件
      }

      const waitPlugins = Array.isArray(deps.waitPlugins) ? deps.waitPlugins : [];
      for (const depName of waitPlugins) {
        if (this.plugins.has(depName)) {
          dependencies.get(pluginName).add(depName);
          dependents.get(depName).add(pluginName);
          inDegree.set(pluginName, inDegree.get(pluginName) + 1);
        }
      }
    }

    // 拓扑排序：找到所有没有依赖的插件（第一层）
    const queue = [];
    for (const [name, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    // 按层级执行
    while (queue.length > 0) {
      const currentLayer = [...queue];
      queue.length = 0;
      layers.push(currentLayer);

      // 处理当前层的所有插件，更新依赖它们的插件的入度
      for (const pluginName of currentLayer) {
        for (const dependentName of dependents.get(pluginName)) {
          const newDegree = inDegree.get(dependentName) - 1;
          inDegree.set(dependentName, newDegree);
          if (newDegree === 0) {
            queue.push(dependentName);
          }
        }
      }
    }

    // 检查是否有循环依赖
    const remaining = Array.from(inDegree.entries()).filter(([_, degree]) => degree > 0);
    if (remaining.length > 0) {
      logger.warn('检测到循环依赖或未定义的依赖', {
        plugins: remaining.map(([name]) => name),
      });
      // 将剩余的插件添加到最后一层
      if (remaining.length > 0) {
        layers.push(remaining.map(([name]) => name));
      }
    }

    return layers;
  }

  /**
   * 初始化所有插件（按依赖关系顺序执行，同层并发）
   */
  async initPlugins() {
    logger.info('开始初始化插件...');

    const executionLayers = this.getExecutionLayers();
    const completedPlugins = new Set(); // 已完成的插件

    // 按层级顺序执行
    for (let layerIndex = 0; layerIndex < executionLayers.length; layerIndex++) {
      const layer = executionLayers[layerIndex];
      const enabledPlugins = layer.filter((name) => {
        const plugin = this.plugins.get(name);
        return plugin && plugin.enabled;
      });

      if (enabledPlugins.length === 0) {
        continue;
      }

      logger.debug(`执行第 ${layerIndex + 1} 层插件初始化: ${enabledPlugins.join(', ')}`);

      // 并发执行当前层的所有插件
      const layerPromises = enabledPlugins.map((name) =>
        (async () => {
          const plugin = this.plugins.get(name);
          try {
            logger.debug(`初始化插件: ${name}`);
            await plugin.instance.init();
            logger.info(`插件 ${name} 初始化成功`);
            completedPlugins.add(name);
          } catch (error) {
            logger.error(`插件 ${name} 初始化失败`, {
              error: error.message,
              stack: error.stack,
            });
            // 标记为禁用，但不阻止其他插件初始化
            plugin.enabled = false;
            completedPlugins.add(name); // 标记为已完成，避免阻塞后续插件
          }
        })()
      );

      await Promise.all(layerPromises);
    }

    logger.info('插件初始化完成');
  }

  /**
   * 清理所有插件（按依赖关系逆序执行，同层并发）
   */
  async cleanupPlugins() {
    logger.info('开始清理插件...');

    const executionLayers = this.getExecutionLayers();

    // 按逆序执行（从最后一层到第一层）
    for (let layerIndex = executionLayers.length - 1; layerIndex >= 0; layerIndex--) {
      const layer = executionLayers[layerIndex];
      const enabledPlugins = layer.filter((name) => {
        const plugin = this.plugins.get(name);
        return plugin && plugin.enabled;
      });

      if (enabledPlugins.length === 0) {
        continue;
      }

      logger.debug(`执行第 ${executionLayers.length - layerIndex} 层插件清理: ${enabledPlugins.join(', ')}`);

      // 并发执行当前层的所有插件
      const layerPromises = enabledPlugins.map((name) =>
        (async () => {
          const plugin = this.plugins.get(name);
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

      await Promise.all(layerPromises);
    }

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

