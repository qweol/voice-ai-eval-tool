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

        {/* 主要功能区 - ASR 和 TTS */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-8">
          <Link href="/asr">
            <div className="bg-white rounded-2xl shadow-lg p-10 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="text-6xl mr-4">🎤</div>
                <div>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-2">
                    核心功能
                  </span>
                  <h2 className="text-3xl font-bold text-gray-800">
                    ASR 语音识别
                  </h2>
                </div>
              </div>
              <p className="text-gray-600 text-lg mb-6">
                上传音频文件，对比多个供应商的识别效果
              </p>
              <div className="flex items-center justify-between">
                <div className="text-blue-600 font-semibold text-lg">
                  开始对比 →
                </div>
              </div>
            </div>
          </Link>

          <Link href="/tts">
            <div className="bg-white rounded-2xl shadow-lg p-10 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-indigo-500 hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="text-6xl mr-4">🔊</div>
                <div>
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-2">
                    核心功能
                  </span>
                  <h2 className="text-3xl font-bold text-gray-800">
                    TTS 语音合成
                  </h2>
                </div>
              </div>
              <p className="text-gray-600 text-lg mb-6">
                输入文本，对比多个供应商的合成效果
              </p>
              <div className="flex items-center justify-between">
                <div className="text-indigo-600 font-semibold text-lg">
                  开始对比 →
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 辅助功能区 - 批量测试和 BadCase 管理 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Link href="/batch-test">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center mb-3">
                <div className="text-4xl mr-3">📊</div>
                <div>
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-1">
                    高级功能
                  </span>
                  <h3 className="text-xl font-bold text-gray-800">
                    批量测试
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                系统性测试和历史对比分析
              </p>
              <div className="text-purple-600 font-semibold text-sm">
                开始测试 →
              </div>
            </div>
          </Link>

          <Link href="/badcases">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-orange-500">
              <div className="flex items-center mb-3">
                <div className="text-4xl mr-3">📝</div>
                <div>
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full mb-1">
                    管理工具
                  </span>
                  <h3 className="text-xl font-bold text-gray-800">
                    BadCase 管理
                  </h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-3">
                管理和追踪测试中发现的问题用例
              </p>
              <div className="text-orange-600 font-semibold text-sm">
                查看管理 →
              </div>
            </div>
          </Link>
        </div>

        {/* 设置入口 */}
        <div className="mt-8 max-w-7xl mx-auto">
          <Link href="/settings">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">⚙️ 设置</h3>
                  <p className="text-gray-600">
                    配置API密钥、音色参数和默认设置
                  </p>
                </div>
                <div className="text-gray-400 text-2xl">→</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 mb-4">支持OpenAI、Qwen、豆包等大模型API，也可自定义接入任意兼容的API</p>
          <Link
            href="/settings"
            className="inline-block text-blue-600 hover:text-blue-800 font-semibold"
          >
            ⚙️ 前往设置页面配置API
          </Link>
        </div>
      </div>
    </div>
  );
}
