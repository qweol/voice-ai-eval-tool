import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            语音服务对比工具
          </h1>
          <p className="text-xl text-gray-600">
            快速对比多个供应商的 TTS 和 ASR 效果
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link href="/asr">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                ASR 语音识别
              </h2>
              <p className="text-gray-600 text-lg">
                上传音频文件，对比多个供应商的识别效果
              </p>
              <div className="mt-6 text-blue-600 font-semibold">
                开始对比 →
              </div>
            </div>
          </Link>

          <Link href="/tts">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="text-6xl mb-4">🔊</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                TTS 语音合成
              </h2>
              <p className="text-gray-600 text-lg">
                输入文本，对比多个供应商的合成效果
              </p>
              <div className="mt-6 text-indigo-600 font-semibold">
                开始对比 →
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-16 text-center text-gray-500">
          <p>支持阿里云、腾讯云、百度等主流语音服务供应商</p>
        </div>
      </div>
    </div>
  );
}
