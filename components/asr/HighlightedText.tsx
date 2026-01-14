/**
 * 高亮文本组件
 * 用于显示带有公共部分高亮的文本
 */

import React from 'react';
import { TextSegment } from '@/lib/utils/textHighlight';

interface HighlightedTextProps {
  segments: TextSegment[];
}

export function HighlightedText({ segments }: HighlightedTextProps) {
  return (
    <span>
      {segments.map((segment, index) => (
        <span
          key={index}
          className={segment.isCommon ? 'bg-green-100 text-green-900' : ''}
        >
          {segment.text}
        </span>
      ))}
    </span>
  );
}
