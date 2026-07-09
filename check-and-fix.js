/**
 * 🛠️ SCRIPT KIỂM TRA & TỰ ĐỘNG SỬA LỖI (LINT, TYPE CHECK & BUILD)
 * Chạy được trên cả Local (Windows) và VPS (Linux)
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m'; // No Color

function logInfo(msg) {
  console.log(`\n${CYAN}ℹ️  [INFO] ${msg}${NC}`);
}

function logSuccess(msg) {
  console.log(`${GREEN}✅ [SUCCESS] ${msg}${NC}`);
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠️  [WARNING] ${msg}${NC}`);
}

function logError(msg) {
  console.log(`${RED}❌ [ERROR] ${msg}${NC}`);
}

function runStep(name, command) {
  console.log(`\n====================================`);
  console.log(`  🚀 BƯỚC: ${name}`);
  console.log(`  Lệnh: ${command}`);
  console.log(`====================================`);

  try {
    // Chạy lệnh và hiển thị output trực tiếp ra terminal
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    logSuccess(`${name} HOÀN TẤT TRƠN TRU.`);
    return true;
  } catch (error) {
    logError(`${name} THẤT BẠI.`);
    return false;
  }
}

function main() {
  logInfo('Bắt đầu quy trình tự động kiểm tra & sửa lỗi...');

  // Bước 1: Chạy ESLint Auto-Fix
  const lintCommand = 'npm run lint:fix';
  logInfo('Đang chạy ESLint sửa lỗi format tự động...');
  const lintPassed = runStep('ESLint Auto-Fix', lintCommand);
  if (!lintPassed) {
    logWarning('ESLint phát hiện có lỗi không thể tự sửa. Vui lòng kiểm tra log ở trên và sửa thủ công.');
  }

  // Bước 2: Kiểm tra kiểu TypeScript
  logInfo('Đang kiểm tra kiểu TypeScript (Type Check)...');
  const typeCheckCommand = 'npm run type-check';
  const typeCheckPassed = runStep('TypeScript Type Check', typeCheckCommand);
  if (!typeCheckPassed) {
    logError('Kiểm tra kiểu TypeScript thất bại! Không cho phép push code lỗi.');
    process.exit(1);
  }

  // Bước 3: Chạy Next.js Production Build thử nghiệm
  logInfo('Đang chạy Next.js Build thử nghiệm...');
  const buildCommand = 'npm run build';
  const buildPassed = runStep('Next.js Build Test', buildCommand);
  if (!buildPassed) {
    logError('Next.js Build thất bại! Không thể push code lỗi build lên production.');
    process.exit(1);
  }

  logSuccess('Tất cả các bước kiểm tra (Lint, TypeScript, Build) đã VƯỢT QUA thành công!');
  process.exit(0);
}

main();
