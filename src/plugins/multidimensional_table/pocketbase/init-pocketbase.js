import PocketBase from "pocketbase";
import { createLogger } from "../../../core/logger.js";
import { APP_CONFIG, POCKETBASE_CONFIG } from "../../../core/constants.js";
import { BrowserWindow, ipcMain } from "electron";
import { resolve, resolveUserData } from "../../../utils/path-resolver.js";
import { SecureStore } from "../../../utils/secure-store.js";
import { WORKFLOW_TABLE_SCHEMA } from "./tables.js";


export const createRegisterWindow = () => {
  const logger = createLogger("PocketBase注册窗口");
  return new Promise((resolvePromise, reject) => {
    // 创建注册窗口
    const registerWindow = new BrowserWindow({
      width: 400,
      height: 600,
      title: 'PocketBase 账号注册',
      resizable: false,
      modal: true,
      autoHideMenuBar: true,
      frame: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 加载注册表单页面
    const registerFormPath = resolve('plugins', 'multidimensional_table', 'pocketbase', 'register-form.html');
    registerWindow.loadFile(registerFormPath);

    let credentialsReceived = false;
    let promiseResolved = false;

    // 监听 IPC 消息获取用户输入
    const handleRegister = (event, data) => {
      if (event.sender === registerWindow.webContents && !promiseResolved) {
        credentialsReceived = true;
        promiseResolved = true;
        // 移除监听器
        ipcMain.removeListener('pocketbase:register-credentials', handleRegister);
        // 关闭窗口
        registerWindow.close();
        // 返回凭证
        resolvePromise({ username: data.username, password: data.password });
      }
    };

    ipcMain.on('pocketbase:register-credentials', handleRegister);

    // 监听窗口关闭事件（用户可能直接关闭窗口）
    registerWindow.on('closed', () => {
      // 移除监听器
      ipcMain.removeListener('pocketbase:register-credentials', handleRegister);
      // 如果窗口关闭但未收到数据，返回空值
      if (!credentialsReceived && !promiseResolved) {
        promiseResolved = true;
        logger.warn('注册窗口已关闭，未获取到凭证');
        resolvePromise({ username: "", password: "" });
      }
    });

    // 显示窗口
    registerWindow.show();
  });
}

/**
 * PocketBase 初始化管理类（单例模式）
 */
export class PocketBaseInitializer {
  // 单例实例
  static _instance = null;

  /**
   * 获取单例实例
   * @param {Object} options - 配置选项
   * @param {string} options.pbUrl - PocketBase 服务器地址，默认使用配置中的值
   * @returns {PocketBaseInitializer} 单例实例
   */
  static getInstance(options = {}) {
    if (!PocketBaseInitializer._instance) {
      PocketBaseInitializer._instance = new PocketBaseInitializer(options);
    }
    return PocketBaseInitializer._instance;
  }

  /**
   * @param {Object} options - 配置选项
   * @param {string} options.pbUrl - PocketBase 服务器地址，默认使用配置中的值
   */
  constructor(options = {}) {
    // 防止直接 new 创建多个实例
    if (PocketBaseInitializer._instance) {
      return PocketBaseInitializer._instance;
    }

    this.pbUrl = options.pbUrl || APP_CONFIG.POCKETBASE_URL || "http://127.0.0.1:8090";
    this.logger = createLogger("PocketBase初始化");
    // 缓存已认证的 PocketBase 实例
    this._authenticatedPB = null;
    this._cachedUsername = null;
    this._cachedPassword = null;
    // 创建安全存储实例（加密存储凭证）
    this.store = new SecureStore({
      path: APP_CONFIG.STORE_FILE,
      encrypt: true, // 启用加密
      defaults: {
        credentials: {
          username: '',
          password: '',
          updatedAt: null,
        },
      },
    });

    PocketBaseInitializer._instance = this;
  }

  /**
   * 设置并保存凭证到本地文件（加密存储）
   * @param {string} username - 用户名/邮箱
   * @param {string} password - 密码
   */
  async setCredentials(username, password) {
    if (!username || !password) {
      this.logger.warn('用户名或密码为空，无法保存');
      return;
    }

    try {
      // 使用 SecureStore 保存凭证（自动加密）
      this.store.set('credentials', {
        username,
        password,
        updatedAt: new Date().toISOString(),
      });
      this.logger.debug('凭证已保存到本地文件（已加密）', { username });
    } catch (error) {
      this.logger.error('保存凭证失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 从本地文件读取凭证（自动解密）
   * @returns {Promise<{username: string, password: string} | null>} 返回凭证对象，如果不存在则返回 null
   */
  async _readCredentialsFromFile() {
    try {
      const credentials = this.store.get('credentials');

      if (credentials && credentials.username && credentials.password) {
        this.logger.debug('从本地文件读取凭证（已解密）', { username: credentials.username });
        return {
          username: credentials.username,
          password: credentials.password,
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('读取凭证文件失败', { error: error.message });
      return null;
    }
  }

  /**
   * 异步获取用户名和密码凭证
   * 优先从本地文件读取，如果没有则打开注册窗口获取
   * @returns {Promise<{username: string, password: string}>} 返回用户名和密码对象
   */
  async getCredentials() {
    // 先从本地文件读取
    const storedCredentials = await this._readCredentialsFromFile();

    // 如果本地文件中有有效的凭证，直接返回
    if (storedCredentials) {
      return storedCredentials;
    }

    // 如果本地文件中没有凭证，打开注册窗口获取
    this.logger.debug('本地文件中没有凭证，打开注册窗口');
    const credentials = await createRegisterWindow();

    // 如果用户成功输入了凭证，保存到本地文件
    if (credentials.username && credentials.password) {
      await this.setCredentials(credentials.username, credentials.password);
      return credentials;
    }

    // 如果用户关闭了窗口或未输入凭证，返回空值
    this.logger.warn('未获取到凭证');
    return { username: '', password: '' };
  }

  /**
   * 通用函数：解析并获取用户名和密码凭证
   * @param {string|null} username - 用户名，如果为 null 则从异步函数获取
   * @param {string|null} password - 密码，如果为 null 则从异步函数获取
   * @returns {Promise<{username: string, password: string}>} 返回解析后的用户名和密码对象
   */
  async _resolveCredentials(username = null, password = null) {
    if (username === null || password === null) {
      const credentials = await this.getCredentials();
      return {
        username: username ?? credentials.username,
        password: password ?? credentials.password,
      };
    }
    return { username, password };
  }

  /**
   * 检查已缓存的 PocketBase 实例是否仍然有效
   * @returns {Promise<boolean>} 返回实例是否有效
   */
  async _isAuthenticatedPBValid() {
    if (!this._authenticatedPB) {
      return false;
    }

    try {
      // 检查是否有有效的认证 token
      if (!this._authenticatedPB.authStore.isValid) {
        this.logger.debug("缓存的认证已失效");
        return false;
      }

      // 尝试一个简单的 API 调用来验证连接是否有效
      await this._authenticatedPB.health.check();
      this.logger.debug("缓存的认证实例仍然有效");
      return true;
    } catch (error) {
      this.logger.debug("缓存的认证实例已失效", { error: error.message });
      this.clearCache();
      return false;
    }
  }

  /**
   * 通过 API 创建 PocketBase 超级用户账号
   * @param {string} token - 从 pbinstal URL 中提取的 JWT token
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<PocketBase>} 返回已认证的 PocketBase 实例
   */
  async createSuperUserAccount(token, username = null, password = null) {
    const pb = new PocketBase(this.pbUrl);

    try {
      this.logger.debug("尝试通过 API 创建超级用户账号...", { username });

      // 调用 PocketBase 的初始化 API 端点创建超级用户
      // 端点: /api/collections/_superusers/records
      // 授权头：直接使用 token（不是 Bearer 格式）
      const response = await fetch(`${this.pbUrl}/api/collections/_superusers/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token, // 直接使用 token，不使用 Bearer 前缀
        },
        body: JSON.stringify({
          email: username,
          password: password,
          passwordConfirm: password, // 需要提供密码确认
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `创建超级用户失败: ${response.status} ${response.statusText}. ` +
          `详情: ${JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();
      this.logger.debug("创建超级用户成功", { result });
      this.logger.debug("超级用户创建成功", { adminId: result.id });

      // 创建成功后，使用新创建的账号进行认证
      await pb.collection('_superusers').authWithPassword(username, password);
      this.logger.debug("超级用户认证成功");

      // 缓存认证实例和凭证
      this._authenticatedPB = pb;
      this._cachedUsername = username;
      this._cachedPassword = password;

      return pb;
    } catch (error) {
      this.logger.error("创建超级用户失败", {
        error: error.message,
        username,
      });
      throw error;
    }
  }


  /**
   * 获取已认证的 PocketBase 实例（复用已缓存的实例）
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<PocketBase>} 返回已认证的 PocketBase 实例
   */
  async getAuthenticatedPB(username = null, password = null) {
    ({ username, password } = await this._resolveCredentials(username, password));

    // 检查是否可以使用缓存的实例
    const isSameCredentials = this._cachedUsername === username && this._cachedPassword === password;
    if (isSameCredentials && await this._isAuthenticatedPBValid()) {
      this.logger.debug("复用已缓存的认证实例");
      return this._authenticatedPB;
    }

    // 需要重新登录
    this.logger.debug("创建新的认证实例", { username });
    const pb = new PocketBase(this.pbUrl);

    // 检查 PocketBase 服务是否可访问
    try {
      await pb.health.check();
      this.logger.debug("PocketBase 服务连接成功");
    } catch (error) {
      this.logger.error("无法连接到 PocketBase 服务");
      throw error;
    }

    // 尝试以超级用户身份登录
    this.logger.debug("尝试登录超级用户账号...", { username });
    try {
      // 注意：PocketBase 最新版本使用 _superusers 集合
      await pb.collection('_superusers').authWithPassword(username, password);
      this.logger.debug("超级用户登录成功");

      // 缓存认证实例和凭证
      this._authenticatedPB = pb;
      this._cachedUsername = username;
      this._cachedPassword = password;

      return pb;
    } catch (error) {
      // 登录失败，清除缓存的实例
      this.clearCache();
      // 登录失败，说明可能是首次运行
      this.logger.warn("超级用户登录失败");
      if (error.status === 404 || error.status === 400) {
        this.logger.warn(`\n❌ 超级用户账号不存在！\n\n请先通过 Admin UI 创建超级用户账号：\n  1. 访问: http://127.0.0.1:8090/_/\n  2. 填写超级用户信息:\n     Email: ${username}\n     Password: ${password}\n  3. 创建完成后，重新运行: pnpm run init\n`);
        throw error;
      }
      throw error;
    }
  }



  /**
   * 手动清除缓存的认证实例（公开方法）
   */
  clearCache() {
    this._authenticatedPB = null;
    this._cachedUsername = null;
    this._cachedPassword = null;
    this.logger.debug("已清除缓存的认证实例");
  }

  /**
   * 创建 PocketBase 数据库集合
   * @param {boolean} forceRecreate - 如果集合已存在，是否删除并重新创建，默认为 true
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<Object>} 返回创建的集合对象
   */
  async createCollection(forceRecreate = true, username = null, password = null) {
    ({ username, password } = await this._resolveCredentials(username, password));
    const pb = await this.getAuthenticatedPB(username, password);

    try {
      // 检查集合是否已存在
      this.logger.debug("检查集合是否存在...");
      const collectionName = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA.name;
      let existingCollection = null;
      try {
        existingCollection = await pb.collections.getOne(collectionName);
        this.logger.debug(`集合 ${collectionName} 已存在`);

        if (forceRecreate) {
          // 如果设置了强制重建，则删除旧集合
          this.logger.debug("删除旧集合...");
          await pb.collections.delete(existingCollection.id);
          this.logger.debug("旧集合已删除");
          console.log("🗑️  已删除旧的 spread 集合");
        } else {
          // 如果不强制重建，直接返回已存在的集合
          this.logger.debug("集合已存在，跳过创建");
          return existingCollection;
        }
      } catch (error) {
        if (error.status === 404) {
          this.logger.debug("集合不存在，将创建新集合");
        } else {
          throw error;
        }
      }

      // 创建集合
      this.logger.debug("创建集合 spread...");

      // 使用 fields 参数（PocketBase 0.31.0 正确格式）
      // 根据官方文档：https://pocketbase.io/docs/api-collections
      const collectionSchema = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA;

      const collection = await pb.collections.create(collectionSchema);
      this.logger.debug("集合创建成功", { id: collection.id, name: collection.name });

      return collection;
    } catch (error) {
      this.logger.error("创建集合失败", error);
      throw error;
    }
  }

  /**
   * 通用方法：根据 schema 创建 PocketBase 数据库集合
   * @param {Object} collectionSchema - 集合的配置 schema
   * @param {boolean} forceRecreate - 如果集合已存在，是否删除并重新创建，默认为 true
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<Object>} 返回创建的集合对象
   */
  async createCollectionFromSchema(collectionSchema, forceRecreate = true, username = null, password = null) {
    ({ username, password } = await this._resolveCredentials(username, password));
    const pb = await this.getAuthenticatedPB(username, password);

    try {
      // 检查集合是否已存在
      this.logger.debug("检查集合是否存在...");
      const collectionName = collectionSchema.name;
      let existingCollection = null;
      try {
        existingCollection = await pb.collections.getOne(collectionName);
        this.logger.debug(`集合 ${collectionName} 已存在`);

        if (forceRecreate) {
          // 如果设置了强制重建，则删除旧集合
          this.logger.debug("删除旧集合...");
          await pb.collections.delete(existingCollection.id);
          this.logger.debug("旧集合已删除");
          console.log(`🗑️  已删除旧的 ${collectionName} 集合`);
        } else {
          // 如果不强制重建，直接返回已存在的集合
          this.logger.debug("集合已存在，跳过创建");
          return existingCollection;
        }
      } catch (error) {
        if (error.status === 404) {
          this.logger.debug("集合不存在，将创建新集合");
        } else {
          throw error;
        }
      }

      // 创建集合
      this.logger.debug(`创建集合 ${collectionName}...`);

      const collection = await pb.collections.create(collectionSchema);
      this.logger.debug("集合创建成功", { id: collection.id, name: collection.name });

      return collection;
    } catch (error) {
      this.logger.error(`创建集合 ${collectionSchema.name} 失败`, error);
      throw error;
    }
  }

  /**
   * 测试添加数据、查询数据、删除数据的功能
   * @param {Object} testData - 要测试的数据对象
   * @param {number} delay - 延迟查询的毫秒数，默认 500ms
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<boolean>} 返回测试是否成功
   */
  async testAddAndDelete(testData = null, delay = 500, username = null, password = null) {
    ({ username, password } = await this._resolveCredentials(username, password));
    const pb = await this.getAuthenticatedPB(username, password);
    const collectionName = POCKETBASE_CONFIG.SPREAD_COLLECTION_SCHEMA.name;

    try {
      // 如果没有提供测试数据，使用默认测试数据
      const data = testData || {
        sheet_id: "test",
        row: 999,
        col: 999,
        value: "test_value",
        computed_value: "",
        formula: "",
        data_type: "text",
        status: "pending",
      };

      this.logger.debug("开始测试：添加数据", data);

      // 1. 添加数据
      const createdRecord = await pb.collection(collectionName).create(data);
      this.logger.debug("数据添加成功", { id: createdRecord.id });

      // 2. 延迟查询
      this.logger.debug(`等待 ${delay}ms 后查询数据...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // 3. 查询数据，判断是否添加成功
      const queryResult = await pb.collection(collectionName).getList(1, 1, {
        filter: `id = "${createdRecord.id}"`,
      });

      if (queryResult.items.length === 0) {
        this.logger.warn("数据添加失败：查询不到记录");
        return false;
      }

      const foundRecord = queryResult.items[0];
      this.logger.debug("数据查询成功", { id: foundRecord.id });

      // 4. 验证数据是否正确
      const isDataMatch =
        foundRecord.sheet_id === data.sheet_id &&
        foundRecord.row === data.row &&
        foundRecord.col === data.col &&
        foundRecord.value === data.value;

      if (!isDataMatch) {
        this.logger.warn("数据不匹配", {
          expected: data,
          actual: foundRecord
        });
        return false;
      }

      this.logger.debug("数据验证通过，准备删除...");

      // 5. 删除该数据
      await pb.collection(collectionName).delete(foundRecord.id);
      this.logger.debug("测试数据已删除", { id: foundRecord.id });

      this.logger.debug("✅ 测试完成：添加、查询、删除功能正常");
      return true;
    } catch (error) {
      this.logger.error("测试失败", error);
      throw error;
    }
  }

  /**
   * 初始化 PocketBase 数据库集合
   * @param {boolean} forceRecreate - 如果集合已存在，是否删除并重新创建，默认为 false
   * @param {string} username - 超级用户邮箱或用户名，如果不提供则从异步函数获取
   * @param {string} password - 超级用户密码，如果不提供则从异步函数获取
   * @returns {Promise<boolean>} 返回是否成功
   */
  async initPocketBase(forceRecreate = false, username = null, password = null) {
    ({ username, password } = await this._resolveCredentials(username, password));
    try {
      // 创建 spread 集合
      this.logger.debug("创建 spread 集合...");
      const spreadCollection = await this.createCollection(forceRecreate, username, password);

      // 创建 workflows 集合
      this.logger.debug("创建 workflows 集合...");
      const workflowCollection = await this.createCollectionFromSchema(
        WORKFLOW_TABLE_SCHEMA,
        forceRecreate,
        username,
        password
      );

      // 测试数据库功能是否正常
      this.logger.debug("测试数据库功能...");
      const testResult = await this.testAddAndDelete(null, 500, username, password);
      if (!testResult) {
        this.logger.debug("数据库功能测试失败");
        return false;
      }

      this.logger.debug("数据库功能测试通过");

      this.logger.debug("PocketBase 初始化完成", {
        spreadCollectionId: spreadCollection.id,
        workflowCollectionId: workflowCollection.id,
        adminUI: `${this.pbUrl}/_/`,
        email: username,
      });

      console.log("✅ PocketBase 初始化成功");
      console.log(`   - spread 集合: ${spreadCollection.name}`);
      console.log(`   - workflows 集合: ${workflowCollection.name}`);

      return true;
    } catch (error) {
      this.logger.error("初始化失败", error);
      this.logger.debug("初始化失败详情", {
        message: error.message,
        isAbort: error.isAbort,
      });

      if (!error.isAbort) {
        this.logger.debug("故障排查建议", {
          checks: [
            "PocketBase 服务是否正常运行",
            "端口 8090 是否可访问",
            "查看 PocketBase 控制台日志",
          ],
        });
      }

      return false;
    }
  }
}
