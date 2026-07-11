# 设计文档：阴影工作 + 显化 个人成长陪伴 App（MVP）

- 日期：2026-07-11
- 状态：待用户评审
- 灵感来源：Katie Clarke 的 YouTube 视频《How to Create a Frequency So Magnetic Your Desires Chase You》

---

## 1. 目标与范围

做一个**自用的**个人成长陪伴 App，把视频里的方法论落地成可每天使用的练习工具。先做 MVP、验证是否真的有用，再决定是否扩大（多用户、上架、商业化）。

**MVP 只做两个核心功能 + 两个 AI 能力：**
1. 引导式阴影日记（文字分步）
2. 引导冥想 / 临在练习（文字分步 + TTS 朗读 + 计时）
3. AI 能力①：日记里的响应式教练（手动触发）
4. AI 能力②：信念改写助手（手动触发）

**明确不做（MVP 范围外）：** 账号系统、多用户、云同步、社交/分享、商业化、后端服务、真人录音冥想、每周模式洞察、AI 生成冥想脚本。

---

## 2. 关键决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 目标用户 | 先自用，验证后再考虑扩大 |
| 运行方式 | React Native + **Expo**，开发期用 Expo Go 扫码运行；后续可打包上架 |
| 平台 | 安卓 / iOS 皆可（Expo 跨平台） |
| 界面语言 | 中文 |
| 冥想形式 | 文字分步 + 系统 TTS 朗读 + 计时器（非真人录音） |
| 数据与隐私 | **本地优先**：日记/冥想/信念全部只存本机；仅在用户主动点“问教练/改写信念”时，把相关文本发给大模型 |
| AI 提供方 | **DeepSeek**（OpenAI 兼容接口） |
| API Key | 用户自己在 platform.deepseek.com 申请，存 `expo-secure-store`（加密、仅本机） |

---

## 3. 技术栈

```
Expo (React Native) + TypeScript
├── 导航：expo-router 或 @react-navigation（底部 Tab）
├── 本地存储：expo-sqlite（结构化数据）
├── 密钥存储：expo-secure-store（DeepSeek API Key）
├── 语音朗读：expo-speech（冥想引导语 TTS）
├── 网络/流式：expo/fetch（SSE 流式；不支持时回退非流式）
└── AI 服务层：封装 DeepSeek OpenAI 兼容接口
```

无后端、无数据库服务器。整个 App 自包含，除“主动问 AI”外全程离线可用。

---

## 4. 架构与模块边界

分层，每层职责单一、通过明确接口通信：

- **UI 层（screens / components）**：只负责展示与交互，不直接碰存储或网络。
- **domain 层（services）**：
  - `journalService`：日记的增删查（读写 SQLite）。
  - `meditationService`：冥想脚本读取、会话记录。
  - `beliefService`：信念条目增删查。
  - `aiService`：唯一对外发网络请求的模块，封装 DeepSeek 调用（教练 / 信念改写两个方法）。
  - `settingsService`：读写 API Key（secure-store）与偏好（默认模型等）。
- **data 层**：`db.ts`（SQLite 初始化/迁移）+ 各表的 DAO。

原则：UI 只依赖 services；services 只依赖 data 与 aiService；密钥永不进 SQLite、永不写日志。

---

## 5. 功能一：引导式阴影日记

### 流程（对应视频“阴影工作五步”）
1. **选触发点**：一句话描述“什么触发了我”。
2. **承认**：自由书写此刻的感受（“我承认我感到……”）。
3. **接纳**：交互式“没关系”×3（点三次，帮助从抗拒转向接纳）。
4. **命名**：引导问题——“它在身体的哪个部位？它像几岁的你？它在怕什么？”
5. **宣泄**：自由书写，让那个部分把话说完（不评判）。
6. **安抚 + 新角色**：写给那个部分的话，并给它一个新的正向角色。

每一步是一个可前进/后退的卡片式流程；随时可保存草稿、退出后可继续。

### AI 教练接入
- 每一步旁有「问教练」按钮，**默认不联网**。
- 点击后：把**当前这一段文本 + 本条日记已有的教练对话历史**发给 DeepSeek，教练以 Katie 式口吻**流式**回应（追问 / 帮命名那个部分 / 慈悲安抚），可继续多轮对话。
- 发送前 UI 明示：“这段内容将发送给 DeepSeek”。
- 教练回应可保存进本条日记。

