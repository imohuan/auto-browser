/**
 * IPC Channels 声明文件
 *
 * 本文件定义了所有 IPC channels 的类型定义，包括：
 * - Channel 名称
 * - 功能描述
 * - 参数类型（详细展开，不使用 options={}）
 * - 返回类型
 *
 * 这些 channels 在主进程的 handlers 目录中定义和注册。
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 视图边界对象
 */
export interface ViewBounds {
  /** X 坐标（像素） */
  x?: number;
  /** Y 坐标（像素） */
  y?: number;
  /** 宽度（像素） */
  width?: number;
  /** 高度（像素） */
  height?: number;
}

/**
 * 视图创建选项
 */
export interface CreateViewOptions {
  /** 视图标题 */
  title?: string;
  /** 要加载的 URL */
  url?: string;
  /** 视图位置和大小 */
  bounds?: ViewBounds;
  /** 是否可见，默认为 true */
  visible?: boolean;
}

/**
 * 视图信息
 */
export interface ViewInfo {
  /** 视图 ID */
  id: string;
  /** 视图标题 */
  title: string;
  /** 当前 URL */
  url: string;
  /** 视图位置和大小 */
  bounds: ViewBounds;
  /** 是否可以后退 */
  canGoBack: boolean;
  /** 是否可以前进 */
  canGoForward: boolean;
  /** 是否为活动视图 */
  isActive: boolean;
  /** 是否可见 */
  isVisible: boolean;
}

/**
 * 网络捕获选项
 */
export interface NetworkCaptureOptions {
  /** 最大捕获时间（毫秒），0 表示无限制，默认 180000（3 分钟） */
  maxCaptureTime?: number;
  /** 无活动超时时间（毫秒），默认 60000（1 分钟） */
  inactivityTimeout?: number;
  /** 是否包含静态资源（图片、CSS、JS 等），默认 false */
  includeStatic?: boolean;
}

/**
 * 网络请求信息（WebRequest 方式）
 */
export interface WebRequestInfo {
  /** 请求 ID */
  requestId: string;
  /** 请求 URL */
  url: string;
  /** HTTP 方法 */
  method: string;
  /** 资源类型 */
  resourceType: string;
  /** 请求时间戳（毫秒） */
  requestTime: number;
  /** 上传数据（如果有） */
  uploadData?: string;
  /** 请求头 */
  requestHeaders?: Record<string, string>;
  /** HTTP 状态码 */
  statusCode?: number;
  /** HTTP 状态行 */
  statusLine?: string;
  /** 响应时间戳（毫秒） */
  responseTime?: number;
  /** 响应头 */
  responseHeaders?: Record<string, string | string[]>;
  /** MIME 类型 */
  mimeType?: string;
  /** 是否来自缓存 */
  fromCache?: boolean;
  /** 错误文本（如果请求失败） */
  errorText?: string;
  /** 特定请求头（已移除公共头） */
  specificRequestHeaders?: Record<string, string>;
  /** 特定响应头（已移除公共头） */
  specificResponseHeaders?: Record<string, string>;
}

/**
 * 网络请求信息（Debugger 方式，包含响应体）
 */
export interface DebuggerRequestInfo {
  /** 请求 ID */
  requestId: string;
  /** 请求 URL */
  url: string;
  /** HTTP 方法 */
  method: string;
  /** 请求头 */
  requestHeaders?: Record<string, string>;
  /** 请求时间戳（毫秒） */
  requestTime: number;
  /** 资源类型 */
  type?: string;
  /** 请求状态：'pending' | 'complete' | 'error' */
  status: "pending" | "complete" | "error";
  /** 请求体（POST 数据） */
  requestBody?: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** HTTP 状态文本 */
  statusText?: string;
  /** 响应头 */
  responseHeaders?: Record<string, string>;
  /** MIME 类型 */
  mimeType?: string;
  /** 响应时间戳（毫秒） */
  responseTime?: number;
  /** 编码后的数据长度（字节） */
  encodedDataLength?: number;
  /** 响应体（如果符合捕获条件） */
  responseBody?: string;
  /** 响应体是否为 base64 编码 */
  base64Encoded?: boolean;
  /** 错误文本（如果请求失败） */
  errorText?: string;
  /** 是否已取消 */
  canceled?: boolean;
  /** 特定请求头（已移除公共头） */
  specificRequestHeaders?: Record<string, string>;
  /** 特定响应头（已移除公共头） */
  specificResponseHeaders?: Record<string, string>;
}

