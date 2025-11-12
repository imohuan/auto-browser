import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取交互元素节点
 * 通过 HTTP 调用 automation:getInteractiveElements channel
 */
export class AutomationGetInteractiveElementsNode extends HttpFlowNode {
  type = "http:automation:getInteractiveElements";
  label = "获取交互元素";
  description = "通过 HTTP API 获取页面中所有可交互的元素";
  category = "自动化操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "selector", type: "string", description: "选择器", required: false },
      { name: "textQuery", type: "string", description: "文本查询", required: false },
      { name: "includeCoordinates", type: "boolean", description: "包含坐标", required: false },
      { name: "strictVisibility", type: "boolean", description: "严格可见性检查", required: false },
      { name: "types", type: "array", description: "元素类型", required: false },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
    ];
  }

  getDefaultConfig() {
    return {
      includeCoordinates: true,
      strictVisibility: true,
    };
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const options = {};
    const selector = this.getInput(inputs, "selector");
    const textQuery = this.getInput(inputs, "textQuery");
    const includeCoordinates = this.getInput(inputs, "includeCoordinates");
    const strictVisibility = this.getInput(inputs, "strictVisibility");
    const types = this.getInput(inputs, "types");
    if (selector !== undefined) options.selector = selector;
    if (textQuery !== undefined) options.textQuery = textQuery;
    if (includeCoordinates !== undefined) options.includeCoordinates = includeCoordinates;
    if (strictVisibility !== undefined) options.strictVisibility = strictVisibility;
    if (types !== undefined) options.types = types;

    this.logger.debug("获取交互元素", { viewId, options });

    return await this.invoke("automation:getInteractiveElements", viewId, options);
  }
}

