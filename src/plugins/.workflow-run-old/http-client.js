/**
 * HTTP 客户端
 * 用于调用 http-server 提供的 /api/invoke API
 * 使用 Electron 的 net.fetch
 */

import { net } from "electron";
import { createLogger } from "../../core/logger.js";

export class HTTPClient {
  constructor(baseUrl, port) {
    this.baseUrl = baseUrl || "http://localhost";
    this.port = port || 3000;
    this.logger = createLogger("workflow-run");
  }

  /**
   * 调用 IPC channel
   * @param {string} channel - IPC channel 名称
   * @param {...any} args - 参数数组
   * @returns {Promise<any>} 响应结果
   */
  async invoke(channel, ...args) {
    const url = `${this.baseUrl}:${this.port}/api/invoke`;

    this.logger.debug("调用 IPC channel", { url, channel, args });
    try {
      const response = await net.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          args,
        }),
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

      result.result = result.data
      return result;
    } catch (error) {
      throw new Error(`HTTP 调用失败: ${error.message}`);
    }
  }
}

