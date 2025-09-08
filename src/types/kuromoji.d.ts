/**
 * Type definitions for kuromoji.js
 * Project: https://github.com/takuyaa/kuromoji.js
 */
declare module 'kuromoji' {
  interface Token {
    surface_form: string;
    pos: string;
    pos_detail_1: string;
    pos_detail_2: string;
    pos_detail_3: string;
    conjugated_type: string;
    conjugated_form: string;
    basic_form: string;
    reading: string;
    pronunciation: string;
  }

  interface Tokenizer {
    tokenize(text: string): Token[];
  }

  interface Builder {
    build(callback: (err: Error | null, tokenizer: Tokenizer) => void): void;
  }

  function builder(options: { dicPath: string }): Builder;
}
