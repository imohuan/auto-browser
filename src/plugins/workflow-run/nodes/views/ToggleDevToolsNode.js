import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 切换视图开发工具节点
 * 通过 HTTP 调用 views:toggleDevTools channel
 */
export class ViewsToggleDevToolsNode extends HttpFlowNode {
  type = "http:views:toggleDevTools";
  label = "切换视图开发工具";
  description = "通过 HTTP API 切换视图开发工具";
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

    this.logger.debug("切换视图开发工具", { viewId });

    return await this.invoke("views:toggleDevTools", viewId);
  }
}

