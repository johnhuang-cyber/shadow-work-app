import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { JOURNAL_STEPS, nextStep, prevStep, isLastStep } from '../../src/domain/journalSteps';
import { getEntry, saveEntry, addCoachMessage, listCoachMessages, deleteCoachMessage } from '../../src/data/journalDao';
import { runCoach } from '../../src/ai/deepseek';
import { getAiConsent, setAiConsent } from '../../src/services/settingsService';
import type { JournalEntry, CoachMessage } from '../../src/types';
import { AppText, Card, GhostButton, PrimaryButton, Screen, SoftInput } from '../../src/components';
import { useTheme } from '../../src/theme';

const USE_NATIVE = Platform.OS !== 'web';

// 'accept'（接纳）是交互式一步，不写入任何文本字段，所以不在此映射中。
const FIELD: Partial<Record<string, keyof JournalEntry>> = {
  trigger: 'trigger', admit: 'admitText',
  name: 'nameText', vent: 'ventText', reassure: 'reassureText',
};

// 每一步的界面文案。设计稿是 5 步（触发点→看见→宣泄→接纳→安抚），
// 领域模型是 6 步（承认/命名分开）；设计稿文案原样保留，「命名」按同一语气补写。
interface StepCopy { label: string; title: string; sub: string; placeholder?: string }
const STEP_COPY: Record<string, StepCopy> = {
  trigger: {
    label: '第 1 步 · 触发点',
    title: '刚刚，\n发生了什么？',
    sub: '不必分析、不必评判，\n只是轻轻回想那个瞬间。',
    placeholder: '那时候，我...',
  },
  admit: {
    label: '第 2 步 · 看见',
    title: '此刻，你感受到\n了什么？',
    sub: '不必寻找答案，\n只需要如实说出来。',
    placeholder: '我感到...',
  },
  accept: {
    label: '第 3 步 · 接纳',
    title: '',
    sub: '轻触圆环，对自己\n说三次「没关系」',
  },
  name: {
    label: '第 4 步 · 命名',
    title: '它，住在你身体的\n哪个地方？',
    sub: '它像几岁的你？\n它在害怕什么？',
    placeholder: '它像是...',
  },
  vent: {
    label: '第 5 步 · 宣泄',
    title: '让它，都写出来',
    sub: '这里没有对错，尽情宣泄',
    placeholder: '想到什么，就写什么...',
  },
  reassure: {
    label: '第 6 步 · 安抚',
    title: '"谢谢你，\n一直这么努力地保护我。"',
    sub: '写几句想对它说的话，\n再给它一个新的、正向的角色。',
    placeholder: '我想对你说...',
  },
};

/** 接纳步骤的呼吸圆环：4 秒吸气放大 / 6 秒呼气收缩，轻触计数。 */
function BreathingCircle({ count, onTap }: { count: number; onTap: () => void }) {
  const { colors, fontFamily, shadow } = useTheme();
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
        Animated.timing(scale, { toValue: 0.94, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <View style={{ alignItems: 'center', gap: 24 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="没关系" onPress={onTap} hitSlop={12}>
        <View style={{ width: 190, height: 190, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: 95,
              backgroundColor: colors.accentSoft,
              opacity: 0.4,
              transform: [{ scale }],
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              width: 154,
              height: 154,
              borderRadius: 77,
              borderWidth: 1.5,
              borderColor: colors.presence,
              opacity: 0.6,
              transform: [{ scale }],
            }}
          />
          <View
            style={{
              width: 114,
              height: 114,
              borderRadius: 57,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...shadow.soft,
            }}
          >
            <AppText style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 28 }}>
              没关系
            </AppText>
          </View>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: colors.accent,
              backgroundColor: i < count ? colors.accent : 'transparent',
            }}
          />
        ))}
      </View>
      {count >= 3 ? (
        <AppText secondary style={{ fontSize: 15, lineHeight: 26, textAlign: 'center' }}>
          很好，你已经在接纳它了。
        </AppText>
      ) : null}
    </View>
  );
}

/** 教练等待态：三个呼吸的小圆点（设计稿 22）。 */
function WaitingDots() {
  const { colors } = useTheme();
  const vals = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    const anims = vals.map((v, i) =>
      Animated.sequence([
        Animated.delay(i * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
            Animated.timing(v, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
          ])
        ),
      ])
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [vals]);

  return (
    <View style={{ alignItems: 'center', gap: 14, paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {vals.map((v, i) => (
          <Animated.View
            key={i}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, opacity: v }}
          />
        ))}
      </View>
      <AppText variant="caption" secondary>教练正在感受你写的话...</AppText>
    </View>
  );
}

