/**
 * 工作流服务器类型定义
 */

/** 从客户端接收的消息类型 */
export const ClientMessageTypes = {
  INIT: "INIT",
  EXECUTE_WORKFLOW: "EXECUTE_WORKFLOW",
  PING: "PING",
};

/** 发送给客户端的消息类型 */
export const ServerMessageTypes = {
  INITIALIZED: "INITIALIZED",
  WORKFLOW_EVENT: "WORKFLOW_EVENT",
  ERROR: "ERROR",
  PONG: "PONG",
};

/**
 * 客户端连接信息
 */
export class ClientConnection {
  /**
   * @param {string} id - 客户端ID
   * @param {any} ws - WebSocket 实例
   * @param {number} connectedAt - 连接时间戳
   * @param {number} lastPingAt - 最后心跳时间戳
   */
  constructor(id, ws, connectedAt, lastPingAt) {
    this.id = id;
    this.ws = ws;
    this.connectedAt = connectedAt;
    this.lastPingAt = lastPingAt;
  }
}

/**
 * 服务器配置
 */
export class ServerConfig {
  /**
   * @param {number} port - WebSocket 端口
   * @param {string} host - 主机地址
   * @param {number} heartbeatInterval - 心跳间隔（毫秒）
   * @param {number} maxConnections - 最大连接数
   */
  constructor(port, host, heartbeatInterval, maxConnections) {
    this.port = port;
    this.host = host || "localhost";
    this.heartbeatInterval = heartbeatInterval || 30000;
    this.maxConnections = maxConnections || 100;
  }
}

