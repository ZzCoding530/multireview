// 自研前缀缓存适配层
// 思路：规则库 + 标签体系构成的不变「系统前缀」在多次审核请求间复用，
// 通过 DeepSeek 返回的 prompt_cache_hit_tokens / prompt_cache_miss_tokens 统计命中，
// 用于核算「缓存命中」带来的成本下降（对应亮点三：推理服务化/前缀缓存）。

export interface PrefixCacheStats {
  hits: number;
  misses: number;
  hitTokens: number;
  missTokens: number;
  outputTokens: number;
}

export class PrefixCache {
  private stats: PrefixCacheStats = {
    hits: 0,
    misses: 0,
    hitTokens: 0,
    missTokens: 0,
    outputTokens: 0,
  };
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  getPrefix(): string {
    return this.prefix;
  }

  record(hitTokens: number, missTokens: number, outputTokens: number): void {
    if (hitTokens > 0) this.stats.hits += 1;
    else this.stats.misses += 1;
    this.stats.hitTokens += hitTokens;
    this.stats.missTokens += missTokens;
    this.stats.outputTokens += outputTokens;
  }

  getStats(): PrefixCacheStats {
    return { ...this.stats };
  }

  hitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }
}
