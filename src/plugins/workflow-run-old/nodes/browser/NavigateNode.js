import { BaseNode, context } from "../../context.js";

/**
 * HTTP 浏览器导航节点
 * 通过 HTTP 调用 browser:navigate channel
 */
export class BrowserNavigateNode extends BaseNode {
  type = "http:browser:navigate";
  label = "导航到URL";
  description = "通过 HTTP API 导航到指定的 URL 地址";
  category = "浏览器管理";

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
    return {
      url: "https://www.baidu.com",
    };
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

    context.logger.debug("导航到URL", { viewId, url });

    // 调用 HTTP API
    const response = await context.http.invoke("browser:navigate", viewId, url);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已导航到 ${url}`,
    };
  }
}

