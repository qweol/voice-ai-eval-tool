import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { extractAudioInfo, generateUniqueFilename, MAX_AUDIO_FILE_SIZE } from '@/lib/utils/audio';

const prisma = new PrismaClient();

/**
 * GET /api/asr/samples
 * 获取样本列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // 构建查询条件
    const where: any = {};

    if (language && language !== 'all') {
      where.language = language;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { originalName: { contains: search } },
      ];
    }

    // 查询总数
    const total = await prisma.asrSample.count({ where });

    // 查询样本列表
    const samples = await prisma.asrSample.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: samples,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('获取样本列表失败:', error);
    return NextResponse.json(
      { error: error.message || '获取样本列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/asr/samples
 * 批量上传样本
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '未上传文件' },
        { status: 400 }
      );
    }

    // 存储目录
    const storageDir = path.join(process.cwd(), 'storage', 'audio');
    await fs.mkdir(storageDir, { recursive: true });

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 验证文件大小
        if (file.size > MAX_AUDIO_FILE_SIZE) {
          errors.push({
            filename: file.name,
            error: `文件大小超过限制（最大 ${MAX_AUDIO_FILE_SIZE / 1024 / 1024}MB）`,
          });
          continue;
        }

        // 读取文件内容
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 提取音频信息
        const audioInfo = await extractAudioInfo(buffer, file.name);

        // 生成唯一文件名
        const uniqueFilename = generateUniqueFilename(file.name);
        const filePath = path.join(storageDir, uniqueFilename);

        // 保存文件
        await fs.writeFile(filePath, buffer);

        // 获取表单中的元数据
        const name = formData.get(`name_${i}`) as string || file.name.replace(/\.[^/.]+$/, '');
        const description = formData.get(`description_${i}`) as string || null;
        const language = formData.get(`language_${i}`) as string || 'zh';
        const tagsStr = formData.get(`tags_${i}`) as string;
        const tags = tagsStr ? JSON.parse(tagsStr) : [];
        const referenceText = formData.get(`referenceText_${i}`) as string || null;

        // 保存到数据库
        const sample = await prisma.asrSample.create({
          data: {
            name,
            description,
            filename: uniqueFilename,
            originalName: file.name,
            fileSize: file.size,
            duration: audioInfo.duration,
            format: audioInfo.format,
            sampleRate: audioInfo.sampleRate,
            bitRate: audioInfo.bitRate,
            channels: audioInfo.channels,
            tags,
            language,
            referenceText,
          },
        });

        results.push(sample);
      } catch (error: any) {
        console.error(`处理文件 ${file.name} 失败:`, error);
        errors.push({
          filename: file.name,
          error: error.message || '处理失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `成功上传 ${results.length} 个样本${errors.length > 0 ? `，${errors.length} 个失败` : ''}`,
    });
  } catch (error: any) {
    console.error('批量上传样本失败:', error);
    return NextResponse.json(
      { error: error.message || '批量上传失败' },
      { status: 500 }
    );
  }
}
