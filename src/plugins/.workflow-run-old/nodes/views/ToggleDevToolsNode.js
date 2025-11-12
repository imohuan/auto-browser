import { BaseNode, context } from "../../context.js";

/**
 * HTTP 切换视图开发工具节点
 * 通过 HTTP 调用 views:toggleDevTools channel
 */
export class ViewsToggleDevToolsNode extends BaseNode {
  type = "http:views:toggleDevTools";
  label = "切换视图开发工具";
  description = "通过 HTTP API 切换视图开发工具";
  category = "视图管理";

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

    context.logger.debug("切换视图开发工具", { viewId });

    const response = await context.http.invoke("views:toggleDevTools", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已切换视图开发工具",
    };
  }
}

