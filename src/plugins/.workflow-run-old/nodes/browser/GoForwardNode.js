import { BaseNode, context } from "../../context.js";

/**
 * HTTP 浏览器前进节点
 * 通过 HTTP 调用 browser:goForward channel
 */
export class BrowserGoForwardNode extends BaseNode {
  type = "http:browser:goForward";
  label = "前进";
  description = "通过 HTTP API 执行浏览器前进";
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

    context.logger.debug("执行前进", { viewId });

    const response = await context.http.invoke("browser:goForward", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已执行前进",
    };
  }
}