/**
 * 网络捕获结果（WebRequest 方式）
 */
export interface WebRequestCaptureResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 捕获开始时间戳（毫秒） */
  captureStartTime: number;
  /** 捕获结束时间戳（毫秒） */
  captureEndTime: number;
  /** 总捕获时长（毫秒） */
  totalDurationMs: number;
  /** 使用的设置 */
  settingsUsed: {
    maxCaptureTime: number;
    inactivityTimeout: number;
    includeStatic: boolean;
    maxRequests: number;
  };
  /** 公共请求头（所有请求共有的请求头） */
  commonRequestHeaders: Record<string, string>;
  /** 公共响应头（所有请求共有的响应头） */
  commonResponseHeaders: Record<string, string>;
  /** 处理后的请求数组 */
  requests: WebRequestInfo[];
  /** 请求数量 */
  requestCount: number;
  /** 接收到的总请求数 */
  totalRequestsReceived: number;
  /** 是否达到请求限制 */
  requestLimitReached: boolean;
}

/**
 * 网络捕获结果（Debugger 方式）
 */
export interface DebuggerCaptureResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 捕获开始时间戳（毫秒） */
  captureStartTime: number;
  /** 捕获结束时间戳（毫秒） */
  captureEndTime: number;
  /** 总捕获时长（毫秒） */
  totalDurationMs: number;
  /** 公共请求头 */
  commonRequestHeaders: Record<string, string>;
  /** 公共响应头 */
  commonResponseHeaders: Record<string, string>;
  /** 处理后的请求数组（包含响应体） */
  requests: DebuggerRequestInfo[];
  /** 请求数量 */
  requestCount: number;
  /** 限制前的总请求数 */
  totalRequestsReceivedBeforeLimit: number;
  /** 是否达到请求限制 */
  requestLimitReached: boolean;
  /** 停止原因：'user_request' | 'inactivity_timeout' | 'max_capture_time' */
  stoppedBy: "user_request" | "inactivity_timeout" | "max_capture_time";
}

/**
 * 网络请求发送选项
 */
export interface NetworkSendRequestOptions {
  /** 请求 URL（必需） */
  url: string;
  /** HTTP 请求方法，默认 'GET' */
  method?: string;
  /** 请求头对象 */
  headers?: Record<string, string>;
  /** 请求体（POST/PUT 等请求） */
  body?: string | object;
  /** 请求超时时间（毫秒），默认 30000（30 秒） */
  timeout?: number;
}

/**
 * 网络请求发送结果
 */
export interface NetworkSendRequestResult {
  /** 请求是否成功 */
  success: boolean;
  /** 响应对象（如果请求成功） */
  response?: {
    /** HTTP 状态码 */
    status: number;
    /** HTTP 状态文本 */
    statusText: string;
    /** 响应头对象 */
    headers: Record<string, string>;
    /** 响应体（根据 Content-Type 自动解析为 JSON 或文本） */
    body: string | object;
    /** 最终 URL（如果发生重定向） */
    url?: string;
  };
  /** 错误信息（如果请求失败） */
  error?: string;
}

/**
 * 网络监控状态
 */
export interface NetworkMonitorStatus {
  /** WebRequest 是否正在捕获 */
  webRequestCapturing: boolean;
  /** Debugger 是否正在捕获 */
  debuggerCapturing: boolean;
}

/**
 * 增强点击选项
 */
export interface EnhancedClickOptions {
  /** 是否等待导航完成，默认 false */
  waitForNavigation?: boolean;
  /** 超时时间（毫秒），默认 5000 */
  timeout?: number;
  /** 点击坐标（可选，如果不提供则使用元素中心） */
  coordinates?: {
    /** X 坐标 */
    x: number;
    /** Y 坐标 */
    y: number;
  };
}

/**
 * 增强点击结果
 */
export interface EnhancedClickResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 元素信息 */
  elementInfo?: {
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    href?: string;
    type?: string;
    value?: string;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    clickMethod: "selector" | "coordinates";
    clickPosition?: {
      x: number;
      y: number;
    };
  };
  /** 是否发生导航（实际实现中字段名为 navigationOccurred） */
  navigated?: boolean;
  /** 是否发生导航（浏览器辅助脚本返回的字段名） */
  navigationOccurred?: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 表单填充结果
 */
