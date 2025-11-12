import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 网络请求节点
 * 通过 HTTP 调用 network:sendRequest channel
 */
export class NetworkSendRequestNode extends HttpFlowNode {
  type = "http:network:sendRequest";
  label = "发送网络请求";
  description = "通过 HTTP API 发送网络请求";
  category = "网络操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "url", type: "string", description: "URL", required: true },
      { name: "method", type: "string", description: "请求方法", required: false },
      { name: "headers", type: "object", description: "请求头", required: false },
      { name: "body", type: "any", description: "请求体", required: false },
      { name: "timeout", type: "number", description: "超时时间", required: false },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
    ];
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const url = this.getInput(inputs, "url");
    const method = this.getInput(inputs, "method") ?? "GET";
    const headers = this.getInput(inputs, "headers") ?? {};
    const body = this.getInput(inputs, "body");
    const timeout = this.getInput(inputs, "timeout") ?? 30000;

    this.logger.debug("发送网络请求", { viewId, url, method, timeout });

    return await this.invoke(
      "network:sendRequest",
      viewId,
      url,
      method,
      headers,
      body,
      timeout
    );
  }
}

