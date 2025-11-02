import { BaseNode, context } from "../../context.js";

/**
 * HTTP 获取网络监控状态节点
 * 通过 HTTP 调用 network:getStatus channel
 */
export class NetworkGetStatusNode extends BaseNode {
  type = "http:network:getStatus";
  label = "获取网络状态";
  description = "通过 HTTP API 获取网络监控状态";
  category = "网络操作";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "status",
        name: "监控状态",
        type: "object",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("获取网络状态", { viewId });

    const response = await context.http.invoke("network:getStatus", viewId);

    return {
      outputs: {
        status: response.result?.data || response.result,
      },
      raw: response.result || response,
      summary: `WebRequest: ${response.result?.data?.webRequestCapturing ? "运行中" : "已停止"}, Debugger: ${response.result?.data?.debuggerCapturing ? "运行中" : "已停止"}`,
    };
  }
}

