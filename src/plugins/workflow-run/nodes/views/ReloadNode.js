import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 刷新视图节点
 * 通过 HTTP 调用 views:reload channel
 */
export class ViewsReloadNode extends HttpFlowNode {
  type = "http:views:reload";
  label = "刷新视图";
  description = "通过 HTTP API 刷新视图";
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

    this.logger.debug("刷新视图", { viewId });

    return await this.invoke("views:reload", viewId);
  }
}

