/**
 * 工作流节点执行器插件
 * 提供工作流节点的注册和执行功能
 */

import { BasePlugin } from "../base-plugin.js";
import { createWorkflowServer } from "workflow-flow-nodes/server";
import { createPocketBaseHistoryHandler } from "./history-handler.js";
import { NODE_CLASS_REGISTRY } from "workflow-flow-nodes";
import { APP_CONFIG } from "../../core/constants.js";
import { pluginManager } from "../plugin-manager.js";

// Views
import { ViewsLoadURLNode } from "./nodes/views/LoadURLNode.js";
import { ViewsCreateNode } from "./nodes/views/CreateNode.js";
import { ViewsGetActiveNode } from "./nodes/views/GetActiveNode.js";
import { ViewsGetAllNode } from "./nodes/views/GetAllNode.js";
import { ViewsReloadNode } from "./nodes/views/ReloadNode.js";
import { ViewsRemoveNode } from "./nodes/views/RemoveNode.js";
import { ViewsSetActiveNode } from "./nodes/views/SetActiveNode.js";
import { ViewsSetVisibleNode } from "./nodes/views/SetVisibleNode.js";
import { ViewsToggleDevToolsNode } from "./nodes/views/ToggleDevToolsNode.js";
import { ViewsUpdateBoundsNode } from "./nodes/views/UpdateBoundsNode.js";

// Automation
import { AutomationClickNode } from "./nodes/automation/ClickNode.js";
import { AutomationTypeNode } from "./nodes/automation/TypeNode.js";
import { AutomationEnhancedClickNode } from "./nodes/automation/EnhancedClickNode.js";
import { AutomationWaitForSelectorNode } from "./nodes/automation/WaitForSelectorNode.js";
import { AutomationUploadFileNode } from "./nodes/automation/UploadFileNode.js";
import { AutomationGetTextNode } from "./nodes/automation/GetTextNode.js";
import { AutomationFindElementsByTextNode } from "./nodes/automation/FindElementsByTextNode.js";
import { AutomationGetInteractiveElementsNode } from "./nodes/automation/GetInteractiveElementsNode.js";
import { AutomationScrollNode } from "./nodes/automation/ScrollNode.js";
import { AutomationSimulateKeyboardNode } from "./nodes/automation/SimulateKeyboardNode.js";
import { AutomationFillFormNode } from "./nodes/automation/FillFormNode.js";

// Browser
import { BrowserExecuteScriptNode } from "./nodes/browser/ExecuteScriptNode.js";
import { BrowserGetInfoNode } from "./nodes/browser/GetInfoNode.js";
import { BrowserGetZoomNode } from "./nodes/browser/GetZoomNode.js";
import { BrowserGoBackNode } from "./nodes/browser/GoBackNode.js";
import { BrowserGoForwardNode } from "./nodes/browser/GoForwardNode.js";
import { BrowserReloadNode } from "./nodes/browser/ReloadNode.js";
import { BrowserScreenshotNode } from "./nodes/browser/ScreenshotNode.js";
import { BrowserSetZoomNode } from "./nodes/browser/SetZoomNode.js";
import { BrowserToggleDevToolsNode } from "./nodes/browser/ToggleDevToolsNode.js";

// Content
import { ContentEvaluateNode } from "./nodes/content/EvaluateNode.js";
import { ContentExtractMetadataNode } from "./nodes/content/ExtractMetadataNode.js";
import { ContentGetHtmlContentNode } from "./nodes/content/GetHtmlContentNode.js";
import { ContentGetPageContentNode } from "./nodes/content/GetPageContentNode.js";
import { ContentGetTextContentNode } from "./nodes/content/GetTextContentNode.js";

// Network
import { NetworkGetStatusNode } from "./nodes/network/GetStatusNode.js";
import { NetworkSendRequestNode } from "./nodes/network/SendRequestNode.js";
import { NetworkStartDebuggerCaptureNode } from "./nodes/network/StartDebuggerCaptureNode.js";
import { NetworkStartWebRequestCaptureNode } from "./nodes/network/StartWebRequestCaptureNode.js";
import { NetworkStopDebuggerCaptureNode } from "./nodes/network/StopDebuggerCaptureNode.js";
import { NetworkStopWebRequestCaptureNode } from "./nodes/network/StopWebRequestCaptureNode.js";

