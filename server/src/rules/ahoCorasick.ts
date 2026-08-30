// 自研 Aho-Corasick 多模式匹配自动机
// 用于一次性扫描文本命中所有关键词，避免逐词线性扫描。

interface Node {
  children: Map<string, number>;
  fail: number;
  output: number[]; // 命中的模式下标列表
}

export interface Match {
  patternIndex: number;
  /** 命中结束字符下标（含） */
  end: number;
}

export class AhoCorasick {
  private nodes: Node[] = [];

  constructor(private patterns: string[]) {
    this.build();
  }

  private newNode(): number {
    this.nodes.push({ children: new Map(), fail: 0, output: [] });
    return this.nodes.length - 1;
  }

  private build(): void {
    this.newNode(); // 根节点 0

    // 1. 插入所有模式构建 trie
    this.patterns.forEach((p, idx) => {
      let node = 0;
      for (const ch of p) {
        const next = this.nodes[node].children.get(ch);
        if (next !== undefined) {
          node = next;
        } else {
          const n = this.newNode();
          this.nodes[node].children.set(ch, n);
          node = n;
        }
      }
      this.nodes[node].output.push(idx);
    });

    // 2. BFS 构建 fail 指针并合并 output
    const queue: number[] = [];
    for (const child of this.nodes[0].children.values()) {
      this.nodes[child].fail = 0;
      queue.push(child);
    }

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const [ch, child] of this.nodes[cur].children) {
        queue.push(child);
        let f = this.nodes[cur].fail;
        while (f !== 0 && !this.nodes[f].children.has(ch)) {
          f = this.nodes[f].fail;
        }
        const fc = this.nodes[f].children.get(ch);
        this.nodes[child].fail = fc !== undefined ? fc : 0;
        this.nodes[child].output.push(...this.nodes[this.nodes[child].fail].output);
      }
    }
  }

  /** 扫描文本，返回所有命中（patternIndex 对应构造时的模式下标） */
  search(text: string): Match[] {
    const result: Match[] = [];
    let node = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node !== 0 && !this.nodes[node].children.has(ch)) {
        node = this.nodes[node].fail;
      }
      const next = this.nodes[node].children.get(ch);
      node = next !== undefined ? next : 0;
      for (const pIdx of this.nodes[node].output) {
        result.push({ patternIndex: pIdx, end: i });
      }
    }
    return result;
  }
}
