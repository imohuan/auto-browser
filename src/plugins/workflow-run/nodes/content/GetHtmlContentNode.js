import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取HTML内容节点
 * 通过 HTTP 调用 content:getHtmlContent channel
 */
export class ContentGetHtmlContentNode extends HttpFlowNode {
  type = "http:content:getHtmlContent";
  label = "获取HTML内容";
  description = "通过 HTTP API 获取页面或指定元素的 HTML 内容";
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

  getDefaultConfig() {
    return {};
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const selector = this.getInput(inputs, "selector");

    this.logger.debug("获取HTML内容", { viewId, selector });

    return await this.invoke("content:getHtmlContent", viewId, selector || null);
  }
}

