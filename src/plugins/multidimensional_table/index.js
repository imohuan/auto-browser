import { BasePlugin } from "../base-plugin.js";
import { utilityProcess, ipcMain, net } from "electron";
import os from "os";
import { EventSource } from "eventsource";
import { APP_CONFIG, POCKETBASE_CONFIG } from "../../core/constants.js";
import { pluginManager } from "../plugin-manager.js";
import { start } from "./pocketbase/index.js";
import { resolve } from "../../utils/path-resolver.js";
import { PocketBaseInitializer } from "./pocketbase/init-pocketbase.js";


// 使用 Electron 的 net.fetch
globalThis.fetch = net.fetch;
// 设置 EventSource polyfill（Node.js 环境需要）
globalThis.EventSource = EventSource;

/**
 * 计算器插件
 * 提供基于 PocketBase 的单元格计算功能
 */
export default class CalculatorPlugin extends BasePlugin {
  constructor() {
    super("calculator");
    this.version = "1.0.0";
    this.description = "基于 PocketBase 的单元格计算服务插件";

    // Utility Process 池配置
    this.PROCESS_COUNT = Math.max(os.cpus().length - 2, 2);
    this.processPool = [];
    this.taskQueue = [];
    this.MAX_QUEUE_SIZE = 1000;
    this.restartTimers = new Map();
    this.isShuttingDown = false;

    // PocketBase 连接
    this.pb = null;
    this.collectionName = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA.name;

    // PocketBase 初始化器单例
    this.pbInitializer = PocketBaseInitializer.getInstance();

    // 缓存的 PocketBase 凭证
    this.credentials = null;
  }

  /**
   * 初始化插件
   */
  async init() {
    await start()

    this.isShuttingDown = false;
    this.logger.info("初始化计算器插件...");

    // 获取工作流节点元数据（如果工作流插件已加载）
    const workflowPlugin = pluginManager.getPlugin("workflow-run");
    if (workflowPlugin) {
      const nodeMetadata = workflowPlugin.getAllNodeMetadata();
      this.logger.debug(JSON.stringify(nodeMetadata, null, 2));
    }

    // 1. 获取 PocketBase 凭证（只获取一次）
    this.credentials = await this.pbInitializer.getCredentials();
    this.logger.info("PocketBase 凭证已加载", { username: this.credentials.username });

    // 2. 获取已认证的 PocketBase 实例
    try {
      this.pb = await this.pbInitializer.getAuthenticatedPB();
      this.logger.info("PocketBase 已认证连接成功");

      // 3. 订阅实时更新
      await this.subscribePocketBase();

      // 4. 处理未完成的任务
      await this.processUnfinishedTasks();
    } catch (error) {
      this.logger.error("PocketBase 连接失败", { error: error.message });
      this.logger.warn("PocketBase 未连接，自动计算功能将不可用");
    }


    // 5. 初始化进程池
    this.initProcessPool();

    // 6. 注册 IPC 处理器
    this.registerIPCHandlers();

    this.logger.info("计算器插件初始化完成");
  }

  /**
   * 清理插件资源
   */
  async cleanup() {
    this.logger.info("清理计算器插件资源...");
    this.isShuttingDown = true;

    // 取消 PocketBase 订阅
    if (this.pb) {
      try {
        this.pb.collection(this.collectionName).unsubscribe("*");
        this.logger.info("PocketBase 订阅已取消");
      } catch (error) {
        this.logger.error("取消 PocketBase 订阅失败", { error: error.message });
      }
    }

    // 清理 Utility Process 池
    this.logger.info("清理 Utility Process 池");
    this.restartTimers.forEach((timer) => clearTimeout(timer));
    this.restartTimers.clear();
    this.processPool.forEach((process) => {
      if (process && !process.killed) {
        process.kill();
      }
    });
  }

