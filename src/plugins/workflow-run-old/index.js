/**
 * 工作流节点执行器插件
 * 提供工作流节点的注册和执行功能
 */

import { BasePlugin } from "../base-plugin.js";
import { NodeRegistryManager } from "./executor/node-registry-manager.js";
import { WorkflowExecutor } from "./executor/executor.js";
import { WorkflowServer } from "./executor/server.js";
import { APP_CONFIG } from "../../core/constants.js";

export default class WorkflowRunPlugin extends BasePlugin {
  constructor() {
    super("workflow-run");
    this.version = "1.0.0";
    this.description = "工作流节点执行器插件，提供节点注册和执行功能";

    // 节点注册表管理器
    this.nodeRegistry = null;
    // 工作流执行器
    this.executor = null;
    // WebSocket 服务器
    this.server = null;
  }

  /**
   * 初始化插件
   */
  async init() {
    this.logger.info("初始化工作流节点执行器插件...");

    try {
      // 创建节点注册表管理器
      this.nodeRegistry = new NodeRegistryManager();
      // 初始化节点注册表
      this.nodeRegistry.initialize();

      // 创建工作流执行器
      this.executor = new WorkflowExecutor(this.nodeRegistry);

      // 创建并启动 WebSocket 服务器
      this.server = new WorkflowServer({
        port: APP_CONFIG.WS_PORT,
        host: "localhost",
        heartbeatInterval: 30000,
        maxConnections: 100,
      });
      this.server.start();

      this.logger.info(
        `工作流节点执行器插件初始化完成，已加载 ${this.nodeRegistry.getNodeCount()} 个节点`
      );
    } catch (error) {
      this.logger.error("工作流节点执行器插件初始化失败", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 清理插件资源
   */
  async cleanup() {
    this.logger.info("清理工作流节点执行器插件资源...");

    // 停止 WebSocket 服务器
    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    this.nodeRegistry = null;
    this.executor = null;

    this.logger.info("工作流节点执行器插件清理完成");
  }

  /**
   * 获取节点注册表管理器
   * @returns {NodeRegistryManager} 节点注册表管理器
   */
  getNodeRegistry() {
    return this.nodeRegistry;
  }

  /**
   * 获取工作流执行器
   * @returns {WorkflowExecutor} 工作流执行器
   */
  getExecutor() {
    return this.executor;
  }

  /**
   * 获取所有节点元数据
   * @returns {Array} 节点元数据数组
   */
  getAllNodeMetadata() {
    if (!this.nodeRegistry) {
      return [];
    }
    return this.nodeRegistry.extractAllNodeMetadata();
  }

  /**
   * 获取 WebSocket 服务器
   * @returns {WorkflowServer} WebSocket 服务器
   */
  getServer() {
    return this.server;
  }
}