export default class WorkflowRunPlugin extends BasePlugin {
  constructor() {
    super("workflow-run");
    this.version = "1.0.0";
    this.description = "工作流节点执行器插件，提供节点注册和执行功能";

    // 节点注册表管理器
    this.nodeRegistry = null;
    // 工作流执行器
    this.executor = null;
    // WebSocket 服务器
    this.server = null;
  }

  /**
   * 初始化插件
   */
  async init() {
    this.logger.info("初始化工作流节点执行器插件...");

    try {
      // 使用 workflow-flow-nodes 构建节点类注册表（注册所有节点）
      this.nodeRegistry = {
        ...NODE_CLASS_REGISTRY,
        // Views
        "http:views:loadURL": ViewsLoadURLNode,
        "http:views:create": ViewsCreateNode,
        "http:views:getActive": ViewsGetActiveNode,
        "http:views:getAll": ViewsGetAllNode,
        "http:views:reload": ViewsReloadNode,
        "http:views:remove": ViewsRemoveNode,
        "http:views:setActive": ViewsSetActiveNode,
        "http:views:setVisible": ViewsSetVisibleNode,
        "http:views:toggleDevTools": ViewsToggleDevToolsNode,
        "http:views:updateBounds": ViewsUpdateBoundsNode,
        // Automation
        "http:automation:click": AutomationClickNode,
        "http:automation:type": AutomationTypeNode,
        "http:automation:enhancedClick": AutomationEnhancedClickNode,
        "http:automation:waitForSelector": AutomationWaitForSelectorNode,
        "http:automation:uploadFile": AutomationUploadFileNode,
        "http:automation:getText": AutomationGetTextNode,
        "http:automation:findElementsByText": AutomationFindElementsByTextNode,
        "http:automation:getInteractiveElements": AutomationGetInteractiveElementsNode,
        "http:automation:scroll": AutomationScrollNode,
        "http:automation:simulateKeyboard": AutomationSimulateKeyboardNode,
        "http:automation:fillForm": AutomationFillFormNode,
        // Browser
        "http:browser:executeScript": BrowserExecuteScriptNode,
        "http:browser:getInfo": BrowserGetInfoNode,
        "http:browser:getZoom": BrowserGetZoomNode,
        "http:browser:goBack": BrowserGoBackNode,
        "http:browser:goForward": BrowserGoForwardNode,
        "http:browser:reload": BrowserReloadNode,
        "http:browser:screenshot": BrowserScreenshotNode,
        "http:browser:setZoom": BrowserSetZoomNode,
        "http:browser:toggleDevTools": BrowserToggleDevToolsNode,
        // Content
        "http:content:evaluate": ContentEvaluateNode,
        "http:content:extractMetadata": ContentExtractMetadataNode,
        "http:content:getHtmlContent": ContentGetHtmlContentNode,
        "http:content:getPageContent": ContentGetPageContentNode,
        "http:content:getTextContent": ContentGetTextContentNode,
        // Network
        "http:network:getStatus": NetworkGetStatusNode,
        "http:network:sendRequest": NetworkSendRequestNode,
        "http:network:startDebuggerCapture": NetworkStartDebuggerCaptureNode,
        "http:network:startWebRequestCapture": NetworkStartWebRequestCaptureNode,
        "http:network:stopDebuggerCapture": NetworkStopDebuggerCaptureNode,
        "http:network:stopWebRequestCapture": NetworkStopWebRequestCaptureNode,
      };

      const historyHandler = await createPocketBaseHistoryHandler();
      const pb = pluginManager.getPlugin("multidimensional_table")?.pb;
      if (pb) {
        historyHandler.setPb(pb);
      }

      // 创建并启动 WebSocket 服务器（仅需端口与节点注册表）
      this.server = createWorkflowServer({
        port: APP_CONFIG.WS_PORT,
        nodeRegistry: this.nodeRegistry,
        historyHandlers: historyHandler,
      });

      const info = this.server.getInfo();
      this.logger.info(
        `工作流节点执行器插件初始化完成，已加载 ${info.nodeCount} 个节点`
      );
    } catch (error) {
      this.logger.error("工作流节点执行器插件初始化失败", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 清理插件资源
   */
  async cleanup() {
    this.logger.info("清理工作流节点执行器插件资源...");

    // 停止 WebSocket 服务器
    if (this.server) {
      await this.server.close();
      this.server = null;
    }

    this.nodeRegistry = null;
    this.executor = null;

    this.logger.info("工作流节点执行器插件清理完成");
  }
}

