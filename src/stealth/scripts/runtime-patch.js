(function applyElectronStealthPatch() {
  const safeDelete = (target, key) => {
    try {
      if (key in target) {
        delete target[key];
      }
    } catch (err) {
      console.debug('[stealth] 删除属性失败', key, err);
    }
  };

  const safeDefine = (target, key, descriptor) => {
    try {
      Object.defineProperty(target, key, descriptor);
    } catch (err) {
      console.debug('[stealth] 定义属性失败', key, err);
    }
  };

  try {
    const navigatorProto = Object.getPrototypeOf(navigator);
    if (navigatorProto) {
      safeDelete(navigatorProto, 'webdriver');
      safeDefine(navigatorProto, 'webdriver', {
        configurable: true,
        enumerable: false,
        get: () => undefined,
      });

      safeDefine(navigatorProto, 'maxTouchPoints', {
        configurable: true,
        enumerable: false,
        get: () => 1,
      });

      safeDefine(navigatorProto, 'deviceMemory', {
        configurable: true,
        enumerable: false,
        get: () => {
          const values = [4, 6, 8, 12, 16];
          return values[Math.floor(Math.random() * values.length)];
        },
      });
    }
  } catch (err) {
    console.debug('[stealth] 修改 navigator 属性失败', err);
  }

  try {
    if (navigator.connection) {
      safeDefine(navigator.connection, 'rtt', {
        configurable: true,
        enumerable: false,
        get: () => Math.floor(Math.random() * 50) + 50,
      });
    }
  } catch (err) {
    console.debug('[stealth] 修改 navigator.connection 失败', err);
  }

  try {
    if (!window.chrome) {
      safeDefine(window, 'chrome', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: {},
      });
    }

    if (!window.chrome.runtime) {
      safeDefine(window.chrome, 'runtime', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: {
          id: undefined,
          connect: () => ({}),
          sendMessage: () => undefined,
          onMessage: {
            addListener: () => undefined,
            removeListener: () => undefined,
          },
        },
      });
    }
  } catch (err) {
    console.debug('[stealth] 伪装 window.chrome 失败', err);
  }

  safeDelete(window, 'require');
  safeDelete(window, 'module');
  safeDelete(window, 'exports');

  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function patchedToDataURL(...args) {
      try {
        const context = this.getContext('2d');
        if (context) {
          const { width, height } = this;
          const imageData = context.getImageData(0, 0, width, height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.random() * 1e-5;
            imageData.data[i + 1] += Math.random() * 1e-5;
            imageData.data[i + 2] += Math.random() * 1e-5;
          }
          context.putImageData(imageData, 0, 0);
        }
      } catch (err) {
        console.debug('[stealth] Canvas 扰动失败', err);
      }
      return originalToDataURL.apply(this, args);
    };
  } catch (err) {
    console.debug('[stealth] 改写 Canvas API 失败', err);
  }

  const WEBGL_UNMASKED_VENDOR = 37445;
  const WEBGL_UNMASKED_RENDERER = 37446;

  try {
    const prototype = WebGLRenderingContext.prototype;
    const originalGetParameter = prototype.getParameter;
    prototype.getParameter = function patchedGetParameter(param) {
      if (param === WEBGL_UNMASKED_VENDOR) {
        return 'Intel Inc.';
      }
      if (param === WEBGL_UNMASKED_RENDERER) {
        return 'Intel Iris OpenGL Engine';
      }
      return originalGetParameter.call(this, param);
    };
  } catch (err) {
    console.debug('[stealth] 改写 WebGLRenderingContext 失败', err);
  }

  try {
    const webgl2Proto = WebGL2RenderingContext?.prototype;
    const original = webgl2Proto?.getParameter;
    if (webgl2Proto && original) {
      webgl2Proto.getParameter = function patchedWebGL2(param) {
        if (param === WEBGL_UNMASKED_VENDOR) {
          return 'Intel Inc.';
        }
        if (param === WEBGL_UNMASKED_RENDERER) {
          return 'Intel Iris OpenGL Engine';
        }
        return original.call(this, param);
      };
    }
  } catch (err) {
    console.debug('[stealth] 改写 WebGL2RenderingContext 失败', err);
  }

  console.info('[stealth] runtime-patch 脚本已执行');
})();


