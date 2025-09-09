// ===============================
// このスクリプトの役割:
// 開発用サーバーの自動起動・再起動を行うユーティリティ。
// - dist/src/app.js（ビルド済みアプリ）をNode.jsで起動
// - src配下の.tsファイル変更を監視し、変更時に自動でビルド＆サーバー再起動
// - APP_PATH環境変数やコマンドライン引数でエントリーポイントのパスを上書き可能
// - エントリーポイントが存在しない場合はエラー終了
// ===============================

// 子プロセスの生成に使用
import { spawn } from 'child_process';
import { watch } from 'fs';
import { resolve } from 'path';
import fs from 'fs';
import { join } from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// サーバープロセスを保持する変数
let serverProcess = null;

// サーバーを起動（既存プロセスがあればkillして再起動）
// エントリーポイントのパスは環境変数や引数で上書き可能。存在しなければエラー終了。
function startServer() {
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('🚀 Starting server...');
  const defaultAppPath = join(__dirname, '../dist/src/app.js');
  const appPath = process.env.APP_PATH || process.argv[2] || defaultAppPath;

  if (!fs.existsSync(appPath)) {
    console.error(`Error: App file not found at path: ${appPath}`);
    process.exit(1);
  }

  serverProcess = spawn('node', [appPath], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
}

// ビルドしてサーバーを起動
// ビルド成功時のみサーバーを再起動
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
