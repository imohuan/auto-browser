// src/utils/crypto-utils.js
// 字符串加密解密工具

import crypto from 'crypto';
import { createLogger } from '../core/logger.js';

const logger = createLogger('utils/crypto-utils');

/**
 * 获取 app 对象（延迟导入，避免循环依赖）
 */
function getApp() {
  try {
    // 使用动态导入避免在导入时出错
    const { app } = require('electron');
    return app;
  } catch (e) {
    // 如果 electron 模块不可用，返回 null
    return null;
  }
}

// 默认加密算法
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // IV 长度（字节）
const SALT_LENGTH = 64; // 盐值长度（字节）
const TAG_LENGTH = 16; // 认证标签长度（字节）

/**
 * 生成密钥
 * 使用 PBKDF2 从密码派生密钥
 * @param {string} password - 密码
 * @param {Buffer} salt - 盐值
 * @returns {Buffer} 派生密钥
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * 加密字符串
 * @param {string} text - 要加密的文本
 * @param {string} password - 加密密码（可选，默认使用应用唯一标识）
 * @returns {string} 加密后的字符串（Base64 编码）
 */
export function encrypt(text, password = null) {
  try {
    if (!text) {
      return '';
    }

    // 如果没有提供密码，使用应用唯一标识作为默认密码
    if (!password) {
      // 使用用户数据目录路径作为唯一标识
      // 这样可以确保不同用户的数据使用不同的密钥
      const app = getApp();
      password = app ? app.getPath('userData') : 'default-password';
    }

    // 生成随机盐值
    const salt = crypto.randomBytes(SALT_LENGTH);
    // 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);
    // 派生密钥
    const key = deriveKey(password, salt);

    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 获取认证标签
    const tag = cipher.getAuthTag();

    // 组合：salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64'),
    ]);

    // 返回 Base64 编码的完整数据
    return combined.toString('base64');
  } catch (error) {
    logger.error('加密失败', { error: error.message });
    throw error;
  }
}

/**
 * 解密字符串
 * @param {string} encryptedText - 加密的文本（Base64 编码）
 * @param {string} password - 解密密码（可选，默认使用应用唯一标识）
 * @returns {string} 解密后的字符串
 */
export function decrypt(encryptedText, password = null) {
  try {
    if (!encryptedText) {
      return '';
    }

    // 如果没有提供密码，使用应用唯一标识作为默认密码
    if (!password) {
      const app = getApp();
      password = app ? app.getPath('userData') : 'default-password';
    }

    // 解码 Base64
    const combined = Buffer.from(encryptedText, 'base64');

    // 提取各部分
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // 派生密钥
    const key = deriveKey(password, salt);

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // 解密数据
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('解密失败', { error: error.message });
    throw error;
  }
}

