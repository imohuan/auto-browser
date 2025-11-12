import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 自动化滚动节点
 * 通过 HTTP 调用 automation:scroll channel
 */
export class AutomationScrollNode extends HttpFlowNode {
  type = "http:automation:scroll";
  label = "滚动页面";
  description = "通过 HTTP API 滚动页面到指定位置";
  category = "自动化操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "x", type: "number", description: "X坐标", required: true },
      { name: "y", type: "number", description: "Y坐标", required: true },
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
    const x = this.getInput(inputs, "x");
    const y = this.getInput(inputs, "y");

    this.logger.debug("执行滚动操作", { viewId, x, y });

    return await this.invoke("automation:scroll", viewId, x, y);
  }
}

