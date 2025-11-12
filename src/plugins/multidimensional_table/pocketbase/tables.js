/**
 * PocketBase 数据表配置
 */

/**
 * 工作流表配置
 * 用于存储工作流的定义，包括节点和边的信息
 */
export const WORKFLOW_TABLE_SCHEMA = {
  name: 'workflows',
  type: 'base',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      options: {
        min: 1,
        max: 255,
      }
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      options: {
        min: 0,
        max: 0, // 0 表示不限制长度
      }
    },
    {
      name: 'createAt',
      type: 'date',
      required: true,
    },
    {
      name: 'updateAt',
      type: 'date',
      required: true,
    },
    {
      name: 'nodes',
      type: 'json',
      required: true,
    },
    {
      name: 'edges',
      type: 'json',
      required: true,
    },
    {
      name: 'path',
      type: 'text',
      required: true,
      options: {
        min: 0,
        max: 0,
      }
    },
  ],
  // 访问规则：允许所有操作（可根据实际需求调整）
  listRule: '',    // 空字符串表示所有人都可以列表查看
  viewRule: '',    // 空字符串表示所有人都可以查看单条记录
  createRule: '',  // 允许创建
  updateRule: '',  // 允许更新
  deleteRule: '',  // 允许删除
};

/**
 * 工作流执行历史记录表配置
 * 用于存储工作流的执行历史，包括执行结果、节点执行情况等
 */
export const EXECUTION_HISTORY_TABLE_SCHEMA = {
  name: 'execution_history',
  type: 'base',
  fields: [
    {
      name: 'executionId',
      type: 'text',
      required: true,
      options: {
        min: 1,
        max: 255,
      }
    },
    {
      name: 'workflowId',
      type: 'text',
      required: true,
      options: {
        min: 1,
        max: 255,
      }
    },
    {
      name: 'success',
      type: 'bool',
      required: true,
    },
    {
      name: 'startTime',
      type: 'number',
      required: true,
    },
    {
      name: 'endTime',
      type: 'number',
      required: false,
    },
    {
      name: 'duration',
      type: 'number',
      required: false,
    },
    {
      name: 'error',
      type: 'json',
      required: false,
    },
    {
      name: 'executedNodeCount',
      type: 'number',
      required: false,
    },
    {
      name: 'skippedNodeCount',
      type: 'number',
      required: false,
    },
    {
      name: 'cachedNodeCount',
      type: 'number',
      required: false,
    },
    {
      name: 'executedNodeIds',
      type: 'json',
      required: false,
    },
    {
      name: 'skippedNodeIds',
      type: 'json',
      required: false,
    },
    {
      name: 'cachedNodeIds',
      type: 'json',
      required: false,
    },
    {
      name: 'nodeResults',
      type: 'json',
      required: false,
    },
    {
      name: 'nodes',
      type: 'json',
      required: false,
    },
    {
      name: 'edges',
      type: 'json',
      required: false,
    },
  ],
  // 访问规则：允许所有操作（可根据实际需求调整）
  listRule: '',
  viewRule: '',
  createRule: '',
  updateRule: '',
  deleteRule: '',
};

/**
 * 前端应用缓存表配置
 * 用于存储前端应用的各种缓存数据，如画布状态、编辑器配置、全局变量等
 */
export const APP_CACHE_TABLE_SCHEMA = {
  name: 'app_cache',
  type: 'base',
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      options: {
        min: 1,
        max: 255,
      }
    },
    {
      name: 'namespace',
      type: 'text',
      required: false,
      options: {
        min: 0,
        max: 100,
      }
    },
    {
      name: 'value',
      type: 'json',
      required: true,
    },
    {
      name: 'expireAt',
      type: 'date',
      required: false,
    },
  ],
  // 访问规则：允许所有操作（可根据实际需求调整）
  listRule: '',
  viewRule: '',
  createRule: '',
  updateRule: '',
  deleteRule: '',
};

