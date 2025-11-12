import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 执行脚本节点
 * 通过 HTTP 调用 content:evaluate channel
 */
export class ContentEvaluateNode extends HttpFlowNode {
  type = "http:content:evaluate";
  label = "执行脚本";
  description = "通过 HTTP API 在页面上下文中执行 JavaScript 并返回结果";
  category = "内容分析";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "script",
        name: "脚本",
        type: "string",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "result",
        name: "执行结果",
        type: "any",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const script = this.getInput(inputs, "script");

    this.logger.debug("执行脚本", { viewId, scriptLength: script?.length });

    return await this.invoke("content:evaluate", viewId, script);
  }
}

