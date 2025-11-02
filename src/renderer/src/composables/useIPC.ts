// src/renderer/src/composables/useIPC.ts
// IPC 通信 Composable

/**
 * 统一的 IPC 响应格式
 */
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stack?: string;
  duration: number;
  channel: string;
}

/**
 * 浏览器 API 接口
 */
interface BrowserAPI {
  invoke: <T = any>(channel: string, ...args: any[]) => Promise<IPCResponse<T>>;
  getChannels: () => Promise<
    IPCResponse<{ channels: string[]; count: number }>
  >;
  on?: (channel: string, listener: (payload: any) => void) => void;
  off?: (channel: string, listener: (payload: any) => void) => void;
}

/**
 * 获取浏览器 API
 */
function getBrowserAPI(): BrowserAPI | null {
  if (typeof window !== "undefined" && "browserAPI" in window) {
    return window.browserAPI as BrowserAPI;
  }
  return null;
}

/**
 * IPC 通信 Hook
 */
export function useIPC() {
  const browserAPI = getBrowserAPI();

  /**
   * 调用 IPC 通道
   */
  async function invoke<T = any>(
    channel: string,
    ...args: any[]
  ): Promise<IPCResponse<T>> {
    if (!browserAPI) {
      return {
        success: false,
        error: "browserAPI 未定义，可能不在 Electron 环境中",
        duration: 0,
        channel,
      };
    }

    try {
      const response = await browserAPI.invoke<T>(channel, ...args);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
        channel,
      };
    }
  }

  /**
   * 获取所有可用通道
   */
  async function getChannels() {
    if (!browserAPI) {
      return {
        success: false,
        error: "browserAPI 未定义",
        duration: 0,
        channel: "ipc:getChannels",
      };
    }

    return await browserAPI.getChannels();
  }

  /**
   * 创建视图
   */
  async function createView(options: {
    title?: string;
    url?: string;
    bounds?: { x: number; y: number; width: number; height: number };
    visible?: boolean;
  }) {
    return await invoke<{ viewId: string }>("views:create", options);
  }

  /**
   * 移除视图
   */
  async function removeView(viewId: string) {
    return await invoke<{ success: boolean }>("views:remove", viewId);
  }

  /**
   * 获取所有视图
   */
  async function getAllViews() {
    return await invoke<{
      views: Array<{
        id: string;
        title: string;
        url: string;
        bounds: { x: number; y: number; width: number; height: number };
        canGoBack: boolean;
        canGoForward: boolean;
      }>;
    }>("views:getAll");
  }

  /**
   * 更新视图位置和大小
   */
  async function updateViewBounds(
    viewId: string,
    bounds: { x?: number; y?: number; width?: number; height?: number }
  ) {
    return await invoke<{
      bounds: { x: number; y: number; width: number; height: number };
    }>("views:updateBounds", viewId, bounds);
  }

  /**
   * 加载 URL
   */
  async function loadURL(viewId: string, url: string) {
    return await invoke<{ success: boolean; url: string }>(
      "views:loadURL",
      viewId,
      url
    );
  }

  /**
   * 刷新视图
   */
  async function reloadView(viewId: string) {
    return await invoke<{ success: boolean }>("views:reload", viewId);
  }

  /**
   * 设置视图显示/隐藏
   */
  async function setViewVisible(viewId: string, visible: boolean) {
    return await invoke<{ success: boolean }>(
      "views:setVisible",
      viewId,
      visible
    );
  }

  /**
   * 截图
   */
  async function screenshot(viewId: string) {
    return await invoke<{ image: string; size: number }>(
      "browser:screenshot",
      viewId
    );
  }

  async function showViewMenu(payload: {
    screenX: number;
    screenY: number;
    viewId: string | null;
    backendId: string | null;
  }) {
    return await invoke<{ success: boolean }>("ui:showViewMenu", payload);
  }

  /**
   * 获取页面信息
   */
  async function getPageInfo(viewId: string) {
    return await invoke<{
      url: string;
      title: string;
      canGoBack: boolean;
      canGoForward: boolean;
      isLoading: boolean;
    }>("browser:getInfo", viewId);
  }

  /**
   * 后退
   */
  async function goBack(viewId: string) {
    return await invoke<{ success: boolean; message?: string }>(
      "browser:goBack",
      viewId
    );
  }

  /**
   * 前进
   */
  async function goForward(viewId: string) {
    return await invoke<{ success: boolean; message?: string }>(
      "browser:goForward",
      viewId
    );
  }

  return {
    invoke,
    getChannels,
    // 视图管理
    createView,
    removeView,
    getAllViews,
    updateViewBounds,
    loadURL,
    reloadView,
    setViewVisible,
    // 浏览器操作
    screenshot,
    getPageInfo,
    goBack,
    goForward,
    // UI 操作
    showViewMenu,
  };
}

// 声明全局类型
declare global {
  interface Window {
    browserAPI: BrowserAPI;
  }
}
