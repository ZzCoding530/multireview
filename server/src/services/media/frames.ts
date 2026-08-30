// 视频抽关键帧：场景切换检测（真实能力，ffmpeg + fluent-ffmpeg）
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';

/** 按场景切换抽取关键帧（最多 maxFrames 帧），返回帧图绝对路径列表 */
export async function extractKeyframes(videoPath: string, outDir: string, maxFrames = 8): Promise<string[]> {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.jpg')) fs.rmSync(path.join(outDir, f), { force: true });
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        '-vf',
        "select='gt(scene,0.3)'",
        '-vsync',
        'vfr',
        '-q:v',
        '2',
        '-frames:v',
        String(maxFrames),
      ])
      .output(path.join(outDir, 'frame-%02d.jpg'))
      .on('end', () => {
        const files = fs
          .readdirSync(outDir)
          .filter((f) => f.endsWith('.jpg'))
          .sort()
          .map((f) => path.join(outDir, f));
        resolve(files);
      })
      .on('error', reject)
      .run();
  });
}

/** 抽取音频（16kHz 单声道 wav），供 ASR 转写 */
export async function extractAudio(videoPath: string, outPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', reject)
      .run();
  });
}
