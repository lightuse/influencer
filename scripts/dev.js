// 子プロセスの生成に使用
import { spawn } from 'child_process';
// ファイル監視に使用
import { watch } from 'fs';
// パス解決に使用
import { resolve } from 'path';

// サーバープロセスを保持する変数
let serverProcess = null;

// サーバーを起動（既存プロセスがあればkillして再起動）
function startServer() {
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('🚀 Starting server...');
  serverProcess = spawn('node', ['dist/src/app.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}

// ビルドしてサーバーを起動
function buildAndStart() {
  console.log('🔨 Building...');
  const buildProcess = spawn('pnpm', ['run', 'build'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  buildProcess.on('close', code => {
    if (code === 0) {
      startServer();
    }
  });
}

// 最初に一度ビルド＆サーバー起動
buildAndStart();

// srcディレクトリ配下の.tsファイルを監視し、変更があればビルド＆サーバー再起動
const srcPath = resolve(process.cwd(), 'src');
watch(srcPath, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.ts')) {
    console.log(`📝 File changed: ${filename}`);
    buildAndStart();
  }
});

// Ctrl+C などでプロセス終了時にサーバープロセスもkill
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});
