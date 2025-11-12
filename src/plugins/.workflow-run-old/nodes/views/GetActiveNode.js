import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取活动视图节点
 * 通过 HTTP 调用 views:getActive channel
 */
export class ViewsGetActiveNode extends BaseNode {
  type = "http:views:getActive";
  label = "获取活动视图";
  description = "通过 HTTP API 获取活动视图ID";
  category = "视图管理";

  defineInputs() {
    return [];
  }

  defineOutputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    context.logger.debug("获取活动视图");

    const response = await context.http.invoke("views:getActive");

    return {
      outputs: {
        viewId: response.result?.id || null,
      },
      raw: response.result || response,
      summary: `活动视图: ${response.result?.id || "无"}`,
    };
  }
}

