import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { BatchTestStatus } from '@prisma/client';

/**
 * GET /api/batch-test
 * 获取批量测试列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as BatchTestStatus | null;
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [batches, total] = await Promise.all([
      prisma.batchTest.findMany({
        where,
        include: {
          _count: {
            select: {
              testCases: true,
              results: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batchTest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        batches,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error: any) {
    console.error('获取批量测试列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch-test
 * 创建批量测试批次
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, tags, providers, config } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: '名称和分类为必填项' },
        { status: 400 }
      );
    }

    const batch = await prisma.batchTest.create({
      data: {
        name,
        description,
        category,
        tags: tags || [],
        providers: providers || [],
        config: config || {},
        status: BatchTestStatus.DRAFT,
      },
    });

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error('创建批量测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
