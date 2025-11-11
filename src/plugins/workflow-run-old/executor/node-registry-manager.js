/**
 * 节点注册表管理器
 * 负责初始化和管理所有节点类型
 * 参考服务端 DEMO 实现逻辑
 */

import { BaseNode, NodeRegistry, CoreNodeRegistry } from "workflow-node-executor";
import { BrowserNodeRegistry } from "../node-registry.js";
import { context } from "../context.js";

export class NodeRegistryManager {
  /**
   * 节点注册表列表
   * @type {NodeRegistry[]}
   */
  nodeRegistries = [];

  /**
   * 节点类型映射表：{ type: BaseNode }
   * @type {Map<string, BaseNode>}
   */
  nodeTypeMap = new Map();

  constructor() {
    // 初始化注册表列表（当前只有浏览器节点注册表）
    this.nodeRegistries = [new CoreNodeRegistry(), new BrowserNodeRegistry()];
    this.nodeTypeMap = new Map();
  }

  /**
   * 初始化节点注册表
   */
  initialize() {
    context.logger.debug("[NodeRegistry] 正在初始化节点注册表...");

    this.nodeRegistries.forEach((registry) => {
      const nodes = registry.getAllNodes();
      nodes.forEach((node) => {
        this.nodeTypeMap.set(node.type, node);
      });
    });

    const nodeCount = this.nodeTypeMap.size;
    context.logger.debug(`[NodeRegistry] ✅ 已加载 ${nodeCount} 个节点`);
  }

  /**
   * 获取节点实例（节点工厂函数）
   * @param {string} type - 节点类型
   * @returns {BaseNode | undefined} 节点实例
   */
  getNodeByType(type) {
    return this.nodeTypeMap.get(type);
  }

  /**
   * 提取所有节点元数据
   * @returns {Array<{
   *   type: string;
   *   label: string;
   *   description: string;
   *   category: string;
   *   inputs: any[];
   *   outputs: any[];
   *   defaultConfig: Record<string, any>;
   * }>} 节点元数据数组
   */
  extractAllNodeMetadata() {
    const metadata = [];

    this.nodeTypeMap.forEach((node) => {
      const nodeData = node.createNodeData();
      metadata.push({
        type: node.type,
        label: node.label,
        description: node.description,
        category: node.category,
        inputs: nodeData.inputs,
        outputs: nodeData.outputs,
        defaultConfig: nodeData.config,
      });
    });

    return metadata;
  }

  /**
   * 获取节点数量
   * @returns {number} 节点数量
   */
  getNodeCount() {
    return this.nodeTypeMap.size;
  }

  /**
   * 检查节点类型是否存在
   * @param {string} type - 节点类型
   * @returns {boolean} 是否存在
   */
  hasNodeType(type) {
    return this.nodeTypeMap.has(type);
  }
}

