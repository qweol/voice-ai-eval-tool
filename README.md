# TTS/ASR 语音服务对比工具

快速对比多个语音服务供应商（阿里云、腾讯云、百度等）的 TTS（文字转语音）和 ASR（语音识别）效果。

## 功能特性

- ✅ **ASR 语音识别对比** - 上传音频文件，并列显示多家识别结果
- ✅ **TTS 语音合成对比** - 输入文本，生成多个音频进行对比
- ✅ **并发调用** - 同时调用多个供应商 API，快速获取结果
- ✅ **简洁界面** - 清晰的对比展示，一目了然

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，并填入你的 API 密钥：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_aliyun_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_aliyun_access_key_secret

# 腾讯云配置
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key

# 百度配置
BAIDU_API_KEY=your_baidu_api_key
BAIDU_SECRET_KEY=your_baidu_secret_key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

## 项目结构

```
voice-ai-eval-tool/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 首页
│   ├── asr/                 # ASR 对比页面
│   ├── tts/                 # TTS 对比页面
│   └── api/                 # API 路由
│       ├── asr/route.ts     # ASR API
│       └── tts/route.ts     # TTS API
├── lib/                     # 工具库
│   ├── types.ts            # 类型定义
│   └── providers/          # 供应商适配器
│       ├── aliyun.ts       # 阿里云
│       ├── tencent.ts      # 腾讯云
│       ├── baidu.ts        # 百度
│       └── mock.ts         # 模拟数据
├── public/
│   └── audio/              # 生成的音频文件
└── .env.local              # 环境变量配置
```

## 使用说明

### ASR 语音识别对比

1. 点击首页的 "ASR 语音识别" 卡片
2. 上传音频文件（支持 .wav, .mp3, .m4a 等格式）
3. 点击 "开始识别"
4. 查看各供应商的识别结果对比

### TTS 语音合成对比

1. 点击首页的 "TTS 语音合成" 卡片
2. 输入要合成的文本
3. 点击 "开始合成"
4. 播放各供应商生成的音频进行对比

## 配置真实 API

当前项目使用模拟数据进行演示。要使用真实的语音服务 API，需要：

### 1. 安装供应商 SDK

```bash
# 阿里云
npm install @alicloud/nls-2019-02-28

# 腾讯云
npm install tencentcloud-sdk-nodejs

# 百度
npm install baidu-aip
```

### 2. 修改适配器代码

在 `lib/providers/` 目录下的各个文件中，取消注释 TODO 部分的代码，并根据各供应商的 API 文档进行调整。

参考文档：
- [阿里云语音服务](https://help.aliyun.com/product/30413.html)
- [腾讯云语音识别](https://cloud.tencent.com/document/product/1093)
- [百度语音技术](https://ai.baidu.com/ai-doc/SPEECH/Vk38lxily)

## 部署

### 本地构建

```bash
npm run build
npm start
```

### Docker 部署

```bash
docker build -t voice-ai-eval .
docker run -p 3000:3000 --env-file .env.local voice-ai-eval
```

### Vercel 部署

```bash
npm install -g vercel
vercel
```

## 技术栈

- **框架**: Next.js 15 + React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **部署**: Vercel / Docker

## 后续优化

- [ ] 添加文本差异高亮显示
- [ ] 支持批量音频测试
- [ ] 添加历史记录功能
- [ ] 支持更多供应商（讯飞、Azure 等）
- [ ] 添加音频波形可视化
- [ ] 导出对比报告（PDF/Excel）

## 许可证

MIT
