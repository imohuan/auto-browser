import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 获取活动视图节点
 * 通过 HTTP 调用 views:getActive channel
 */
export class ViewsGetActiveNode extends HttpFlowNode {
  type = "http:views:getActive";
  label = "获取活动视图";
  description = "通过 HTTP API 获取活动视图ID";
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
    this.logger.debug("获取活动视图");

    return await this.invoke("views:getActive");
  }
}

