// #!/usr/bin/env node
// OpenAPI/TypeSpec から型定義・API実装テンプレートを自動生成するスクリプト

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// API型定義・実装テンプレート生成のメイン関数
async function generateAPI() {
  try {
    console.log('🔄 Compiling TypeSpec schemas...');

    // TypeSpecスキーマをコンパイル
    await execAsync('tsp compile schemas/main.tsp');
    console.log('✅ TypeSpec compilation completed');

    // OpenAPI型定義（TypeScript型）を生成
    console.log('🔄 Generating TypeScript types from OpenAPI...');
    await execAsync(
      'pnpx openapi-typescript tsp-output/@typespec/openapi3/openapi.yaml -o generated/api-types.ts'
    );
    console.log('✅ TypeScript types generated');

    // API実装テンプレートを生成
    await generateApiImplementation();
    console.log('✅ API implementation template generated');
  } catch (error) {
    console.error('❌ API generation failed:', error);
    process.exit(1);
  }
}

// API実装テンプレートを生成し、ファイルに書き出す関数
async function generateApiImplementation() {
  const apiImplementationTemplate = `// Auto-generated API implementation
// This file provides basic structure - customize as needed

import { components } from './api-types.js';

type InfluencerStats = components['schemas']['InfluencerStats'];
type TopInfluencer = components['schemas']['TopInfluencer'];
type NounAnalysisResult = components['schemas']['NounAnalysisResult'];
type ImportResult = components['schemas']['ImportResultResponse'];

export interface ApiImplementation {
  // ヘルスチェック
  health(): Promise<{ status: string; timestamp: string }>;
  
  // インフルエンサー関連エンドポイント
    getInfluencerStats(influencerId: number): Promise<InfluencerStats>;
    getTopInfluencersByLikes(limit?: number): Promise<TopInfluencer[]>;
    getTopInfluencersByComments(limit?: number): Promise<TopInfluencer[]>;
    getTopNouns(influencerId: number, limit?: number): Promise<NounAnalysisResult>;
  
  // インポート関連エンドポイント
    getImportStatus(): Promise<ImportResult>;
    importCSV(file: Buffer): Promise<ImportResult>;
}

// サービスと連携するための基本実装構造
export const apiImplementation: ApiImplementation = {
  async health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  },

  async getInfluencerStats(influencerId: number) {
    // TODO: InfluencerServiceと連携して実装
    throw new Error('Not implemented');
  },

  async getTopInfluencersByLikes(limit = 10) {
    // TODO: InfluencerServiceと連携して実装
    throw new Error('Not implemented');
  },

  async getTopInfluencersByComments(limit = 10) {
    // TODO: InfluencerServiceと連携して実装
    throw new Error('Not implemented');
  },

  async getTopNouns(influencerId: number, limit = 10) {
    // TODO: InfluencerServiceと連携して実装
    throw new Error('Not implemented');
  },

  async getImportStatus() {
    // TODO: ImportServiceと連携して実装
    throw new Error('Not implemented');
  },

  async importCSV(file: Buffer) {
    // TODO: ImportServiceと連携して実装
    throw new Error('Not implemented');
  }
};`;

  await fs.writeFile(
    'generated/api-implementation.ts',
    apiImplementationTemplate
  );
}

// スクリプト実行時に generateAPI を呼び出す
generateAPI();
