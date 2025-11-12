import { BaseNode, context } from "../../context.js";

/**
 * HTTP 更新视图边界节点
 * 通过 HTTP 调用 views:updateBounds channel
 */
export class ViewsUpdateBoundsNode extends BaseNode {
  type = "http:views:updateBounds";
  label = "更新视图边界";
  description = "通过 HTTP API 更新视图位置和大小";
  category = "视图管理";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "bounds",
        name: "边界",
        type: "object",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "bounds",
        name: "更新后的边界",
        type: "object",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const bounds = inputs.bounds || config.bounds;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!bounds) {
      throw new Error("必须提供边界");
    }

    context.logger.debug("更新视图边界", { viewId, bounds });

    const response = await context.http.invoke("views:updateBounds", viewId, bounds);

    return {
      outputs: {
        bounds: response.result?.bounds || response.result,
      },
      raw: response.result || response,
      summary: "已更新视图边界",
    };
  }
}

