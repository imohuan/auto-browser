import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 自动化点击节点
 * 通过 HTTP 调用 automation:click channel
 */
export class AutomationClickNode extends HttpFlowNode {
  type = "http:automation:click";
  label = "点击元素";
  description = "通过 HTTP API 点击页面上的元素";
  category = "自动化操作";

  defineInputs() {
    return [
      {
        name: "viewId",
        type: "string",
        description: "视图ID",
        required: true,
      },
      {
        name: "selector",
        type: "string",
        description: "选择器",
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
    const selector = this.getInput(inputs, "selector");

    this.logger.debug("执行点击操作", { viewId, selector });

    return await this.invoke("automation:click", viewId, selector);
  }
}