### 边界与免责
- 教练**不做诊断、不替代专业心理治疗**；system prompt 内置：识别到自伤/危机信号时，温和建议寻求专业帮助与热线，不继续深入。

---

## 6. 功能二：引导冥想 / 临在练习

- 预置 2–3 个脚本（如“回到当下 3 分钟”“与被触发的部分对话”“力量归位”），每个脚本是「引导语 + 停顿秒数」的有序步骤。
- 播放页：逐句显示引导语 + `expo-speech` 朗读 + 呼吸/计时进度圈；可暂停 / 重来 / 提前结束。
- 结束后写入一条 `meditation_sessions` 记录（脚本、实际时长、完成与否）。
- 脚本内容以本地 JSON/常量维护，方便随时改文案。

---

## 7. AI 集成（DeepSeek）

### 接口
- Base URL：`https://api.deepseek.com`，OpenAI 兼容 `POST /chat/completions`。
- 认证：请求头 `Authorization: Bearer <用户的 DeepSeek Key>`。
- 模型：默认 `deepseek-chat`；信念改写可选 `deepseek-reasoner`（更强推理）。设置页可切换。
- 消息格式：标准 `messages` 数组（1 条 system + 多轮 user/assistant）。
- 流式：`stream: true`，通过 `expo/fetch` 读取 SSE，逐 chunk 上屏；环境不支持流式时回退为非流式（转圈等完整结果）。

### 两个能力，各自独立的 system prompt
- **教练（coach）**：扮演 Katie 式慈悲教练；只做倾听、追问、帮命名阴影部分、给安抚话术；不评判、不下诊断；含危机识别与转介免责；中文口吻温暖。多轮对话，前端维护历史。
- **信念改写（reframe）**：走“极性/顶替定律”，从一个限制性信念出发，产出一个**小而可信**的赋能信念（不一步登天）。以结构化文本返回：原信念 / 可能来源 / 新赋能信念 / 一句可每天复述的话。结果可存入 `beliefs`。

### 密钥与隐私
- Key 存 `expo-secure-store`，首次使用时引导用户粘贴；仅本机、加密。
- 平时完全离线；仅“问教练/改写信念”那一次发出相关文本。
- **⚠️ 升级点（写入代码注释与本文档）**：当前为自用 MVP，App 直连 DeepSeek 且 Key 在客户端，可接受；**若将来公开发布，必须改为后端代理转发，切勿把 Key 打包进公开 App。**

---

## 8. 数据模型（expo-sqlite）

- `journal_entries`：`id, created_at, trigger, admit_text, name_text, vent_text, reassure_text, part_label`
- `coach_messages`：`id, entry_id(FK), role('user'|'assistant'), content, created_at`
- `beliefs`：`id, created_at, limiting_belief, source, empowering_belief, mantra`
- `meditation_sessions`：`id, created_at, script_id, duration_sec, completed`
- 偏好（默认模型等）：`AsyncStorage` 或一张 `settings` 表；**API Key 不入库**，只在 secure-store。

启动时执行建表/迁移（`db.ts` 里的版本化迁移）。

---

## 9. 导航与屏幕

底部 4 Tab：
- **今天**：开始一条新阴影日记 / 继续草稿。
- **冥想**：脚本列表 → 播放页。
- **信念**：信念改写入口 + 已保存信念列表。
- **我的**：日记历史、冥想记录、设置（API Key 录入、默认模型切换、隐私说明）。

---

## 10. 错误处理

- 未配置 Key 时点 AI → 引导去“我的”粘贴 Key。
- 网络失败 / 401 / 限流：给出中文可读提示，可重试；本地写作内容不丢。
- 流式中断：保留已收到的部分，允许重发。
- SQLite 读写失败：提示并保底（草稿先存内存）。

---

## 11. 测试策略

- `aiService`：mock DeepSeek 返回，测试请求体构造（system/messages 正确）、SSE 解析、错误分支。
- services 层：对 SQLite DAO 做增删查单测。
- 关键 UI 流程：阴影日记五步能走通、能保存、能续写；冥想能播放/朗读/计时。
- 手动验收：Expo Go 真机跑一遍完整闭环。

---

## 12. 未决 / 后续（MVP 后）

- 每周模式洞察（AI 回顾一周日记）。
- 频率/力量 1–10 每日打卡与趋势图。
- 真人录音冥想。
- 打包上架（届时补：后端代理、账号、云同步、隐私合规）。
