import { BaseNode, context } from "../../context.js";

/**
 * HTTP 设置活动视图节点
 * 通过 HTTP 调用 views:setActive channel
 */
export class ViewsSetActiveNode extends BaseNode {
  type = "http:views:setActive";
  label = "设置活动视图";
  description = "通过 HTTP API 设置活动视图";
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

    context.logger.debug("设置活动视图", { viewId });

    const response = await context.http.invoke("views:setActive", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已设置活动视图: ${viewId}`,
    };
  }
}

