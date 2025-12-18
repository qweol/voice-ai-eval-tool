/**
 * 批量测试执行引擎
 * 负责执行批量测试任务
 */

import { prisma } from '@/lib/db';
import { callGenericTTS } from '@/lib/providers/generic/caller';
import { getSystemProviders } from '@/lib/providers/system-providers';
import { promises as fs } from 'fs';
import path from 'path';

// 导入枚举类型
enum BatchTestStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}

enum TestResultStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * 执行批量测试
 */
export async function executeBatchTest(batchId: string): Promise<void> {
  try {
    // 获取批次信息
    const batch = await prisma.batchTest.findUnique({
      where: { id: batchId },
      include: {
        testCases: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const config = batch.config as any;
    const retryCount = config.retryCount || 1;
    const speed = config.speed || 1.0;

    // 转换 providers 为数组
    const providers = Array.isArray(batch.providers) ? batch.providers : [];

    let completedCount = 0;
    let failedCount = 0;
    let totalDuration = 0;
    let totalCost = 0;

    // 遍历所有测试用例
    for (const testCase of batch.testCases) {
      // 检查批次状态，如果被暂停则停止
      const currentBatch = await prisma.batchTest.findUnique({
        where: { id: batchId },
        select: { status: true },
      });

      if (currentBatch?.status === BatchTestStatus.PAUSED) {
        console.log('批量测试已暂停');
        break;
      }

      // 遍历所有供应商
      for (const providerId of providers) {
        // 确保 providerId 是字符串
        const providerIdStr = String(providerId);
        let success = false;
        let lastError: string | null = null;

        // 重试逻辑
        for (let attempt = 0; attempt < retryCount && !success; attempt++) {
          try {
            // 从批次配置中获取供应商配置
            // 注意：批量测试在服务器端执行，无法访问 localStorage
            // 所以供应商配置需要在批次配置中保存
            console.log(`🔍 查找供应商: ${providerIdStr}`);

            const batchConfig = batch.config as any;
            const providerConfigs = batchConfig.providerConfigs || {};
            let providerConfig = providerConfigs[providerIdStr];

            if (!providerConfig) {
              console.error(`❌ 供应商 ${providerIdStr} 配置不存在`);
              console.error(`📋 批次配置中的供应商:`, Object.keys(providerConfigs));
              throw new Error(`供应商 ${providerIdStr} 配置不存在。请确保在执行测试前已保存供应商配置到批次中。`);
            }

            // 如果是系统预置供应商，从服务器端获取完整配置（包含真实的 API Key）
            if (providerConfig.isSystem) {
              const systemProviders = getSystemProviders();
              const systemProvider = systemProviders.find(sp => sp.id === providerIdStr);

              if (systemProvider) {
                console.log(`✅ 使用系统预置供应商: ${systemProvider.name}`);
                // 合并用户的覆盖配置（如模型、音色选择），但保留系统的 API Key
                const { apiKey: _, ...userOverrides } = providerConfig;
                providerConfig = {
                  ...systemProvider,
                  ...userOverrides,
                  apiKey: systemProvider.apiKey, // 确保使用系统的 API Key
                };
              } else {
                console.warn(`⚠️ 系统预置供应商 ${providerIdStr} 未找到，使用批次配置`);
              }
            }

            console.log(`✅ 找到供应商: ${providerConfig.name}`);

            // 调用 TTS API
            const overallStart = Date.now();
            const result = await callGenericTTS(providerConfig, testCase.text, {
              speed,
              voice: testCase.expectedVoice || undefined,
            });
            const endToEndTime = Date.now() - overallStart;
            const endToEndDurationSeconds = endToEndTime / 1000;

            // 保存音频文件
            const audioFileName = `${batchId}_${testCase.id}_${providerIdStr}_${Date.now()}.mp3`;
            const audioDir =
              process.env.AUDIO_STORAGE_DIR ||
              path.join(process.cwd(), 'public', 'audio');
            const audioPath = path.join(audioDir, audioFileName);
            await fs.mkdir(audioDir, { recursive: true });
            await fs.writeFile(audioPath, result.audioBuffer);

            // 使用 API 路由访问音频文件
            const audioUrl = `/api/storage/audio/${audioFileName}`;

            // 计算成本（简化版，实际应该根据供应商定价）
            const cost = calculateCost(testCase.text.length, providerIdStr);

            // 保存测试结果
            await prisma.batchTestResult.upsert({
              where: {
                batchId_testCaseId_provider: {
                  batchId,
                  testCaseId: testCase.id,
                  provider: providerIdStr,
                },
              },
              create: {
                batchId,
                testCaseId: testCase.id,
                provider: providerIdStr,
                status: TestResultStatus.SUCCESS,
                audioUrl,
                duration: endToEndDurationSeconds,
                cost,
                ttfb: result.ttfb,
                totalTime: endToEndTime,
                technicalParams: {
                  format: result.format || 'mp3',
                  fileSize: result.audioBuffer.length,
                  providerLatencyMs: result.totalTime,
                  providerDurationSeconds: result.duration,
                },
              },
              update: {
                status: TestResultStatus.SUCCESS,
                audioUrl,
                duration: endToEndDurationSeconds,
                cost,
                ttfb: result.ttfb,
                totalTime: endToEndTime,
                technicalParams: {
                  format: result.format || 'mp3',
                  fileSize: result.audioBuffer.length,
                  providerLatencyMs: result.totalTime,
                  providerDurationSeconds: result.duration,
                },
                error: null,
              },
            });

            totalDuration += endToEndDurationSeconds;
            totalCost += cost;
            success = true;
          } catch (error: any) {
            lastError = error.message;
            console.error(
              `测试失败 (尝试 ${attempt + 1}/${retryCount}):`,
              testCase.id,
              providerIdStr,
              error.message
            );

            // 如果是最后一次尝试，保存失败结果
            if (attempt === retryCount - 1) {
              await prisma.batchTestResult.upsert({
                where: {
                  batchId_testCaseId_provider: {
                    batchId,
                    testCaseId: testCase.id,
                    provider: providerIdStr,
                  },
                },
                create: {
                  batchId,
                  testCaseId: testCase.id,
                  provider: providerIdStr,
                  status: TestResultStatus.FAILED,
                  error: lastError,
                },
                update: {
                  status: TestResultStatus.FAILED,
                  error: lastError,
                },
              });
              failedCount++;
            }
          }
        }

        if (success) {
          completedCount++;
        }
      }

      // 更新批次进度
      const totalTests = batch.testCases.length * providers.length;
      const currentCompleted = completedCount;
      const successRate = totalTests > 0 ? (completedCount / totalTests) * 100 : 0;
      const avgDuration = completedCount > 0 ? totalDuration / completedCount : 0;

      await prisma.batchTest.update({
        where: { id: batchId },
        data: {
          completedCases: currentCompleted,
          failedCases: failedCount,
          successRate,
          avgDuration,
          totalCost,
        },
      });
    }

    // 更新批次状态为完成
    await prisma.batchTest.update({
      where: { id: batchId },
      data: {
        status: BatchTestStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log('批量测试完成:', batchId);
  } catch (error: any) {
    console.error('批量测试执行失败:', error);

    // 更新批次状态为失败
    await prisma.batchTest.update({
      where: { id: batchId },
      data: {
        status: BatchTestStatus.FAILED,
      },
    });
  }
}

/**
 * 计算成本（简化版）
 * 实际应该根据供应商的定价策略计算
 */
function calculateCost(textLength: number, _providerId: string): number {
  // 简化计算：每1000字符 $0.015
  const baseRate = 0.015;
  return (textLength / 1000) * baseRate;
}
