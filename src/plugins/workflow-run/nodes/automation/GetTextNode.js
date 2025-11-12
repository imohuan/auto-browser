import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取元素文本节点
 * 通过 HTTP 调用 automation:getText channel
 */
export class AutomationGetTextNode extends HttpFlowNode {
  type = "http:automation:getText";
  label = "获取元素文本";
  description = "通过 HTTP API 获取元素的文本内容";
  category = "自动化操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "selector", type: "string", description: "选择器", required: true },
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

    this.logger.debug("获取元素文本", { viewId, selector });

    return await this.invoke("automation:getText", viewId, selector);
  }
}

