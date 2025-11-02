// src/services/cdp-service.js
// 基于 Chrome DevTools Protocol 的自动化服务

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../core/logger.js';

const logger = createLogger('services/cdp-service');

// 获取当前文件的目录名
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * CDP 服务类
 */
class CDPService {
  constructor(webContents) {
    this.webContents = webContents;
  }

  /**
   * 确保 CDP 调试器已附加
   */
  async ensureDebuggerAttached() {
    if (!this.webContents.debugger.isAttached()) {
      try {
        await this.webContents.debugger.attach('1.3');
        logger.debug('CDP 调试器已附加');
      } catch (error) {
        logger.error('附加 CDP 调试器失败', error);
        throw error;
      }
    }
  }

  /**
   * 获取元素的位置信息
   */
  async getElementRect(selector) {
    await this.ensureDebuggerAttached();

    await this.webContents.debugger.sendCommand('DOM.enable');
    await this.webContents.debugger.sendCommand('Runtime.enable');

    const { root } = await this.webContents.debugger.sendCommand('DOM.getDocument');
    const { nodeId } = await this.webContents.debugger.sendCommand('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: selector
    });

    if (!nodeId) {
      throw new Error(`元素未找到: ${selector}`);
    }

    const { model } = await this.webContents.debugger.sendCommand('DOM.getBoxModel', {
      nodeId: nodeId
    });

    const [x1, y1, x2, y2, x3, y3, x4, y4] = model.content;
    const x = (x1 + x3) / 2;
    const y = (y1 + y3) / 2;

