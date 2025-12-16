import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/batch-test/[id]/test-cases
 * 获取测试用例列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const testCases = await prisma.testCase.findMany({
      where: { batchId: id },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: testCases,
    });
  } catch (error: any) {
    console.error('获取测试用例失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch-test/[id]/test-cases
 * 添加测试用例
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { testCases } = body;

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json(
        { success: false, error: '测试用例不能为空' },
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
      testCases.map((tc: any) =>
        prisma.testCase.create({
          data: {
            batchId: id,
            text: tc.text,
            category: tc.category,
            expectedVoice: tc.expectedVoice,
            tags: tc.tags || [],
            metadata: tc.metadata || {},
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
      data: createdCases,
    });
  } catch (error: any) {
    console.error('添加测试用例失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/batch-test/[id]/test-cases
 * 批量删除测试用例
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要删除的用例ID' },
        { status: 400 }
      );
    }

    const result = await prisma.testCase.deleteMany({
      where: {
        id: { in: ids },
        batchId: id,
      },
    });

    // 更新批次的总用例数
    await prisma.batchTest.update({
      where: { id },
      data: {
        totalCases: {
          decrement: result.count,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
    });
  } catch (error: any) {
    console.error('删除测试用例失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
