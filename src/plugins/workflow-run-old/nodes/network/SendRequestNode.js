import { BaseNode, context } from "../../context.js";

/**
 * HTTP 网络请求节点
 * 通过 HTTP 调用 network:sendRequest channel
 */
export class NetworkSendRequestNode extends BaseNode {
  type = "http:network:sendRequest";
  label = "发送网络请求";
  description = "通过 HTTP API 发送网络请求";
  category = "网络操作";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        required: true,
      },
      {
        id: "method",
        name: "请求方法",
        type: "string",
        required: false,
      },
      {
        id: "headers",
        name: "请求头",
        type: "object",
        required: false,
      },
      {
        id: "body",
        name: "请求体",
        type: "any",
        required: false,
      },
      {
        id: "timeout",
        name: "超时时间",
        type: "number",
        required: false,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "result",
        name: "结果",
        type: "any",
      },
    ];
  }

  getDefaultConfig() {
    return {
      method: "GET",
      timeout: 30000,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const url = inputs.url || config.url;
    const method = inputs.method || config.method || "GET";
    const headers = inputs.headers || config.headers || {};
    const body = inputs.body !== undefined ? inputs.body : config.body;
    const timeout = inputs.timeout || config.timeout || 30000;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!url) {
      throw new Error("必须提供URL");
    }

    context.logger.debug("发送网络请求", { viewId, url, method, timeout });

    // 调用 HTTP API
    const response = await context.http.invoke(
      "network:sendRequest",
      viewId,
      url,
      method,
      headers,
      body,
      timeout
    );

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `${method} ${url}`,
    };
  }
}

