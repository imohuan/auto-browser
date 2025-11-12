import { BaseNode, context } from "../../context.js";

/**
 * HTTP 自动化点击节点
 * 通过 HTTP 调用 automation:click channel
 */
export class AutomationClickNode extends BaseNode {
  type = "http:automation:click";
  label = "点击元素";
  description = "通过 HTTP API 点击页面上的元素";
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

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    context.logger.debug("执行点击操作", { viewId, selector });

    // 调用 HTTP API
    const response = await context.http.invoke("automation:click", viewId, selector);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已点击元素 ${selector}`,
    };
  }
}

