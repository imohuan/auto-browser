import { BaseNode, context } from "../../context.js";

/**
 * HTTP 设置视图可见性节点
 * 通过 HTTP 调用 views:setVisible channel
 */
export class ViewsSetVisibleNode extends BaseNode {
  type = "http:views:setVisible";
  label = "设置视图可见性";
  description = "通过 HTTP API 设置视图显示/隐藏";
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
        id: "visible",
        name: "是否可见",
        type: "boolean",
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
    const visible = inputs.visible !== undefined ? inputs.visible : config.visible;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (visible === undefined || visible === null) {
      throw new Error("必须提供可见性");
    }

    context.logger.debug("设置视图可见性", { viewId, visible });

    const response = await context.http.invoke("views:setVisible", viewId, visible);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已设置视图${visible ? "可见" : "隐藏"}`,
    };
  }
}

