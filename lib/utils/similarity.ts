/**
 * 文本相似度计算工具
 * 用于计算ASR识别结果之间的相似度
 */

/**
 * 预处理文本：去除空格并转小写
 */
function preprocessText(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

/**
 * 计算最长公共子序列（LCS）的长度
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns LCS的长度
 */
function longestCommonSubsequence(str1: string, str2: string): number {
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

  return dp[m][n];
}

/**
 * 计算两个文本之间的相似度
 * @param text1 第一个文本
 * @param text2 第二个文本
 * @returns 相似度百分比 (0-100)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  // 预处理文本
  const processed1 = preprocessText(text1);
  const processed2 = preprocessText(text2);

  // 如果两个文本都为空，认为相似度为100%
  if (processed1.length === 0 && processed2.length === 0) {
    return 100;
  }

  // 如果其中一个为空，相似度为0%
  if (processed1.length === 0 || processed2.length === 0) {
    return 0;
  }

  // 计算LCS长度
  const lcsLength = longestCommonSubsequence(processed1, processed2);

  // 计算相似度：(2 * LCS长度) / (文本1长度 + 文本2长度)
  const similarity = (2 * lcsLength) / (processed1.length + processed2.length);

  // 转换为百分比并保留一位小数
  return Math.round(similarity * 1000) / 10;
}

/**
 * 计算多个文本结果之间的相似度矩阵
 * @param texts 文本数组
 * @returns 相似度矩阵
 */
export function calculateSimilarityMatrix(texts: string[]): number[][] {
  const n = texts.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 100; // 自己和自己相似度为100%
      } else if (i < j) {
        // 只计算上三角矩阵，下三角对称复制
        matrix[i][j] = calculateTextSimilarity(texts[i], texts[j]);
        matrix[j][i] = matrix[i][j];
      }
    }
  }

  return matrix;
}

/**
 * 计算每个文本与其他文本的平均相似度
 * @param matrix 相似度矩阵
 * @returns 平均相似度数组
 */
export function calculateAverageSimilarities(matrix: number[][]): number[] {
  const n = matrix.length;
  const averages: number[] = [];

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        sum += matrix[i][j];
        count++;
      }
    }

    averages.push(count > 0 ? Math.round((sum / count) * 10) / 10 : 0);
  }

  return averages;
}

/**
 * 计算整体一致性（所有两两相似度的平均值）
 * @param matrix 相似度矩阵
 * @returns 整体一致性百分比
 */
export function calculateOverallConsistency(matrix: number[][]): number {
  const n = matrix.length;

  if (n <= 1) {
    return 100; // 只有一个结果时，一致性为100%
  }

  let sum = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += matrix[i][j];
      count++;
    }
  }

  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
}

/**
 * 批量计算ASR结果的相似度信息
 * @param results ASR识别结果数组（只包含成功的结果）
 * @returns 相似度信息对象
 */
export interface SimilarityInfo {
  overall: number;        // 整体一致性
  matrix: number[][];     // 相似度矩阵
  averages: number[];     // 每个模型的平均相似度
}

export function calculateASRSimilarity(
  results: Array<{ text: string; status: 'success' | 'error' }>
): SimilarityInfo | null {
  // 只取成功的结果
  const successResults = results.filter(r => r.status === 'success');

  // 如果成功结果少于2个，无法计算相似度
  if (successResults.length < 2) {
    return null;
  }

  const texts = successResults.map(r => r.text);
  const matrix = calculateSimilarityMatrix(texts);
  const averages = calculateAverageSimilarities(matrix);
  const overall = calculateOverallConsistency(matrix);

  return {
    overall,
    matrix,
    averages,
  };
}
