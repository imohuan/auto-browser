// src/stealth/preload-injector.js
// 在 preload 环境执行 stealth 脚本

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsDir = join(__dirname, 'scripts');

const scripts = [
  { filename: 'stealth.min.js', description: 'stealth 核心脚本' },
  { filename: 'runtime-patch.js', description: 'Electron 伪装补丁' },
];

function runScript(source, filename) {
  vm.runInThisContext(source, {
    filename,
    displayErrors: true,
  });
}

export function injectStealthScripts() {
  if (typeof window === 'undefined') {
    console.warn('[stealth] 当前环境无浏览器上下文，跳过脚本注入');
    return;
  }

  for (const script of scripts) {
    const filePath = join(scriptsDir, script.filename);

    if (!existsSync(filePath)) {
      console.warn(`[stealth] 未找到脚本: ${script.filename}`);
      continue;
    }

    try {
      const source = readFileSync(filePath, 'utf8');
      runScript(source, script.filename);
      console.info(`[stealth] 已执行脚本: ${script.filename} (${script.description})`);
    } catch (error) {
      console.error(`[stealth] 执行脚本失败: ${script.filename}`, error);
    }
  }
}


