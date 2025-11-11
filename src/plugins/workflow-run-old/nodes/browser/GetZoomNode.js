import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取缩放级别节点
 * 通过 HTTP 调用 browser:getZoom channel
 */
export class BrowserGetZoomNode extends BaseNode {
  type = "http:browser:getZoom";
  label = "获取缩放";
  description = "通过 HTTP API 获取浏览器缩放级别";
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
        id: "zoomFactor",
        name: "缩放因子",
        type: "number",
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

    context.logger.debug("获取缩放级别", { viewId });

    const response = await context.http.invoke("browser:getZoom", viewId);

    return {
      outputs: {
        zoomFactor: response.result?.zoomFactor || 1.0,
      },
      raw: response.result || response,
      summary: `当前缩放级别: ${response.result?.zoomFactor || 1.0}`,
    };
  }
}

