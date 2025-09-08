import { NounCount } from '../domain/entities.js';
import kuromoji from 'kuromoji';

/**
 * Kuromojiのトークン情報。
 */
interface KuromojiToken {
  /** 表層形（実際の文字列） */
  surface_form: string;
  /** 品詞 */
  pos: string;
}

/**
 * Kuromojiのトークナイザーインターフェース。
 */
interface KuromojiTokenizer {
  /**
   * テキストをトークン配列に分割する。
   * @param text 分析対象テキスト
   */
  tokenize(text: string): KuromojiToken[];
}

/**
 * テキスト分析（名詞抽出）サービス。
 * Kuromojiを用いて日本語テキストから名詞を抽出します。
 */
export class TextAnalysisService {
  /** Kuromojiトークナイザーインスタンス */
  private tokenizer: KuromojiTokenizer | null = null;

  /**
   * Kuromojiトークナイザーを初期化します。
   * @returns 初期化完了時に解決されるPromise
   */
  async initialize(): Promise<void> {
    if (this.tokenizer) return;

    return new Promise((resolve, reject) => {
      kuromoji
        .builder({ dicPath: 'node_modules/kuromoji/dict' })
        .build((err: Error | null, tokenizer: KuromojiTokenizer) => {
          if (err) {
            reject(err);
          } else {
            this.tokenizer = tokenizer;
            resolve();
          }
        });
    });
  }

  /**
   * 複数テキストから名詞を抽出し、出現回数順に返す。
   * @param texts 分析対象のテキスト配列
   * @returns 名詞と出現回数の配列
   */
  async analyzeTexts(texts: string[]): Promise<NounCount[]> {
    if (!this.tokenizer) {
      await this.initialize();
    }

    const nounCounts = new Map<string, number>();

    for (const text of texts) {
      if (!text || !this.tokenizer) continue;

      const tokens = this.tokenizer.tokenize(text);
      for (const token of tokens) {
        // 名詞のみを抽出（品詞が名詞で、長さが2文字以上のもの）
        if (token.pos === '名詞' && token.surface_form.length >= 2) {
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