export interface FillFormResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 元素信息 */
  elementInfo?: {
    tagName: string;
    id?: string;
    className?: string;
    type?: string;
    name?: string;
    value?: string;
    placeholder?: string;
  };
  /** 错误信息 */
  error?: string;
}

/**
 * 键盘模拟结果
 */
export interface SimulateKeyboardResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 每个按键组合的操作结果 */
  results?: Array<{
    /** 按键组合字符串 */
    keyCombination: string;
    /** 是否成功 */
    success: boolean;
    /** 错误信息 */
    error?: string;
  }>;
  /** 目标元素信息 */
  targetElement?: {
    tagName: string;
    id?: string;
    className?: string;
    type?: string;
  };
}

/**
 * 交互元素信息
 */
export interface InteractiveElement {
  /** 元素类型：'button' | 'link' | 'input' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'other' */
  type: string;
  /** CSS 选择器 */
  selector: string;
  /** 元素标签名 */
  tagName: string;
  /** 元素 ID */
  id?: string;
  /** 元素类名 */
  className?: string;
  /** 元素文本内容 */
  text?: string;
  /** 链接地址（如果是链接） */
  href?: string;
  /** 输入框类型（如果是输入框） */
  inputType?: string;
  /** 输入框占位符 */
  placeholder?: string;
  /** 输入框值 */
  value?: string;
  /** 是否选中（复选框/单选按钮） */
  checked?: boolean;
  /** 元素位置信息 */
  coordinates?: {
    /** X 坐标 */
    x: number;
    /** Y 坐标 */
    y: number;
    /** 宽度 */
    width: number;
    /** 高度 */
    height: number;
  };
  /** 元素是否可见 */
  visible?: boolean;
}

/**
 * 获取交互元素选项
 */
export interface GetInteractiveElementsOptions {
  /** 自定义 CSS 选择器 */
  selector?: string;
  /** 文本查询（用于查找包含指定文本的元素） */
  textQuery?: string;
  /** 是否包含坐标信息，默认 true */
  includeCoordinates?: boolean;
  /** 是否严格检查可见性，默认 true */
  strictVisibility?: boolean;
  /** 要查找的元素类型数组 */
  types?: string[];
}

/**
 * 查找元素选项
 */
export interface FindElementsByTextOptions {
  /** 是否包含坐标信息，默认 true */
  includeCoordinates?: boolean;
  /** 是否严格检查可见性，默认 true */
  strictVisibility?: boolean;
}

/**
 * 文本内容结果
 */
export interface TextContentResult {
  /** 是否成功 */
  success: boolean;
  /** 提取的文本内容 */
  textContent?: string;
  /** 元数据（标题、作者等） */
  metadata?: {
    title?: string;
    author?: string;
    siteName?: string;
    description?: string;
    url?: string;
  };
  /** 错误信息 */
  error?: string;
}

/**
 * HTML 内容结果
 */
