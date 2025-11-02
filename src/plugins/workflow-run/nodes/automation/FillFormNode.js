import { BaseNode, context } from "../../context.js";

/**
 * HTTP 表单填充节点
 * 通过 HTTP 调用 automation:fillForm channel
 */
export class AutomationFillFormNode extends BaseNode {
  type = "http:automation:fillForm";
  label = "填充表单";
  description = "通过 HTTP API 填充表单元素";
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
        id: "value",
        name: "值",
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
    const value = inputs.value || config.value;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    if (value === undefined || value === null) {
      throw new Error("必须提供值");
    }

    context.logger.debug("填充表单", { viewId, selector });

    const response = await context.http.invoke("automation:fillForm", viewId, selector, value);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已填充表单: ${value}`,
    };
  }
}

