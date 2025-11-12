import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取文本内容节点
 * 通过 HTTP 调用 content:getTextContent channel
 */
export class ContentGetTextContentNode extends HttpFlowNode {
  type = "http:content:getTextContent";
  label = "获取文本内容";
  description = "通过 HTTP API 获取页面文本内容（使用 Readability）";
  category = "内容分析";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "selector", type: "string", description: "选择器", required: false },
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

    this.logger.debug("获取文本内容", { viewId, selector });

    return await this.invoke("content:getTextContent", viewId, selector || null);
  }
}

