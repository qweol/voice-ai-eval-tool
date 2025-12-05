import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TTS/ASR 对比工具',
  description: '语音服务供应商对比平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
