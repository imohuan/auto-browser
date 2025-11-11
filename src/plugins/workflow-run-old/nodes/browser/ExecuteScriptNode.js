import { BaseNode, context } from "../../context.js";

/**
 * HTTP 执行脚本节点
 * 通过 HTTP 调用 browser:executeScript channel
 */
export class BrowserExecuteScriptNode extends BaseNode {
  type = "http:browser:executeScript";
  label = "执行脚本";
  description = "通过 HTTP API 在页面上下文中执行 JavaScript 代码";
  category = "浏览器管理";

  defineInputs() {
    return [
      {
        id: "viewId",
        name: "视图ID",
        type: "string",
        required: true,
      },
      {
        id: "script",
        name: "脚本",
        type: "string",
        required: true,
      },
    ];
  }

  defineOutputs() {
    return [
      {
        id: "result",
        name: "执行结果",
        type: "any",
      },
    ];
  }

  getDefaultConfig() {
    return {};
  }

  async execute(config, inputs, workflowContext) {
    const viewId = inputs.viewId || config.viewId;
    const script = inputs.script || config.script;

    if (!viewId) {
      throw new Error("必须提供视图ID");
    }

    if (!script) {
      throw new Error("必须提供脚本");
    }

    context.logger.debug("执行脚本", { viewId, scriptLength: script?.length });

    const response = await context.http.invoke("browser:executeScript", viewId, script);

    return {
      outputs: {
        result: response.result?.result || response.result,
      },
      raw: response.result || response,
      summary: "脚本执行完成",
    };
  }
}

