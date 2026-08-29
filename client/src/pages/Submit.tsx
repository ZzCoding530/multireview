import React, { useState } from 'react';
import { api, decisionColor } from '../api';
import type { DetectionResult, ModerationRecord } from '../types';
import { CATEGORY_LABELS, DECISION_LABELS } from '../types';

interface SubmitResp {
  record: ModerationRecord;
  detection: DetectionResult;
  decision: string;
}

export default function Submit() {
  const [content, setContent] = useState('');
  const [businessLine, setBusinessLine] = useState('general');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResp | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');

  const submitText = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/submit/text', { content, businessLine });
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('businessLine', businessLine);
    setUploadMsg('上传中...');
    try {
      const { data } = await api.post('/submit/media', fd);
      setUploadMsg(`已上传 #${data.record.id}（一期仅存不审，已进人审队列）`);
    } catch {
      setUploadMsg('上传失败');
    }
    e.target.value = '';
  };

  const d = result?.detection;
  const decision = result?.decision ?? '';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">内容提交与检测</h1>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <select
            value={businessLine}
            onChange={(e) => setBusinessLine(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="general">通用业务线</option>
            <option value="youth">青少年模式（更严）</option>
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="输入待审核文本，例如：这里有人在赌博，快举报"
          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={submitText}
            disabled={loading || !content.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? '检测中...' : '提交检测'}
          </button>
          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            上传图片 / 音视频
            <input type="file" className="hidden" onChange={uploadFile} />
          </label>
        </div>
        {uploadMsg && <div className="mt-2 text-sm text-slate-500">{uploadMsg}</div>}
      </div>

      {result && d && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-slate-800">检测结果</h2>
            <span
              className="rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: decisionColor(decision) }}
            >
              {DECISION_LABELS[decision as keyof typeof DECISION_LABELS] ?? decision}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">置信度</div>
              <div className="text-2xl font-semibold text-slate-800">
                {Math.round(d.confidence * 100)}%
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">违规类别</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {d.categories.length === 0 ? (
                  <span className="text-sm text-slate-400">无</span>
                ) : (
                  d.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                    >
                      {CATEGORY_LABELS[c]}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">命中次数</div>
              <div className="text-2xl font-semibold text-slate-800">{d.hits.length}</div>
            </div>
          </div>

          {d.hits.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-slate-700">命中位置</div>
              <div className="space-y-2">
                {d.hits.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {h.type}
                    </span>
                    <span className="text-slate-700">
                      第 {h.sentenceIndex + 1} 句 ·「{h.matched}」
                    </span>
                    <span className="text-slate-400">位置 {h.start}-{h.end}</span>
                    <span className="text-red-600">{CATEGORY_LABELS[h.category]}</span>
                    <span className="ml-auto text-xs text-slate-400">{h.ruleName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.llmUsed && d.llmReview && (
            <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">LLM 语义精审</span>
                {d.llmReview.category && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    {CATEGORY_LABELS[d.llmReview.category]}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  置信度 {Math.round(d.llmReview.confidence * 100)}%
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">理由：{d.llmReview.reason}</div>
              {d.llmReview.evidence && (
                <div className="mt-1 text-sm text-slate-500">依据：{d.llmReview.evidence}</div>
              )}
            </div>
          )}

          {(d.ocrText || typeof d.frameCount === 'number' || d.transcript) && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              {d.ocrText && <div className="text-slate-600">OCR 文本：{d.ocrText}</div>}
              {typeof d.frameCount === 'number' && (
                <div className="mt-1 text-slate-500">抽帧数：{d.frameCount}</div>
              )}
              {d.transcript && <div className="mt-1 text-slate-600">音频转写：{d.transcript}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
