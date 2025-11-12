import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 文件上传节点
 * 通过 HTTP 调用 automation:uploadFile channel
 */
export class AutomationUploadFileNode extends HttpFlowNode {
  type = "http:automation:uploadFile";
  label = "上传文件";
  description = "通过 HTTP API 上传文件到文件输入框";
  category = "自动化操作";

  defineInputs() {
    return [
      { name: "viewId", type: "string", description: "视图ID", required: true },
      { name: "selector", type: "string", description: "选择器", required: true },
      { name: "filePath", type: "string", description: "文件路径", required: true },
    ];
  }

  defineOutputs() {
    return [
      { name: "result", type: "any", description: "结果" },
    ];
  }

  async execute(inputs, execContext) {
    const validation = this.validateInputs(inputs);
    if (!validation.valid) {
      return this.createError(validation.errors.join("; "));
    }

    const viewId = this.getInput(inputs, "viewId");
    const selector = this.getInput(inputs, "selector");
    const filePath = this.getInput(inputs, "filePath");

    this.logger.debug("上传文件", { viewId, selector, filePath });

    return await this.invoke("automation:uploadFile", viewId, selector, filePath);
  }
}

