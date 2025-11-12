import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 浏览器刷新节点
 * 通过 HTTP 调用 browser:reload channel
 */
export class BrowserReloadNode extends HttpFlowNode {
  type = "http:browser:reload";
  label = "刷新";
  description = "通过 HTTP API 刷新页面";
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

    this.logger.debug("刷新页面", { viewId });

    return await this.invoke("browser:reload", viewId);
  }
}

