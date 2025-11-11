import { BaseNode, context } from "../../context.js";

/**
 * HTTP 增强点击节点
 * 通过 HTTP 调用 automation:enhancedClick channel
 */
export class AutomationEnhancedClickNode extends BaseNode {
  type = "http:automation:enhancedClick";
  label = "增强点击";
  description = "通过 HTTP API 执行增强版点击（支持等待导航）";
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
        id: "waitForNavigation",
        name: "等待导航",
        type: "boolean",
        required: false,
      },
      {
        id: "timeout",
        name: "超时时间",
        type: "number",
        required: false,
      },
      {
        id: "coordinates",
        name: "点击坐标",
        type: "object",
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
      waitForNavigation: false,
      timeout: 5000,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector || config.selector;
    const waitForNavigation = inputs.waitForNavigation !== undefined
      ? inputs.waitForNavigation
      : config.waitForNavigation !== undefined
        ? config.waitForNavigation
        : false;
    const timeout = inputs.timeout || config.timeout || 5000;
    const coordinates = inputs.coordinates || config.coordinates;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    // 构建选项对象
    const options = {};
    if (waitForNavigation !== undefined) options.waitForNavigation = waitForNavigation;
    if (timeout !== undefined) options.timeout = timeout;
    if (coordinates) options.coordinates = coordinates;

    context.logger.debug("执行增强点击", { viewId, selector, options });

    // 调用 HTTP API
    const response = await context.http.invoke("automation:enhancedClick", viewId, selector, options);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已执行增强点击 ${selector}`,
    };
  }
}

