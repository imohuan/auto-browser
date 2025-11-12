import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 等待选择器节点
 * 通过 HTTP 调用 automation:waitForSelector channel
 */
export class AutomationWaitForSelectorNode extends HttpFlowNode {
  type = "http:automation:waitForSelector";
  label = "等待选择器";
  description = "通过 HTTP API 等待指定元素出现";
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
        id: "selector",
        name: "选择器",
        type: "string",
        required: true,
      },
      {
        id: "timeout",
        name: "超时时间",
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
      timeout: 5000,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector || config.selector;
    const timeout = inputs.timeout || config.timeout || 5000;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    this.logger.debug("等待选择器出现", { viewId, selector, timeout });

    return await this.invoke("automation:waitForSelector", viewId, selector, timeout);
  }
}

