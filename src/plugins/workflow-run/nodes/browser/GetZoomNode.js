import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取缩放级别节点
 * 通过 HTTP 调用 browser:getZoom channel
 */
export class BrowserGetZoomNode extends HttpFlowNode {
  type = "http:browser:getZoom";
  label = "获取缩放";
  description = "通过 HTTP API 获取浏览器缩放级别";
  category = "浏览器管理";

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

    this.logger.debug("获取缩放级别", { viewId });

    return await this.invoke("browser:getZoom", viewId);
  }
}

