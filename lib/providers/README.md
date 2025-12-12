# 供应商适配器说明

## 音色配置说明

### ❌ 不需要为每个音色单独配置

**同一个供应商的不同音色，只需要通过参数切换，不需要单独配置适配器。**

### ✅ 正确的做法

每个供应商的适配器函数都支持 `options.voice` 参数，通过这个参数选择不同的音色：

```typescript
// 使用标准音色
synthesizeWithTencent(text, { voice: 'standard' })

// 使用精品音色
synthesizeWithTencent(text, { voice: 'premium' })

// 使用大模型音色
synthesizeWithTencent(text, { voice: 'large-model' })
```

### 腾讯云音色配置

| voice 参数值 | 说明 | ModelType | VoiceType | 资源包要求 |
|-------------|------|-----------|-----------|-----------|
| `standard` | 标准音色 | 1 | 1 | 基础/精品音色资源包 |
| `premium` | 精品音色 | 2 | 4 | 基础/精品音色资源包 |
| `large-model` | 大模型音色 | 3 | 1050 | 大模型音色资源包 |
| `default` | 默认（标准音色） | 1 | 1 | 基础/精品音色资源包 |

### 使用示例

```typescript
// 在 API 路由中调用
const result = await synthesizeWithTencent(text, {
  voice: 'standard',  // 选择音色
  speed: 0.8,         // 语速
  volume: 0.9,        // 音量
});
```

### 前端如何传递音色参数

如果需要在前端选择音色，可以修改 API 路由接收音色参数：

```typescript
// app/api/tts/route.ts
const { text, voice } = await request.json();

// 调用时传递音色参数
const result = await synthesizeWithTencent(text, { voice });
```

## 架构优势

1. **一个适配器支持多种音色** - 不需要为每个音色写单独的适配器
2. **统一接口** - 所有供应商都使用 `TTSOptions.voice` 参数
3. **易于扩展** - 添加新音色只需在配置映射中添加一行
4. **灵活切换** - 运行时动态选择音色，无需重新配置

## 注意事项

1. **资源包匹配** - 确保选择的音色类型与你的资源包匹配
   - 标准/精品音色需要"基础/精品音色资源包"
   - 大模型音色需要"大模型音色资源包"

2. **参数值** - 不同供应商的 `voice` 参数值可能不同
   - 腾讯云：`'standard'`, `'premium'`, `'large-model'`
   - 阿里云：可能是 `'xiaoyun'`, `'xiaogang'` 等
   - 百度：可能是 `'0'`, `'1'`, `'2'` 等

3. **默认值** - 如果不传 `voice` 参数，会使用默认音色（通常是标准音色）



