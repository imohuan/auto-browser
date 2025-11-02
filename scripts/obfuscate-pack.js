import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要混淆的文件扩展名
const OBFUSCATE_EXTENSIONS = ['.js'];

// 需要排除的目录名称
const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.vscode',
  '.idea',
  'pb_data',
];

// 需要排除的文件名模式
const EXCLUDE_FILE_PATTERNS = [
  '.log',
  '.map',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.md',
];

// javascript-obfuscator 配置
const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  target: 'node',
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
};

/**
 * 递归遍历目录，获取所有文件
 */
function getAllFiles(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const dirName = path.basename(filePath);
      if (!EXCLUDE_DIRS.includes(dirName)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 检查文件是否应该被排除
 */
function shouldExcludeFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);

  for (const pattern of EXCLUDE_FILE_PATTERNS) {
    if (fileName.includes(pattern) || relativePath.includes(pattern)) {
      return true;
    }
  }

  const parts = relativePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.includes(part)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查文件是否在 src 目录下
 */
function isInSrcDir(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return normalizedPath.startsWith('src/');
}

/**
 * 检查文件是否应该被混淆
 */
function shouldObfuscate(filePath) {
  if (!isInSrcDir(filePath)) {
    return false;
  }

  if (shouldExcludeFile(filePath)) {
    return false;
  }

  const ext = path.extname(filePath);
  return OBFUSCATE_EXTENSIONS.includes(ext);
}

/**
 * 混淆单个文件
 */
function obfuscateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 跳过空文件或非常小的文件
    if (content.trim().length < 10) {
      return content;
    }

    const result = JavaScriptObfuscator.obfuscate(content, OBFUSCATOR_OPTIONS);
    return result.getObfuscatedCode();
  } catch (error) {
    console.error(`混淆文件失败: ${filePath}`, error.message);
    return null;
  }
}

/**
 * 复制目录结构
 */
function copyDirectory(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = fs.readdirSync(srcDir);

  files.forEach((file) => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      const dirName = path.basename(srcPath);
      if (!EXCLUDE_DIRS.includes(dirName)) {
        copyDirectory(srcPath, destPath);
      }
    } else {
      if (!shouldExcludeFile(srcPath)) {
        const destDirPath = path.dirname(destPath);
        if (!fs.existsSync(destDirPath)) {
          fs.mkdirSync(destDirPath, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
      }
    }
  });
}

/**
 * 混淆 src 目录中的文件
 */
function obfuscateSrcDirectory(srcDir, destDir) {
  const srcPath = path.join(srcDir, 'src');

  if (!fs.existsSync(srcPath)) {
    console.warn('警告: src 目录不存在，跳过混淆');
    return { obfuscatedCount: 0, copiedCount: 0 };
  }

  const allFiles = getAllFiles(srcPath);
  let obfuscatedCount = 0;
  let copiedCount = 0;

  allFiles.forEach((filePath) => {
    const relativePath = path.relative(srcDir, filePath);
    const destPath = path.join(destDir, relativePath);

    const destDirPath = path.dirname(destPath);
    if (!fs.existsSync(destDirPath)) {
      fs.mkdirSync(destDirPath, { recursive: true });
    }

    if (shouldObfuscate(filePath)) {
      const obfuscatedCode = obfuscateFile(filePath);
      if (obfuscatedCode !== null) {
        fs.writeFileSync(destPath, obfuscatedCode, 'utf8');
        obfuscatedCount++;
        console.log(`✓ 已混淆: ${relativePath}`);
      } else {
        fs.copyFileSync(filePath, destPath);
        copiedCount++;
      }
    } else if (!shouldExcludeFile(filePath)) {
      fs.copyFileSync(filePath, destPath);
      copiedCount++;
    }
  });

  return { obfuscatedCount, copiedCount };
}

/**
 * 复制其他必要的文件（非 src 目录）
 */
function copyOtherFiles(srcDir, destDir) {
  const items = fs.readdirSync(srcDir);
  let copiedCount = 0;

  items.forEach((item) => {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    if (item === 'src') {
      return;
    }

    if (EXCLUDE_DIRS.includes(item)) {
      return;
    }

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
      copiedCount++;
    } else {
      if (!shouldExcludeFile(srcPath)) {
        const destDirPath = path.dirname(destPath);
        if (!fs.existsSync(destDirPath)) {
          fs.mkdirSync(destDirPath, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
      }
    }
  });

  return copiedCount;
}

/**
 * 主函数
 */
function main() {
  const srcDir = process.cwd();
  const destDir = path.join(srcDir, 'dist');

  console.log('开始混淆打包...');
  console.log(`源目录: ${srcDir}`);
  console.log(`目标目录: ${destDir}`);
  console.log('注意: 只混淆 src 目录下的 .js 文件\n');

  // 清理目标目录
  if (fs.existsSync(destDir)) {
    console.log('清理旧的 dist 目录...');
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // 1. 混淆 src 目录下的文件
  console.log('正在混淆 src 目录...');
  const { obfuscatedCount, copiedCount: srcCopiedCount } = obfuscateSrcDirectory(srcDir, destDir);

  // 2. 复制其他文件（非 src 目录）
  console.log('\n正在复制其他文件...');
  const otherCopiedCount = copyOtherFiles(srcDir, destDir);

  console.log(`\n混淆完成: ${obfuscatedCount} 个文件已混淆, ${srcCopiedCount + otherCopiedCount} 个文件已复制`);
  console.log('\n混淆打包完成！');
  console.log(`输出目录: ${destDir}`);
}

try {
  main();
} catch (error) {
  console.error('错误:', error);
  process.exit(1);
}


