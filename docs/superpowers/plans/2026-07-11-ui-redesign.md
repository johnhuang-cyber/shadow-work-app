# 频率 · UI 重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 按 `docs/design/频率App视觉设计.dc.html` + `docs/design/design-tokens.json`（26 屏、浅/深双模式）重做全部 UI，替换默认组件风格。

**Architecture:** 新增 `src/theme/`（token 落地 + useColorScheme 切换）与 `src/components/`（按钮/卡片/输入/图标等基础件），各屏幕只消费 theme + components。业务逻辑（DAO/AI/domain）不动。

**Tech:** @expo-google-fonts/fraunces + inter + noto-serif-sc（expo-font 加载，失败回退系统字体）；@expo/vector-icons Feather（细线图标）；动效用 RN Animated（呼吸圆环、淡入位移、柔光完成态），不引入 reanimated 新用法。

**设计对照源（实现者必读）：** `docs/design/频率App视觉设计.dc.html`（屏幕 01–26）、`docs/design/design-tokens.json`（color/colorDark/type/spacing/radius/shadow/motion）。

---

## Task A：主题系统 + 基础组件 + Tab 壳
- `src/theme/tokens.ts`（从 design-tokens.json 落地，浅/深两套语义色）+ `src/theme/index.ts`（useTheme：useColorScheme 自动切换）
- 字体加载（app/_layout.tsx：Fraunces/Inter/NotoSerifSC，加载中显示柔和启动态；失败回退系统字体）
- `src/components/`：`AppText`（display/title/heading/body/caption 变体）、`PrimaryButton`/`GhostButton`（56pt、圆角 pill、accentGlow）、`Card`、`SoftInput`（大而软的输入区）、`Screen`（安全区+背景）
- Tab 壳按稿重做：Feather 细线图标（今天 sun / 冥想 wind / 信念 heart / 我的 user），选中色 accent，背景 surface
- 验收：tsc 干净、17 单测过、web 可见新 Tab 与字体

## Task B：今天 + 阴影日记五步 + 教练三态
- 今天（01/10）：日期 caption + 衬线大字引导语 + 主按钮「开始记录」+ 低调历史入口（09/26 空态文案）
- 日记流程（19/02/03/20/21）：一屏一步、衬线引导语、步骤点指示（非进度条）；接纳步=呼吸圆环（Animated 4s/6s 循环）+「没关系」轻触×3；完成步=柔光收束 + 肯定语后返回
- 教练（04/22/23/24）：对话区按稿配色（用户浅蓝底/教练暖白卡）、等待态呼吸圆点、网络失败与未配 Key 的温和文案与出口
- 验收：tsc、单测、web 全流程可走

## Task C：冥想 + 信念/频率卡 + 我的 + 深色核对
- 冥想播放（05/14）：深色沉浸背景、呼吸缩放圆环、引导语大字、极简控制；完成态（06/15）柔光 + 肯定语
- 信念改写（07/16）：改写表单按稿；结果=频率卡（25 卡墙 + 26 空态），卡片可翻看原→新信念
- 我的（08/17）：Key/模型设置按稿卡片化、隐私说明、柔和状态可视化
- 深色模式核对：全屏幕跟随系统切换（colorDark）
- 验收：tsc、单测、web 浅/深各走一遍；git 提交
