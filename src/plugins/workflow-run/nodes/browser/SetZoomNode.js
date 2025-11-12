import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 设置缩放级别节点
 * 通过 HTTP 调用 browser:setZoom channel
 */
export class BrowserSetZoomNode extends HttpFlowNode {
  type = "http:browser:setZoom";
  label = "设置缩放";
  description = "通过 HTTP API 设置浏览器缩放级别";
  category = "浏览器管理";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "zoomFactor", type: "number", description: "缩放因子", required: true },
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
    const zoomFactor = this.getInput(inputs, "zoomFactor");

    this.logger.debug("设置缩放级别", { viewId, zoomFactor });

    return await this.invoke("browser:setZoom", viewId, zoomFactor);
  }
}

