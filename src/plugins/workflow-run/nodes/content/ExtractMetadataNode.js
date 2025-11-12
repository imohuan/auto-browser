import { HttpFlowNode } from "../HttpFlowNode.js";

/**
 * HTTP 提取页面元数据节点
 * 通过 HTTP 调用 content:extractMetadata channel
 */
export class ContentExtractMetadataNode extends HttpFlowNode {
  type = "http:content:extractMetadata";
  label = "提取页面元数据";
  description = "通过 HTTP API 提取页面的元数据";
  category = "内容分析";

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

    this.logger.debug("提取页面元数据", { viewId });

    return await this.invoke("content:extractMetadata", viewId);
  }
}

