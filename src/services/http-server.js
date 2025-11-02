// src/services/http-server.js
// HTTP API 服务

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createLogger } from '../core/logger.js';
import { HTTP_CONFIG } from '../core/constants.js';
import { ipcManager } from '../core/ipc-manager.js';
import { resolve } from '../utils/path-resolver.js';

const logger = createLogger('services/http-server');

/**
 * HTTP 服务类
 */
class HTTPServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = null;

    this._setupMiddleware();
    this._setupRoutes();

    logger.debug('HTTP 服务初始化');
  }

  /**
   * 配置中间件
   */
  _setupMiddleware() {
    // CORS 跨域支持
    this.app.use(cors({
      origin: HTTP_CONFIG.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body 解析器
    this.app.use(express.json({ limit: HTTP_CONFIG.BODY_LIMIT }));
    this.app.use(express.urlencoded({ extended: true, limit: HTTP_CONFIG.BODY_LIMIT }));

    // 日志中间件
    this.app.use((req, res, next) => {
      logger.debug(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined,
      });
      next();
    });

  }

  _filterChannels(channels) {
    return channels.filter(channel => {
      if (channel.startsWith('ui:')) return false;
      return true;
    });
  }

  /**
   * 配置路由
   */
  _setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: this.port,
        version: '2.0.0',
      });
    });

    // 获取所有可用的 IPC 通道
    this.app.get('/api/channels', (req, res) => {
      try {
        const channels = ipcManager.getChannels();
        const filteredChannels = this._filterChannels(channels);
        res.json({
          success: true,
          channels: filteredChannels,
          count: filteredChannels.length,
          usage: 'POST /api/invoke 调用任意通道',
        });
      } catch (error) {
        logger.error('获取通道列表失败', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // 通用 IPC 调用接口（核心接口）
    this.app.post('/api/invoke', async (req, res) => {
      try {
        const { channel, args = [] } = req.body;

        if (this._filterChannels([channel]).length === 0) {
          return res.status(400).json({
            success: false,
            error: '通道不存在',
          });
        }

        // 验证参数
        if (!channel) {
          return res.status(400).json({
            success: false,
            error: '缺少必要参数: channel',
          });
        }

        if (!Array.isArray(args)) {
          return res.status(400).json({
            success: false,
            error: '参数 args 必须是数组',
          });
        }

        logger.debug(`HTTP API 调用: ${channel}`, { args });

        // 调用 IPC 管理器
        const result = await ipcManager.execute(channel, ...args);

        res.json(result);
      } catch (error) {
        logger.error('API 调用失败', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Node Editor 静态资源路由（放在 API 路由之后，避免冲突）
    const nodeEditorPath = resolve('web', 'node-editor');
    const staticOptions = {
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.ico': 'image/x-icon',
        };
        if (mimeTypes[ext]) {
          res.setHeader('Content-Type', mimeTypes[ext]);
        }
      },
    };

    // 挂载到 /node-editor 路径（主入口）
    this.app.use('/web', express.static(nodeEditorPath, staticOptions));
    // 为了支持 index.html 中的绝对路径，映射 /assets 和根资源
    this.app.use('/assets', express.static(path.join(nodeEditorPath, 'assets'), staticOptions));
    this.app.get('/vite.svg', (req, res) => {
      res.sendFile(path.join(nodeEditorPath, 'vite.svg'));
    });

    logger.debug(`Node Editor 静态服务已配置: ${nodeEditorPath}`);

    // 404 处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: `接口不存在: ${req.method} ${req.path}`,
      });
    });

    // 错误处理中间件
    this.app.use((err, req, res, next) => {
      logger.error('HTTP 服务器错误', err);
      res.status(500).json({
        success: false,
        error: err.message || '服务器内部错误',
      });
    });
  }

  /**
   * 启动 HTTP 服务
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`HTTP 服务已启动: http://localhost:${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('HTTP 服务启动失败', error);
          reject(error);
        });
      } catch (error) {
        logger.error('HTTP 服务启动异常', error);
        reject(error);
      }
    });
  }

  /**
   * 停止 HTTP 服务
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        logger.warn('HTTP 服务未运行');
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          logger.error('HTTP 服务停止失败', error);
          reject(error);
        } else {
          logger.debug('HTTP 服务已停止');
          this.server = null;
          resolve();
        }
      });
    });
  }
}

export { HTTPServer };

