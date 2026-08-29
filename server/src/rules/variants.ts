// 变体词归一化：识别绕过关键词过滤的手法。
// 手法 1：插入分隔符（如 "赌 博"、"赌|博"、"加·微·信"）
// 手法 2：谐音 / 形近字替换（如 "尼" -> "你"）

const SEPARATORS = new Set([
  ' ', '\t', '\n', '\r',
  '|', '*', '-', '_', '·', '.', '~', '`',
  '、', '，', ',', '。', '！', '!', '？', '?', '；', ';', '：', ':',
  '/', '\\', '+', '=', '@', '#', '$', '%', '^', '&',
  '(', ')', '[', ']', '{', '}', '"', "'", '<', '>',
]);

// 谐音 / 形近字映射（教学用极小映射，演示原理，可扩充）
const HOMOPHONE: Record<string, string> = {
  尼: '你',
  伱: '你',
  祢: '你',
  玛: '马',
  佰: '百',
  陆: '六',
};

export function normalizeVariant(text: string): string {
  let out = '';
  for (const ch of text) {
    if (SEPARATORS.has(ch)) continue;
    out += HOMOPHONE[ch] ?? ch;
  }
  return out.toLowerCase();
}