export interface HtmlContentResult {
  /** 是否成功 */
  success: boolean;
  /** 提取的 HTML 内容 */
  htmlContent?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 页面元数据
 */
export interface PageMetadata {
  /** 页面标题 */
  title?: string;
  /** 作者 */
  author?: string;
  /** 站点名称 */
  siteName?: string;
  /** 描述 */
  description?: string;
  /** 页面 URL */
  url?: string;
  /** 发布时间 */
  publishedTime?: string;
  /** 修改时间 */
  modifiedTime?: string;
  /** 语言 */
  language?: string;
  /** 图片数组 */
  images?: string[];
}

/**
 * 窗口状态
 */
export interface WindowState {
  /** 是否最大化 */
  isMaximized: boolean;
  /** 是否最小化 */
  isMinimized: boolean;
  /** 是否置顶 */
  isAlwaysOnTop: boolean;
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
  /** 图片格式，默认 'png' */
  format?: "png" | "jpeg";
  /** 图片质量（仅 JPEG，0-100），默认 90 */
  quality?: number;
}

/**
 * 截图结果
 */
export interface ScreenshotResult {
  /** Base64 编码的图片数据（data URI） */
  image: string;
  /** 图片大小（字节） */
  size: number;
}

/**
 * 浏览器信息
 */
export interface BrowserInfo {
  /** 当前 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 是否可以后退 */
  canGoBack: boolean;
  /** 是否可以前进 */
  canGoForward: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 右键菜单选项
 */
export interface ShowViewMenuOptions {
  /** 屏幕 X 坐标 */
  screenX: number;
  /** 屏幕 Y 坐标 */
  screenY: number;
  /** 视图 ID */
  viewId: string;
  /** 后端视图 ID（用于操作目标视图） */
  backendId: string;
}

/**
 * 标签页右键菜单选项
 */
export interface ShowTabContextMenuOptions {
  /** 屏幕 X 坐标 */
  screenX: number;
  /** 屏幕 Y 坐标 */
  screenY: number;
  /** 视图 ID */
  viewId: string;
  /** 后端视图 ID（用于操作目标视图） */
  backendId: string | null;
  /** 当前标签页索引 */
  currentIndex: number;
  /** 标签页总数 */
  totalCount: number;
}

// ============================================================================
// Network Channels
// ============================================================================

/**
 * 启动 WebRequest 网络捕获（不含响应体）
 *
 * 使用 Electron 的 webRequest API 捕获网络请求，性能较好但不包含响应体。
 *
 * @param viewId - 视图 ID
 * @param options - 捕获选项
 * @param options.maxCaptureTime - 最大捕获时间（毫秒），0 表示无限制，默认 180000（3 分钟）
 * @param options.inactivityTimeout - 无活动超时时间（毫秒），默认 60000（1 分钟）
 * @param options.includeStatic - 是否包含静态资源（图片、CSS、JS 等），默认 false
 * @returns 启动结果
 */
export type NetworkStartWebRequestCapture = (
  viewId: string,
  options?: NetworkCaptureOptions
) => Promise<{
  success: boolean;
  message?: string;
  maxCaptureTime?: number;
  inactivityTimeout?: number;
  includeStatic?: boolean;
  maxRequests?: number;
}>;

/**
 * 停止 WebRequest 网络捕获
 *
 * @param viewId - 视图 ID
 * @returns 捕获结果，包含所有捕获到的请求信息
 */
export type NetworkStopWebRequestCapture = (
  viewId: string
) => Promise<WebRequestCaptureResult>;

/**
 * 启动 Debugger 网络捕获（含响应体）
 *
 * 使用 Chrome DevTools Protocol 捕获网络请求，可获取响应体但性能略差。
 *
 * @param viewId - 视图 ID
 * @param options - 捕获选项
 * @param options.maxCaptureTime - 最大捕获时间（毫秒），0 表示无限制，默认 180000（3 分钟）
 * @param options.inactivityTimeout - 无活动超时时间（毫秒），默认 60000（1 分钟）
 * @param options.includeStatic - 是否包含静态资源（图片、CSS、JS 等），默认 false
 * @returns 启动结果
 */
export type NetworkStartDebuggerCapture = (
  viewId: string,
  options?: NetworkCaptureOptions
) => Promise<{
  success: boolean;
  message?: string;
  maxCaptureTime?: number;
  inactivityTimeout?: number;
  includeStatic?: boolean;
  maxRequests?: number;
}>;

/**
 * 停止 Debugger 网络捕获
 *
 * @param viewId - 视图 ID
 * @returns 捕获结果，包含所有捕获到的请求信息和响应体
 */
export type NetworkStopDebuggerCapture = (
  viewId: string
) => Promise<DebuggerCaptureResult>;

/**
 * 发送网络请求
 *
 * 在页面上下文中使用 fetch API 发送请求，支持超时控制。
 *
 * @param viewId - 视图 ID
 * @param url - 请求 URL（必需）
 * @param method - HTTP 请求方法，默认 'GET'
 * @param headers - 请求头对象，默认 {}
 * @param body - 请求体（POST/PUT 等请求），默认 null
 * @param timeout - 请求超时时间（毫秒），默认 30000（30 秒）
 * @returns 请求结果
 */
export type NetworkSendRequest = (
  viewId: string,
  url: string,
  method?: string,
  headers?: Record<string, string>,
  body?: string | object | null,
  timeout?: number
) => Promise<NetworkSendRequestResult>;

/**
 * 获取网络监控状态
 *
 * @param viewId - 视图 ID
 * @returns 网络监控状态
 */
export type NetworkGetStatus = (viewId: string) => Promise<{
  success: boolean;
  data: NetworkMonitorStatus;
}>;

// ============================================================================
// Automation Channels
// ============================================================================

/**
 * CDP 真实点击
 *
 * 使用 Chrome DevTools Protocol 执行真实的鼠标点击事件。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器
 * @returns 点击结果
 */
export type AutomationClick = (
  viewId: string,
  selector: string
) => Promise<{
  success: boolean;
  selector: string;
}>;

/**
 * CDP 真实输入
 *
 * 使用 Chrome DevTools Protocol 执行真实的键盘输入事件。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器（输入框）
 * @param text - 要输入的文本
 * @returns 输入结果
 */
export type AutomationType = (
  viewId: string,
  selector: string,
  text: string
) => Promise<{
  success: boolean;
  selector: string;
  text: string;
}>;

/**
 * CDP 滚动页面
 *
 * 使用 Chrome DevTools Protocol 滚动页面到指定位置。
 *
 * @param viewId - 视图 ID
 * @param x - 水平滚动位置（像素）
 * @param y - 垂直滚动位置（像素）
 * @returns 滚动结果
 */
export type AutomationScroll = (
  viewId: string,
  x: number,
  y: number
) => Promise<{
  success: boolean;
  x: number;
  y: number;
}>;

/**
 * CDP 等待选择器
 *
 * 使用 Chrome DevTools Protocol 等待指定元素出现。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器
 * @param timeout - 超时时间（毫秒），默认 5000
 * @returns 等待结果
 */
export type AutomationWaitForSelector = (
  viewId: string,
  selector: string,
  timeout?: number
) => Promise<{
  success: boolean;
  selector: string;
}>;

/**
 * CDP 获取元素文本
 *
 * 使用 Chrome DevTools Protocol 获取元素的文本内容。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器
 * @returns 元素文本内容
 */
export type AutomationGetText = (
  viewId: string,
  selector: string
) => Promise<{
  text: string;
}>;

/**
 * CDP 文件上传
 *
 * 使用 Chrome DevTools Protocol 上传文件到文件输入框。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器（文件输入框）
 * @param filePath - 文件路径
 * @returns 上传结果
 */
export type AutomationUploadFile = (
  viewId: string,
  selector: string,
  filePath: string
) => Promise<{
  success: boolean;
  selector: string;
  filePath: string;
}>;

/**
 * 增强版点击（使用辅助脚本）
 *
 * 使用浏览器辅助脚本执行点击，支持等待导航和自定义坐标。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器
 * @param options - 点击选项
 * @param options.waitForNavigation - 是否等待导航完成，默认 false
 * @param options.timeout - 超时时间（毫秒），默认 5000
 * @param options.coordinates - 点击坐标（可选，如果不提供则使用元素中心）
 * @param options.coordinates.x - X 坐标
 * @param options.coordinates.y - Y 坐标
 * @returns 点击结果，包含元素信息和导航状态
 */
export type AutomationEnhancedClick = (
  viewId: string,
  selector: string,
  options?: EnhancedClickOptions
) => Promise<EnhancedClickResult>;

/**
 * 表单填充
 *
 * 使用浏览器辅助脚本填充表单元素。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器（表单元素）
 * @param value - 要填充的值
 * @returns 填充结果，包含元素信息
 */
export type AutomationFillForm = (
  viewId: string,
  selector: string,
  value: string
) => Promise<FillFormResult>;

/**
 * 键盘输入模拟
 *
 * 使用浏览器辅助脚本模拟键盘输入。
 *
 * @param viewId - 视图 ID
 * @param keys - 要输入的键（可以是字符串或特殊键如 'Enter'、'Tab' 等）
 * @param selector - CSS 选择器（可选，用于聚焦到特定元素）
 * @param delay - 输入延迟（毫秒），默认 0
 * @returns 模拟结果
 */
export type AutomationSimulateKeyboard = (
  viewId: string,
  keys: string,
  selector?: string | null,
  delay?: number
) => Promise<SimulateKeyboardResult>;

/**
 * 获取交互元素
 *
 * 使用浏览器辅助脚本获取页面中所有可交互的元素（按钮、链接、输入框等）。
 *
 * @param viewId - 视图 ID
 * @param options - 选项
 * @param options.selector - 自定义 CSS 选择器
 * @param options.textQuery - 文本查询（用于查找包含指定文本的元素）
 * @param options.includeCoordinates - 是否包含坐标信息，默认 true
 * @param options.strictVisibility - 是否严格检查可见性，默认 true
 * @param options.types - 要查找的元素类型数组
 * @returns 交互元素数组
 */
export type AutomationGetInteractiveElements = (
  viewId: string,
  options?: GetInteractiveElementsOptions
) => Promise<{
  elements: InteractiveElement[];
}>;

/**
 * 查找包含文本的元素
 *
 * 使用浏览器辅助脚本查找包含指定文本的元素（多层回退策略）。
 *
 * @param viewId - 视图 ID
 * @param textQuery - 要查找的文本
 * @param options - 选项
 * @param options.includeCoordinates - 是否包含坐标信息，默认 true
 * @param options.strictVisibility - 是否严格检查可见性，默认 true
 * @returns 找到的元素数组
 */
export type AutomationFindElementsByText = (
  viewId: string,
  textQuery: string,
  options?: FindElementsByTextOptions
) => Promise<{
  elements: InteractiveElement[];
}>;

// ============================================================================
// Views Channels
// ============================================================================

/**
 * 创建新视图
 *
 * 在 BaseWindow 中创建一个新的 WebContentsView。
 *
 * @param options - 视图创建选项
 * @param options.title - 视图标题
 * @param options.url - 要加载的 URL
 * @param options.bounds - 视图位置和大小
 * @param options.bounds.x - X 坐标（像素）
 * @param options.bounds.y - Y 坐标（像素）
 * @param options.bounds.width - 宽度（像素）
 * @param options.bounds.height - 高度（像素）
 * @param options.visible - 是否可见，默认为 true
 * @returns 创建的视图 ID
 */
export type ViewsCreate = (options?: CreateViewOptions) => Promise<{
  viewId: string;
}>;

/**
 * 移除视图
 *
 * @param viewId - 视图 ID
 * @returns 是否成功移除
 */
export type ViewsRemove = (viewId: string) => Promise<{
  success: boolean;
}>;

/**
 * 获取所有视图
 *
 * @returns 所有视图的信息数组
 */
export type ViewsGetAll = () => Promise<{
  views: ViewInfo[];
}>;

/**
 * 更新视图位置和大小
 *
 * @param viewId - 视图 ID
 * @param bounds - 新的位置和大小（部分更新，未指定的属性保持不变）
 * @param bounds.x - X 坐标（像素，可选）
 * @param bounds.y - Y 坐标（像素，可选）
 * @param bounds.width - 宽度（像素，可选）
 * @param bounds.height - 高度（像素，可选）
 * @returns 更新后的完整边界信息
 */
export type ViewsUpdateBounds = (
  viewId: string,
  bounds: ViewBounds
) => Promise<{
  bounds: Required<ViewBounds>;
}>;

/**
 * 加载 URL
 *
 * @param viewId - 视图 ID
 * @param url - 要加载的 URL
 * @returns 是否成功
 */
export type ViewsLoadURL = (
  viewId: string,
  url: string
) => Promise<{
  success: boolean;
  url: string;
}>;

/**
 * 刷新视图
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type ViewsReload = (viewId: string) => Promise<{
  success: boolean;
}>;

/**
 * 切换开发工具
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type ViewsToggleDevTools = (viewId: string) => Promise<{
  success: boolean;
}>;

/**
 * 设置活动视图
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type ViewsSetActive = (viewId: string) => Promise<{
  success: boolean;
  viewId: string;
}>;

/**
 * 获取活动视图 ID
 *
 * @returns 活动视图 ID（如果没有活动视图则返回 null）
 */
export type ViewsGetActive = () => Promise<{
  id: string | null;
}>;

/**
 * 设置视图显示/隐藏
 *
 * @param viewId - 视图 ID
 * @param visible - 是否可见
 * @returns 是否成功
 */
export type ViewsSetVisible = (
  viewId: string,
  visible: boolean
) => Promise<{
  success: boolean;
}>;

// ============================================================================
// UI Channels
// ============================================================================

/**
 * 显示视图右键菜单
 *
 * @param options - 菜单选项
 * @param options.screenX - 屏幕 X 坐标
 * @param options.screenY - 屏幕 Y 坐标
 * @param options.viewId - 视图 ID
 * @param options.backendId - 后端视图 ID（用于操作目标视图）
 * @returns 是否成功
 */
export type UIShowViewMenu = (options: ShowViewMenuOptions) => Promise<{
  success: boolean;
}>;

/**
 * 显示标签页右键菜单
 *
 * @param options - 菜单选项
 * @param options.screenX - 屏幕 X 坐标
 * @param options.screenY - 屏幕 Y 坐标
 * @param options.viewId - 视图 ID
 * @param options.backendId - 后端视图 ID（用于操作目标视图）
 * @param options.currentIndex - 当前标签页索引
 * @param options.totalCount - 标签页总数
 * @returns 是否成功
 */
export type UIShowTabContextMenu = (
  options: ShowTabContextMenuOptions
) => Promise<{
  success: boolean;
}>;

/**
 * 窗口最小化
 *
 * @returns 是否成功
 */
export type UIWindowMinimize = () => Promise<{
  success: boolean;
  error?: string;
}>;

/**
 * 窗口最大化/还原切换
 *
 * @returns 是否成功
 */
export type UIWindowToggleMaximize = () => Promise<{
  success: boolean;
  error?: string;
}>;

/**
 * 窗口关闭
 *
 * @returns 是否成功
 */
export type UIWindowClose = () => Promise<{
  success: boolean;
  error?: string;
}>;

/**
 * 获取窗口状态
 *
 * @returns 窗口状态
 */
export type UIWindowState = () => Promise<{
  success: boolean;
  data: WindowState;
  error?: string;
}>;

/**
 * 窗口顶置切换
 *
 * @returns 是否成功
 */
export type UIWindowToggleAlwaysOnTop = () => Promise<{
  success: boolean;
  error?: string;
}>;

/**
 * 移动窗口位置
 */
export type UIWindowMove = (params: { x: number; y: number }) => Promise<{
  success: boolean;
  error?: string;
}>;

// ============================================================================
// Browser Channels
// ============================================================================

/**
 * 导航到指定 URL
 *
 * @param viewId - 视图 ID
 * @param url - 要导航到的 URL
 * @returns 是否成功
 */
export type BrowserNavigate = (
  viewId: string,
  url: string
) => Promise<{
  success: boolean;
  url: string;
}>;

/**
 * 获取页面信息
 *
 * @param viewId - 视图 ID
 * @returns 页面信息
 */
export type BrowserGetInfo = (viewId: string) => Promise<BrowserInfo>;

/**
 * 后退
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type BrowserGoBack = (viewId: string) => Promise<{
  success: boolean;
  message?: string;
}>;

/**
 * 前进
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type BrowserGoForward = (viewId: string) => Promise<{
  success: boolean;
  message?: string;
}>;

/**
 * 刷新
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type BrowserReload = (viewId: string) => Promise<{
  success: boolean;
}>;

/**
 * 截图
 *
 * 注意：当前实现只支持 PNG 格式，未使用 format 和 quality 选项。
 *
 * @param viewId - 视图 ID
 * @param options - 截图选项（可选，当前实现未使用）
 * @param options.format - 图片格式，默认 'png'（当前实现固定为 PNG）
 * @param options.quality - 图片质量（仅 JPEG，0-100），默认 90（当前实现未使用）
 * @returns 截图结果（Base64 编码的图片数据）
 */
export type BrowserScreenshot = (
  viewId: string,
  options?: ScreenshotOptions
) => Promise<ScreenshotResult>;

/**
 * 切换开发工具
 *
 * @param viewId - 视图 ID
 * @returns 是否成功
 */
export type BrowserToggleDevTools = (viewId: string) => Promise<{
  success: boolean;
}>;

/**
 * 执行 JavaScript
 *
 * 在页面上下文中执行 JavaScript 代码并返回结果。
 *
 * @param viewId - 视图 ID
 * @param script - JavaScript 代码字符串
 * @returns 执行结果
 */
export type BrowserExecuteScript = (
  viewId: string,
  script: string
) => Promise<{
  result: any;
}>;

/**
 * 设置缩放级别
 *
 * @param viewId - 视图 ID
 * @param zoomFactor - 缩放因子（0.25 到 3.0）
 * @returns 是否成功
 */
export type BrowserSetZoom = (
  viewId: string,
  zoomFactor: number
) => Promise<{
  success: boolean;
  zoomFactor: number;
}>;

/**
 * 获取缩放级别
 *
 * @param viewId - 视图 ID
 * @returns 当前的缩放因子
 */
export type BrowserGetZoom = (viewId: string) => Promise<{
  zoomFactor: number;
}>;

// ============================================================================
// Content Channels
// ============================================================================

/**
 * 获取文本内容（使用 Readability）
 *
 * 使用 Readability 算法提取页面的主要文本内容。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器（可选，用于提取特定元素的文本）
 * @returns 文本内容结果
 */
export type ContentGetTextContent = (
  viewId: string,
  selector?: string | null
) => Promise<TextContentResult>;

/**
 * 获取 HTML 内容
 *
 * 获取页面或指定元素的 HTML 内容。
 *
 * @param viewId - 视图 ID
 * @param selector - CSS 选择器（可选，用于提取特定元素的 HTML）
 * @returns HTML 内容结果
 */
export type ContentGetHtmlContent = (
  viewId: string,
  selector?: string | null
) => Promise<HtmlContentResult>;

/**
 * CDP 获取页面 HTML
 *
 * 使用 Chrome DevTools Protocol 获取完整的页面 HTML。
 *
 * @param viewId - 视图 ID
 * @returns 页面 HTML 内容和长度
 */
export type ContentGetPageContent = (viewId: string) => Promise<{
  html: string;
  length: number;
}>;

/**
 * 提取页面元数据
 *
 * 提取页面的元数据（标题、作者、描述等）。
 *
 * @param viewId - 视图 ID
 * @returns 页面元数据
 */
export type ContentExtractMetadata = (viewId: string) => Promise<PageMetadata>;

/**
 * 执行 JavaScript 并返回结果
 *
 * 在页面上下文中执行 JavaScript 代码并返回结果。
 *
 * @param viewId - 视图 ID
 * @param script - JavaScript 代码字符串
 * @returns 执行结果
 */
export type ContentEvaluate = (
  viewId: string,
  script: string
) => Promise<{
  result: any;
}>;

// ============================================================================
// IPC Channels 映射类型
// ============================================================================

/**
 * 所有 IPC channels 的类型映射
 */
export interface IPCChannels {
  // Network Channels
  "network:startWebRequestCapture": NetworkStartWebRequestCapture;
  "network:stopWebRequestCapture": NetworkStopWebRequestCapture;
  "network:startDebuggerCapture": NetworkStartDebuggerCapture;
  "network:stopDebuggerCapture": NetworkStopDebuggerCapture;
  "network:sendRequest": NetworkSendRequest;
  "network:getStatus": NetworkGetStatus;

