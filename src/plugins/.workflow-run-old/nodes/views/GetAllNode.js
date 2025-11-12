import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取所有视图节点
 * 通过 HTTP 调用 views:getAll channel
 */
export class ViewsGetAllNode extends BaseNode {
  type = "http:views:getAll";
  label = "获取所有视图";
  description = "通过 HTTP API 获取所有视图信息";
  category = "视图管理";

  defineInputs() {
    return [];
  }

  defineOutputs() {
    return [
      {
        id: "views",
        name: "视图列表",
        type: "array",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    context.logger.debug("获取所有视图");

    const response = await context.http.invoke("views:getAll");

    return {
      outputs: {
        views: response.result?.views || [],
      },
      raw: response.result || response,
      summary: `已获取 ${response.result?.views?.length || 0} 个视图`,
    };
  }
}

