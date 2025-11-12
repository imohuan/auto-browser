import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 启动 WebRequest 网络捕获节点
 * 通过 HTTP 调用 network:startWebRequestCapture channel
 */
export class NetworkStartWebRequestCaptureNode extends HttpFlowNode {
  type = "http:network:startWebRequestCapture";
  label = "启动WebRequest捕获";
  description = "通过 HTTP API 启动 WebRequest 网络捕获（不含响应体）";
  category = "网络操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "maxCaptureTime", type: "number", description: "最大捕获时间", required: false },
      { name: "inactivityTimeout", type: "number", description: "无活动超时时间", required: false },
      { name: "includeStatic", type: "boolean", description: "包含静态资源", required: false },
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
    const options = {};
    const maxCaptureTime = this.getInput(inputs, "maxCaptureTime");
    const inactivityTimeout = this.getInput(inputs, "inactivityTimeout");
    const includeStatic = this.getInput(inputs, "includeStatic");
    if (maxCaptureTime !== undefined) options.maxCaptureTime = maxCaptureTime;
    if (inactivityTimeout !== undefined) options.inactivityTimeout = inactivityTimeout;
    if (includeStatic !== undefined) options.includeStatic = includeStatic;

    this.logger.debug("启动WebRequest捕获", { viewId, options });

    return await this.invoke("network:startWebRequestCapture", viewId, options);
  }
}

