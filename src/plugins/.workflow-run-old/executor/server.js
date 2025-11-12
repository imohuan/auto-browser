/**
 * WebSocket 工作流服务器
 * 提供工作流执行服务，替代 Web Worker
 * 参考服务端 DEMO 实现逻辑
 */

import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { NodeRegistryManager } from "./node-registry-manager.js";
import { WorkflowExecutor } from "./executor.js";
import { context } from "../context.js";
import { ClientConnection, ServerConfig } from "./types.js";

/**
 * 工作流 WebSocket 服务器
 */
export class WorkflowServer {
  /**
   * @param {Partial<ServerConfig>} config - 服务器配置
   */
  constructor(config = {}) {
    const defaultConfig = new ServerConfig(
      config.port || 3001,
      config.host || "localhost",
      config.heartbeatInterval || 30000,
      config.maxConnections || 100
    );

    this.config = Object.assign(defaultConfig, config);
    this.wss = null;
    this.nodeRegistry = new NodeRegistryManager();
    this.executor = new WorkflowExecutor(this.nodeRegistry);
    this.clients = new Map();
    this.serverId = `server_${randomUUID()}`;
    this.heartbeatTimer = null;
  }

  /**
   * 启动服务器
   */
  start() {
    context.logger.info("========================================");
    context.logger.info("🚀 工作流 WebSocket 服务器");
    context.logger.info("========================================");

    // 先初始化节点注册表
    try {
      this.nodeRegistry.initialize();
    } catch (error) {
      context.logger.error("❌ 节点注册表初始化失败:", error);
      throw error;
    }

    // 创建 WebSocket 服务器
    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host,
    });

    // 设置连接处理
    this.wss.on("connection", this.handleConnection.bind(this));

    // 设置错误处理
    this.wss.on("error", this.handleServerError.bind(this));

    // 监听服务器就绪事件
    this.wss.on("listening", () => {
      context.logger.info(
        `✅ WebSocket 服务器正在监听端口 ${this.config.port}`
      );
    });

    // 启动心跳检测
    this.startHeartbeat();

    context.logger.info(`✅ 服务器已启动`);
    context.logger.info(`   地址: ws://${this.config.host}:${this.config.port}`);
    context.logger.info(`   节点数: ${this.nodeRegistry.getNodeCount()}`);
    context.logger.info(`   最大连接数: ${this.config.maxConnections}`);
    context.logger.info("========================================");
  }

  /**
   * 停止服务器
   */
  stop() {
    context.logger.info("正在停止服务器...");

    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // 关闭所有客户端连接
    this.clients.forEach((client) => {
      try {
        if (client.ws.readyState === 1) {
          // WebSocket.OPEN
          client.ws.close(1000, "Server shutting down");
        }
      } catch (error) {
        context.logger.error(`关闭客户端连接失败: ${client.id}`, error);
      }
    });
    this.clients.clear();

    // 关闭服务器
    if (this.wss) {
      this.wss.close(() => {
        context.logger.info("✅ 服务器已停止");
      });
    }
  }

  /**
   * 处理客户端连接
   * @private
   */
  handleConnection(ws) {
    const clientId = `client_${randomUUID()}`;

    // 检查连接数限制
    if (this.clients.size >= this.config.maxConnections) {
      context.logger.warn(`❌ 拒绝连接 ${clientId}: 已达到最大连接数`);
      ws.close(1008, "Max connections reached");
      return;
    }

    const client = new ClientConnection(clientId, ws, Date.now(), Date.now());

    this.clients.set(clientId, client);
    context.logger.info(
      `✅ 客户端已连接: ${clientId} (总连接数: ${this.clients.size})`
    );

    // 监听消息
    ws.on("message", (data) => {
      this.handleMessage(clientId, data);
    });

    // 监听关闭
    ws.on("close", (code, reason) => {
      this.handleDisconnection(clientId, code, reason?.toString() || "");
    });

    // 监听错误
    ws.on("error", (error) => {
      this.handleClientError(clientId, error);
    });
  }

  /**
   * 处理客户端消息
   * @private
   */
  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "INIT":
          this.handleInit(client);
          break;

        case "EXECUTE_WORKFLOW":
          this.handleExecuteWorkflow(client, message.payload);
          break;

        case "PING":
          this.handlePing(client, message.payload);
          break;

        default:
          context.logger.warn(`[${clientId}] 未知消息类型:`, message);
      }
    } catch (error) {
      context.logger.error(`[${clientId}] 解析消息失败:`, error);
      this.sendMessage(client, {
        type: "ERROR",
        payload: {
          message: "Invalid message format",
          code: "INVALID_MESSAGE",
        },
      });
    }
  }

  /**
   * 处理初始化请求
   * @private
   */
  handleInit(client) {
    context.logger.debug(`[${client.id}] 处理初始化请求`);

    const nodeMetadata = this.nodeRegistry.extractAllNodeMetadata();

    const response = {
      type: "INITIALIZED",
      payload: {
        nodeMetadata,
        serverId: this.serverId,
        timestamp: Date.now(),
      },
    };

    this.sendMessage(client, response);
    context.logger.info(
      `[${client.id}] ✅ 已发送 ${nodeMetadata.length} 个节点元数据`
    );
  }

  /**
   * 处理工作流执行请求
   * @private
   */
  async handleExecuteWorkflow(client, payload) {
    context.logger.info(
      `[${client.id}] 执行工作流: ${payload.workflowId} (ID: ${payload.executionId})`
    );

    const { executionId, workflowId, nodes, edges } = payload;

    // 异步执行工作流（不阻塞其他消息处理）
    this.executor
      .execute(executionId, workflowId, nodes, edges, (message) => {
        this.sendMessage(client, message);
      })
      .catch((error) => {
        context.logger.error(`[${client.id}] 工作流执行异常:`, error);
      });
  }

  /**
   * 处理心跳 PING
   * @private
   */
  handlePing(client, payload) {
    client.lastPingAt = Date.now();

    const response = {
      type: "PONG",
      payload: {
        timestamp: payload.timestamp,
        serverTimestamp: Date.now(),
      },
    };

    this.sendMessage(client, response);
  }

  /**
   * 发送消息给客户端
   * @private
   */
  sendMessage(client, message) {
    if (client.ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        context.logger.error(`发送消息失败 [${client.id}]:`, error);
      }
    }
  }

  /**
   * 处理客户端断开连接
   * @private
   */
  handleDisconnection(clientId, code, reason) {
    this.clients.delete(clientId);
    context.logger.info(
      `🔌 客户端已断开: ${clientId} (code: ${code}, reason: ${reason || "none"
      }) (剩余: ${this.clients.size})`
    );
  }

  /**
   * 处理客户端错误
   * @private
   */
  handleClientError(clientId, error) {
    context.logger.error(`[${clientId}] 客户端错误:`, error);
  }

  /**
   * 处理服务器错误
   * @private
   */
  handleServerError(error) {
    context.logger.error("❌ 服务器错误:", error);
  }

  /**
   * 启动心跳检测
   * @private
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 2; // 2倍心跳间隔为超时

      this.clients.forEach((client) => {
        if (now - client.lastPingAt > timeout) {
          context.logger.warn(`⚠️  客户端 ${client.id} 心跳超时，断开连接`);
          try {
            client.ws.close(1000, "Heartbeat timeout");
          } catch (error) {
            context.logger.error(`关闭超时客户端失败: ${client.id}`, error);
          }
          this.clients.delete(client.id);
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * 获取服务器状态
   * @returns {Object} 服务器状态信息
   */
  getStatus() {
    return {
      serverId: this.serverId,
      isRunning: this.wss !== null,
      clientCount: this.clients.size,
      nodeCount: this.nodeRegistry.getNodeCount(),
      config: this.config,
    };
  }
}

