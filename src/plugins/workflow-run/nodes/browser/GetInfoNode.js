import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取页面信息节点
 * 通过 HTTP 调用 browser:getInfo channel
 */
export class BrowserGetInfoNode extends HttpFlowNode {
  type = "http:browser:getInfo";
  label = "获取页面信息";
  description = "通过 HTTP API 获取页面信息";
  category = "浏览器管理";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
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

    this.logger.debug("获取页面信息", { viewId });

    return await this.invoke("browser:getInfo", viewId);
  }
}

