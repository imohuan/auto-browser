import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 浏览器截图节点
 * 通过 HTTP 调用 browser:screenshot channel
 */
export class BrowserScreenshotNode extends HttpFlowNode {
  type = "http:browser:screenshot";
  label = "截图";
  description = "通过 HTTP API 对页面进行截图";
  category = "浏览器管理";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "format", type: "string", description: "图片格式", required: false },
      { name: "quality", type: "number", description: "图片质量", required: false },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
    ];
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const format = this.getInput(inputs, "format");
    const quality = this.getInput(inputs, "quality");

    this.logger.debug("执行截图", { viewId, format, quality });

    const options = {};
    if (format !== undefined) options.format = format;
    if (quality !== undefined) options.quality = quality;

    return await this.invoke("browser:screenshot", viewId, options);
  }
}

