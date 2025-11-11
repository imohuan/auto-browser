import { BaseNode, context } from "../../context.js";

/**
 * HTTP 查找元素节点
 * 通过 HTTP 调用 automation:findElementsByText channel
 */
export class AutomationFindElementsByTextNode extends BaseNode {
  type = "http:automation:findElementsByText";
  label = "查找元素";
  description = "通过 HTTP API 查找包含指定文本的元素";
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
        id: "textQuery",
        name: "文本查询",
        type: "string",
        required: true,
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
    ];
  }

  defineOutputs() {
    return [
      {
        id: "elements",
        name: "找到的元素",
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
    const textQuery = inputs.textQuery || config.textQuery;
    const options = {};

    if (inputs.includeCoordinates !== undefined || config.includeCoordinates !== undefined) {
      options.includeCoordinates = inputs.includeCoordinates !== undefined ? inputs.includeCoordinates : config.includeCoordinates;
    }
    if (inputs.strictVisibility !== undefined || config.strictVisibility !== undefined) {
      options.strictVisibility = inputs.strictVisibility !== undefined ? inputs.strictVisibility : config.strictVisibility;
    }

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!textQuery) {
      throw new Error("必须提供文本查询");
    }

    context.logger.debug("查找元素", { viewId, textQuery, options });

    const response = await context.http.invoke("automation:findElementsByText", viewId, textQuery, options);

    return {
      outputs: {
        elements: response.result?.elements || [],
      },
      raw: response.result || response,
      summary: `已找到 ${response.result?.elements?.length || 0} 个元素`,
    };
  }
}

