// 音频转写（ASR）：Whisper 转写后走文本审核
// 真实实现基于 transformers.js 的 automatic-speech-recognition（Xenova/whisper-small）。
// 当前沙箱 HuggingFace 被墙，首次失败后缓存为「不可用」（详见 待完善清单）。
export interface ASRResult {
  available: boolean;
  text: string | null;
}

let unavailable = false;

export async function transcribeAudio(audioPath: string): Promise<ASRResult> {
  if (unavailable) {
    return { available: false, text: null };
  }
  try {
    const { pipeline } = await import('@huggingface/transformers');
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
    const output = (await transcriber(audioPath)) as { text: string };
    return { available: true, text: output.text };
  } catch {
    unavailable = true;
    return { available: false, text: null };
  }
}
