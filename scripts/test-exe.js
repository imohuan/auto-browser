// scripts/test-exe.js
// 测试脚本：启动 exe 文件并监听日志

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 配置
const CONFIG = {
  // exe 文件路径（可修改）
  exePath: process.argv[2] || path.join(PROJECT_ROOT, 'out', 'win-unpacked', 'AutoBrowser.exe'),
  // 测试日志输出文件
  testLogFile: path.join(PROJECT_ROOT, 'test-exe.log'),
  // 应用日志文件路径（监听此文件的变化）
  appLogFile: path.join(PROJECT_ROOT, 'userData', 'logs', 'app.log'),
  // 进程名称
  processName: 'AutoBrowser.exe',
};

// 确保日志目录存在
function ensureLogDir() {
  const logDir = path.dirname(CONFIG.testLogFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const appLogDir = path.dirname(CONFIG.appLogFile);
  if (!fs.existsSync(appLogDir)) {
    fs.mkdirSync(appLogDir, { recursive: true });
  }
}

// 写入测试日志
function writeTestLog(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;

  try {
    fs.appendFileSync(CONFIG.testLogFile, logMessage, 'utf-8');
    console.log(`[${type}] ${message}`);
  } catch (error) {
    console.error('写入测试日志失败:', error.message);
  }
}

// Kill 掉指定名称的进程
async function killProcessByName(processName) {
  try {
    writeTestLog(`检查并终止进程: ${processName}`, 'INFO');

    // 使用 tasklist 查找进程
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}" /FO CSV /NH`);

    if (stdout.includes(processName)) {
      writeTestLog(`发现运行中的 ${processName} 进程，正在终止...`, 'WARN');

      // 使用 taskkill 强制终止进程
      try {
        await execAsync(`taskkill /F /IM ${processName}`);
        writeTestLog(`已终止 ${processName} 进程`, 'INFO');

        // 等待进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (killError) {
        writeTestLog(`终止进程失败: ${killError.message}`, 'WARN');
      }
    } else {
      writeTestLog(`未发现运行中的 ${processName} 进程`, 'INFO');
    }
  } catch (error) {
    writeTestLog(`检查进程失败: ${error.message}`, 'WARN');
  }
}

// 清空日志文件
function clearLogs() {
  writeTestLog('清空日志文件...', 'INFO');

  // 清空测试日志
  try {
    if (fs.existsSync(CONFIG.testLogFile)) {
      fs.writeFileSync(CONFIG.testLogFile, '', 'utf-8');
    }
  } catch (error) {
    console.error(`清空测试日志失败: ${error.message}`);
  }

  // 清空应用日志
  try {
    if (fs.existsSync(CONFIG.appLogFile)) {
      fs.writeFileSync(CONFIG.appLogFile, '', 'utf-8');
      writeTestLog(`已清空应用日志: ${CONFIG.appLogFile}`, 'INFO');
    }
  } catch (error) {
    writeTestLog(`清空应用日志失败: ${error.message}`, 'WARN');
  }
}

// 监听日志文件变化
function watchLogFile() {
  let lastSize = 0;
  let watchTimer = null;

  let checkInterval = null;

  // 检查文件是否存在
  if (!fs.existsSync(CONFIG.appLogFile)) {
    writeTestLog(`等待日志文件创建: ${CONFIG.appLogFile}`, 'WAIT');
    // 如果文件不存在，等待文件创建
    checkInterval = setInterval(() => {
      if (fs.existsSync(CONFIG.appLogFile)) {
        clearInterval(checkInterval);
        checkInterval = null;
        try {
          lastSize = fs.statSync(CONFIG.appLogFile).size;
          writeTestLog(`日志文件已创建，开始监听: ${CONFIG.appLogFile}`, 'INFO');
          startWatching();
        } catch (error) {
          writeTestLog(`获取日志文件信息失败: ${error.message}`, 'ERROR');
        }
      }
    }, 500);
  }

  try {
    lastSize = fs.statSync(CONFIG.appLogFile).size;
    writeTestLog(`开始监听日志文件: ${CONFIG.appLogFile}`, 'INFO');
    startWatching();
  } catch (error) {
    writeTestLog(`获取日志文件信息失败: ${error.message}`, 'ERROR');
  }

  function startWatching() {
    // 使用 fs.watchFile 监听文件变化
    fs.watchFile(CONFIG.appLogFile, { interval: 500 }, (curr, prev) => {
      if (curr.size > prev.size) {
        // 文件变大了，读取新增内容
        try {
          const fd = fs.openSync(CONFIG.appLogFile, 'r');
          const buffer = Buffer.alloc(curr.size - prev.size);
          fs.readSync(fd, buffer, 0, buffer.length, prev.size);
          fs.closeSync(fd);

          const newContent = buffer.toString('utf-8');
          if (newContent.trim()) {
            writeTestLog(`[应用日志]\n${newContent}`, 'APP_LOG');
          }
          lastSize = curr.size;
        } catch (error) {
          // 文件可能正在被写入，忽略错误
          if (error.code !== 'EAGAIN' && error.code !== 'EBUSY') {
            writeTestLog(`读取日志文件失败: ${error.message}`, 'ERROR');
          }
        }
      } else if (curr.size < prev.size) {
        // 文件被清空或重置了
        writeTestLog(`日志文件被重置`, 'INFO');
        lastSize = curr.size;
      }
    });
  }

  // 返回清理函数
  return () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (watchTimer) {
      clearInterval(watchTimer);
      watchTimer = null;
    }
    try {
      fs.unwatchFile(CONFIG.appLogFile);
    } catch (error) {
      // 忽略错误
    }
  };
}

