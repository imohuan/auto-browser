import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取文本内容节点
 * 通过 HTTP 调用 content:getTextContent channel
 */
export class ContentGetTextContentNode extends BaseNode {
  type = "http:content:getTextContent";
  label = "获取文本内容";
  description = "通过 HTTP API 获取页面文本内容（使用 Readability）";
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
        id: "textContent",
        name: "文本内容",
        type: "string",
      },
      {
        id: "metadata",
        name: "元数据",
        type: "object",
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

    context.logger.debug("获取文本内容", { viewId, selector });

    // 调用 HTTP API
    const response = await context.http.invoke("content:getTextContent", viewId, selector || null);

    if (!response.result?.success) {
      throw new Error(response.result?.error || "获取文本内容失败");
    }

    return {
      outputs: {
        textContent: response.result.textContent || "",
        metadata: response.result.metadata || {},
      },
      raw: response.result || response,
      summary: `已获取文本内容，长度: ${response.result.textContent?.length || 0} 字符`,
    };
  }
}

