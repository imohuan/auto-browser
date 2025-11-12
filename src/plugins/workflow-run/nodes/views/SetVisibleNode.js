import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 设置视图可见性节点
 * 通过 HTTP 调用 views:setVisible channel
 */
export class ViewsSetVisibleNode extends HttpFlowNode {
  type = "http:views:setVisible";
  label = "设置视图可见性";
  description = "通过 HTTP API 设置视图显示/隐藏";
  category = "视图管理";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "visible", type: "boolean", description: "是否可见", required: true },
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
    const visible = this.getInput(inputs, "visible");

    this.logger.debug("设置视图可见性", { viewId, visible });

    return await this.invoke("views:setVisible", viewId, visible);
  }
}