    return {
      nodeId,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(x3 - x1),
      height: Math.round(y3 - y1)
    };
  }

  /**
   * CDP 真实点击
   */
  async click(selector) {
    logger.debug('CDP 真实点击', { selector });

    try {
      await this.ensureDebuggerAttached();
      const rect = await this.getElementRect(selector);
      logger.debug('元素位置', rect);

      const { x, y } = rect;

      // 鼠标移动
      await this.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x,
        y: y,
        button: 'left',
        clickCount: 0
      });

      await sleep(50);

      // 鼠标按下
      await this.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: x,
        y: y,
        button: 'left',
        clickCount: 1
      });

      await sleep(30);

      // 鼠标释放
      await this.webContents.debugger.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: x,
        y: y,
        button: 'left',
        clickCount: 1
      });

      logger.info('CDP 真实点击成功', { selector });
      return true;
    } catch (error) {
      logger.error('CDP 点击失败', error);
      throw error;
    }
  }

  /**
   * CDP 真实输入
   */
  async type(selector, text) {
    logger.debug('CDP 真实输入', { selector, text });

    try {
      await this.ensureDebuggerAttached();
      await this.click(selector);
      await sleep(100);

      // 清空现有内容
      await this.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'a',
        code: 'KeyA',
        windowsVirtualKeyCode: 65,
        nativeVirtualKeyCode: 65,
        modifiers: 2
      });

      await this.webContents.debugger.sendCommand('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'a',
        code: 'KeyA',
        windowsVirtualKeyCode: 65,
        nativeVirtualKeyCode: 65,
        modifiers: 2
      });

      await sleep(50);

      // 逐字符输入
      for (const char of text) {
        await this.webContents.debugger.sendCommand('Input.insertText', {
          text: char
        });
        await sleep(50 + Math.random() * 100);
      }

      logger.info('CDP 真实输入成功', { selector, text });
      return true;
    } catch (error) {
      logger.error('CDP 输入失败', error);
      throw error;
    }
  }

  /**
   * CDP 滚动页面
   */
  async scroll(x, y) {
    logger.debug('CDP 滚动', { x, y });

    try {
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('Runtime.enable');

      await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: `window.scrollTo(${x}, ${y})`,
        userGesture: true
      });

      logger.info('CDP 滚动成功', { x, y });
      return true;
    } catch (error) {
      logger.error('CDP 滚动失败', error);
      throw error;
    }
  }

  /**
   * CDP 获取元素文本
   */
  async getText(selector) {
    logger.debug('CDP 获取文本', { selector });

    try {
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('Runtime.enable');

      const result = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: `document.querySelector('${selector}')?.textContent`,
        returnByValue: true
      });

      return result.result.value;
    } catch (error) {
      logger.error('CDP 获取文本失败', error);
      throw error;
    }
  }

  /**
   * CDP 等待选择器
   */
  async waitForSelector(selector, timeout = 5000) {
    logger.debug('CDP 等待选择器', { selector, timeout });

    try {
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('DOM.enable');

      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        try {
          const { root } = await this.webContents.debugger.sendCommand('DOM.getDocument');
          const { nodeId } = await this.webContents.debugger.sendCommand('DOM.querySelector', {
            nodeId: root.nodeId,
            selector: selector
          });

          if (nodeId) {
            logger.info('CDP 元素已出现', { selector });
            return true;
          }
        } catch (error) {
          // 继续等待
        }

        await sleep(100);
      }

      throw new Error(`等待超时: ${selector}`);
    } catch (error) {
      logger.error('CDP 等待选择器失败', error);
      throw error;
    }
  }

  /**
   * CDP 执行 JavaScript
   */
  async evaluate(script) {
    logger.debug('CDP 执行 JavaScript', { script: script.substring(0, 100) });

    try {
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('Runtime.enable');

      const result = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true,
        userGesture: true
      });

      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
      }

      logger.info('CDP 执行成功');
      return result.result.value;
    } catch (error) {
      logger.error('CDP 执行失败', error);
      throw error;
    }
  }

  /**
   * CDP 获取页面 HTML
   */
  async getContent() {
    logger.debug('CDP 获取页面内容');

    try {
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('DOM.enable');

      const { root } = await this.webContents.debugger.sendCommand('DOM.getDocument');
      const { outerHTML } = await this.webContents.debugger.sendCommand('DOM.getOuterHTML', {
        nodeId: root.nodeId
      });

      logger.info('CDP 获取页面内容成功', { length: outerHTML.length });
      return outerHTML;
    } catch (error) {
      logger.error('CDP 获取页面内容失败', error);
      throw error;
    }
  }

  /**
   * CDP 文件上传
   */
  async uploadFile(selector, filePath) {
    logger.debug('CDP 文件上传', { selector, filePath });

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(filePath);
      const fileSize = (fileStats.size / 1024).toFixed(2);

      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('DOM.enable');

      const { root } = await this.webContents.debugger.sendCommand('DOM.getDocument');
      const { nodeId } = await this.webContents.debugger.sendCommand('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: selector
      });

      if (!nodeId) {
        throw new Error(`文件输入框未找到: ${selector}`);
      }

      await this.webContents.debugger.sendCommand('DOM.setFileInputFiles', {
        files: [filePath],
        nodeId: nodeId
      });

      logger.info('CDP 文件上传成功', { filePath, fileName, fileSize: fileSize + ' KB' });
      return true;
    } catch (error) {
      logger.error('CDP 文件上传失败', error);
      throw error;
    }
  }

  /**
   * 注入浏览器辅助脚本
   */
  async injectBrowserHelpers() {
    try {
      const helperScript = fs.readFileSync(
        path.join(__dirname, '../utils/browser-helpers.js'),
        'utf-8'
      );

      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('Runtime.enable');

      const checkResult = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: 'typeof window.__browserHelpers !== "undefined"',
        returnByValue: true
      });

      if (checkResult.result.value === true) {
        logger.debug('浏览器辅助脚本已注入');
        return true;
      }

      const wrappedScript = `
(function() {
  try {
    ${helperScript}
    return { success: true, hasHelpers: typeof window.__browserHelpers !== 'undefined' };
  } catch (error) {
    return { success: false, error: error.message, stack: error.stack };
  }
})()
`;

      const result = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: wrappedScript,
        returnByValue: true,
        userGesture: true
      });

      if (result.exceptionDetails) {
        const error = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
        throw new Error(`脚本注入异常: ${error}`);
      }

      const returnValue = result.result.value;
      if (!returnValue.success) {
        throw new Error(`脚本执行失败: ${returnValue.error}\n${returnValue.stack || ''}`);
      }

      if (!returnValue.hasHelpers) {
        throw new Error('脚本执行成功但 window.__browserHelpers 未创建');
      }

      const verifyResult = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: 'typeof window.__browserHelpers',
        returnByValue: true
      });

      logger.info('浏览器辅助脚本注入成功', {
        helpersType: verifyResult.result.value
      });

      return true;
    } catch (error) {
      logger.error('注入浏览器辅助脚本失败', error);
      throw error;
    }
  }

  /**
   * 调用浏览器辅助函数
   */
  async callBrowserHelper(functionName, ...args) {
    try {
      await this.injectBrowserHelpers();
      await this.ensureDebuggerAttached();
      await this.webContents.debugger.sendCommand('Runtime.enable');

      const checkExpression = `typeof window.__browserHelpers?.${functionName}`;
      const checkResult = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: checkExpression,
        returnByValue: true
      });

      if (checkResult.result.value !== 'function') {
        throw new Error(`浏览器辅助函数 ${functionName} 不存在或不是函数（类型: ${checkResult.result.value}）`);
      }

      const argsJson = JSON.stringify(args);
      const expression = `window.__browserHelpers.${functionName}(...${argsJson})`;

      logger.debug('调用浏览器辅助函数', { functionName, args });

      const result = await this.webContents.debugger.sendCommand('Runtime.evaluate', {
        expression: expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true
      });

      if (result.exceptionDetails) {
        const exceptionText = result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text ||
          '未知异常';
        const lineNumber = result.exceptionDetails.lineNumber || '?';
        const columnNumber = result.exceptionDetails.columnNumber || '?';
        const stackTrace = result.exceptionDetails.stackTrace?.callFrames?.map(frame =>
          `  at ${frame.functionName || '<anonymous>'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`
        ).join('\n') || '';

        const fullError = `浏览器端异常: ${exceptionText}\n位置: 行 ${lineNumber}, 列 ${columnNumber}\n${stackTrace}`;
        logger.error(`${functionName} 执行异常`, fullError);
        throw new Error(fullError);
      }

      return result.result.value;
    } catch (error) {
      logger.error(`调用浏览器辅助函数 ${functionName} 失败`, error);
      throw error;
    }
  }

  // ========== 使用浏览器辅助脚本的增强功能 ==========

  /**
   * 增强版点击
   */
  async enhancedClick(selector, options = {}) {
    logger.debug('增强版点击', { selector, options });

    try {
      const result = await this.callBrowserHelper(
        'clickElement',
        selector,
        options.waitForNavigation || false,
        options.timeout || 5000,
        options.coordinates || null
      );

      if (result.error) {
        throw new Error(result.error);
      }

      logger.info('增强版点击成功', { selector });
      return result;
    } catch (error) {
      logger.error('增强版点击失败', error);
      throw error;
    }
  }

  /**
   * 表单填充
   */
  async fillForm(selector, value) {
    logger.debug('表单填充', { selector, value });

    try {
      const result = await this.callBrowserHelper('fillElement', selector, value);

      if (result.error) {
        throw new Error(result.error);
      }

      logger.info('表单填充成功', { selector });
      return result;
    } catch (error) {
      logger.error('表单填充失败', error);
      throw error;
    }
  }

  /**
   * 键盘输入模拟
   */
  async simulateKeyboard(keys, selector = null, delay = 0) {
    logger.debug('键盘输入模拟', { keys, selector, delay });

    try {
      const result = await this.callBrowserHelper(
        'simulateKeyboard',
        keys,
        selector,
        delay
      );

      if (!result.success) {
        throw new Error(result.error || '键盘输入模拟失败');
      }

      logger.info('键盘输入模拟成功', { keys });
      return result;
    } catch (error) {
      logger.error('键盘输入模拟失败', error);
      throw error;
    }
  }

  /**
   * 获取交互元素
   */
  async getInteractiveElements(options = {}) {
    logger.debug('获取交互元素', options);

    try {
      // 确保所有 options 参数都正确传递，包括新增的参数
      const result = await this.callBrowserHelper('getInteractiveElements', options);

      if (!result || !result.success) {
        throw new Error(result?.error || '获取交互元素失败');
      }

      const elements = result.elements || [];
      logger.info(`找到 ${elements.length} 个交互元素`);
      return elements;
    } catch (error) {
      logger.error('获取交互元素失败', error);
      throw error;
    }
  }

  /**
   * 查找包含文本的元素
   */
  async findElementsByText(textQuery, options = {}) {
    logger.debug('查找包含文本的元素', { textQuery, options });

    try {
      // 确保所有 options 参数都正确传递，包括新增的参数
      const result = await this.callBrowserHelper(
        'findElementsByTextWithFallback',
        { textQuery, ...options }
      );

      logger.info(`找到 ${result.length} 个包含文本的元素`);
      return result;
    } catch (error) {
      logger.error('查找包含文本的元素失败', error);
      throw error;
    }
  }

  /**
   * 发送网络请求
   */
  async sendNetworkRequest(url, method = 'GET', headers = {}, body = null, timeout = 30000) {
    logger.debug('发送网络请求', { url, method });

    try {
      const result = await this.callBrowserHelper(
        'sendNetworkRequest',
        url,
        method,
        headers,
        body,
        timeout
      );

      if (!result.success) {
        throw new Error(result.error || '网络请求失败');
      }

      logger.info('网络请求成功', { url, status: result.response.status });
      return result;
    } catch (error) {
      logger.error('网络请求失败', error);
      throw error;
    }
  }

  /**
   * 获取文本内容（使用 Readability）
   */
  async getTextContent(selector = null) {
    logger.debug('获取文本内容', { selector });

    try {
      const result = await this.callBrowserHelper('getTextContent', selector);
      if (result.success) {
        const textLength = result.textContent?.length || 0;
        logger.info(`文本内容提取成功: ${textLength} 字符`);
      }
      return result;
    } catch (error) {
      logger.error('获取文本内容失败', error);
      throw error;
    }
  }

  /**
   * 获取 HTML 内容
   */
  async getHtmlContent(selector = null) {
    logger.debug('获取 HTML 内容', { selector });

    try {
      const result = await this.callBrowserHelper('getHtmlContent', selector);
      if (result.success) {
        const htmlLength = result.htmlContent?.length || 0;
        logger.info(`HTML 内容提取成功: ${htmlLength} 字符`);
      }
      return result;
    } catch (error) {
      logger.error('获取 HTML 内容失败', error);
      throw error;
    }
  }

  /**
   * 提取页面元数据
   */
  async extractPageMetadata() {
    logger.debug('提取页面元数据');

    try {
      const metadata = await this.callBrowserHelper('extractPageMetadata');
      logger.info('元数据提取成功', {
        title: metadata.title,
        author: metadata.author,
        siteName: metadata.siteName
      });
      return metadata;
    } catch (error) {
      logger.error('提取元数据失败', error);
      throw error;
    }
  }
}

export { CDPService };

