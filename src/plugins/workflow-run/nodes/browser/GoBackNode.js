import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 浏览器后退节点
 * 通过 HTTP 调用 browser:goBack channel
 */
export class BrowserGoBackNode extends HttpFlowNode {
  type = "http:browser:goBack";
  label = "后退";
  description = "通过 HTTP API 执行浏览器后退";
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

    this.logger.debug("执行后退", { viewId });

    return await this.invoke("browser:goBack", viewId);
  }
}

