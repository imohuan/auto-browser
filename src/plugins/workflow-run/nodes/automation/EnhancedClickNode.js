import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 增强点击节点
 * 通过 HTTP 调用 automation:enhancedClick channel
 */
export class AutomationEnhancedClickNode extends HttpFlowNode {
  type = "http:automation:enhancedClick";
  label = "增强点击";
  description = "通过 HTTP API 执行增强版点击（支持等待导航）";
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
        name: "waitForNavigation",
        type: "boolean",
        description: "等待导航",
        required: false,
      },
      {
        name: "timeout",
        type: "number",
        description: "超时时间",
        required: false,
      },
      {
        name: "coordinates",
        type: "object",
        description: "点击坐标",
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
    const selector = this.getInput(inputs, "selector");
    const waitForNavigation = this.getInput(inputs, "waitForNavigation");
    const timeout = this.getInput(inputs, "timeout");
    const coordinates = this.getInput(inputs, "coordinates");

    const options = {};
    if (waitForNavigation !== undefined) options.waitForNavigation = waitForNavigation;
    if (timeout !== undefined) options.timeout = timeout;
    if (coordinates) options.coordinates = coordinates;

    this.logger.debug("执行增强点击", { viewId, selector, options });

    return await this.invoke("automation:enhancedClick", viewId, selector, options);
  }
}

