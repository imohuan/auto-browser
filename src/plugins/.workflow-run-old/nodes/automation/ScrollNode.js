import { BaseNode, context } from "../../context.js";

/**
 * HTTP 自动化滚动节点
 * 通过 HTTP 调用 automation:scroll channel
 */
export class AutomationScrollNode extends BaseNode {
  type = "http:automation:scroll";
  label = "滚动页面";
  description = "通过 HTTP API 滚动页面到指定位置";
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
        id: "x",
        name: "X坐标",
        type: "number",
        required: true,
      },
      {
        id: "y",
        name: "Y坐标",
        type: "number",
        required: true,
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
      x: 0,
      y: 0,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const x = inputs.x !== undefined ? inputs.x : config.x;
    const y = inputs.y !== undefined ? inputs.y : config.y;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (x === undefined || x === null) {
      throw new Error("必须提供X坐标");
    }

    if (y === undefined || y === null) {
      throw new Error("必须提供Y坐标");
    }

    context.logger.debug("执行滚动操作", { viewId, x, y });

    const response = await context.http.invoke("automation:scroll", viewId, x, y);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已滚动到位置 (${x}, ${y})`,
    };
  }
}

