import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * POST /api/batch-test/[id]/import
 * 导入测试用例（支持 CSV/JSON 格式）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { format, data, source } = body;

    console.log('📥 导入请求:', { format, dataType: typeof data, dataLength: Array.isArray(data) ? data.length : 'N/A' });

    if (!format || !data) {
      return NextResponse.json(
        { success: false, error: '格式和数据不能为空' },
        { status: 400 }
      );
    }

    let testCases: any[] = [];

    // 解析不同格式的数据
    if (format === 'json') {
      // 如果 data 是字符串，尝试解析为 JSON
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          testCases = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          return NextResponse.json(
            { success: false, error: 'JSON 格式错误' },
            { status: 400 }
          );
        }
      } else {
        testCases = Array.isArray(data) ? data : [data];
      }
    } else if (format === 'csv') {
      // CSV 格式：text,category,expectedVoice,tags
      testCases = parseCSV(data);
    } else if (format === 'badcase') {
      // 从 BadCase 导入
      testCases = data.map((bc: any) => ({
        text: bc.text,
        category: bc.category,
        tags: bc.tags || [],
        metadata: {
          fromBadCase: true,
          badCaseId: bc.id,
          severity: bc.severity,
        },
      }));
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的格式' },
        { status: 400 }
      );
    }

    // 验证数据
    console.log('📋 解析后的测试用例数:', testCases.length);
    if (testCases.length > 0) {
      console.log('📝 第一个用例示例:', testCases[0]);
    }

    const validCases = testCases.filter((tc) => tc.text && tc.text.trim());
    console.log('✅ 有效的测试用例数:', validCases.length);

    if (validCases.length === 0) {
      return NextResponse.json(
        { success: false, error: `没有有效的测试用例。共解析 ${testCases.length} 个用例，但都缺少 text 字段` },
        { status: 400 }
      );
    }

    // 获取当前最大的 orderIndex
    const lastCase = await prisma.testCase.findFirst({
      where: { batchId: id },
      orderBy: { orderIndex: 'desc' },
    });

    let startIndex = (lastCase?.orderIndex || 0) + 1;

    // 批量创建测试用例
    const createdCases = await prisma.$transaction(
      validCases.map((tc) =>
        prisma.testCase.create({
          data: {
            batchId: id,
            text: tc.text.trim(),
            category: tc.category || null,
            expectedVoice: tc.expectedVoice || null,
            tags: tc.tags || [],
            metadata: {
              ...tc.metadata,
              source: source || 'import',
              importedAt: new Date().toISOString(),
            },
            orderIndex: startIndex++,
          },
        })
      )
    );

    // 更新批次的总用例数
    await prisma.batchTest.update({
      where: { id },
      data: {
        totalCases: {
          increment: createdCases.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        imported: createdCases.length,
        skipped: testCases.length - validCases.length,
        testCases: createdCases,
      },
    });
  } catch (error: any) {
    console.error('导入测试用例失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * 解析 CSV 数据
 * 格式：text,category,expectedVoice,tags
 */
function parseCSV(csvData: string): any[] {
  const lines = csvData.trim().split('\n');
  const testCases: any[] = [];

  // 跳过表头（如果有）
  const startIndex = lines[0].toLowerCase().includes('text') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 简单的 CSV 解析（不处理引号内的逗号）
    const parts = line.split(',').map((p) => p.trim());

    if (parts.length >= 1 && parts[0]) {
      testCases.push({
        text: parts[0],
        category: parts[1] || null,
        expectedVoice: parts[2] || null,
        tags: parts[3] ? parts[3].split('|').map((t) => t.trim()) : [],
      });
    }
  }

  return testCases;
}
