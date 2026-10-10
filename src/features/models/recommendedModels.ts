export interface RecommendedModel {
  file: string;
  repo: string;
  pageUrl: string;
  note: string;
}

/** @litert-lm/core の README で Web 対応が明記されているモデル */
export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    file: 'gemma-4-E2B-it-web.litertlm',
    repo: 'litert-community/gemma-4-E2B-it-litert-lm',
    pageUrl: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/tree/main',
    note: 'Gemma 4 E2B（軽量・まずはこちら）',
  },
  {
    file: 'gemma-4-E4B-it-web.litertlm',
    repo: 'litert-community/gemma-4-E4B-it-litert-lm',
    pageUrl: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/tree/main',
    note: 'Gemma 4 E4B（高品質・より多くのメモリが必要）',
  },
];
