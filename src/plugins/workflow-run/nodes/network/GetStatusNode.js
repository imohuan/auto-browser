import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取网络监控状态节点
 * 通过 HTTP 调用 network:getStatus channel
 */
export class NetworkGetStatusNode extends HttpFlowNode {
  type = "http:network:getStatus";
  label = "获取网络状态";
  description = "通过 HTTP API 获取网络监控状态";
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

    this.logger.debug("获取网络状态", { viewId });

    return await this.invoke("network:getStatus", viewId);
  }
}

