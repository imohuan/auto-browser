import { createLogger } from "../../../core/logger.js";
import { APP_CONFIG } from "../../../core/constants.js";
import { BaseFlowNode } from "workflow-flow-nodes";
export { BaseFlowNode };

/**
 * 面向 HTTP 的基础节点
 * 提供日志、_invoke(raw) 与 invoke(包装为 NodeExecutionResult)
 */
export class HttpFlowNode extends BaseFlowNode {
  constructor() {
    super();
    this.logger = createLogger("workflow-run");
    this.baseUrl = "http://localhost";
    this.port = APP_CONFIG.HTTP_PORT;
  }

  shouldUseCache(inputs, context) {
    return false;
  }

  /**
   * 原始 HTTP 调用（抛出异常由上层处理）
   * @param {string} channel
   * @param  {...any} args
   * @returns {Promise<any>} 原始数据 data
   */
  async _invoke(channel, ...args) {
    const { net } = await import("electron");
    const url = `${this.baseUrl}:${this.port}/api/invoke`;
    this.logger.debug("调用 IPC channel", { url, channel, args });
    const response = await net.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, args }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      this.logger.error("响应错误", { channel, args, errorData });
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    this.logger.debug("响应结果", { channel, args, result });
    if (!result.success) {
      throw new Error(result.error || "调用失败");
    }
    return result.data ?? result.result ?? result;
  }

  /**
   * 封装输出为 NodeExecutionResult
   * @param {string} channel
   * @param  {...any} args
   * @returns {Promise<import("workflow-flow-nodes").NodeExecutionResult>}
   */
  async invoke(channel, ...args) {
    try {
      const data = await this._invoke(channel, ...args);
      return this.createOutput({ result: data }, data, `${channel} 调用成功`);
    } catch (error) {
      this.logger.error("调用失败", { channel, args, error });
      return this.createError(error instanceof Error ? error : String(error));
    }
  }
}
