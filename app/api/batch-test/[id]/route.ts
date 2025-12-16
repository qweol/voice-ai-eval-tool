import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BatchTestStatus } from '@prisma/client';

/**
 * GET /api/batch-test/[id]
 * 获取批量测试详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await prisma.batchTest.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { orderIndex: 'asc' },
        },
        results: {
          include: {
            testCase: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: '批次不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error('获取批量测试详情失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/batch-test/[id]
 * 更新批量测试
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, tags, providers, config, status } = body;

    // 获取当前批次以合并配置
    const currentBatch = await prisma.batchTest.findUnique({
      where: { id },
      select: { config: true },
    });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (providers !== undefined) updateData.providers = providers;

    // 合并配置而不是覆盖
    if (config !== undefined) {
      const currentConfig = (currentBatch?.config as any) || {};
      updateData.config = {
        ...currentConfig,
        ...config,
      };
    }

    if (status !== undefined) updateData.status = status;

    const batch = await prisma.batchTest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error('更新批量测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/batch-test/[id]
 * 删除批量测试
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.batchTest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    console.error('删除批量测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
