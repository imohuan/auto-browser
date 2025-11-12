import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 键盘模拟节点
 * 通过 HTTP 调用 automation:simulateKeyboard channel
 */
export class AutomationSimulateKeyboardNode extends HttpFlowNode {
  type = "http:automation:simulateKeyboard";
  label = "模拟键盘";
  description = "通过 HTTP API 模拟键盘输入";
  category = "自动化操作";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "keys",
        name: "按键",
        type: "string",
        required: true,
      },
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
      {
        id: "delay",
        name: "延迟",
        type: "number",
        required: false,
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
      delay: 0,
    };
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const keys = this.getInput(inputs, "keys");
    const selector = this.getInput(inputs, "selector");
    const delay = this.getInput(inputs, "delay");

    this.logger.debug("模拟键盘输入", { viewId, keys, selector, delay });

    return await this.invoke("automation:simulateKeyboard", viewId, keys, selector || null, delay ?? 0);
  }
}

