import { BaseNode, context } from "../../context.js";

/**
 * HTTP 停止 Debugger 网络捕获节点
 * 通过 HTTP 调用 network:stopDebuggerCapture channel
 */
export class NetworkStopDebuggerCaptureNode extends BaseNode {
  type = "http:network:stopDebuggerCapture";
  label = "停止Debugger捕获";
  description = "通过 HTTP API 停止 Debugger 网络捕获并返回结果（含响应体）";
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
        id: "result",
        name: "捕获结果",
        type: "any",
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

    context.logger.debug("停止Debugger捕获", { viewId });

    const response = await context.http.invoke("network:stopDebuggerCapture", viewId);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `捕获完成，共 ${response.result?.requestCount || 0} 个请求`,
    };
  }
}

