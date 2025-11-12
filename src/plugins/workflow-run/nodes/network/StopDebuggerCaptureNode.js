import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 停止 Debugger 网络捕获节点
 * 通过 HTTP 调用 network:stopDebuggerCapture channel
 */
export class NetworkStopDebuggerCaptureNode extends HttpFlowNode {
  type = "http:network:stopDebuggerCapture";
  label = "停止Debugger捕获";
  description = "通过 HTTP API 停止 Debugger 网络捕获并返回结果（含响应体）";
  category = "网络操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");

    this.logger.debug("停止Debugger捕获", { viewId });

    return await this.invoke("network:stopDebuggerCapture", viewId);
  }
}

