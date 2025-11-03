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

