import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 表单填充节点
 * 通过 HTTP 调用 automation:fillForm channel
 */
export class AutomationFillFormNode extends HttpFlowNode {
  type = "http:automation:fillForm";
  label = "填充表单";
  description = "通过 HTTP API 填充表单元素";
  category = "自动化操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "selector", type: "string", description: "选择器", required: true },
      { name: "value", type: "string", description: "值", required: true },
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
    const selector = this.getInput(inputs, "selector");
    const value = this.getInput(inputs, "value");

    this.logger.debug("填充表单", { viewId, selector });

    return await this.invoke("automation:fillForm", viewId, selector, value);
  }
}