// 启动 exe 进程
function startExe(cleanupWatch) {
  if (!fs.existsSync(CONFIG.exePath)) {
    writeTestLog(`错误: exe 文件不存在: ${CONFIG.exePath}`, 'ERROR');
    writeTestLog(`请提供正确的 exe 文件路径作为参数`, 'INFO');
    writeTestLog(`示例: node scripts/test-exe.js "E:\\Code\\AutoBrowser\\out\\win-unpacked\\AutoBrowser.exe"`, 'INFO');
    if (cleanupWatch) cleanupWatch();
    process.exit(1);
  }

  writeTestLog(`启动 exe 文件: ${CONFIG.exePath}`, 'INFO');

  const exeProcess = spawn(CONFIG.exePath, [], {
    cwd: path.dirname(CONFIG.exePath),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  // 捕获标准输出
  exeProcess.stdout.on('data', (data) => {
    const output = data.toString('utf-8');
    writeTestLog(`[STDOUT]\n${output}`, 'STDOUT');
  });

  // 捕获标准错误
  exeProcess.stderr.on('data', (data) => {
    const output = data.toString('utf-8');
    writeTestLog(`[STDERR]\n${output}`, 'STDERR');
  });

  // 进程退出
  exeProcess.on('exit', (code, signal) => {
    writeTestLog(`进程退出，退出码: ${code}, 信号: ${signal || 'N/A'}`, 'EXIT');
    if (cleanupWatch) cleanupWatch();
    process.exit(code || 0);
  });

  // 进程错误
  exeProcess.on('error', (error) => {
    writeTestLog(`进程错误: ${error.message}`, 'ERROR');
    if (cleanupWatch) cleanupWatch();
    process.exit(1);
  });

  // 处理 Ctrl+C
  process.on('SIGINT', () => {
    writeTestLog('收到 SIGINT 信号，正在终止进程...', 'INFO');
    if (cleanupWatch) cleanupWatch();
    exeProcess.kill('SIGTERM');
    setTimeout(() => {
      if (!exeProcess.killed) {
        writeTestLog('进程未响应，强制终止...', 'WARN');
        exeProcess.kill('SIGKILL');
      }
      process.exit(0);
    }, 3000);
  });

  return exeProcess;
}

// 主函数
async function main() {
  ensureLogDir();

  writeTestLog('='.repeat(80), 'INFO');
  writeTestLog('测试脚本启动', 'INFO');
  writeTestLog(`exe 路径: ${CONFIG.exePath}`, 'INFO');
  writeTestLog(`测试日志文件: ${CONFIG.testLogFile}`, 'INFO');
  writeTestLog(`应用日志文件: ${CONFIG.appLogFile}`, 'INFO');
  writeTestLog('='.repeat(80), 'INFO');

  // 1. 终止已运行的进程
  await killProcessByName(CONFIG.processName);

  // 2. 清空日志文件
  clearLogs();

  // 3. 启动监听日志文件
  const cleanupWatch = watchLogFile();

  // 4. 启动 exe 进程
  startExe(cleanupWatch);
}

// 运行主函数
main().catch(error => {
  console.error('主函数执行失败:', error);
  process.exit(1);
});

