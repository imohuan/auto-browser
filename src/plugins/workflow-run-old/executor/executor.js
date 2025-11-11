/**
 * 工作流执行器
 * 负责执行工作流并通过事件回调发送事件
 * 参考服务端 DEMO 实现逻辑
 */

import { executeWorkflow } from "workflow-node-executor";
import { context } from "../context.js";

/**
 * 工作流执行器类
 */
export class WorkflowExecutor {
  /**
   * 创建执行器实例
   * @param {import("./node-registry-manager.js").NodeRegistryManager} nodeRegistry - 节点注册表管理器
   */
  constructor(nodeRegistry) {
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * 执行工作流
   * @param {string} executionId - 执行ID
   * @param {string} workflowId - 工作流ID
   * @param {any[]} nodes - 节点数组
   * @param {any[]} edges - 边数组
   * @param {(message: any) => void} sendMessage - 消息发送回调函数
   * @returns {Promise<any>} 执行结果
   */
  async execute(executionId, workflowId, nodes, edges, sendMessage) {
    context.logger.debug(
      `[Executor] 开始执行工作流: ${workflowId} (执行ID: ${executionId})`
    );

    try {
      // 创建事件发射器（将事件通过回调发送）
      const emitter = this.createEventEmitter(sendMessage);

      const options = {
        nodes,
        edges,
        nodeFactory: (type) => this.nodeRegistry.getNodeByType(type),
        emitter: emitter,
        executionId,
        workflowId,
      };

      const result = await executeWorkflow(options);

      context.logger.debug(
        `[Executor] ✅ 工作流执行完成: ${executionId}`,
        result
      );

      return result;
    } catch (error) {
      context.logger.error(
        `[Executor] ❌ 工作流执行失败: ${executionId}`,
        error
      );

      // 发送错误消息
      sendMessage({
        type: "ERROR",
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: "WORKFLOW_EXECUTION_ERROR",
        },
      });

      throw error;
    }
  }

  /**
   * 创建事件发射器
   * @param {(message: any) => void} sendMessage - 消息发送回调
   * @returns {any} 事件发射器对象
   */
  createEventEmitter(sendMessage) {
    return {
      emit(eventType, eventData) {
        const message = {
          type: "WORKFLOW_EVENT",
          payload: {
            eventType,
            eventData,
          },
        };
        sendMessage(message);
      },
      on() {
        // 执行器端不需要监听事件
      },
      off() {
        // 执行器端不需要取消监听
      },
    };
  }
}

