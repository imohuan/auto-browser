import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取所有视图节点
 * 通过 HTTP 调用 views:getAll channel
 */
export class ViewsGetAllNode extends HttpFlowNode {
  type = "http:views:getAll";
  label = "获取所有视图";
  description = "通过 HTTP API 获取所有视图信息";
  category = "视图管理";

  defineInputs() {
    return [];
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
    this.logger.debug("获取所有视图");

    return await this.invoke("views:getAll");
  }
}

