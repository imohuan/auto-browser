/**
 * 节点注册表类
 * 管理所有浏览器节点实例的加载和访问
 */

import { BaseNode, NodeRegistry } from "workflow-node-executor";

// Network 节点
import { NetworkStartWebRequestCaptureNode } from "./nodes/network/StartWebRequestCaptureNode.js";
import { NetworkStopWebRequestCaptureNode } from "./nodes/network/StopWebRequestCaptureNode.js";
import { NetworkStartDebuggerCaptureNode } from "./nodes/network/StartDebuggerCaptureNode.js";
import { NetworkStopDebuggerCaptureNode } from "./nodes/network/StopDebuggerCaptureNode.js";
import { NetworkSendRequestNode } from "./nodes/network/SendRequestNode.js";
import { NetworkGetStatusNode } from "./nodes/network/GetStatusNode.js";

// Automation 节点
import { AutomationClickNode } from "./nodes/automation/ClickNode.js";
import { AutomationEnhancedClickNode } from "./nodes/automation/EnhancedClickNode.js";
import { AutomationTypeNode } from "./nodes/automation/TypeNode.js";
import { AutomationScrollNode } from "./nodes/automation/ScrollNode.js";
import { AutomationWaitForSelectorNode } from "./nodes/automation/WaitForSelectorNode.js";
import { AutomationGetTextNode } from "./nodes/automation/GetTextNode.js";
import { AutomationUploadFileNode } from "./nodes/automation/UploadFileNode.js";
import { AutomationFillFormNode } from "./nodes/automation/FillFormNode.js";
import { AutomationSimulateKeyboardNode } from "./nodes/automation/SimulateKeyboardNode.js";
import { AutomationGetInteractiveElementsNode } from "./nodes/automation/GetInteractiveElementsNode.js";
import { AutomationFindElementsByTextNode } from "./nodes/automation/FindElementsByTextNode.js";

// Views 节点
import { ViewsCreateNode } from "./nodes/views/CreateNode.js";
import { ViewsRemoveNode } from "./nodes/views/RemoveNode.js";
import { ViewsGetAllNode } from "./nodes/views/GetAllNode.js";
import { ViewsUpdateBoundsNode } from "./nodes/views/UpdateBoundsNode.js";
import { ViewsLoadURLNode } from "./nodes/views/LoadURLNode.js";
import { ViewsReloadNode } from "./nodes/views/ReloadNode.js";
import { ViewsToggleDevToolsNode } from "./nodes/views/ToggleDevToolsNode.js";
import { ViewsSetActiveNode } from "./nodes/views/SetActiveNode.js";
import { ViewsGetActiveNode } from "./nodes/views/GetActiveNode.js";
import { ViewsSetVisibleNode } from "./nodes/views/SetVisibleNode.js";

// Browser 节点
import { BrowserNavigateNode } from "./nodes/browser/NavigateNode.js";
import { BrowserScreenshotNode } from "./nodes/browser/ScreenshotNode.js";
import { BrowserGetInfoNode } from "./nodes/browser/GetInfoNode.js";
import { BrowserGoBackNode } from "./nodes/browser/GoBackNode.js";
import { BrowserGoForwardNode } from "./nodes/browser/GoForwardNode.js";
import { BrowserReloadNode } from "./nodes/browser/ReloadNode.js";
import { BrowserToggleDevToolsNode } from "./nodes/browser/ToggleDevToolsNode.js";
import { BrowserExecuteScriptNode } from "./nodes/browser/ExecuteScriptNode.js";
import { BrowserSetZoomNode } from "./nodes/browser/SetZoomNode.js";
import { BrowserGetZoomNode } from "./nodes/browser/GetZoomNode.js";

// Content 节点
import { ContentGetTextContentNode } from "./nodes/content/GetTextContentNode.js";
import { ContentGetHtmlContentNode } from "./nodes/content/GetHtmlContentNode.js";
import { ContentGetPageContentNode } from "./nodes/content/GetPageContentNode.js";
import { ContentExtractMetadataNode } from "./nodes/content/ExtractMetadataNode.js";
import { ContentEvaluateNode } from "./nodes/content/EvaluateNode.js";

/**
 * 节点注册表
 * 按分类组织所有节点（内部使用）
 */
const NODE_REGISTRY = {
  /** Network 节点 */
  network: {
    startWebRequestCapture: new NetworkStartWebRequestCaptureNode(),
    stopWebRequestCapture: new NetworkStopWebRequestCaptureNode(),
    startDebuggerCapture: new NetworkStartDebuggerCaptureNode(),
    stopDebuggerCapture: new NetworkStopDebuggerCaptureNode(),
    sendRequest: new NetworkSendRequestNode(),
    getStatus: new NetworkGetStatusNode(),
  },
  /** Automation 节点 */
  automation: {
    click: new AutomationClickNode(),
    enhancedClick: new AutomationEnhancedClickNode(),
    type: new AutomationTypeNode(),
    scroll: new AutomationScrollNode(),
    waitForSelector: new AutomationWaitForSelectorNode(),
    getText: new AutomationGetTextNode(),
    uploadFile: new AutomationUploadFileNode(),
    fillForm: new AutomationFillFormNode(),
    simulateKeyboard: new AutomationSimulateKeyboardNode(),
    getInteractiveElements: new AutomationGetInteractiveElementsNode(),
    findElementsByText: new AutomationFindElementsByTextNode(),
  },
  /** Views 节点 */
  views: {
    create: new ViewsCreateNode(),
    remove: new ViewsRemoveNode(),
    getAll: new ViewsGetAllNode(),
    updateBounds: new ViewsUpdateBoundsNode(),
    loadURL: new ViewsLoadURLNode(),
    reload: new ViewsReloadNode(),
    toggleDevTools: new ViewsToggleDevToolsNode(),
    setActive: new ViewsSetActiveNode(),
    getActive: new ViewsGetActiveNode(),
    setVisible: new ViewsSetVisibleNode(),
  },
  /** Browser 节点 */
  browser: {
    navigate: new BrowserNavigateNode(),
    screenshot: new BrowserScreenshotNode(),
    getInfo: new BrowserGetInfoNode(),
    goBack: new BrowserGoBackNode(),
    goForward: new BrowserGoForwardNode(),
    reload: new BrowserReloadNode(),
    toggleDevTools: new BrowserToggleDevToolsNode(),
    executeScript: new BrowserExecuteScriptNode(),
    setZoom: new BrowserSetZoomNode(),
    getZoom: new BrowserGetZoomNode(),
  },
  /** Content 节点 */
  content: {
    getTextContent: new ContentGetTextContentNode(),
    getHtmlContent: new ContentGetHtmlContentNode(),
    getPageContent: new ContentGetPageContentNode(),
    extractMetadata: new ContentExtractMetadataNode(),
    evaluate: new ContentEvaluateNode(),
  },
};

/**
 * 构建节点类型映射表
 */
function buildNodeTypeMap() {
  const map = {};
  Object.values(NODE_REGISTRY).forEach((category) => {
    Object.values(category).forEach((node) => {
      map[node.type] = node;
    });
  });
  return map;
}

/**
 * 浏览器节点注册表类
 * 继承自 NodeRegistry，提供浏览器节点的专用注册表
 */
export class BrowserNodeRegistry extends NodeRegistry {
  /**
   * 创建浏览器节点注册表实例
   */
  constructor() {
    super(buildNodeTypeMap());
  }
}


export const nodeRegistry = new BrowserNodeRegistry();
export const nodeMetadata = nodeRegistry.getAllMetadata();