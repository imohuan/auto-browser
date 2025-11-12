import { BaseNode, context } from "../../context.js";

/**
 * HTTP 设置缩放级别节点
 * 通过 HTTP 调用 browser:setZoom channel
 */
export class BrowserSetZoomNode extends BaseNode {
  type = "http:browser:setZoom";
  label = "设置缩放";
  description = "通过 HTTP API 设置浏览器缩放级别";
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
        id: "zoomFactor",
        name: "缩放因子",
        type: "number",
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
      zoomFactor: 1.0,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const zoomFactor = inputs.zoomFactor !== undefined ? inputs.zoomFactor : config.zoomFactor;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (zoomFactor === undefined || zoomFactor === null) {
      throw new Error("必须提供缩放因子");
    }

    context.logger.debug("设置缩放级别", { viewId, zoomFactor });

    const response = await context.http.invoke("browser:setZoom", viewId, zoomFactor);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已设置缩放级别: ${zoomFactor}`,
    };
  }
}

