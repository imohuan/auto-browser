/**
 * PocketBase 历史记录 Handler
 * 用于 start-server.js 的工作流执行历史记录保存
 */

/**
 * 创建 PocketBase 历史记录处理器
 * @param {Object} options - 配置选项
 * @param {string} options.pbUrl - PocketBase 服务器地址，默认 http://127.0.0.1:8090
 * @param {string} options.username - 超级用户邮箱或用户名
 * @param {string} options.password - 超级用户密码
 * @returns {Promise<Object>} 返回历史记录处理器对象
 */
export async function createPocketBaseHistoryHandler() {
  // 创建 PocketBase 实例
  let pb = null;
  const collectionName = "execution_history";

  return {
    setPb(_pb) {
      pb = _pb;
    },
    /**
     * 获取历史记录（分页）
     * @param {string} workflowId - 工作流ID，可选
     * @param {number} page - 页码，默认 1
     * @param {number} pageSize - 每页数量，默认 20
     * @param {string} requestId - 请求ID（执行ID），可选，用于精确查找
     * @returns {Promise<Object>} 返回分页结果对象，包含 history、total、page、pageSize
     */
    async getHistory(workflowId, page = 1, pageSize = 20, requestId = null) {
      try {
        const filters = [];

        // 如果提供了 workflowId，过滤工作流
        if (workflowId) {
          filters.push(`workflowId = "${workflowId}"`);
        }

        // 如果提供了 requestId（执行ID），精确匹配
        if (requestId) {
          filters.push(`executionId = "${requestId}"`);
        }

        const filter = filters.length > 0 ? filters.join(" && ") : "";

        // PocketBase 的 getList 方法：getList(page, perPage, options)
        const result = await pb.collection(collectionName).getList(page, pageSize, {
          filter,
          sort: "-startTime", // 按开始时间倒序
        });

        // 映射数据字段
        const history = result.items.map((item) => ({
          executionId: item.executionId,
          workflowId: item.workflowId,
          success: item.success,
          startTime: item.startTime,
          endTime: item.endTime,
          duration: item.duration,
          error: item.error,
          executedNodeCount: item.executedNodeCount,
          skippedNodeCount: item.skippedNodeCount,
          cachedNodeCount: item.cachedNodeCount,
          executedNodeIds: item.executedNodeIds,
          skippedNodeIds: item.skippedNodeIds,
          cachedNodeIds: item.cachedNodeIds,
          nodeResults: item.nodeResults,
          nodes: item.nodes,
          edges: item.edges,
        }));

        // 返回分页结果
        return {
          history,
          total: result.totalItems,
          page: result.page,
          pageSize: result.perPage,
        };
      } catch (error) {
        console.error("获取历史记录失败:", error);
        // 返回空的分页结果
        return {
          history: [],
          total: 0,
          page: page || 1,
          pageSize: pageSize || 20,
        };
      }
    },

    /**
     * 保存历史记录
     * @param {Object} result - 执行结果对象
     * @param {Object} workflow - 工作流对象
     * @returns {Promise<void>}
     */
    async saveHistory(result, workflow) {
      try {
        // 将 Map 转换为普通对象以便序列化
        const nodeResultsObj = {};
        if (result.nodeResults instanceof Map) {
          result.nodeResults.forEach((value, key) => {
            nodeResultsObj[key] = value;
          });
        } else if (result.nodeResults) {
          Object.assign(nodeResultsObj, result.nodeResults);
        }

        const record = {
          executionId: result.executionId,
          workflowId: result.workflowId,
          success: result.success,
          startTime: result.startTime,
          endTime: result.endTime,
          duration: result.duration,
          error: result.error,
          executedNodeCount: result.executedNodeIds?.length || 0,
          skippedNodeCount: result.skippedNodeIds?.length || 0,
          cachedNodeCount: result.cachedNodeIds?.length || 0,
          executedNodeIds: result.executedNodeIds || [],
          skippedNodeIds: result.skippedNodeIds || [],
          cachedNodeIds: result.cachedNodeIds || [],
          nodeResults: nodeResultsObj,
          nodes: workflow?.nodes,
          edges: workflow?.edges,
        };

        // 检查是否已存在相同 executionId 的记录
        try {
          const existing = await pb
            .collection(collectionName)
            .getFirstListItem(`executionId = "${result.executionId}"`);

          // 如果存在，更新记录
          await pb.collection(collectionName).update(existing.id, record);
          console.log(`✅ 已更新历史记录: ${result.executionId}`);
        } catch (error) {
          // 如果不存在（404），创建新记录
          if (error.status === 404) {
            await pb.collection(collectionName).create(record);
            console.log(`✅ 已保存历史记录: ${result.executionId}`);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error("保存历史记录失败:", error);
        throw error;
      }
    },

    /**
     * 清空历史记录
     * @param {string} workflowId - 工作流ID，可选。如果提供则只清空该工作流的历史
     * @returns {Promise<void>}
     */
    async clearHistory(workflowId) {
      try {
        if (workflowId) {
          // 清空指定工作流的历史
          const records = await pb
            .collection(collectionName)
            .getFullList({ filter: `workflowId = "${workflowId}"` });

          for (const record of records) {
            await pb.collection(collectionName).delete(record.id);
          }
          console.log(`🗑️ 已删除 ${records.length} 条历史记录 (工作流: ${workflowId})`);
        } else {
          // 清空所有历史
          const records = await pb.collection(collectionName).getFullList();
          for (const record of records) {
            await pb.collection(collectionName).delete(record.id);
          }
          console.log(`🗑️ 已清空所有历史记录 (共 ${records.length} 条)`);
        }
      } catch (error) {
        console.error("清空历史记录失败:", error);
        throw error;
      }
    },

    /**
     * 删除单个历史记录
     * @param {string} executionId - 执行ID
     * @returns {Promise<void>}
     */
    async deleteHistory(executionId) {
      try {
        const record = await pb
          .collection(collectionName)
          .getFirstListItem(`executionId = "${executionId}"`);

        await pb.collection(collectionName).delete(record.id);
        console.log(`🗑️ 已删除历史记录: ${executionId}`);
      } catch (error) {
        if (error.status === 404) {
          throw new Error(`历史记录不存在: ${executionId}`);
        }
        console.error("删除历史记录失败:", error);
        throw error;
      }
    },
  };
}

