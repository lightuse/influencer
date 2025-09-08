import { vi, describe, it, expect } from 'vitest';
import { TextAnalysisService } from '../src/application/text-analysis.service.js';
import * as kuromoji from 'kuromoji';

// kuromojiのモック化
vi.mock('kuromoji', () => {
  let shouldBuildFail = false; // モック用フラグ

  // テキストを形態素解析するモック関数
  const mockTokenize = vi.fn(text => {
    if (text === '猫が好きです。犬も好きです。') {
      return [
        { surface_form: '猫', pos: '名詞' },
        { surface_form: '好き', pos: '名詞' },
        { surface_form: '犬', pos: '名詞' },
        { surface_form: '好き', pos: '名詞' },
      ];
    } else if (text === '猫と犬が遊んでいます。') {
      return [
        { surface_form: '猫', pos: '名詞' },
        { surface_form: '犬', pos: '名詞' },
        { surface_form: '遊ん', pos: '動詞' },
      ];
    }
    return [];
  });

  // モックのビルダー関数
  const mockBuild = vi.fn(callback => {
    if (shouldBuildFail) {
      callback(new Error('Mock build failure'), null);
    } else {
      callback(null, { tokenize: mockTokenize });
    }
  });

  return {
    default: {
      builder: vi.fn(() => ({
        build: mockBuild,
      })),
    },
    _setBuildFail: (fail: boolean) => {
      shouldBuildFail = fail;
    },
  };
});

// サンプルテキスト
const sampleTexts = ['猫が好きです。犬も好きです。', '猫と犬が遊んでいます。'];

// TextAnalysisServiceの単体テスト
describe('TextAnalysisService', () => {
  let service: TextAnalysisService;

  beforeEach(() => {
    service = new TextAnalysisService();
    // 各テストでサービスを初期化
  });

  // テキストから名詞を抽出できること
  it('should extract nouns from texts', async () => {
    await service.initialize(); // Initialize here
    const result = await service.analyzeTexts(sampleTexts);
    expect(result.sort((a, b) => a.noun.localeCompare(b.noun))).toEqual([
      { noun: '好き', count: 2 },
    ]);
  });

  // 空配列入力時は空配列を返すこと
  it('should return empty array for empty input', async () => {
    await service.initialize(); // Initialize here
    const result = await service.analyzeTexts([]);
    expect(result).toEqual([]);
  });

  // 空文字列のみの場合も空配列を返すこと
  it('should return empty array for texts containing only empty strings', async () => {
    await service.initialize();
    const result = await service.analyzeTexts(['', ' ']);
    expect(result).toEqual([]);
  });

  // tokenizer未初期化時も例外を出さず動作すること
  it('should handle tokenizer not initialized', async () => {
    // 強制的に未初期化状態にする
    (service as any).tokenizer = null;
    // analyzeTexts内でinitializeが呼ばれることを期待
    const result = await service.analyzeTexts(['猫']);
    expect(Array.isArray(result)).toBe(true);
  });

  // 初期化失敗時にエラーを投げること
  it('should handle initialization failure', async () => {
    // モックのビルド失敗を設定
    vi.mocked(kuromoji as any)._setBuildFail(true);

    // 初期化時にエラーがスローされることを期待
    await expect(service.initialize()).rejects.toThrow('Mock build failure');

    // モックのビルド成功を設定
    vi.mocked(kuromoji as any)._setBuildFail(false);
  });
});
