import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 自动化输入节点
 * 通过 HTTP 调用 automation:type channel
 */
export class AutomationTypeNode extends HttpFlowNode {
  type = "http:automation:type";
  label = "输入文本";
  description = "通过 HTTP API 在输入框中输入文本";
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
      {
        name: "text",
        type: "string",
        description: "文本",
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
    const text = this.getInput(inputs, "text");

    this.logger.debug("执行输入操作", { viewId, selector, textLength: text?.length });

    return await this.invoke("automation:type", viewId, selector, text);
  }
}

