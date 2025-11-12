import { BaseNode, context } from "../../context.js";

/**
 * HTTP 提取页面元数据节点
 * 通过 HTTP 调用 content:extractMetadata channel
 */
export class ContentExtractMetadataNode extends BaseNode {
  type = "http:content:extractMetadata";
  label = "提取页面元数据";
  description = "通过 HTTP API 提取页面的元数据";
  category = "内容分析";

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
        id: "metadata",
        name: "元数据",
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

    context.logger.debug("提取页面元数据", { viewId });

    const response = await context.http.invoke("content:extractMetadata", viewId);

    return {
      outputs: {
        metadata: response.result || response,
      },
      raw: response.result || response,
      summary: `已提取元数据: ${response.result?.title || "未知标题"}`,
    };
  }
}

