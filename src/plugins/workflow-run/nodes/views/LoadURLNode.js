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

    this.logger.debug("加载URL", { viewId, url });

    return await this.invoke("views:loadURL", viewId, url);
  }
}

