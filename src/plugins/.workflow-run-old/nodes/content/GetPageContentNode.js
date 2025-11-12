import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取页面内容节点
 * 通过 HTTP 调用 content:getPageContent channel
 */
export class ContentGetPageContentNode extends BaseNode {
  type = "http:content:getPageContent";
  label = "获取页面内容";
  description = "通过 HTTP API 使用 CDP 获取完整的页面 HTML";
  category = "内容分析";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "html",
        name: "HTML内容",
        type: "string",
      },
      {
        id: "length",
        name: "长度",
        type: "number",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("获取页面内容", { viewId });

    const response = await context.http.invoke("content:getPageContent", viewId);

    return {
      outputs: {
        html: response.result?.html || "",
        length: response.result?.length || 0,
      },
      raw: response.result || response,
      summary: `已获取页面内容，长度: ${response.result?.length || 0} 字符`,
    };
  }
}

