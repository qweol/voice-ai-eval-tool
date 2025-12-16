import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET /api/storage/audio/[filename]
 * 提供音频文件访问
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const audioPath = path.join(process.cwd(), 'storage', 'audio', filename);

    // 检查文件是否存在
    try {
      await fs.access(audioPath);
    } catch {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // 读取音频文件
    const audioBuffer = await fs.readFile(audioPath);

    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg';

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 缓存 1 年
        'Accept-Ranges': 'bytes', // 支持断点续传
      },
    });
  } catch (error: any) {
    console.error('读取音频文件失败:', error);
    return NextResponse.json(
      { error: 'Failed to read audio file' },
      { status: 500 }
    );
  }
}
