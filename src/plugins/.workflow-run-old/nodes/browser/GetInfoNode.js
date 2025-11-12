import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取页面信息节点
 * 通过 HTTP 调用 browser:getInfo channel
 */
export class BrowserGetInfoNode extends BaseNode {
  type = "http:browser:getInfo";
  label = "获取页面信息";
  description = "通过 HTTP API 获取页面信息";
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
        id: "info",
        name: "页面信息",
        type: "object",
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

    context.logger.debug("获取页面信息", { viewId });

    const response = await context.http.invoke("browser:getInfo", viewId);

    return {
      outputs: {
        info: response.result || response,
      },
      raw: response.result || response,
      summary: `页面: ${response.result?.title || response.result?.url || "未知"}`,
    };
  }
}

