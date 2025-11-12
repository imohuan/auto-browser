import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 创建视图节点
 * 通过 HTTP 调用 views:create channel
 */
export class ViewsCreateNode extends HttpFlowNode {
  type = "http:views:create";
  label = "创建视图";
  description = "通过 HTTP API 创建一个新的浏览器视图";
  category = "视图管理";

  defineInputs() {
    return [
      { name: "title", type: "string", description: "标题", required: false },
      { name: "url", type: "string", description: "URL", required: false },
      { name: "bounds", type: "object", description: "位置和大小", required: false },
      { name: "visible", type: "boolean", description: "是否可见", required: false },
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

    const title = this.getInput(inputs, "title");
    const url = this.getInput(inputs, "url");
    const bounds = this.getInput(inputs, "bounds");
    const visible = this.getInput(inputs, "visible");

    const options = {};
    if (title !== undefined) options.title = title;
    if (url !== undefined) options.url = url;
    if (bounds !== undefined) options.bounds = bounds;
    if (visible !== undefined) options.visible = visible;

    this.logger.debug("创建视图", { options });

    return await this.invoke("views:create", options);
  }
}

