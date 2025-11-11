import { BaseNode, context } from "../../context.js";

/**
 * HTTP 浏览器刷新节点
 * 通过 HTTP 调用 browser:reload channel
 */
export class BrowserReloadNode extends BaseNode {
  type = "http:browser:reload";
  label = "刷新";
  description = "通过 HTTP API 刷新页面";
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

    context.logger.debug("刷新页面", { viewId });

    const response = await context.http.invoke("browser:reload", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已刷新页面",
    };
  }
}

