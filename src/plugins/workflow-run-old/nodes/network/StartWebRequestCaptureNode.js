import { BaseNode, context } from "../../context.js";

/**
 * HTTP 启动 WebRequest 网络捕获节点
 * 通过 HTTP 调用 network:startWebRequestCapture channel
 */
export class NetworkStartWebRequestCaptureNode extends BaseNode {
  type = "http:network:startWebRequestCapture";
  label = "启动WebRequest捕获";
  description = "通过 HTTP API 启动 WebRequest 网络捕获（不含响应体）";
  category = "网络操作";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "maxCaptureTime",
        name: "最大捕获时间",
        type: "number",
        required: false,
      },
      {
        id: "inactivityTimeout",
        name: "无活动超时时间",
        type: "number",
        required: false,
      },
      {
        id: "includeStatic",
        name: "包含静态资源",
        type: "boolean",
        required: false,
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
      maxCaptureTime: 180000,
      inactivityTimeout: 60000,
      includeStatic: false,
    };
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const options = {};

    if (inputs.maxCaptureTime !== undefined || config.maxCaptureTime !== undefined) {
      options.maxCaptureTime = inputs.maxCaptureTime || config.maxCaptureTime;
    }
    if (inputs.inactivityTimeout !== undefined || config.inactivityTimeout !== undefined) {
      options.inactivityTimeout = inputs.inactivityTimeout || config.inactivityTimeout;
    }
    if (inputs.includeStatic !== undefined || config.includeStatic !== undefined) {
      options.includeStatic = inputs.includeStatic !== undefined ? inputs.includeStatic : config.includeStatic;
    }

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    context.logger.debug("启动WebRequest捕获", { viewId, options });

    const response = await context.http.invoke("network:startWebRequestCapture", viewId, options);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: "已启动 WebRequest 网络捕获",
    };
  }
}

