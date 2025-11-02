/**
 * IPC 配置
 */
export const IPC_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 默认超时时间（毫秒）
  LOG_ARGS: true, // 默认记录参数
  LOG_RESULT: true, // 默认记录结果
  EXECUTE_CHANNEL: 'ipc:execute', // 统一执行通道
  GET_CHANNELS_CHANNEL: 'ipc:getChannels', // 获取通道列表

  HTTP_PORT: 3230, // HTTP 服务端口
  WS_PORT: 3231, // WebSocket 服务端口
  VITE_PORT: 5173, // Vite 开发服务器端口
  POCKETBASE_PORT: 8071, // PocketBase 服务器端口
};