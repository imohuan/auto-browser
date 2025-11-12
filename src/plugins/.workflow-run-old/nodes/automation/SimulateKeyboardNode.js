import { BaseNode, context } from "../../context.js";

/**
 * HTTP 键盘模拟节点
 * 通过 HTTP 调用 automation:simulateKeyboard channel
 */
export class AutomationSimulateKeyboardNode extends BaseNode {
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

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const keys = inputs.keys || config.keys;
    const selector = inputs.selector !== undefined ? inputs.selector : config.selector;
    const delay = inputs.delay !== undefined ? inputs.delay : config.delay !== undefined ? config.delay : 0;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!keys) {
      throw new Error("必须提供按键");
    }

    context.logger.debug("模拟键盘输入", { viewId, keys, selector, delay });

    const response = await context.http.invoke("automation:simulateKeyboard", viewId, keys, selector || null, delay);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已模拟按键: ${keys}`,
    };
  }
}

