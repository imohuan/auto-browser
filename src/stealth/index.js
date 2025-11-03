// src/stealth/index.js
// 反检测（Stealth）统一配置

import { createLogger } from '../core/logger.js';

const logger = createLogger('stealth');

const DEFAULT_CHROME_VERSION = '120.0.0.0';

const configuredSessions = new WeakSet();
const patchedWebContents = new WeakSet();

const COMMAND_SWITCHES = [
  // 禁用 Blink 的 "AutomationControlled" 特性，去除 window.navigator.webdriver 等特征（使页面更难检测自动化环境）
  { name: 'disable-blink-features', value: 'AutomationControlled' },

  // 禁用部分 Blink 特性（如 IsolateOrigins、site-per-process、OutOfBlinkCors），防止站点隔离影响自动化脚本注入
  { name: 'disable-features', value: 'IsolateOrigins,site-per-process,OutOfBlinkCors' },

  // 禁止启用站点隔离相关试验，进一步避免自动化受限
  { name: 'disable-site-isolation-trials' },

  // 显式启用 NetworkService 相关特性，可能有助于绕过某些自动化检测机制
  { name: 'enable-features', value: 'NetworkService,NetworkServiceInProcess' },

  // 禁用 Chrome 内置的自动化标记，有助于隐藏自动化身份
  { name: 'disable-automation' },

  // 禁用 /dev/shm 临时存储使用（防止在部分 Linux 环境下内存共享不足导致崩溃）
  { name: 'disable-dev-shm-usage' },

  // 设置默认窗口大小（1920x1080），让环境更接近常见桌面分辨率，减少被检测风险
  { name: 'window-size', value: '1920,1080' },
];

// MAIN_FRAME_HEADERS 伪装首部：用于主框架请求，模拟真实浏览器发起页面导航时的 Sec-Fetch 系列请求头，有助于减少自动化环境被检测风险
const MAIN_FRAME_HEADERS = {
  'Sec-Fetch-Site': 'none',      // 表示请求非跨站点（主导航通常为 "none"）
  'Sec-Fetch-Mode': 'navigate',  // 导航操作（比如通过地址栏或链接）
  'Sec-Fetch-User': '?1',        // 表示用户主动发起了导航（如点击链接）
  'Sec-Fetch-Dest': 'document',  // 目标资源类型为主文档
};

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function createStealthUserAgent(baseUA = '') {
  const fallbackUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${DEFAULT_CHROME_VERSION} Safari/537.36`;
  if (!baseUA || typeof baseUA !== 'string') {
    return fallbackUA;
  }

  let result = baseUA;
  result = result.replace(/Electron\/[\d.]+\s?/g, '');
  result = result.replace(/Chrome\/[\d.]+/g, `Chrome/${DEFAULT_CHROME_VERSION}`);
  result = normalizeWhitespace(result);

  if (!/Safari\/537\.36/.test(result)) {
    result = `${result} Safari/537.36`;
  }

  return result || fallbackUA;
}

export function applyStealthAppConfig(appInstance) {
  if (!appInstance?.commandLine) {
    logger.warn('未能应用反检测启动参数：app 实例无效');
    return;
  }

  for (const { name, value } of COMMAND_SWITCHES) {
    try {
      if (value !== undefined) {
        appInstance.commandLine.appendSwitch(name, value);
      } else {
        appInstance.commandLine.appendSwitch(name);
      }
    } catch (error) {
      logger.error(`追加启动参数失败: ${name}`, error);
    }
  }

  logger.info('已追加反检测相关启动参数');
}

export function configureSessionStealth(targetSession) {
  if (!targetSession || configuredSessions.has(targetSession)) {
    return;
  }

  try {
    const originalUA = targetSession.getUserAgent?.();
    const stealthUA = createStealthUserAgent(originalUA);
    if (typeof targetSession.setUserAgent === 'function') {
      targetSession.setUserAgent(stealthUA);
    }

    targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };

      delete headers['Electron'];
      delete headers['x-electron-default'];

      const currentUA = headers['User-Agent'] || headers['user-agent'] || stealthUA;
      const patchedUA = createStealthUserAgent(currentUA);
      headers['User-Agent'] = patchedUA;

      headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';

      if (details.resourceType === 'mainFrame') {
        for (const [key, value] of Object.entries(MAIN_FRAME_HEADERS)) {
          headers[key] = value;
        }
      }

      callback({ requestHeaders: headers });
    });

    configuredSessions.add(targetSession);
    logger.info('默认会话已启用反检测请求头处理');
  } catch (error) {
    logger.error('配置会话反检测失败', error);
  }
}

export function attachWebContentsStealth(webContents) {
  if (!webContents || patchedWebContents.has(webContents)) {
    return;
  }

  try {
    configureSessionStealth(webContents.session);

    const currentUA = webContents.getUserAgent?.();
    if (typeof webContents.setUserAgent === 'function') {
      const patchedUA = createStealthUserAgent(currentUA);
      webContents.setUserAgent(patchedUA);
    }

    webContents.on('did-start-loading', () => {
      const script = `
        try {
          if (navigator?.maxTouchPoints !== 1) {
            Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, enumerable: false, get: () => 1 });
          }
          delete window._electron;
          delete window.electron;
        } catch (err) {
          console.debug('[stealth] did-start-loading 注入失败', err);
        }
      `;
      webContents.executeJavaScript(script, true).catch(() => {
        // 静默忽略执行失败
      });
    });

    patchedWebContents.add(webContents);
    logger.debug('已绑定 WebContents 反检测处理', { id: webContents.id });
  } catch (error) {
    logger.error('绑定 WebContents 反检测失败', error);
  }
}


