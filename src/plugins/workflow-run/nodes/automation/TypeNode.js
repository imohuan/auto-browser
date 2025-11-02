import { BaseNode, context } from "../../context.js";

/**
 * HTTP 自动化输入节点
 * 通过 HTTP 调用 automation:type channel
 */
export class AutomationTypeNode extends BaseNode {
  type = "http:automation:type";
  label = "输入文本";
  description = "通过 HTTP API 在输入框中输入文本";
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
      {
        id: "text",
        name: "文本",
        type: "string",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "result",
        name: "结果",
        type: "any",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector || config.selector;
    const text = inputs.text || config.text;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    if (text === undefined || text === null) {
      throw new Error("必须提供文本");
    }

    context.logger.debug("执行输入操作", { viewId, selector, textLength: text?.length });

    const response = await context.http.invoke("automation:type", viewId, selector, text);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已输入文本: ${text}`,
    };
  }
}

