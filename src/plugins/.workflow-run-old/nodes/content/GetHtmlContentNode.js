import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取HTML内容节点
 * 通过 HTTP 调用 content:getHtmlContent channel
 */
export class ContentGetHtmlContentNode extends BaseNode {
  type = "http:content:getHtmlContent";
  label = "获取HTML内容";
  description = "通过 HTTP API 获取页面或指定元素的 HTML 内容";
  category = "内容分析";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "htmlContent",
        name: "HTML内容",
        type: "string",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector !== undefined ? inputs.selector : config.selector;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("获取HTML内容", { viewId, selector });

    const response = await context.http.invoke("content:getHtmlContent", viewId, selector || null);

    if (!response.result?.success) {
      throw new Error(response.result?.error || "获取HTML内容失败");
    }

    return {
      outputs: {
        htmlContent: response.result.htmlContent || "",
      },
      raw: response.result || response,
      summary: `已获取HTML内容，长度: ${response.result.htmlContent?.length || 0} 字符`,
    };
  }
}

