/**
 * Electron 网络监控模块
 * 提供类似 mcp-chrome 的网络监控功能
 * 适配 BaseWindow + WebContentsView 环境
 */

import { session } from 'electron';
import { createLogger } from '../core/logger.js';

const logger = createLogger('services/network-service');

// 静态资源扩展名列表
const STATIC_RESOURCE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
  '.css', '.scss', '.less',
  '.js', '.jsx', '.ts', '.tsx', '.map',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.ogg', '.wav',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
];

// 广告和分析域名列表
const AD_ANALYTICS_DOMAINS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'doubleclick.net',
  'googlesyndication.com',
  'facebook.com/tr',
  'connect.facebook.net',
  'bat.bing.com',
  'analytics.twitter.com',
  'static.hotjar.com',
  'script.hotjar.com',
];

// 静态资源 MIME 类型
const STATIC_MIME_TYPES = [
  'image/',
  'font/',
  'audio/',
  'video/',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/pdf',
  'application/zip',
  'application/octet-stream',
];

// API 响应 MIME 类型
const API_MIME_TYPES = [
  'application/json',
  'application/xml',
  'text/xml',
  'text/plain',
  'application/x-www-form-urlencoded',
  'application/graphql',
];

/**
 * WebRequest 方式的网络捕获（不含响应体）
 */
class WebRequestCapture {
  constructor(webContents) {
    this.webContents = webContents;
    this.session = webContents.session;
    this.isCapturing = false;
    this.captureData = null;
    this.maxCaptureTimer = null;
    this.inactivityTimer = null;
    this.lastActivityTime = 0;
    this.requestCounter = 0;
    this.MAX_REQUESTS = 100;

    // 存储监听器引用以便后续移除
    this.listeners = {
      onBeforeRequest: null,
      onBeforeSendHeaders: null,
      onHeadersReceived: null,
      onCompleted: null,
      onErrorOccurred: null,
    };
  }

  /**
   * 开始捕获
   */
  async start(options = {}) {
    const {
      maxCaptureTime = 180000,        // 默认 3 分钟
      inactivityTimeout = 60000,      // 默认 1 分钟无活动后停止
      includeStatic = false,          // 默认不包含静态资源
    } = options;

    if (this.isCapturing) {
      logger.warn('WebRequest 捕获已在进行中');
      return { success: false, message: '捕获已在进行中' };
    }

    logger.info('开始 WebRequest 网络捕获', { maxCaptureTime, inactivityTimeout, includeStatic });

    this.isCapturing = true;
    this.requestCounter = 0;
    this.captureData = {
      startTime: Date.now(),
      requests: {},
      maxCaptureTime,
      inactivityTimeout,
      includeStatic,
      limitReached: false,
    };

    this.updateLastActivityTime();
    this.setupListeners();

    // 设置最大捕获时间
    if (maxCaptureTime > 0) {
      this.maxCaptureTimer = setTimeout(() => {
        logger.info('达到最大捕获时间，自动停止');
        this.stop();
      }, maxCaptureTime);
    }

    return {
      success: true,
      message: 'WebRequest 网络捕获已启动',
      maxCaptureTime,
      inactivityTimeout,
      includeStatic,
      maxRequests: this.MAX_REQUESTS,
    };
  }

