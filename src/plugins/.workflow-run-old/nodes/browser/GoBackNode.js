import { BaseNode, context } from "../../context.js";

/**
 * HTTP 浏览器后退节点
 * 通过 HTTP 调用 browser:goBack channel
 */
export class BrowserGoBackNode extends BaseNode {
  type = "http:browser:goBack";
  label = "后退";
  description = "通过 HTTP API 执行浏览器后退";
  category = "浏览器管理";

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

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("执行后退", { viewId });

    const response = await context.http.invoke("browser:goBack", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已执行后退",
    };
  }
}

