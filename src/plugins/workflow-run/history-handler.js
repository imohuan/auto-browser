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
     * @param {string} executionId - 执行ID，可选。如果提供则返回单条完整记录
     * @param {number} page - 页码，默认 1
     * @param {number} pageSize - 每页数量，默认 20
     * @returns {Promise<Object>} 返回分页结果对象，包含 history、total、page、pageSize
     */
    async getHistory(executionId, page = 1, pageSize = 20) {
      try {
        // 如果指定了 executionId，直接查找单条记录
        if (executionId) {
          try {
            const record = await pb
              .collection(collectionName)
              .getFirstListItem(`executionId = "${executionId}"`);

            // 映射数据字段，返回完整的 nodes、edges、nodeResults
            const historyItem = {
              executionId: record.executionId,
              workflowId: record.workflowId,
              success: record.success,
              startTime: record.startTime,
              endTime: record.endTime,
              duration: record.duration,
              error: record.error,
              executedNodeCount: record.executedNodeCount,
              skippedNodeCount: record.skippedNodeCount,
              cachedNodeCount: record.cachedNodeCount,
              executedNodeIds: record.executedNodeIds,
              skippedNodeIds: record.skippedNodeIds,
              cachedNodeIds: record.cachedNodeIds,
              nodeResults: record.nodeResults,
              nodes: record.nodes,
              edges: record.edges,
            };

            // 返回单条记录
            return {
              history: [historyItem],
              total: 1,
              page: 1,
              pageSize: 1,
            };
          } catch (error) {
            // 未找到记录（404）
            if (error.status === 404) {
              return {
                history: [],
                total: 0,
                page: 1,
                pageSize: 1,
              };
            }
            throw error;
          }
        }

        // 未指定 executionId，返回所有历史记录（不包含 nodes、edges、nodeResults）
        // PocketBase 的 getList 方法：getList(page, perPage, options)
        const result = await pb.collection(collectionName).getList(page, pageSize, {
          sort: "-startTime", // 按开始时间倒序
        });

        // 映射数据字段，移除 nodes、edges、nodeResults 以减少数据传输
        const history = result.items.map((item) => {
          const { nodes, edges, nodeResults, ...rest } = item;
          return {
            executionId: rest.executionId,
            workflowId: rest.workflowId,
            success: rest.success,
            startTime: rest.startTime,
            endTime: rest.endTime,
            duration: rest.duration,
            error: rest.error,
            executedNodeCount: rest.executedNodeCount,
            skippedNodeCount: rest.skippedNodeCount,
            cachedNodeCount: rest.cachedNodeCount,
            executedNodeIds: rest.executedNodeIds,
            skippedNodeIds: rest.skippedNodeIds,
            cachedNodeIds: rest.cachedNodeIds,
          };
        });

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

