import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取元素文本节点
 * 通过 HTTP 调用 automation:getText channel
 */
export class AutomationGetTextNode extends BaseNode {
  type = "http:automation:getText";
  label = "获取元素文本";
  description = "通过 HTTP API 获取元素的文本内容";
  category = "自动化操作";

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
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "text",
        name: "文本内容",
        type: "string",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector || config.selector;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    context.logger.debug("获取元素文本", { viewId, selector });

    const response = await context.http.invoke("automation:getText", viewId, selector);

    return {
      outputs: {
        text: response.result?.text || "",
      },
      raw: response.result || response,
      summary: `已获取文本，长度: ${response.result?.text?.length || 0} 字符`,
    };
  }
}