  /**
   * 设置网络请求监听器
   * @returns {void}
   * @description 注册 onBeforeRequest、onBeforeSendHeaders、onHeadersReceived、onCompleted、onErrorOccurred 等监听器
   */
  setupListeners() {
    const filter = { urls: ['<all_urls>'] };

    // onBeforeRequest - 请求发送前
    this.listeners.onBeforeRequest = this.session.webRequest.onBeforeRequest(filter, (details, callback) => {
      if (!this.isCapturing) {
        callback({});
        return;
      }

      if (this.shouldFilterRequest(details.url, this.captureData.includeStatic)) {
        callback({});
        return;
      }

      if (this.requestCounter >= this.MAX_REQUESTS) {
        logger.warn(`达到请求限制 (${this.MAX_REQUESTS})，忽略新请求: ${details.url}`);
        this.captureData.limitReached = true;
        callback({});
        return;
      }

      this.requestCounter++;
      this.updateLastActivityTime();

      const requestId = details.id.toString();
      if (!this.captureData.requests[requestId]) {
        this.captureData.requests[requestId] = {
          requestId,
          url: details.url,
          method: details.method,
          resourceType: details.resourceType,
          requestTime: Date.now(),
          uploadData: details.uploadData ? '[Binary Data]' : undefined,
        };
        logger.info(`✓ WebRequest 捕获 ${this.requestCounter}/${this.MAX_REQUESTS}: ${details.method} ${details.url}`);
      }

      callback({});
    });

    // onBeforeSendHeaders - 发送请求头
    this.listeners.onBeforeSendHeaders = this.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      if (!this.isCapturing) {
        callback({});
        return;
      }

      const requestId = details.id.toString();
      const requestInfo = this.captureData.requests[requestId];

      if (requestInfo && details.requestHeaders) {
        requestInfo.requestHeaders = details.requestHeaders;
        logger.debug(`  → 发送请求头: ${requestInfo.method} ${requestInfo.url}`);
      }

      callback({});
    });

    // onHeadersReceived - 接收响应头
    this.listeners.onHeadersReceived = this.session.webRequest.onHeadersReceived(filter, (details, callback) => {
      if (!this.isCapturing) {
        callback({});
        return;
      }

      const requestId = details.id.toString();
      const requestInfo = this.captureData.requests[requestId];

      if (requestInfo) {
        requestInfo.statusCode = details.statusCode;
        requestInfo.statusLine = details.statusLine;
        requestInfo.responseTime = Date.now();
        requestInfo.responseHeaders = details.responseHeaders;

        // 获取 MIME 类型
        const contentType = details.responseHeaders?.['content-type'] ||
          details.responseHeaders?.['Content-Type'];
        if (contentType) {
          requestInfo.mimeType = Array.isArray(contentType) ? contentType[0] : contentType;
        }

        // 根据 MIME 类型进行二次过滤
        if (requestInfo.mimeType && this.shouldFilterByMimeType(requestInfo.mimeType, this.captureData.includeStatic)) {
          delete this.captureData.requests[requestId];
          if (this.requestCounter > 0) {
            this.requestCounter--;
          }
          logger.info(`✗ 过滤请求 (MIME: ${requestInfo.mimeType}): ${requestInfo.url}`);
        } else {
          logger.info(`  ← 接收响应 ${details.statusCode}: ${requestInfo.url} (${requestInfo.mimeType || '未知'})`);
        }

        this.updateLastActivityTime();
      }

      callback({});
    });

    // onCompleted - 请求完成
    this.listeners.onCompleted = this.session.webRequest.onCompleted(filter, (details) => {
      if (!this.isCapturing) return;

      const requestId = details.id.toString();
      const requestInfo = this.captureData.requests[requestId];

      if (requestInfo) {
        requestInfo.fromCache = details.fromCache;
        const cacheInfo = details.fromCache ? ' [缓存]' : '';
        logger.info(`  ✓ 请求完成${cacheInfo}: ${requestInfo.url}`);
        this.updateLastActivityTime();
      }
    });

    // onErrorOccurred - 请求错误
    this.listeners.onErrorOccurred = this.session.webRequest.onErrorOccurred(filter, (details) => {
      if (!this.isCapturing) return;

      const requestId = details.id.toString();
      const requestInfo = this.captureData.requests[requestId];

      if (requestInfo) {
        requestInfo.errorText = details.error;
        logger.error(`  ✗ 请求失败: ${requestInfo.url} - ${details.error}`);
        this.updateLastActivityTime();
      }
    });
  }

  /**
   * 移除网络请求监听器（WebRequestCapture 类）
   * @returns {void}
   * @description 移除所有已注册的 webRequest 监听器，清理监听器引用
   */
  removeListeners() {
    if (this.listeners.onBeforeRequest) {
      this.session.webRequest.onBeforeRequest(null);
    }
    if (this.listeners.onBeforeSendHeaders) {
      this.session.webRequest.onBeforeSendHeaders(null);
    }
    if (this.listeners.onHeadersReceived) {
      this.session.webRequest.onHeadersReceived(null);
    }
    if (this.listeners.onCompleted) {
      this.session.webRequest.onCompleted(null);
    }
    if (this.listeners.onErrorOccurred) {
      this.session.webRequest.onErrorOccurred(null);
    }

    this.listeners = {
      onBeforeRequest: null,
      onBeforeSendHeaders: null,
      onHeadersReceived: null,
      onCompleted: null,
      onErrorOccurred: null,
    };
  }

  /**
   * 判断是否应该过滤请求
   * @param {string} url - 请求的 URL 地址
   * @param {boolean} includeStatic - 是否包含静态资源
   * @returns {boolean} 如果应该过滤返回 true，否则返回 false
   * @description 过滤规则：1. 广告和分析域名 2. 静态资源扩展名（如果 includeStatic 为 false）
   */
  shouldFilterRequest(url, includeStatic) {
    try {
      const urlObj = new URL(url);

      // 过滤广告和分析域名
      if (AD_ANALYTICS_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }

      // 如果不包含静态资源，根据扩展名过滤
      if (!includeStatic) {
        const path = urlObj.pathname.toLowerCase();
        if (STATIC_RESOURCE_EXTENSIONS.some(ext => path.endsWith(ext))) {
          return true;
        }
      }

      return false;
    } catch (e) {
      logger.error('过滤 URL 时出错', e);
      return false;
    }
  }

  /**
   * 根据 MIME 类型判断是否应该过滤
   * @param {string} mimeType - MIME 类型字符串
   * @param {boolean} includeStatic - 是否包含静态资源
   * @returns {boolean} 如果应该过滤返回 true，否则返回 false
   * @description 过滤规则：始终保留 API 响应类型；如果 includeStatic 为 false，过滤静态资源 MIME 类型和 text/ 类型
   */
  shouldFilterByMimeType(mimeType, includeStatic) {
    if (!mimeType) return false;

    // 始终保留 API 响应类型
    if (API_MIME_TYPES.some(type => mimeType.startsWith(type))) {
      return false;
    }

    // 如果不包含静态资源，过滤静态资源 MIME 类型
    if (!includeStatic) {
      if (STATIC_MIME_TYPES.some(type => mimeType.startsWith(type))) {
        return true;
      }

      // 过滤所有 text/ 类型（除了已在 API_MIME_TYPES 中的）
      if (mimeType.startsWith('text/')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 更新最后活动时间
   * @returns {void}
   * @description 更新最后活动时间戳，并重置无活动计时器
   */
  updateLastActivityTime() {
    this.lastActivityTime = Date.now();

    // 重置非活动计时器
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    if (this.captureData.inactivityTimeout > 0) {
      this.inactivityTimer = setTimeout(() => {
        this.checkInactivity();
      }, this.captureData.inactivityTimeout);
    }
  }

  /**
   * 检查非活动状态
   */
  checkInactivity() {
    if (!this.isCapturing) return;

    const inactiveTime = Date.now() - this.lastActivityTime;

    if (inactiveTime >= this.captureData.inactivityTimeout) {
      logger.info(`无活动 ${inactiveTime}ms，自动停止捕获`);
      this.stop();
    } else {
      const remainingTime = this.captureData.inactivityTimeout - inactiveTime;
      this.inactivityTimer = setTimeout(() => {
        this.checkInactivity();
      }, remainingTime);
    }
  }

  /**
   * 停止捕获网络请求
   * @returns {Promise<Object>} 返回捕获结果对象
   * @returns {boolean} returns.success - 是否成功停止
   * @returns {string} [returns.message] - 结果消息
   * @returns {number} returns.captureStartTime - 捕获开始时间戳
   * @returns {number} returns.captureEndTime - 捕获结束时间戳
   * @returns {number} returns.totalDurationMs - 总捕获时长（毫秒）
   * @returns {Object} returns.settingsUsed - 使用的设置
   * @returns {Object} returns.commonRequestHeaders - 公共请求头（所有请求共有的请求头）
   * @returns {Object} returns.commonResponseHeaders - 公共响应头（所有请求共有的响应头）
   * @returns {Array<Object>} returns.requests - 处理后的请求数组（已移除公共头，只保留特定头）
   * @returns {number} returns.requestCount - 请求数量
   * @returns {number} returns.totalRequestsReceived - 接收到的总请求数
   * @returns {boolean} returns.requestLimitReached - 是否达到请求限制
   */
  async stop() {
    if (!this.isCapturing) {
      return { success: false, message: '没有正在进行的捕获' };
    }

    logger.info('停止 WebRequest 网络捕获');

    this.isCapturing = false;

    // 清理计时器
    if (this.maxCaptureTimer) {
      clearTimeout(this.maxCaptureTimer);
      this.maxCaptureTimer = null;
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // 移除监听器
    this.removeListeners();

    // 处理捕获的数据
    const endTime = Date.now();
    const requestsArray = Object.values(this.captureData.requests);

    // 分析公共请求头和响应头
    const commonRequestHeaders = this.analyzeCommonHeaders(requestsArray, 'requestHeaders');
    const commonResponseHeaders = this.analyzeCommonHeaders(requestsArray, 'responseHeaders');

    // 处理请求数据，移除公共头
    const processedRequests = requestsArray.map(req => {
      const finalReq = { ...req };

      if (finalReq.requestHeaders) {
        finalReq.specificRequestHeaders = this.filterOutCommonHeaders(
          finalReq.requestHeaders,
          commonRequestHeaders
        );
        delete finalReq.requestHeaders;
      }

      if (finalReq.responseHeaders) {
        finalReq.specificResponseHeaders = this.filterOutCommonHeaders(
          finalReq.responseHeaders,
          commonResponseHeaders
        );
        delete finalReq.responseHeaders;
      }

      return finalReq;
    });

    // 按时间排序
    processedRequests.sort((a, b) => (a.requestTime || 0) - (b.requestTime || 0));

    const result = {
      success: true,
      captureStartTime: this.captureData.startTime,
      captureEndTime: endTime,
      totalDurationMs: endTime - this.captureData.startTime,
      settingsUsed: {
        maxCaptureTime: this.captureData.maxCaptureTime,
        inactivityTimeout: this.captureData.inactivityTimeout,
        includeStatic: this.captureData.includeStatic,
        maxRequests: this.MAX_REQUESTS,
      },
      commonRequestHeaders,
      commonResponseHeaders,
      requests: processedRequests,
      requestCount: processedRequests.length,
      totalRequestsReceived: this.requestCounter,
      requestLimitReached: this.captureData.limitReached,
    };

    // 清理数据
    this.captureData = null;
    this.requestCounter = 0;

    return result;
  }

  /**
   * 分析公共请求头或响应头
   * @param {Array<Object>} requests - 请求对象数组
   * @param {string} headerType - 头部类型，'requestHeaders' 或 'responseHeaders'
   * @returns {Object} 返回公共头部对象，键为头部名称（小写），值为头部值（所有请求中值都相同的头部）
   */
  analyzeCommonHeaders(requests, headerType) {
    if (!requests || requests.length === 0) return {};

    const commonHeaders = {};
    const firstRequestWithHeaders = requests.find(req =>
      req[headerType] && Object.keys(req[headerType]).length > 0
    );

    if (!firstRequestWithHeaders || !firstRequestWithHeaders[headerType]) {
      return {};
    }

    const headers = firstRequestWithHeaders[headerType];
    const headerNames = Object.keys(headers);

    // 检查每个头是否在所有请求中都存在且值相同
    for (const name of headerNames) {
      const value = Array.isArray(headers[name]) ? headers[name][0] : headers[name];
      const isCommon = requests.every(req => {
        const reqHeaders = req[headerType];
        if (!reqHeaders) return false;
        const reqValue = Array.isArray(reqHeaders[name]) ? reqHeaders[name][0] : reqHeaders[name];
        return reqValue === value;
      });

      if (isCommon) {
        commonHeaders[name] = value;
      }
    }

    return commonHeaders;
  }

  /**
   * 过滤掉公共头，只保留特定头部（WebRequestCapture 类）
   * @param {Object} headers - 原始头部对象
   * @param {Object} commonHeaders - 公共头部对象（键为头部名称）
   * @returns {Object} 返回过滤后的头部对象，只包含不在公共头部中的头部（或值与公共值不同的头部）
   */
  filterOutCommonHeaders(headers, commonHeaders) {
    if (!headers || typeof headers !== 'object') return {};

    const specificHeaders = {};
    Object.keys(headers).forEach(name => {
      const value = Array.isArray(headers[name]) ? headers[name][0] : headers[name];
      const commonValue = commonHeaders[name];

      if (!(name in commonHeaders) || value !== commonValue) {
        specificHeaders[name] = value;
      }
    });

    return specificHeaders;
  }
}

/**
 * Debugger 方式的网络捕获（包含响应体）
 */
class DebuggerCapture {
  constructor(webContents) {
    this.webContents = webContents;
    this.isCapturing = false;
    this.captureData = null;
    this.maxCaptureTimer = null;
    this.inactivityTimer = null;
    this.lastActivityTime = 0;
    this.requestCounter = 0;
    this.MAX_REQUESTS = 100;
    this.MAX_RESPONSE_BODY_SIZE = 1 * 1024 * 1024; // 1MB
    this.pendingResponseBodies = new Map();

    // 绑定事件处理器
    this.handleDebuggerEvent = this.handleDebuggerEvent.bind(this);
    this.handleDebuggerDetach = this.handleDebuggerDetach.bind(this);
  }

  /**
   * 开始捕获网络请求（Debugger 方式，可获取响应体）
   * @param {Object} [options={}] - 捕获选项
   * @param {number} [options.maxCaptureTime=180000] - 最大捕获时间（毫秒），0 表示无限制，默认 3 分钟
   * @param {number} [options.inactivityTimeout=60000] - 无活动超时时间（毫秒），默认 1 分钟
   * @param {boolean} [options.includeStatic=false] - 是否包含静态资源（图片、CSS、JS 等）
   * @returns {Promise<Object>} 返回启动结果对象
   * @returns {boolean} returns.success - 是否成功启动
   * @returns {string} [returns.message] - 结果消息
   * @returns {number} [returns.maxCaptureTime] - 设置的最大捕获时间
   * @returns {number} [returns.inactivityTimeout] - 设置的无活动超时时间
   * @returns {boolean} [returns.includeStatic] - 是否包含静态资源
   * @returns {number} [returns.maxRequests] - 最大请求数量限制
   */
  async start(options = {}) {
    const {
      maxCaptureTime = 180000,        // 默认 3 分钟
      inactivityTimeout = 60000,      // 默认 1 分钟无活动后停止
      includeStatic = false,          // 默认不包含静态资源
    } = options;

    if (this.isCapturing) {
      logger.warn('Debugger 捕获已在进行中');
      return { success: false, message: '捕获已在进行中' };
    }

    logger.info('开始 Debugger 网络捕获', { maxCaptureTime, inactivityTimeout, includeStatic });

    try {
      // 附加调试器
      if (!this.webContents.debugger.isAttached()) {
        await this.webContents.debugger.attach('1.3');
      }

      // 启用网络域
      await this.webContents.debugger.sendCommand('Network.enable');

      this.isCapturing = true;
      this.requestCounter = 0;
      this.captureData = {
        startTime: Date.now(),
        requests: {},
        maxCaptureTime,
        inactivityTimeout,
        includeStatic,
        limitReached: false,
      };

      this.updateLastActivityTime();

      // 设置事件监听
      this.webContents.debugger.on('message', this.handleDebuggerEvent);
      this.webContents.debugger.on('detach', this.handleDebuggerDetach);

      // 设置最大捕获时间
      if (maxCaptureTime > 0) {
        this.maxCaptureTimer = setTimeout(() => {
          logger.info('达到最大捕获时间，自动停止');
          this.stop(true);
        }, maxCaptureTime);
      }

      return {
        success: true,
        message: 'Debugger 网络捕获已启动',
        maxCaptureTime,
        inactivityTimeout,
        includeStatic,
        maxRequests: this.MAX_REQUESTS,
      };
    } catch (error) {
      logger.error('启动 Debugger 捕获失败', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 处理调试器事件
   * @param {string} event - 事件类型（通常为 'message'）
   * @param {string} method - CDP 方法名（如 'Network.requestWillBeSent'）
   * @param {Object} params - 事件参数对象
   * @returns {void}
   * @description 根据方法名分发到对应的处理方法
   */
  handleDebuggerEvent(event, method, params) {
    if (!this.isCapturing) return;

    this.updateLastActivityTime();

    switch (method) {
      case 'Network.requestWillBeSent':
        this.handleRequestWillBeSent(params);
        break;
      case 'Network.responseReceived':
        this.handleResponseReceived(params);
        break;
      case 'Network.loadingFinished':
        this.handleLoadingFinished(params);
        break;
      case 'Network.loadingFailed':
        this.handleLoadingFailed(params);
        break;
    }
  }

  /**
   * 处理调试器分离事件
   * @param {string} event - 事件类型
   * @param {string} reason - 分离原因
   * @returns {void}
   * @description 当调试器被分离时自动清理资源
   */
  handleDebuggerDetach(event, reason) {
    logger.warn('Debugger 已分离', reason);
    if (this.isCapturing) {
      this.cleanup();
    }
  }

  /**
   * 处理请求将被发送事件
   * @param {Object} params - 事件参数对象
   * @param {string} params.requestId - 请求 ID
   * @param {Object} params.request - 请求对象
   * @param {string} params.request.url - 请求 URL
   * @param {string} params.request.method - 请求方法
   * @param {Object} params.request.headers - 请求头对象
   * @param {string} [params.request.postData] - POST 请求体
   * @param {number} params.timestamp - 时间戳
   * @param {string} [params.type] - 资源类型
   * @returns {void}
   * @description 记录请求信息，进行初步过滤
   */
  handleRequestWillBeSent(params) {
    const { requestId, request, timestamp, type } = params;

    // 初步过滤
    if (this.shouldFilterRequestByUrl(request.url) ||
      this.shouldFilterRequestByExtension(request.url, this.captureData.includeStatic)) {
      return;
    }

    if (this.requestCounter >= this.MAX_REQUESTS) {
      this.captureData.limitReached = true;
      return;
    }

    if (!this.captureData.requests[requestId]) {
      this.captureData.requests[requestId] = {
        requestId,
        url: request.url,
        method: request.method,
        requestHeaders: request.headers,
        requestTime: timestamp * 1000,
        type: type || 'Other',
        status: 'pending',
        requestBody: request.postData,
      };
      logger.info(`✓ Debugger 捕获请求: ${request.method} ${request.url}`);
    }
  }

  /**
   * 处理响应接收事件
   * @param {Object} params - 事件参数对象
   * @param {string} params.requestId - 请求 ID
   * @param {Object} params.response - 响应对象
   * @param {number} params.response.status - HTTP 状态码
   * @param {string} params.response.statusText - HTTP 状态文本
   * @param {Object} params.response.headers - 响应头对象
   * @param {string} params.response.mimeType - MIME 类型
   * @param {number} params.timestamp - 时间戳
   * @param {string} [params.type] - 资源类型
   * @returns {void}
   * @description 更新响应信息，进行 MIME 类型过滤
   */
  handleResponseReceived(params) {
    const { requestId, response, timestamp, type } = params;
    const requestInfo = this.captureData.requests[requestId];

    if (!requestInfo) return;

    // 根据 MIME 类型进行二次过滤
    if (this.shouldFilterByMimeType(response.mimeType, this.captureData.includeStatic)) {
      delete this.captureData.requests[requestId];
      logger.info(`✗ Debugger 过滤请求 (MIME: ${response.mimeType}): ${requestInfo.url}`);
      return;
    }

    // 更新计数器
    const currentStoredCount = Object.keys(this.captureData.requests).length;
    this.requestCounter = currentStoredCount;

    requestInfo.status = response.status === 0 ? 'pending' : 'complete';
    requestInfo.statusCode = response.status;
    requestInfo.statusText = response.statusText;
    requestInfo.responseHeaders = response.headers;
    requestInfo.mimeType = response.mimeType;
    requestInfo.responseTime = timestamp * 1000;
    if (type) requestInfo.type = type;

    logger.info(`  ← Debugger 接收响应 ${response.status}: ${requestInfo.url} (${response.mimeType || '未知'})`);
  }

  /**
   * 处理加载完成事件
   * @param {Object} params - 事件参数对象
   * @param {string} params.requestId - 请求 ID
   * @param {number} params.encodedDataLength - 编码后的数据长度（字节）
   * @returns {Promise<void>}
   * @description 标记请求完成，并尝试获取响应体（如果符合条件）
   */
  async handleLoadingFinished(params) {
    const { requestId, encodedDataLength } = params;
    const requestInfo = this.captureData.requests[requestId];

    if (!requestInfo) return;

    requestInfo.encodedDataLength = encodedDataLength;
    if (requestInfo.status === 'pending') {
      requestInfo.status = 'complete';
    }

    logger.info(`  ✓ Debugger 加载完成: ${requestInfo.url} (${encodedDataLength} 字节)`);

    // 尝试获取响应体
    if (this.shouldCaptureResponseBody(requestInfo)) {
      try {
        const responseBody = await this.getResponseBody(requestId);
        if (responseBody) {
          if (responseBody.body && responseBody.body.length > this.MAX_RESPONSE_BODY_SIZE) {
            requestInfo.responseBody =
              responseBody.body.substring(0, this.MAX_RESPONSE_BODY_SIZE) +
              `\n\n... [响应被截断，总大小: ${responseBody.body.length} 字节] ...`;
            logger.info(`    → 响应体已截断: ${responseBody.body.length} 字节 (限制 ${this.MAX_RESPONSE_BODY_SIZE})`);
          } else {
            requestInfo.responseBody = responseBody.body;
            logger.info(`    → 获取响应体成功: ${responseBody.body.length} 字节`);
          }
          requestInfo.base64Encoded = responseBody.base64Encoded;

          // Debug 模式：打印响应体内容
          if (requestInfo.responseBody) {
            const DEBUG_PRINT_LIMIT = 5000; // Debug 模式下最多打印 5000 个字符
            const bodyToPrint = requestInfo.responseBody.length > DEBUG_PRINT_LIMIT
              ? requestInfo.responseBody.substring(0, DEBUG_PRINT_LIMIT) + `\n\n... [Debug 打印已截断，总大小: ${requestInfo.responseBody.length} 字符] ...`
              : requestInfo.responseBody;

            logger.debug(`    [响应体内容] ${requestInfo.url}:`, bodyToPrint);
          }
        }
      } catch (error) {
        logger.warn(`获取响应体失败 ${requestId}:`, error.message);
      }
    }
  }

  /**
   * 处理加载失败事件
   * @param {Object} params - 事件参数对象
   * @param {string} params.requestId - 请求 ID
   * @param {string} params.errorText - 错误文本
   * @param {string} [params.type] - 资源类型
   * @returns {void}
   * @description 标记请求失败状态
   */
  handleLoadingFailed(params) {
    const { requestId, errorText, canceled, type } = params;
    const requestInfo = this.captureData.requests[requestId];

    if (!requestInfo) return;

    requestInfo.status = 'error';
    requestInfo.errorText = errorText;
    requestInfo.canceled = canceled;
    if (type) requestInfo.type = type;

    const cancelInfo = canceled ? ' [已取消]' : '';
    logger.error(`  ✗ Debugger 加载失败${cancelInfo}: ${requestInfo.url} - ${errorText}`);
  }

  /**
   * 获取响应体
   * @param {string} requestId - 请求 ID
   * @returns {Promise<Object|null>} 返回响应体对象，如果获取失败返回 null
   * @returns {string} returns.body - 响应体内容（如果是 base64 编码会自动解码）
   * @returns {boolean} returns.base64Encoded - 响应体是否为 base64 编码
   * @description 使用 CDP 的 Network.getResponseBody 命令获取响应体，支持去重以避免重复请求
   */
  async getResponseBody(requestId) {
    const pendingKey = requestId;

    if (this.pendingResponseBodies.has(pendingKey)) {
      return this.pendingResponseBodies.get(pendingKey);
    }

    const responseBodyPromise = (async () => {
      try {
        if (!this.webContents.debugger.isAttached()) {
          throw new Error('Debugger 未附加');
        }

        const result = await this.webContents.debugger.sendCommand(
          'Network.getResponseBody',
          { requestId }
        );
        return result;
      } finally {
        this.pendingResponseBodies.delete(pendingKey);
      }
    })();

    this.pendingResponseBodies.set(pendingKey, responseBodyPromise);
    return responseBodyPromise;
  }

  /**
   * 判断是否应该捕获响应体
   * @param {Object} requestInfo - 请求信息对象
   * @param {string} requestInfo.mimeType - MIME 类型
   * @param {string} requestInfo.url - 请求 URL
   * @returns {boolean} 如果应该捕获响应体返回 true，否则返回 false
   * @description 捕获规则：1. API MIME 类型 2. URL 包含 API 关键词的请求（但排除静态资源）
   */
  shouldCaptureResponseBody(requestInfo) {
    const mimeType = requestInfo.mimeType || '';

    // 优先捕获 API MIME 类型
    if (API_MIME_TYPES.some(type => mimeType.startsWith(type))) {
      return true;
    }

    // 根据 URL 启发式判断是否为 API 调用
    const url = requestInfo.url.toLowerCase();
    if (/\/(api|service|rest|graphql|query|data|rpc|v[0-9]+)\//i.test(url) ||
      url.includes('.json') ||
      url.includes('json=') ||
      url.includes('format=json')) {

      if (mimeType && STATIC_MIME_TYPES.some(type => mimeType.startsWith(type))) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 根据 URL 判断是否应该过滤请求（DebuggerCapture 类）
   * @param {string} url - 请求 URL
   * @returns {boolean} 如果应该过滤返回 true，否则返回 false
   * @description 过滤规则：包含广告和分析域名
   */
  shouldFilterRequestByUrl(url) {
    try {
      const urlObj = new URL(url);
      if (AD_ANALYTICS_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 根据扩展名判断是否应该过滤请求
   * @param {string} url - 请求 URL
   * @param {boolean} includeStatic - 是否包含静态资源
   * @returns {boolean} 如果应该过滤返回 true，否则返回 false
   * @description 如果 includeStatic 为 false，过滤静态资源扩展名
   */
  shouldFilterRequestByExtension(url, includeStatic) {
    if (includeStatic) return false;

    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      if (STATIC_RESOURCE_EXTENSIONS.some(ext => path.endsWith(ext))) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * 根据 MIME 类型判断是否应该过滤（DebuggerCapture 类）
   * @param {string} mimeType - MIME 类型字符串
   * @param {boolean} includeStatic - 是否包含静态资源
   * @returns {boolean} 如果应该过滤返回 true，否则返回 false
   * @description 过滤规则：始终保留 API MIME 类型；如果 includeStatic 为 false，过滤静态资源 MIME 类型
   */
  shouldFilterByMimeType(mimeType, includeStatic) {
    if (!mimeType) return false;

    if (API_MIME_TYPES.some(type => mimeType.startsWith(type))) {
      return false;
    }

    if (!includeStatic) {
      if (STATIC_MIME_TYPES.some(type => mimeType.startsWith(type))) {
        return true;
      }
    }

    return false;
  }

  /**
   * 更新最后活动时间（DebuggerCapture 类）
   * @returns {void}
   * @description 更新最后活动时间戳，并重置无活动计时器
   */
  updateLastActivityTime() {
    this.lastActivityTime = Date.now();

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    if (this.captureData.inactivityTimeout > 0) {
      this.inactivityTimer = setTimeout(() => {
        this.checkInactivity();
      }, this.captureData.inactivityTimeout);
    }
  }

  /**
   * 检查非活动状态（DebuggerCapture 类）
   * @returns {void}
   * @description 检查是否达到无活动超时时间，如果达到则自动停止捕获
   */
  checkInactivity() {
    if (!this.isCapturing) return;

    const inactiveTime = Date.now() - this.lastActivityTime;

    if (inactiveTime >= this.captureData.inactivityTimeout) {
      logger.info(`无活动 ${inactiveTime}ms，自动停止捕获`);
      this.stop(true);
    } else {
      const remainingTime = this.captureData.inactivityTimeout - inactiveTime;
      this.inactivityTimer = setTimeout(() => {
        this.checkInactivity();
      }, remainingTime);
    }
  }

  /**
   * 清理资源（DebuggerCapture 类）
   * @returns {void}
   * @description 清理所有计时器、待处理的响应体和捕获数据
   */
  cleanup() {
    if (this.maxCaptureTimer) {
      clearTimeout(this.maxCaptureTimer);
      this.maxCaptureTimer = null;
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.pendingResponseBodies.clear();
    this.captureData = null;
    this.requestCounter = 0;
    this.isCapturing = false;
  }

  /**
   * 停止捕获网络请求（DebuggerCapture 类）
   * @param {boolean} [isAutoStop=false] - 是否为自动停止（超时或非活动触发）
   * @returns {Promise<Object>} 返回捕获结果对象
   * @returns {boolean} returns.success - 是否成功停止
   * @returns {string} [returns.message] - 结果消息
   * @returns {number} returns.captureStartTime - 捕获开始时间戳
   * @returns {number} returns.captureEndTime - 捕获结束时间戳
   * @returns {number} returns.totalDurationMs - 总捕获时长（毫秒）
   * @returns {Object} returns.commonRequestHeaders - 公共请求头
   * @returns {Object} returns.commonResponseHeaders - 公共响应头
   * @returns {Array<Object>} returns.requests - 处理后的请求数组（包含响应体，已移除公共头）
   * @returns {number} returns.requestCount - 请求数量
   * @returns {number} returns.totalRequestsReceivedBeforeLimit - 限制前的总请求数
   * @returns {boolean} returns.requestLimitReached - 是否达到请求限制
   * @returns {string} returns.stoppedBy - 停止原因：'user_request'、'inactivity_timeout' 或 'max_capture_time'
   */
  async stop(isAutoStop = false) {
    if (!this.isCapturing) {
      return { success: false, message: '没有正在进行的捕获' };
    }

    logger.info('停止 Debugger 网络捕获', { isAutoStop });

    this.isCapturing = false;

    // 移除事件监听
    this.webContents.debugger.removeListener('message', this.handleDebuggerEvent);
    this.webContents.debugger.removeListener('detach', this.handleDebuggerDetach);

    // 禁用网络域并分离调试器
    try {
      if (this.webContents.debugger.isAttached()) {
        await this.webContents.debugger.sendCommand('Network.disable');
        await this.webContents.debugger.detach();
      }
    } catch (error) {
      logger.warn('分离 Debugger 时出错', error);
    }

    // 处理捕获的数据
    const endTime = Date.now();
    const requestsArray = Object.values(this.captureData.requests);

    // 分析公共请求头和响应头
    const commonRequestHeaders = this.analyzeCommonHeaders(requestsArray, 'requestHeaders');
    const commonResponseHeaders = this.analyzeCommonHeaders(requestsArray, 'responseHeaders');

    // 处理请求数据，移除公共头
    const processedRequests = requestsArray.map(req => {
      const finalReq = { ...req };

      if (finalReq.requestHeaders) {
        finalReq.specificRequestHeaders = this.filterOutCommonHeaders(
          finalReq.requestHeaders,
          commonRequestHeaders
        );
        delete finalReq.requestHeaders;
      } else {
        finalReq.specificRequestHeaders = {};
      }

      if (finalReq.responseHeaders) {
        finalReq.specificResponseHeaders = this.filterOutCommonHeaders(
          finalReq.responseHeaders,
          commonResponseHeaders
        );
        delete finalReq.responseHeaders;
      } else {
        finalReq.specificResponseHeaders = {};
      }

      return finalReq;
    });

    // 按时间排序
    processedRequests.sort((a, b) => (a.requestTime || 0) - (b.requestTime || 0));

    const result = {
      success: true,
      captureStartTime: this.captureData.startTime,
      captureEndTime: endTime,
      totalDurationMs: endTime - this.captureData.startTime,
      commonRequestHeaders,
      commonResponseHeaders,
      requests: processedRequests,
      requestCount: processedRequests.length,
      totalRequestsReceivedBeforeLimit: this.captureData.limitReached ?
        this.MAX_REQUESTS : processedRequests.length,
      requestLimitReached: this.captureData.limitReached,
      stoppedBy: isAutoStop ?
        (this.lastActivityTime ? 'inactivity_timeout' : 'max_capture_time') :
        'user_request',
    };

    // 清理
    this.cleanup();

    return result;
  }

  /**
   * 分析公共请求头或响应头（DebuggerCapture 类）
   * @param {Array<Object>} requests - 请求对象数组
   * @param {string} headerTypeKey - 头部类型键名（'requestHeaders' 或 'responseHeaders'）
   * @returns {Object} 返回公共头部对象，键为头部名称，值为头部值（所有请求中值都相同的头部）
   * @description 使用 Map 统计头部值出现次数，找出在所有请求中都出现且值相同的头部
   */
  analyzeCommonHeaders(requests, headerTypeKey) {
    if (!requests || requests.length === 0) return {};

    const headerValueCounts = new Map();
    let requestsWithHeadersCount = 0;

    for (const req of requests) {
      const headers = req[headerTypeKey];
      if (headers && Object.keys(headers).length > 0) {
        requestsWithHeadersCount++;
        for (const name in headers) {
          const lowerName = name.toLowerCase();
          const value = headers[name];
          if (!headerValueCounts.has(lowerName)) {
            headerValueCounts.set(lowerName, new Map());
          }
          const values = headerValueCounts.get(lowerName);
          values.set(value, (values.get(value) || 0) + 1);
        }
      }
    }

    if (requestsWithHeadersCount === 0) return {};

    const commonHeaders = {};
    headerValueCounts.forEach((values, name) => {
      values.forEach((count, value) => {
        if (count === requestsWithHeadersCount) {
          let originalName = name;
          for (const req of requests) {
            const hdrs = req[headerTypeKey];
            if (hdrs) {
              const foundName = Object.keys(hdrs).find(k => k.toLowerCase() === name);
              if (foundName) {
                originalName = foundName;
                break;
              }
            }
          }
          commonHeaders[originalName] = value;
        }
      });
    });

    return commonHeaders;
  }

  /**
   * 过滤掉公共头
   */
  filterOutCommonHeaders(headers, commonHeaders) {
    if (!headers || typeof headers !== 'object') return {};

    const specificHeaders = {};
    const commonHeadersLower = {};

    Object.keys(commonHeaders).forEach(commonName => {
      commonHeadersLower[commonName.toLowerCase()] = commonHeaders[commonName];
    });

    Object.keys(headers).forEach(name => {
      const lowerName = name.toLowerCase();
      if (!(lowerName in commonHeadersLower) || headers[name] !== commonHeadersLower[lowerName]) {
        specificHeaders[name] = headers[name];
      }
    });

    return specificHeaders;
  }
}

/**
 * 网络请求发送器
 */
class NetworkRequest {
  constructor(webContents) {
    this.webContents = webContents;
  }

  /**
   * 发送网络请求
   * @param {Object} [options={}] - 请求选项
   * @param {string} options.url - 请求 URL（必需）
   * @param {string} [options.method='GET'] - HTTP 请求方法
   * @param {Object} [options.headers={}] - 请求头对象
   * @param {string|Object} [options.body] - 请求体（POST/PUT 等请求）
   * @param {number} [options.timeout=30000] - 请求超时时间（毫秒），默认 30 秒
   * @returns {Promise<Object>} 返回请求结果对象
   * @returns {boolean} returns.success - 请求是否成功
   * @returns {Object} [returns.response] - 响应对象（如果请求成功）
   * @returns {number} returns.response.status - HTTP 状态码
   * @returns {string} returns.response.statusText - HTTP 状态文本
   * @returns {Object} returns.response.headers - 响应头对象
   * @returns {string|Object} returns.response.body - 响应体（根据 Content-Type 自动解析为 JSON 或文本）
   * @returns {string} [returns.error] - 错误信息（如果请求失败）
   * @description 在页面上下文中使用 fetch API 发送请求，支持超时控制
   */
  async send(options = {}) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = options;

    if (!url) {
      return { success: false, error: 'URL 参数是必需的' };
    }

    logger.info('发送网络请求', { url, method, headers });

    try {
      // 在页面上下文中执行 fetch 请求
      const result = await this.webContents.executeJavaScript(`
        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), ${timeout});

            const options = {
              method: '${method}',
              headers: ${JSON.stringify(headers)},
              signal: controller.signal,
            };

            ${body ? `options.body = ${JSON.stringify(body)};` : ''}

            const response = await fetch('${url}', options);
            clearTimeout(timeoutId);

            const responseHeaders = {};
            response.headers.forEach((value, key) => {
              responseHeaders[key] = value;
            });

            let responseBody;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              responseBody = await response.json();
            } else {
              responseBody = await response.text();
            }

            return {
              success: true,
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody,
              url: response.url,
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
            };
          }
        })()
      `);

      return result;
    } catch (error) {
      logger.error('发送网络请求失败', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * 网络监控管理器
 */
export class NetworkMonitor {
  constructor(webContents) {
    this.webContents = webContents;
    this.webRequestCapture = new WebRequestCapture(webContents);
    this.debuggerCapture = new DebuggerCapture(webContents);
    this.networkRequest = new NetworkRequest(webContents);
  }

  /**
   * 开始 WebRequest 捕获（不含响应体）
   * @param {Object} [options={}] - 捕获选项，参考 WebRequestCapture.start 方法的参数
   * @returns {Promise<Object>} 返回启动结果，参考 WebRequestCapture.start 方法的返回值
   * @description 使用 Electron 的 webRequest API 捕获网络请求，不包含响应体但性能更好
   */
  async startWebRequestCapture(options) {
    return this.webRequestCapture.start(options);
  }

  /**
   * 停止 WebRequest 捕获
   * @returns {Promise<Object>} 返回捕获结果，参考 WebRequestCapture.stop 方法的返回值
   */
  async stopWebRequestCapture() {
    return this.webRequestCapture.stop();
  }

  /**
   * 开始 Debugger 捕获（包含响应体）
   * @param {Object} [options={}] - 捕获选项，参考 DebuggerCapture.start 方法的参数
   * @returns {Promise<Object>} 返回启动结果，参考 DebuggerCapture.start 方法的返回值
   * @description 使用 Chrome DevTools Protocol 捕获网络请求，可获取响应体但性能略差
   */
  async startDebuggerCapture(options) {
    return this.debuggerCapture.start(options);
  }

  /**
   * 停止 Debugger 捕获
   * @returns {Promise<Object>} 返回捕获结果，参考 DebuggerCapture.stop 方法的返回值
   */
  async stopDebuggerCapture() {
    return this.debuggerCapture.stop();
  }

  /**
   * 发送网络请求
   * @param {Object} [options={}] - 请求选项，参考 NetworkRequest.send 方法的参数
   * @returns {Promise<Object>} 返回请求结果，参考 NetworkRequest.send 方法的返回值
   * @description 在页面上下文中发送网络请求
   */
  async sendRequest(options) {
    return this.networkRequest.send(options);
  }

  /**
   * 获取网络监控状态
   * @returns {Object} 返回状态对象
   * @returns {boolean} returns.webRequestCapturing - WebRequest 是否正在捕获
   * @returns {boolean} returns.debuggerCapturing - Debugger 是否正在捕获
   */
  getStatus() {
    return {
      webRequestCapturing: this.webRequestCapture.isCapturing,
      debuggerCapturing: this.debuggerCapture.isCapturing,
    };
  }
}

export default NetworkMonitor;

