/** 联网搜索工具对客户端公开的稳定结果。 */
export interface WebSearchResult {
  query: string;
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    snippet?: string;
    publishedAt?: string;
    website?: string;
  }>;
  searchedAt: string;
}

/** 已通过聊天入口校验、仅供服务端工具使用的图片。 */
export interface ValidatedChatImage {
  data: string;
  mediaType: string;
  filename?: string;
}

/** 图片文字识别对客户端公开的稳定结果。 */
export interface ImageRecognitionResult {
  images: Array<{
    index: number;
    direction?: number;
    language?: number;
    words: Array<{
      text: string;
      location: { left: number; top: number; width: number; height: number };
      probability?: { average: number; variance: number; min: number };
      vertices?: Array<{ x: number; y: number }>;
    }>;
    paragraphs?: Array<{
      wordIndexes: number[];
      vertices?: Array<{ x: number; y: number }>;
    }>;
  }>;
}
