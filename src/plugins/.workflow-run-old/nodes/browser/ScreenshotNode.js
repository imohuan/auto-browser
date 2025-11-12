import { BaseNode, context } from "../../context.js";

/**
 * HTTP 浏览器截图节点
 * 通过 HTTP 调用 browser:screenshot channel
 */
export class BrowserScreenshotNode extends BaseNode {
  type = "http:browser:screenshot";
  label = "截图";
  description = "通过 HTTP API 对页面进行截图";
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
        id: "format",
        name: "图片格式",
        type: "string",
        required: false,
      },
      {
        id: "quality",
        name: "图片质量",
        type: "number",
        required: false,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "image",
        name: "图片数据",
        type: "string",
      },
      {
        id: "size",
        name: "图片大小",
        type: "number",
      },
    ];
  }

  getDefaultConfig() {
    return {
      format: "png",
      quality: 90,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const format = inputs.format || config.format || "png";
    const quality = inputs.quality !== undefined ? inputs.quality : config.quality !== undefined ? config.quality : 90;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("执行截图", { viewId, format, quality });

    // 调用 HTTP API
    const options = {};
    if (format) options.format = format;
    if (quality !== undefined) options.quality = quality;

    const response = await context.http.invoke("browser:screenshot", viewId, options);

    return {
      outputs: {
        image: response.result?.image,
        size: response.result?.size,
      },
      raw: response.result || response,
      summary: `截图完成，大小: ${response.result?.size || 0} 字节`,
    };
  }
}

