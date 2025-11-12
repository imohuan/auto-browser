import { BaseNode, context } from "../../context.js";

/**
 * HTTP 创建视图节点
 * 通过 HTTP 调用 views:create channel
 */
export class ViewsCreateNode extends BaseNode {
  type = "http:views:create";
  label = "创建视图";
  description = "通过 HTTP API 创建一个新的浏览器视图";
  category = "视图管理";

  defineInputs() {
    return [
      {
        id: "title",
        name: "标题",
        type: "string",
        required: false,
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        required: false,
      },
      {
        id: "bounds",
        name: "位置和大小",
        type: "object",
        required: false,
      },
      {
        id: "visible",
        name: "是否可见",
        type: "boolean",
        required: false,
      },
    ];
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
    return {
      visible: true,
    };
  }

  async execute(config, inputs, workflowContext) {
    const options = {};

    if (inputs.title !== undefined || config.title !== undefined) {
      options.title = inputs.title || config.title;
    }
    if (inputs.url !== undefined || config.url !== undefined) {
      options.url = inputs.url || config.url;
    }
    if (inputs.bounds !== undefined || config.bounds !== undefined) {
      options.bounds = inputs.bounds || config.bounds;
    }
    if (inputs.visible !== undefined || config.visible !== undefined) {
      options.visible = inputs.visible !== undefined ? inputs.visible : config.visible !== undefined ? config.visible : true;
    }

    context.logger.debug("创建视图", { options });

    // 调用 HTTP API
    const response = await context.http.invoke("views:create", options);

    return {
      outputs: {
        viewId: response.result?.viewId,
      },
      raw: response.result || response,
      summary: `已创建视图: ${response.result?.viewId || "未知"}`,
    };
  }
}

