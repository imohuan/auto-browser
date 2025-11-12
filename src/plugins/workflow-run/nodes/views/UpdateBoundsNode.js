import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 更新视图边界节点
 * 通过 HTTP 调用 views:updateBounds channel
 */
export class ViewsUpdateBoundsNode extends HttpFlowNode {
  type = "http:views:updateBounds";
  label = "更新视图边界";
  description = "通过 HTTP API 更新视图位置和大小";
  category = "视图管理";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "bounds", type: "object", description: "边界", required: true },
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
    const bounds = this.getInput(inputs, "bounds");

    this.logger.debug("更新视图边界", { viewId, bounds });

    return await this.invoke("views:updateBounds", viewId, bounds);
  }
}

