// src/utils/file-utils.js
// 文件操作工具

import fs from 'fs';
import path from 'path';
import { createLogger } from '../core/logger.js';

const logger = createLogger('utils/file-utils');

/**
 * 确保目录存在，不存在则创建
 * @param {string} dirPath - 目录路径
 */
export function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.debug(`创建目录: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`创建目录失败: ${dirPath}`, error);
    throw error;
  }
}

/**
 * 读取 JSON 文件
 * @param {string} filePath - 文件路径
 * @returns {any} 解析后的 JSON 对象
 */
export function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`读取 JSON 文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 写入 JSON 文件
 * @param {string} filePath - 文件路径
 * @param {any} data - 数据对象
 * @param {boolean} pretty - 是否格式化，默认 true
 */
export function writeJSON(filePath, data, pretty = true) {
  try {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.debug(`写入 JSON 文件: ${filePath}`);
  } catch (error) {
    logger.error(`写入 JSON 文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 读取文本文件
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
export function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    logger.error(`读取文本文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 写入文本文件
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 */
export function writeText(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.debug(`写入文本文件: ${filePath}`);
  } catch (error) {
    logger.error(`写入文本文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 追加文本到文件
 * @param {string} filePath - 文件路径
 * @param {string} content - 追加内容
 */
export function appendText(filePath, content) {
  try {
    fs.appendFileSync(filePath, content, 'utf-8');
  } catch (error) {
    logger.error(`追加文本失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 删除文件
 * @param {string} filePath - 文件路径
 */
export function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`删除文件: ${filePath}`);
    }
  } catch (error) {
    logger.error(`删除文件失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Object} 文件信息
 */
export function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    logger.error(`获取文件信息失败: ${filePath}`, error);
    throw error;
  }
}

/**
 * 列出目录下的所有文件
 * @param {string} dirPath - 目录路径
 * @param {boolean} recursive - 是否递归，默认 false
 * @returns {string[]} 文件路径列表
 */
export function listFiles(dirPath, recursive = false) {
  try {
    const files = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isFile()) {
        files.push(fullPath);
      } else if (stats.isDirectory() && recursive) {
        files.push(...listFiles(fullPath, true));
      }
    }

    return files;
  } catch (error) {
    logger.error(`列出文件失败: ${dirPath}`, error);
    throw error;
  }
}

