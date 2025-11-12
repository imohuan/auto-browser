import { BaseNode, context } from "../../context.js";

/**
 * HTTP 加载URL节点
 * 通过 HTTP 调用 views:loadURL channel
 */
export class ViewsLoadURLNode extends BaseNode {
  type = "http:views:loadURL";
  label = "加载URL";
  description = "通过 HTTP API 在视图中加载 URL";
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
        id: "url",
        name: "URL",
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
    const url = inputs.url || config.url;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!url) {
      throw new Error("必须提供URL");
    }

    context.logger.debug("加载URL", { viewId, url });

    const response = await context.http.invoke("views:loadURL", viewId, url);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已加载URL: ${url}`,
    };
  }
}

