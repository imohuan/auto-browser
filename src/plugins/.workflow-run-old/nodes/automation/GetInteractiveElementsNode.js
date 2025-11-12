import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取交互元素节点
 * 通过 HTTP 调用 automation:getInteractiveElements channel
 */
export class AutomationGetInteractiveElementsNode extends BaseNode {
  type = "http:automation:getInteractiveElements";
  label = "获取交互元素";
  description = "通过 HTTP API 获取页面中所有可交互的元素";
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
        required: false,
      },
      {
        id: "textQuery",
        name: "文本查询",
        type: "string",
        required: false,
      },
      {
        id: "includeCoordinates",
        name: "包含坐标",
        type: "boolean",
        required: false,
      },
      {
        id: "strictVisibility",
        name: "严格可见性检查",
        type: "boolean",
        required: false,
      },
      {
        id: "types",
        name: "元素类型",
        type: "array",
        required: false,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "elements",
        name: "交互元素",
        type: "array",
      },
    ];
  }

  getDefaultConfig() {
    return {
      includeCoordinates: true,
      strictVisibility: true,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const options = {};

    if (inputs.selector !== undefined || config.selector !== undefined) {
      options.selector = inputs.selector || config.selector;
    }
    if (inputs.textQuery !== undefined || config.textQuery !== undefined) {
      options.textQuery = inputs.textQuery || config.textQuery;
    }
    if (inputs.includeCoordinates !== undefined || config.includeCoordinates !== undefined) {
      options.includeCoordinates = inputs.includeCoordinates !== undefined ? inputs.includeCoordinates : config.includeCoordinates;
    }
    if (inputs.strictVisibility !== undefined || config.strictVisibility !== undefined) {
      options.strictVisibility = inputs.strictVisibility !== undefined ? inputs.strictVisibility : config.strictVisibility;
    }
    if (inputs.types !== undefined || config.types !== undefined) {
      options.types = inputs.types || config.types;
    }

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("获取交互元素", { viewId, options });

    const response = await context.http.invoke("automation:getInteractiveElements", viewId, options);

    return {
      outputs: {
        elements: response.result?.elements || [],
      },
      raw: response.result || response,
      summary: `已获取 ${response.result?.elements?.length || 0} 个交互元素`,
    };
  }
}

