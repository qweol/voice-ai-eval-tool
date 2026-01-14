/**
 * 文本高亮工具
 * 用于高亮显示多个文本之间的公共子字符串
 */

/**
 * 文本片段类型
 */
export interface TextSegment {
  text: string;
  isCommon: boolean; // 是否为公共部分
}

/**
 * 找出两个字符串的最长公共子序列（LCS）
 * 返回LCS的位置信息
 */
function findLCS(str1: string, str2: string): Set<number>[] {
  const m = str1.length;
  const n = str2.length;

  // 创建DP表
  const dp: number[][] = Array(m + 1)
    .fill(0)
    .map(() => Array(n + 1).fill(0));

  // 填充DP表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯找出LCS的位置
  const lcsPositions1 = new Set<number>();
  const lcsPositions2 = new Set<number>();

  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (str1[i - 1] === str2[j - 1]) {
      lcsPositions1.add(i - 1);
      lcsPositions2.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return [lcsPositions1, lcsPositions2];
}

/**
 * 将文本分割成片段（公共部分和非公共部分）
 */
function segmentText(text: string, commonPositions: Set<number>): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let isCurrentCommon = false;

  for (let i = 0; i < text.length; i++) {
    const isCommon = commonPositions.has(i);

    if (i === 0) {
      // 第一个字符
      currentSegment = text[i];
      isCurrentCommon = isCommon;
    } else if (isCommon === isCurrentCommon) {
      // 相同类型，继续累加
      currentSegment += text[i];
    } else {
      // 类型变化，保存当前片段，开始新片段
      if (currentSegment) {
        segments.push({ text: currentSegment, isCommon: isCurrentCommon });
      }
      currentSegment = text[i];
      isCurrentCommon = isCommon;
    }
  }

  // 保存最后一个片段
  if (currentSegment) {
    segments.push({ text: currentSegment, isCommon: isCurrentCommon });
  }

  return segments;
}

/**
 * 高亮多个文本的公共部分
 * @param texts 文本数组
 * @returns 每个文本的片段数组
 */
export function highlightCommonParts(texts: string[]): TextSegment[][] {
  if (texts.length === 0) return [];
  if (texts.length === 1) {
    return [[{ text: texts[0], isCommon: false }]];
  }

  // 找出所有文本的公共位置
  const commonPositions: Set<number>[] = texts.map(() => new Set());

  // 两两比较，找出公共部分
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const [pos1, pos2] = findLCS(texts[i], texts[j]);

      // 将公共位置添加到集合中
      pos1.forEach(p => commonPositions[i].add(p));
      pos2.forEach(p => commonPositions[j].add(p));
    }
  }

  // 将每个文本分割成片段
  return texts.map((text, i) => segmentText(text, commonPositions[i]));
}

