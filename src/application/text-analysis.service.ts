import { NounCount } from '../domain/entities.js';
import kuromoji from 'kuromoji';

/**
 * テキスト分析（名詞抽出）サービス。
 * Kuromojiを用いて日本語テキストから名詞を抽出します。
 */
export class TextAnalysisService {
  /** 名詞フィルタ用の品詞名 */
  static readonly NOUN_POS = '名詞';
  /** 名詞の最小長さ */
  static readonly MIN_NOUN_LENGTH = 2;
  /** Kuromojiトークナイザーインスタンス */
  private tokenizer: import('kuromoji').Tokenizer | null = null;
  /** 初期化処理のPromise（競合防止用） */
  private initializingPromise: Promise<void> | null = null;

  /**
   * Kuromojiトークナイザーを初期化します。
   * @returns 初期化完了時に解決されるPromise
   */
  async initialize(): Promise<void> {
    if (this.tokenizer) return;
    if (this.initializingPromise) {
      await this.initializingPromise;
      return;
    }
    this.initializingPromise = new Promise((resolve, reject) => {
      kuromoji
        .builder({ dicPath: 'node_modules/kuromoji/dict' })
        .build((err: Error | null, tokenizer: import('kuromoji').Tokenizer) => {
          if (err) {
            this.initializingPromise = null;
            reject(err);
          } else {
            this.tokenizer = tokenizer;
            this.initializingPromise = null;
            resolve();
          }
        });
    });
    await this.initializingPromise;
  }

  /**
   * 複数テキストから名詞を抽出し、出現回数順に返す。
   * @param texts 分析対象のテキスト配列
   * @returns 名詞と出現回数の配列
   */
  async analyzeTexts(texts: string[]): Promise<NounCount[]> {
    if (!this.tokenizer) {
      await this.initialize();
      if (!this.tokenizer) {
        throw new Error('Tokenizer initialization failed.');
      }
    }

    const nounCounts = new Map<string, number>();

    for (const text of texts) {
      if (!text || !this.tokenizer) continue;

      const tokens = this.tokenizer.tokenize(text);
      for (const token of tokens) {
        // 名詞のみを抽出（品詞が名詞で、長さがMIN_NOUN_LENGTH文字以上のもの）
        if (
          token.pos === TextAnalysisService.NOUN_POS &&
          token.surface_form.length >= TextAnalysisService.MIN_NOUN_LENGTH
        ) {
          const noun = token.surface_form;
          nounCounts.set(noun, (nounCounts.get(noun) || 0) + 1);
        }
      }
    }

    // 出現回数で降順ソート
    return Array.from(nounCounts.entries())
      .map(([noun, count]) => ({ noun, count }))
      .sort((a, b) => b.count - a.count);
  }
}