  // Automation Channels
  "automation:click": AutomationClick;
  "automation:type": AutomationType;
  "automation:scroll": AutomationScroll;
  "automation:waitForSelector": AutomationWaitForSelector;
  "automation:getText": AutomationGetText;
  "automation:uploadFile": AutomationUploadFile;
  "automation:enhancedClick": AutomationEnhancedClick;
  "automation:fillForm": AutomationFillForm;
  "automation:simulateKeyboard": AutomationSimulateKeyboard;
  "automation:getInteractiveElements": AutomationGetInteractiveElements;
  "automation:findElementsByText": AutomationFindElementsByText;

  // Views Channels
  "views:create": ViewsCreate;
  "views:remove": ViewsRemove;
  "views:getAll": ViewsGetAll;
  "views:updateBounds": ViewsUpdateBounds;
  "views:loadURL": ViewsLoadURL;
  "views:reload": ViewsReload;
  "views:toggleDevTools": ViewsToggleDevTools;
  "views:setActive": ViewsSetActive;
  "views:getActive": ViewsGetActive;
  "views:setVisible": ViewsSetVisible;

  // UI Channels
  "ui:showViewMenu": UIShowViewMenu;
  "ui:showTabContextMenu": UIShowTabContextMenu;
  "ui:window-minimize": UIWindowMinimize;
  "ui:window-toggle-maximize": UIWindowToggleMaximize;
  "ui:window-close": UIWindowClose;
  "ui:window-state": UIWindowState;
  "ui:window-toggle-always-on-top": UIWindowToggleAlwaysOnTop;
  "ui:window-move": UIWindowMove;

  // Browser Channels
  "browser:navigate": BrowserNavigate;
  "browser:getInfo": BrowserGetInfo;
  "browser:goBack": BrowserGoBack;
  "browser:goForward": BrowserGoForward;
  "browser:reload": BrowserReload;
  "browser:screenshot": BrowserScreenshot;
  "browser:toggleDevTools": BrowserToggleDevTools;
  "browser:executeScript": BrowserExecuteScript;
  "browser:setZoom": BrowserSetZoom;
  "browser:getZoom": BrowserGetZoom;

  // Content Channels
  "content:getTextContent": ContentGetTextContent;
  "content:getHtmlContent": ContentGetHtmlContent;
  "content:getPageContent": ContentGetPageContent;
  "content:extractMetadata": ContentExtractMetadata;
  "content:evaluate": ContentEvaluate;
}
