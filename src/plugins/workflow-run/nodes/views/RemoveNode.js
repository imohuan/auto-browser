import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 移除视图节点
 * 通过 HTTP 调用 views:remove channel
 */
export class ViewsRemoveNode extends HttpFlowNode {
  type = "http:views:remove";
  label = "移除视图";
  description = "通过 HTTP API 移除视图";
  category = "视图管理";

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

    this.logger.debug("移除视图", { viewId });

    return await this.invoke("views:remove", viewId);
  }
}

