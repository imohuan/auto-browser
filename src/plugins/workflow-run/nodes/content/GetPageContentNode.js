import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取页面内容节点
 * 通过 HTTP 调用 content:getPageContent channel
 */
export class ContentGetPageContentNode extends HttpFlowNode {
  type = "http:content:getPageContent";
  label = "获取页面内容";
  description = "通过 HTTP API 使用 CDP 获取完整的页面 HTML";
  category = "内容分析";

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

    this.logger.debug("获取页面内容", { viewId });

    return await this.invoke("content:getPageContent", viewId);
  }
}