/** 完成收束：柔光渐现 + 肯定语（设计稿 21），约 1.8 秒后自动返回。 */
function CompletionOverlay() {
  const { colors, fontFamily } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 450,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 36,
          opacity,
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          width: 190,
          height: 190,
          borderRadius: 95,
          backgroundColor: colors.accentSoft,
          opacity: 0.55,
        }}
      />
      <AppText
        style={{
          fontFamily: fontFamily.serif,
          fontStyle: 'italic',
          fontSize: 23,
          lineHeight: 37,
          textAlign: 'center',
        }}
      >
        你已经把这份感受，{'\n'}好好地接住了。
      </AppText>
    </Animated.View>
  );
}

export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptCount, setAcceptCount] = useState(0);
  const [coachText, setCoachText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [coachError, setCoachError] = useState<'network' | 'nokey' | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const navigation = useNavigation();
  const { colors, fontFamily, radius, shadow } = useTheme();
  const entryRef = useRef<JournalEntry | null>(null);
  entryRef.current = entry;
  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef<{ text: string; history: { role: 'user' | 'assistant'; content: string }[] } | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef<string | null>(null);
  playingRef.current = playingId;

  useEffect(() => {
    getEntry(id!).then(setEntry);
    listCoachMessages(id!).then(setMessages);
  }, [id]);

  // OS 手势/硬件返回时也持久化（onBlur 覆盖不到键盘未失焦的情况）
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', () => {
      if (entryRef.current) saveEntry(entryRef.current);
    });
    return () => sub();
  }, [navigation]);

  useEffect(() => () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    // 只停掉本页发起的朗读
    if (playingRef.current) Speech.stop();
  }, []);

  if (!entry) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  const step = JOURNAL_STEPS[stepIdx];
  const copy = STEP_COPY[step.key];
  const isAccept = step.key === 'accept';
  const field = FIELD[step.key];
  const value = field ? ((entry[field] as string) ?? '') : '';
  const update = (text: string) => { if (field) setEntry({ ...entry, [field]: text }); };
  const persist = async () => { await saveEntry(entry); };

  const exit = () => { persist(); router.back(); };
  const goPrev = () => { persist(); setStepIdx(prevStep(stepIdx)); };
  const goNext = () => {
    persist();
    if (isLastStep(stepIdx)) {
      if (finishing) return;
      setFinishing(true);
      finishTimer.current = setTimeout(() => router.back(), 1800);
    } else {
      setStepIdx(nextStep(stepIdx));
    }
  };

  // ——— 教练对话 ———
  const requestCoach = async (text: string, history: { role: 'user' | 'assistant'; content: string }[]) => {
    setLoading(true);
    setStreaming('');
    setCoachError(null);
    try {
      const full = await runCoach(text, history, (d) => setStreaming((s) => s + d));
      await addCoachMessage({ entryId: id!, role: 'assistant', content: full });
      setMessages(await listCoachMessages(id!));
      pendingRef.current = null;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setCoachError(msg.includes('API Key') ? 'nokey' : 'network');
    } finally {
      setStreaming('');
      setLoading(false);
    }
  };

  const confirmSend = async () => {
    const text = coachText.trim();
    if (!text) return;
    setConfirming(false);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    pendingRef.current = { text, history };
    await addCoachMessage({ entryId: id!, role: 'user', content: text });
    setMessages(await listCoachMessages(id!));
    setCoachText('');
    await requestCoach(text, history);
  };

  /** 发送入口：第一次询问一次同意，之后直接发送。 */
  const onSendPress = async () => {
    if (await getAiConsent()) await confirmSend();
    else setConfirming(true);
  };

  const acceptAndSend = async () => {
    await setAiConsent();
    await confirmSend();
  };

  const retry = () => {
    const pending = pendingRef.current;
    if (pending) requestCoach(pending.text, pending.history);
    else setCoachError(null);
  };

  // ——— 消息操作：复制 / 朗读 / 删除 ———
  const copyMessage = async (m: CoachMessage) => {
    await Clipboard.setStringAsync(m.content);
    setCopiedId(m.id);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedId(null), 1500);
  };

  const togglePlay = (m: CoachMessage) => {
    if (playingId === m.id) {
      Speech.stop();
      setPlayingId(null);
      return;
    }
    Speech.stop();
    setPlayingId(m.id);
    const clear = () => setPlayingId((p) => (p === m.id ? null : p));
    Speech.speak(m.content, { language: 'zh-CN', rate: 0.95, onDone: clear, onStopped: clear, onError: clear });
  };

  const removeMessage = async (m: CoachMessage) => {
    if (deletingId !== m.id) {
      setDeletingId(m.id);
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      deleteTimer.current = setTimeout(() => setDeletingId(null), 2000);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeletingId(null);
    if (playingId === m.id) {
      Speech.stop();
      setPlayingId(null);
    }
    await deleteCoachMessage(m.id);
    setMessages(await listCoachMessages(id!));
  };

  /** 每条消息气泡下方的低调操作行。 */
  const renderActions = (m: CoachMessage) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 8,
        opacity: 0.7,
        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copiedId === m.id ? '已复制' : '复制'}
        onPress={() => copyMessage(m)}
        hitSlop={8}
      >
        <Feather name={copiedId === m.id ? 'check' : 'copy'} size={14} color={colors.textSecondary} />
      </Pressable>
      {m.role === 'assistant' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playingId === m.id ? '停止朗读' : '朗读'}
          onPress={() => togglePlay(m)}
          hitSlop={8}
        >
          <Feather name={playingId === m.id ? 'square' : 'volume-2'} size={14} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deletingId === m.id ? '确认删除' : '删除'}
        onPress={() => removeMessage(m)}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
      >
        <Feather name="trash-2" size={14} color={deletingId === m.id ? colors.danger : colors.textSecondary} />
        {deletingId === m.id ? (
          <AppText variant="caption" color={colors.danger} style={{ fontSize: 11, lineHeight: 15 }}>
            再点一次删除
          </AppText>
        ) : null}
      </Pressable>
    </View>
  );

  const stepDots = (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 22, marginBottom: 8 }}>
      {JOURNAL_STEPS.map((s, i) => (
        <View
          key={s.key}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i === stepIdx ? colors.accent : colors.accentSoft,
          }}
        />
      ))}
    </View>
  );

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 顶栏：返回 / 退出 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={exit} hitSlop={12}>
              <Feather name="chevron-left" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={exit} hitSlop={12}>
              <AppText variant="caption" secondary style={{ fontSize: 13 }}>退出</AppText>
            </Pressable>
          </View>

          {stepDots}

          {/* 步骤内容 */}
          <View style={{ minHeight: 430, justifyContent: 'center', gap: 24, paddingVertical: 24 }}>
            <AppText variant="caption" color={colors.accent} style={{ fontSize: 13, letterSpacing: 0.5, textAlign: 'center' }}>
              {copy.label}
            </AppText>
            {copy.title ? (
              <AppText
                style={{
                  fontFamily: fontFamily.serif,
                  fontStyle: 'italic',
                  fontSize: step.key === 'vent' ? 22 : 26,
                  lineHeight: step.key === 'vent' ? 33 : 39,
                  textAlign: 'center',
                }}
              >
                {copy.title}
              </AppText>
            ) : null}
            <AppText secondary style={{ fontSize: 15, lineHeight: 27, textAlign: 'center' }}>
              {copy.sub}
            </AppText>
            {isAccept ? (
              <BreathingCircle count={acceptCount} onTap={() => setAcceptCount((c) => Math.min(c + 1, 3))} />
            ) : (
              <SoftInput
                value={value}
                onChangeText={update}
                onBlur={persist}
                placeholder={copy.placeholder}
                style={{
                  borderWidth: 0,
                  borderRadius: radius.lg,
                  padding: 22,
                  minHeight: step.key === 'vent' ? 220 : 120,
                  ...shadow.soft,
                }}
              />
            )}
            {step.key === 'vent' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Feather name="lock" size={14} color={colors.textSecondary} />
                <AppText variant="caption" secondary style={{ fontSize: 13 }}>说给教练听</AppText>
              </Pressable>
            ) : null}
          </View>

          {/* 底部导航 */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <GhostButton
              label={stepIdx === 0 ? '先不记录' : '上一步'}
              onPress={stepIdx === 0 ? exit : goPrev}
              style={{ flex: 1, height: 54 }}
            />
            <PrimaryButton
              label={isLastStep(stepIdx) ? '完成今天的记录' : '下一步'}
              onPress={goNext}
              glow={isLastStep(stepIdx)}
              style={{ flex: 1.4, height: 54 }}
            />
          </View>

          {/* 教练陪伴 */}
          <View style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 26, gap: 18 }}>
            <View>
              <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32 }}>教练陪伴</AppText>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  alignSelf: 'flex-start',
                  marginTop: 10,
                  backgroundColor: colors.accentSoft,
                  borderRadius: radius.pill,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                }}
              >
                <Feather name="lock" size={12} color={colors.textSecondary} />
                <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 16 }}>
                  你的分享只属于你自己 · 已加密
                </AppText>
              </View>
            </View>

            {/* 首次使用的隐私提示 */}
            {messages.length === 0 ? (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 12 }}>
                <AppText variant="caption" secondary style={{ fontSize: 13, lineHeight: 22 }}>
                  对话时，你写的话会发送给 DeepSeek，用于生成教练的回应。
                </AppText>
              </View>
            ) : null}

            {/* 消息列表 */}
            {messages.map((m) => (
              <View
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: m.role === 'user' ? '82%' : '88%',
                }}
              >
                {m.role === 'user' ? (
                  <View
                    style={{
                      backgroundColor: colors.presenceSoft,
                      borderRadius: radius.md,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                    }}
                  >
                    <AppText style={{ fontSize: 16, lineHeight: 27 }}>{m.content}</AppText>
                  </View>
                ) : (
                  <Card radius="md" padding={16} style={{ ...shadow.soft }}>
                    <AppText style={{ fontSize: 16, lineHeight: 27 }}>{m.content}</AppText>
                  </Card>
                )}
                {renderActions(m)}
              </View>
            ))}

            {/* 流式回复 / 等待态 */}
            {loading && streaming ? (
              <Card radius="md" padding={16} style={{ alignSelf: 'flex-start', maxWidth: '88%', ...shadow.soft }}>
                <AppText style={{ fontSize: 16, lineHeight: 27 }}>{streaming}</AppText>
              </Card>
            ) : null}
            {loading && !streaming ? <WaitingDots /> : null}

            {/* 网络失败（设计稿 23） */}
            {coachError === 'network' ? (
              <Card radius="md" padding={20} style={{ alignItems: 'center', gap: 14 }}>
                <Feather name="alert-triangle" size={26} color={colors.danger} />
                <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
                  连接暂时断了一下，{'\n'}先把想说的留在这里，稍后再试。
                </AppText>
                <GhostButton label="重新连接" onPress={retry} style={{ height: 44, paddingHorizontal: 20 }} />
              </Card>
            ) : null}

            {/* 未配置 API Key（设计稿 24） */}
            {coachError === 'nokey' ? (
              <Card radius="md" padding={22} style={{ alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="info" size={22} color={colors.accent} />
                </View>
                <AppText style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 30 }}>
                  教练还没有准备好
                </AppText>
                <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
                  去「我的」里连接一下，{'\n'}就可以开始对话了。{'\n'}你写下的内容不会因此丢失。
                </AppText>
                <GhostButton label="前往设置" onPress={() => router.push('/me')} style={{ height: 44, paddingHorizontal: 24 }} />
              </Card>
            ) : null}

            {/* 首次发送前确认一次（内联，不用 Alert；之后不再询问） */}
            {confirming ? (
              <Card radius="md" padding={18} style={{ gap: 14 }}>
                <AppText variant="caption" secondary style={{ lineHeight: 22 }}>
                  这段话将发送给 DeepSeek，用于生成教练的回应。你的分享只属于你自己 · 已加密。只在第一次发送前问你这一次。
                </AppText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <GhostButton label="取消" onPress={() => setConfirming(false)} style={{ flex: 1, height: 48 }} />
                  <PrimaryButton label="确认发送" onPress={acceptAndSend} style={{ flex: 1.4, height: 48 }} />
                </View>
              </Card>
            ) : null}

            {/* 输入行 */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <SoftInput
                value={coachText}
                onChangeText={setCoachText}
                placeholder="想说些什么..."
                style={{
                  flex: 1,
                  minHeight: 48,
                  maxHeight: 140,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderWidth: 0,
                  borderRadius: radius.lg,
                  ...shadow.soft,
                }}
              />
              <PrimaryButton
                label="发送"
                disabled={!coachText.trim() || loading || confirming}
                onPress={onSendPress}
                style={{ height: 48, paddingHorizontal: 20 }}
              />
            </View>
          </View>
        </ScrollView>

        {finishing ? <CompletionOverlay /> : null}
      </View>
    </Screen>
  );
}
