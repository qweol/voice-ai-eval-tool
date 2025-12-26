import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * GET /api/asr/samples/[id]
 * 获取单个样本详情
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sample = await prisma.asrSample.findUnique({
      where: { id },
    });

    if (!sample) {
      return NextResponse.json(
        { error: '样本不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sample,
    });
  } catch (error: any) {
    console.error('获取样本详情失败:', error);
    return NextResponse.json(
      { error: error.message || '获取样本详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/asr/samples/[id]
 * 更新样本信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, description, tags, language, referenceText } = body;

    const sample = await prisma.asrSample.update({
      where: { id },
      data: {
        name,
        description,
        tags,
        language,
        referenceText,
      },
    });

    return NextResponse.json({
      success: true,
      data: sample,
      message: '样本信息已更新',
    });
  } catch (error: any) {
    console.error('更新样本失败:', error);
    return NextResponse.json(
      { error: error.message || '更新样本失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/asr/samples/[id]
 * 删除样本
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取样本信息
    const sample = await prisma.asrSample.findUnique({
      where: { id },
    });

    if (!sample) {
      return NextResponse.json(
        { error: '样本不存在' },
        { status: 404 }
      );
    }

    // 删除文件
    const storageDir = path.join(process.cwd(), 'storage', 'audio');
    const filePath = path.join(storageDir, sample.filename);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('删除文件失败:', error);
      // 继续删除数据库记录
    }

    // 删除数据库记录
    await prisma.asrSample.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '样本已删除',
    });
  } catch (error: any) {
    console.error('删除样本失败:', error);
    return NextResponse.json(
      { error: error.message || '删除样本失败' },
      { status: 500 }
    );
  }
}
