import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 加载URL节点
 * 通过 HTTP 调用 views:loadURL channel
 */
export class ViewsLoadURLNode extends HttpFlowNode {
  type = "http:views:loadURL";
  label = "加载URL";
  description = "通过 HTTP API 在视图中加载 URL";
  category = "视图管理";

  defineInputs() {
    return [
      {
        name: "viewId",
        type: "string",
        description: "视图ID",
        required: true,
      },
      {
        name: "url",
        type: "string",
        description: "URL",
        required: true,
      },
      {
        name: "waitForLoad",
        type: "boolean",
        description: "是否等待加载完成",
        required: false,
      },
      {
        name: "timeout",
        type: "number",
        description: "超时时间（毫秒）",
        required: false,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        name: "result",
        type: "any",
        description: "结果",
      },
    ];
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const url = this.getInput(inputs, "url");
    const waitForLoad = this.getInput(inputs, "waitForLoad") ?? false;
    const timeout = this.getInput(inputs, "timeout") ?? 30000;

    this.logger.debug("加载URL", { viewId, url, waitForLoad, timeout });

    return await this.invoke("views:loadURL", viewId, url, waitForLoad, timeout);
  }
}

