import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 停止 WebRequest 网络捕获节点
 * 通过 HTTP 调用 network:stopWebRequestCapture channel
 */
export class NetworkStopWebRequestCaptureNode extends HttpFlowNode {
  type = "http:network:stopWebRequestCapture";
  label = "停止WebRequest捕获";
  description = "通过 HTTP API 停止 WebRequest 网络捕获并返回结果";
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

    this.logger.debug("停止WebRequest捕获", { viewId });

    return await this.invoke("network:stopWebRequestCapture", viewId);
  }
}

