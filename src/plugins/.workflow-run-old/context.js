import { HTTPClient } from "./http-client.js";
import { createLogger } from "../../core/logger.js";
import { APP_CONFIG } from "../../core/constants.js";

export { BaseNode } from "workflow-node-executor";

/**
 * 工作流执行上下文
 * 提供 HTTP 客户端和日志功能
 */
class Context {
  constructor() {
    // 初始化 HTTP 客户端
    this.http = new HTTPClient("http://localhost", APP_CONFIG.HTTP_PORT);

    // 初始化日志记录器
    this.logger = createLogger("workflow-run");
  }
}

export const context = new Context();