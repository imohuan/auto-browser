import { BaseNode, context } from "../../context.js";

/**
 * HTTP 文件上传节点
 * 通过 HTTP 调用 automation:uploadFile channel
 */
export class AutomationUploadFileNode extends BaseNode {
  type = "http:automation:uploadFile";
  label = "上传文件";
  description = "通过 HTTP API 上传文件到文件输入框";
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
        id: "selector",
        name: "选择器",
        type: "string",
        required: true,
      },
      {
        id: "filePath",
        name: "文件路径",
        type: "string",
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
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const selector = inputs.selector || config.selector;
    const filePath = inputs.filePath || config.filePath;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!selector) {
      throw new Error("必须提供选择器");
    }

    if (!filePath) {
      throw new Error("必须提供文件路径");
    }

    context.logger.debug("上传文件", { viewId, selector, filePath });

    const response = await context.http.invoke("automation:uploadFile", viewId, selector, filePath);

    return {
      outputs: {
        result: response.result || response,
      },
      raw: response.result || response,
      summary: `已上传文件: ${filePath}`,
    };
  }
}

