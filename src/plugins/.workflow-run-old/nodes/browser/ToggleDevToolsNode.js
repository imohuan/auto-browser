import { BaseNode, context } from "../../context.js";

/**
 * HTTP 切换开发工具节点
 * 通过 HTTP 调用 browser:toggleDevTools channel
 */
export class BrowserToggleDevToolsNode extends BaseNode {
  type = "http:browser:toggleDevTools";
  label = "切换开发工具";
  description = "通过 HTTP API 切换浏览器开发工具";
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

    context.logger.debug("切换开发工具", { viewId });

    const response = await context.http.invoke("browser:toggleDevTools", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已切换开发工具",
    };
  }
}