  /**
   * 创建单个 Utility Process
   */
  createUtilityProcess(index) {
    this.logger.info(`创建 Utility Process ${index}`);

    const workerPath = resolve("plugins", "multidimensional_table", "calculator-worker.js");
    this.logger.debug(`Worker 路径: ${workerPath}`);

    // 使用缓存的凭证
    const child = utilityProcess.fork(
      workerPath,
      [],
      {
        serviceName: `calculator-worker-${index}`,
        env: {
          PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL || this.credentials.username,
          PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD || this.credentials.password,
          PB_URL: process.env.PB_URL || APP_CONFIG.POCKETBASE_URL || "http://127.0.0.1:8090",
        },
        stdio: "pipe", // 捕获子进程的 stdout/stderr
      }
    );

    // 监听子进程的标准输出
    if (child.stdout) {
      child.stdout.on("data", (data) => {
        this.logger.debug(`Utility Process ${index} stdout: ${data.toString()}`);
      });
    }

    // 监听子进程的标准错误
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        this.logger.debug(`Utility Process ${index} stderr: ${data.toString()}`);
      });
    }

    // 监听 spawn 事件
    child.on("spawn", () => {
      this.logger.info(`Utility Process ${index} 已启动`);
      child.isReady = true;
      child.busy = false;
      this.processQueueUntilFull();
    });

    // 监听计算结果
    child.on("message", (result) => {
      child.currentTask = null;
      if (result.success) {
        this.logger.info(`Utility Process ${index} 任务完成`, {
          recordId: result.recordId,
          computedValue: result.computedValue,
          duration: result.duration,
        });
      } else {
        this.logger.error(`Utility Process ${index} 任务失败`, {
          recordId: result.recordId,
          error: result.error,
        });
      }

      // 标记为空闲
      child.busy = false;

      // 处理队列中的任务（批量分配，充分利用所有空闲进程）
      this.processQueueUntilFull();
    });

    // 监听错误
    child.on("error", (error) => {
      this.logger.error(`Utility Process ${index} 错误`, error);
      this.handleProcessFailure(index, child, "error", { error: error.message });
    });

    // 监听进程退出
    child.on("exit", (code) => {
      this.logger.warn(`Utility Process ${index} 退出，代码: ${code}`);
      this.handleProcessFailure(index, child, "exit", { code }, { alreadyExited: true });
    });

    child.busy = false;
    child.currentTask = null;
    child.isReady = false;
    return child;
  }

  /**
   * 初始化 Utility Process 池
   */
  initProcessPool() {
    this.logger.info(`初始化 ${this.PROCESS_COUNT} 个 Utility Process`);

    for (let i = 0; i < this.PROCESS_COUNT; i++) {
      this.processPool.push(this.createUtilityProcess(i));
    }
  }

  /**
   * 分配任务给空闲进程
   * 返回 true 表示成功分配，false 表示没有空闲进程或队列为空
   */
  processNextTask() {
    if (this.taskQueue.length === 0) return false;

    const process = this.processPool.find((p) => this.isProcessAvailable(p));
    if (!process) {
      // 所有进程忙碌，等待进程完成时自动调用 processNextTask()
      return false;
    }

    const task = this.taskQueue.shift();
    if (!task) return false;

    return this.assignTaskToProcess(process, task);
  }

  /**
   * 持续处理队列中的任务，直到队列为空或没有空闲进程
   * 优化版本：一次性找出所有空闲进程，批量分配
   */
  processQueueUntilFull() {
    // 快速检查：如果队列为空或没有空闲进程，直接返回
    if (this.taskQueue.length === 0) return;

    // 找出所有空闲进程
    const idleProcesses = this.processPool
      .map((process, index) => ({ process, index }))
      .filter(({ process }) => this.isProcessAvailable(process));
    if (idleProcesses.length === 0) return;

    // 计算可以分配的任务数量（取空闲进程数和队列长度中的较小值）
    const taskCount = Math.min(idleProcesses.length, this.taskQueue.length);

    // 批量分配任务
    for (let i = 0; i < taskCount; i++) {
      const { process } = idleProcesses[i];
      const task = this.taskQueue.shift();
      if (!task) {
        break;
      }

      this.assignTaskToProcess(process, task);
    }
  }

  /**
   * 判断进程是否可用
   */
  isProcessAvailable(process) {
    return Boolean(
      process &&
      process.isReady &&
      !process.busy &&
      !process.killed &&
      typeof process.pid === "number"
    );
  }

  /**
   * 将任务分配到指定进程
   */
  assignTaskToProcess(process, task) {
    const processIndex = this.processPool.indexOf(process);
    if (processIndex === -1) {
      this.logger.warn("进程池中未找到指定进程，任务重新入队", {
        recordId: task.recordId,
        fieldName: task.fieldName,
      });
      this.requeueTask(task, "进程不存在");
      return false;
    }

    process.busy = true;
    process.currentTask = task;

    try {
      this.logger.info("分配任务给进程", {
        recordId: task.recordId,
        fieldName: task.fieldName,
        processIndex,
      });
      process.postMessage(task);
      return true;
    } catch (error) {
      process.busy = false;
      process.currentTask = null;
      this.logger.error("向 Utility Process 发送任务失败", {
        recordId: task.recordId,
        fieldName: task.fieldName,
        error: error.message,
      });
      this.requeueTask(task, "postMessage 异常");
      this.handleProcessFailure(processIndex, process, "postMessage 异常", { error: error.message });
      return false;
    }
  }

  /**
   * 任务重新入队
   */
  requeueTask(task, reason) {
    if (!task) return;

    task.retryCount = (task.retryCount || 0) + 1;
    task.timestamp = Date.now();

    this.taskQueue.unshift(task);
    this.logger.warn("任务重新入队", {
      recordId: task.recordId,
      fieldName: task.fieldName,
      reason,
      retryCount: task.retryCount,
    });

    if (task.retryCount > 5) {
      this.logger.error("任务重试次数过多", {
        recordId: task.recordId,
        fieldName: task.fieldName,
        retryCount: task.retryCount,
      });
    }
  }

  /**
   * 处理进程失败
   */
  handleProcessFailure(index, child, reason, detail = {}, options = {}) {
    const { alreadyExited = false } = options;

    if (this.isShuttingDown) {
      if (child) {
        child.busy = false;
        child.currentTask = null;
        child.isReady = false;
      }

      if (this.processPool[index] === child) {
        this.processPool[index] = null;
      }

      return;
    }

    if (!child) {
      this.scheduleProcessRestart(index);
      return;
    }

    if (child.currentTask) {
      this.requeueTask(child.currentTask, `${reason} 触发重试`);
      child.currentTask = null;
    }

    child.busy = false;
    child.isReady = false;

    if (this.processPool[index] === child) {
      this.processPool[index] = null;
    }

    this.logger.warn(`Utility Process ${index} 准备重启`, {
      reason,
      ...detail,
    });

    if (!alreadyExited && !child.killed && typeof child.kill === "function") {
      try {
        child.kill();
      } catch (killError) {
        this.logger.error(`终止 Utility Process ${index} 失败`, {
          error: killError.message,
        });
      }
    }

    this.scheduleProcessRestart(index);
    this.processQueueUntilFull();
  }

  /**
   * 调度进程重启
   */
  scheduleProcessRestart(index) {
    if (this.isShuttingDown) {
      return;
    }

    if (this.restartTimers.has(index)) {
      return;
    }

    const timer = setTimeout(() => {
      this.restartTimers.delete(index);
      this.processPool[index] = this.createUtilityProcess(index);
      this.processQueueUntilFull();
    }, 1000);

    this.restartTimers.set(index, timer);
  }

  /**
   * 提交计算任务到队列
   */
  submitCalculationTask(recordId, fieldName, newValue) {
    // 队列保护
    if (this.taskQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn("任务队列已满，丢弃任务", {
        recordId,
        queueLength: this.taskQueue.length,
      });
      return false;
    }

    const task = {
      type: "CELL_CALCULATE",
      recordId,
      fieldName,
      newValue,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.taskQueue.push(task);
    this.logger.info("任务入队", {
      recordId,
      fieldName,
      queueLength: this.taskQueue.length,
      availableWorkers: this.processPool.filter((p) => this.isProcessAvailable(p)).length,
    });

    // 尝试持续处理队列，直到没有空闲进程或队列为空
    // 这样即使有多个任务，也能尽可能多地分配
    this.processQueueUntilFull();
    return true;
  }


  /**
   * 检查并处理未完成的任务
   */
  async processUnfinishedTasks() {
    try {
      this.logger.info("检查未完成的任务...");

      // 查询所有未完成的记录（状态为 pending 或 computing）
      const unfinishedRecords = await this.pb.collection(this.collectionName).getFullList({
        filter: 'status = "pending" || status = "computing"',
        sort: "created",
      });

      this.logger.info(`找到 ${unfinishedRecords.length} 个未完成任务`);

      if (unfinishedRecords.length === 0) {
        return;
      }

      // 批量将所有未完成任务加入队列（不立即分配，避免重复调用 processQueueUntilFull）
      let addedCount = 0;
      for (const record of unfinishedRecords) {
        // 判断需要计算的字段
        let fieldName = "value";
        if (record.formula) {
          fieldName = "formula";
        }

        // 队列保护
        if (this.taskQueue.length >= this.MAX_QUEUE_SIZE) {
          this.logger.warn("任务队列已满，跳过剩余未完成任务", {
            skipped: unfinishedRecords.length - addedCount,
          });
          break;
        }

        const task = {
          type: "CELL_CALCULATE",
          recordId: record.id,
          fieldName,
          newValue: record[fieldName],
          timestamp: Date.now(),
          retryCount: 0,
        };

        this.taskQueue.push(task);
        addedCount++;

        this.logger.info("未完成任务已加入队列", {
          recordId: record.id,
          row: record.row,
          col: record.col,
          status: record.status,
        });
      }

      this.logger.info("所有未完成任务已加入队列", {
        total: addedCount,
      });

      // 批量分配任务（一次性处理，充分利用所有空闲进程）
      this.processQueueUntilFull();
    } catch (error) {
      this.logger.error("处理未完成任务失败", { error: error.message });
    }
  }

  /**
   * 订阅 PocketBase 实时更新
   */
  async subscribePocketBase() {
    try {
      // subscribe 方法是异步的，需要 await
      await this.pb.collection(this.collectionName).subscribe("*", (e) => {
        this.logger.debug("收到 PocketBase 实时事件", {
          action: e.action,
          recordId: e.record.id,
          status: e.record.status,
        });

        // 只处理更新事件和创建事件
        if (e.action !== "update" && e.action !== "create") {
          return;
        }

        const record = e.record;

        // 只有状态为 computing 的记录才需要计算
        if (record.status !== "computing") {
          this.logger.debug("记录状态不是 computing，跳过", {
            recordId: record.id,
            status: record.status,
          });
          return;
        }

        // 判断需要计算的字段
        let fieldName = "value";
        let fieldValue = record.value;

        // 如果 record 中存在 formula 字段（通常指有公式时），
        // 则将要计算的字段名设置为 "formula"，计算内容为公式字段内容
        // 这通常表示优先计算单元格输入的公式而非原始值
        if (record.formula) {
          fieldName = "formula";
          fieldValue = record.formula;
        }

        this.logger.info("检测到需要计算的记录", {
          recordId: record.id,
          row: record.row,
          col: record.col,
          fieldName,
          status: record.status,
        });

        // 提交计算任务
        this.submitCalculationTask(record.id, fieldName, fieldValue);
      });

      this.logger.info("已订阅 PocketBase 实时更新");
    } catch (error) {
      this.logger.error("订阅 PocketBase 失败", { error: error.message });
    }
  }

  /**
   * 注册 IPC 处理器
   */
  registerIPCHandlers() {
    // IPC 安全通道: 处理单元格编辑请求
    ipcMain.on("trigger:cell-edit-request", (event, payload) => {
      this.logger.debug("收到IPC请求", { payload });

      // 1. 输入验证
      if (!payload || !payload.recordId || !payload.fieldName) {
        this.logger.error("无效的请求参数", { payload });
        event.reply("trigger:cell-edit-response", {
          success: false,
          error: "无效的请求参数",
        });
        return;
      }

      // 2. 提交计算任务（submitCalculationTask 内部会进行队列保护）
      const submitted = this.submitCalculationTask(
        payload.recordId,
        payload.fieldName,
        payload.newValue
      );

      if (!submitted) {
        // 队列已满，拒绝请求
        event.reply("trigger:cell-edit-response", {
          success: false,
          error: "系统繁忙，请稍后重试",
        });
        return;
      }

      // 3. 异步响应 (不等待计算完成)
      event.reply("trigger:cell-edit-response", {
        success: true,
        message: "计算任务已提交",
      });
    });
  }
}

