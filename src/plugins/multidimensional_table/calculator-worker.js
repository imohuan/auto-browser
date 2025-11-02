import PocketBase from "pocketbase";
import { APP_CONFIG, POCKETBASE_CONFIG } from "../../core/constants.js";
import { net } from "electron";

// 直接替换全局 fetch 为 Electron 的 net.fetch
globalThis.fetch = net.fetch;

console.log("Utility Process 已启动", {
  env: {
    PB_URL: process.env.PB_URL,
    PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL,
  },
  hasGlobalFetch: typeof globalThis.fetch !== "undefined",
  hasElectronNet: typeof net !== "undefined",
  hasNetFetch: typeof net?.fetch === "function",
  fetchIsNetFetch: globalThis.fetch === net.fetch,
});

/**
 * 安全的公式计算器 (简化版，生产环境建议使用 mathjs)
 */
function evaluateFormula(formula, inputValue) {
  try {
    console.debug("开始计算公式", { formula, inputValue });

    // 简单替换 {value} 占位符
    const expression = formula.replace(/\{value\}/g, inputValue);
    console.debug("替换占位符后的表达式", { expression });

    // 仅支持基础运算符，避免使用 eval
    // 生产环境应使用 mathjs 等安全库
    const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, "");

    if (safeExpression !== expression) {
      console.warn("公式包含非法字符，已过滤", {
        original: expression,
        safe: safeExpression,
      });
    }

    // 这里为了演示使用 Function，生产环境必须使用 mathjs
    const result = new Function(`return ${safeExpression}`)();
    console.debug("公式计算结果", { safeExpression, result });

    return result;
  } catch (e) {
    console.error("公式计算失败", { formula, inputValue, error: e.message });
    throw new Error(`公式错误: ${e.message}`);
  }
}

/**
 * 设置消息处理器
 */
function setupMessageHandler() {
  console.log("开始监听主进程消息");

  // 在 Utility Process 中与主进程通信使用 process.parentPort
  process.parentPort.on("message", async (e) => {
    const task = e.data;
    const startTime = Date.now();
    console.log("收到计算任务", {
      recordId: task.recordId,
      fieldName: task.fieldName,
      type: task.type,
    });

    try {
      // 1. 初始化 PocketBase SDK (使用全局的 net.fetch)
      const pbUrl = process.env.PB_URL || APP_CONFIG.POCKETBASE_URL;
      const collectionName = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA.name;
      console.debug("初始化 PocketBase SDK", { url: pbUrl });
      const pb = new PocketBase(pbUrl);

      // 2. 获取当前记录
      console.debug("获取单元格记录", { recordId: task.recordId });
      const record = await pb.collection(collectionName).getOne(task.recordId);

      console.log("单元格数据", {
        row: record.row,
        col: record.col,
        value: record.value,
        dataType: record.data_type,
        formula: record.formula,
      });

      // 3. 执行计算逻辑
      let computedValue = null;

      if (record.formula) {
        // 公式计算
        console.log("执行公式计算", { formula: record.formula });
        computedValue = evaluateFormula(record.formula, record.value);
        console.log("公式计算完成", { result: computedValue });
      } else if (record.data_type === "number") {
        // 数值计算 (示例: 乘以2)
        console.log("执行数值计算");
        const numValue = parseFloat(record.value);
        computedValue = isNaN(numValue) ? 0 : numValue * 2;
        console.log("数值计算完成", {
          input: numValue,
          result: computedValue,
        });
      } else {
        // 文本直接使用原值
        console.log("文本类型，直接使用原值");
        computedValue = record.value;
      }

      // 模拟复杂计算延迟
      console.debug("模拟计算延迟 500ms");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 4. 回写计算结果到 PocketBase
      console.debug("回写计算结果到数据库");
      await pb.collection(collectionName).update(task.recordId, {
        computed_value: String(computedValue),
        status: "completed",
        updated: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      console.log("任务完成", {
        recordId: task.recordId,
        computedValue: computedValue,
        duration: `${duration}ms`,
      });

      // 5. 通知主进程任务完成
      process.parentPort.postMessage({
        success: true,
        recordId: task.recordId,
        computedValue: computedValue,
        duration: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      // 提取详细错误信息
      const errorDetails = {
        message: error.message,
        status: error.status,
        data: error.data,
        isAbort: error.isAbort,
        originalError: error.originalError?.message,
      };

      console.error("任务处理失败", {
        recordId: task.recordId,
        error: error.message,
        errorDetails: errorDetails,
        stack: error.stack,
        duration: `${duration}ms`,
      });

      // 记录错误到数据库
      try {
        console.debug("尝试将错误写入数据库");
        const pbUrl = process.env.PB_URL || APP_CONFIG.POCKETBASE_URL;
        const pb = new PocketBase(pbUrl);
        const errorCollectionName = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA.name;

        await pb.collection(errorCollectionName).update(task.recordId, {
          status: "error",
          error_message: error.message,
        });
        console.debug("错误信息已写入数据库");
      } catch (e) {
        console.error("写入错误信息到数据库失败", {
          error: e.message,
          stack: e.stack,
        });
      }

      // 通知主进程任务失败
      process.parentPort.postMessage({
        success: false,
        recordId: task.recordId,
        error: error.message,
        duration: duration,
      });
    }
  });

  console.log("消息监听器已注册，等待任务...");
}

// 启动消息监听器
setupMessageHandler();
console.log("Calculator Worker 初始化完成，开始接收任务");

