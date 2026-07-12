import { useEffect, useRef, useState, type ReactNode } from 'react';
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
// （DB 的 nameText 字段仍保留在 schema/types 中，只是 UI 不再使用。）
const FIELD: Partial<Record<string, keyof JournalEntry>> = {
  trigger: 'trigger', admit: 'admitText',
  vent: 'ventText', reassure: 'reassureText',
};

// 每一步的界面文案，与设计稿的 5 步（触发点→看见→宣泄→接纳→安抚）一一对应。
// 设计稿 02（看见）与 20（宣泄）不显示步骤小标题，label 留空即隐藏。
interface StepCopy { label: string; title: string; sub: string; placeholder?: string }
const STEP_COPY: Record<string, StepCopy> = {
  trigger: {
    label: '第 1 步 · 触发点',
    title: '刚刚，\n发生了什么？',
    sub: '不必分析、不必评判，\n只是轻轻回想那个瞬间。',
    placeholder: '那时候，我...',
  },
  admit: {
    label: '',
    title: '此刻，你感受到\n了什么？',
    sub: '不必寻找答案，\n只需要如实说出来。',
    placeholder: '我感到...',
  },
  vent: {
    label: '',
    title: '让它，都写出来',
    sub: '这里没有对错，尽情宣泄',
    placeholder: '想到什么，就写什么...',
  },
  accept: {
    label: '第 4 步 · 接纳',
    title: '',
    sub: '轻触圆环，对自己\n说三次「没关系」',
  },
  reassure: {
    label: '第 5 步 · 安抚',
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
              borderColor: colors.accent,
              opacity: 0.35,
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
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.accentSoft,
            opacity: 0.45,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {vals.map((v, i) => (
            <Animated.View
              key={i}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, opacity: v }}
            />
          ))}
        </View>
      </View>
      <AppText variant="caption" secondary>教练正在感受你写的话...</AppText>
    </View>
  );
}

// ——— 教练消息 · 长按操作浮层（设计稿 28a–28f）———

/** 长按浮层的锚点：消息在页面容器坐标系里的位置与容器宽度。 */
interface PopoverAnchor { x: number; y: number; w: number; h: number; rootW: number }

interface PopoverState { msg: CoachMessage; confirm: boolean; anchor: PopoverAnchor }

// 浮层高度估算（操作行 / 确认态），用于「上方放得下就贴在消息上缘之上」的启发式
const POPOVER_H_ACTIONS = 62;
const POPOVER_H_CONFIRM = 96;
const CONFIRM_W = 210;
// 设计稿 28c/28f：确认「放下」按钮深浅模式都是柔赭红
const RELEASE_BG = '#B5493A';
const RELEASE_TEXT = '#F5F1E8';

/** 操作胶囊：复制 / 朗读（仅教练消息）/ 放下，「放下」原地切换为二次确认态。 */
function MessagePopover({
  anchor,
  role,
  confirm,
  onCopy,
  onSpeak,
  onAskRelease,
  onKeep,
  onRelease,
}: {
  anchor: PopoverAnchor;
  role: 'user' | 'assistant';
  confirm: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onAskRelease: () => void;
  onKeep: () => void;
  onRelease: () => void;
}) {
  const { colors, component, fontFamily, shadow, isDark } = useTheme();
  const pop = component.messageActionPopover;
  const anim = useRef(new Animated.Value(0)).current;

  // 入场：0.9→1 缩放 + 渐显，240ms（component.messageActionPopover.enterMs）
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: pop.enterMs,
      easing: Easing.out(Easing.ease),
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [anim, pop.enterMs]);

  const estH = confirm ? POPOVER_H_CONFIRM : POPOVER_H_ACTIONS;
  const above = anchor.y - estH + 10 >= 8; // 上方放得下就浮在消息上缘（与消息轻微重叠）
  const top = above ? anchor.y - estH + 10 : anchor.y + anchor.h + 8;
  const horizontal =
    role === 'assistant'
      ? { left: Math.max(16, Math.min(anchor.x + 6, anchor.rootW - (confirm ? CONFIRM_W : 170) - 16)) }
      : { right: Math.max(16, anchor.rootW - anchor.x - anchor.w) };

  const actionItem = (icon: 'copy' | 'volume-2' | 'trash-2', label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: pop.itemRadius,
        backgroundColor: pressed ? colors.accentSoft : 'transparent',
      })}
    >
      {({ pressed }) => (
        <>
          <Feather name={icon} size={16} color={pressed ? colors.accent : colors.textSecondary} />
          <AppText
            variant="caption"
            color={pressed ? colors.accent : colors.textSecondary}
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        ...horizontal,
        backgroundColor: isDark ? pop.surfaceDark : pop.surface,
        borderRadius: pop.radius,
        opacity: anim,
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        ...shadow.soft,
        ...(confirm
          ? { padding: 14, width: CONFIRM_W }
          : { flexDirection: 'row' as const, gap: 4, padding: 8 }),
      }}
    >
      {confirm ? (
        <>
          <AppText style={{ fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 10 }}>
            要放下这条消息吗？
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={onKeep}
              style={({ pressed }) => ({
                flex: 1,
                height: 36,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(245,241,232,0.18)' : 'rgba(42,38,34,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AppText style={{ fontSize: 13, lineHeight: 18 }}>留着</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onRelease}
              style={({ pressed }) => ({
                flex: 1,
                height: 36,
                borderRadius: 18,
                backgroundColor: RELEASE_BG,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText style={{ fontSize: 13, lineHeight: 18, fontFamily: fontFamily.sansSemiBold, color: RELEASE_TEXT }}>
                放下
              </AppText>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {actionItem('copy', '复制', onCopy)}
          {role === 'assistant' ? actionItem('volume-2', '朗读', onSpeak) : null}
          {actionItem('trash-2', '放下', onAskRelease)}
        </>
      )}
    </Animated.View>
  );
}

const BAR_HEIGHTS = [5, 11, 7, 9];

/** 朗读中的呼吸声波指示（设计稿 28b/28e）：四根细条呼吸起伏，轻触停止。 */
function SpeakingIndicator({ onStop }: { onStop: () => void }) {
  const { colors } = useTheme();
  const vals = useRef(BAR_HEIGHTS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const anims = vals.map((v, i) =>
      Animated.sequence([
        Animated.delay(i * 150),
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 0.45, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
            Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE }),
          ])
        ),
      ])
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [vals]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="停止朗读"
      onPress={onStop}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <Animated.View
            key={i}
            style={{ width: 2.5, height: h, borderRadius: 2, backgroundColor: colors.accent, transform: [{ scaleY: vals[i] }] }}
          />
        ))}
      </View>
      <AppText variant="caption" color={colors.accent} style={{ fontSize: 11, lineHeight: 15 }}>
        朗读中
      </AppText>
    </Pressable>
  );
}

/** 「已复制」Toast（设计稿 28b/28e）：底部居中胶囊，淡入上浮，1.5s 后自动淡出。 */
function CopiedToast({ onHide }: { onHide: () => void }) {
  const { component, shadow, isDark } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: USE_NATIVE }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: USE_NATIVE }).start(
        () => onHideRef.current()
      );
    }, component.toast.durationMs);
    return () => clearTimeout(t);
  }, [anim, component.toast.durationMs]);

  const bg = isDark ? component.toast.bgDark : component.toast.bg;
  const fg = isDark ? component.toast.textDark : component.toast.text;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 36,
        alignItems: 'center',
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: bg,
          borderRadius: component.toast.radius,
          paddingVertical: 8,
          paddingHorizontal: 16,
          ...shadow.soft,
        }}
      >
        <Feather name="check" size={12} color={fg} />
        <AppText variant="caption" color={fg} style={{ fontSize: 12, lineHeight: 16 }}>
          已复制
        </AppText>
      </View>
    </Animated.View>
  );
}

/** 完成收束：柔光渐现 + 肯定语 + 「回到今天」（设计稿 21），由用户主动收束。 */
function CompletionOverlay({ onDone }: { onDone: () => void }) {
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
          gap: 26,
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
        "谢谢你，{'\n'}一直这么努力地保护我。"
      </AppText>
      <AppText secondary style={{ fontSize: 14, lineHeight: 24, textAlign: 'center' }}>
        你已经把这份感受，{'\n'}好好地接住了。
      </AppText>
      <GhostButton label="回到今天" onPress={onDone} style={{ height: 48, paddingHorizontal: 28, marginTop: 8 }} />
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
  const [playingId, setPlayingId] = useState<string | null>(null);
  // 长按浮出的操作胶囊；同一时刻最多一个
  const [popover, setPopover] = useState<PopoverState | null>(null);
  // 「已复制」toast：>0 时显示；自增使连续复制也能重新触发
  const [toastKey, setToastKey] = useState(0);

  const router = useRouter();
  const navigation = useNavigation();
  const { colors, fontFamily, radius, shadow, isDark } = useTheme();
  // 主色 35% 透明的描边（设计稿 23 的「重新连接」）
  const accentBorder = isDark ? 'rgba(217,145,109,0.35)' : 'rgba(201,123,90,0.35)';
  const entryRef = useRef<JournalEntry | null>(null);
  entryRef.current = entry;
  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef<{ text: string; history: { role: 'user' | 'assistant'; content: string }[] } | null>(null);
  const playingRef = useRef<string | null>(null);
  playingRef.current = playingId;
  // 浮层定位：页面容器 + 每条消息的 ref（长按时量取消息位置作为锚点）
  const rootRef = useRef<View>(null);
  const messageRefs = useRef<Record<string, View | null>>({});

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
      setFinishing(true);
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
      setCoachText(''); // 成功后才清空草稿；失败时保留在输入框里（设计稿 23）
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

  // ——— 消息操作：长按浮出 复制 / 朗读 / 放下（设计稿 28）———
  /** 长按消息：量取消息在页面容器里的位置，作为浮层锚点。 */
  const openPopover = (m: CoachMessage) => {
    const node = messageRefs.current[m.id];
    const root = rootRef.current;
    if (!node || !root) return;
    node.measureInWindow((x, y, w, h) => {
      root.measureInWindow((rx, ry, rw) => {
        setPopover({ msg: m, confirm: false, anchor: { x: x - rx, y: y - ry, w, h, rootW: rw } });
      });
    });
  };

  const copyMessage = async (m: CoachMessage) => {
    await Clipboard.setStringAsync(m.content);
    setPopover(null);
    setToastKey((k) => k + 1);
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

  const stopPlaying = () => {
    Speech.stop();
    setPlayingId(null);
  };

  /** 浮层确认态里的「放下」：删除该条消息。 */
  const releaseMessage = async (m: CoachMessage) => {
    setPopover(null);
    if (playingId === m.id) stopPlaying();
    await deleteCoachMessage(m.id);
    setMessages(await listCoachMessages(id!));
  };

  /** 消息正文：长按浮出操作胶囊；轻点收起已有浮层。 */
  const renderMessageBody = (m: CoachMessage, children: ReactNode) => (
    <Pressable
      ref={(r) => { messageRefs.current[m.id] = r; }}
      accessibilityLabel="长按打开消息操作"
      delayLongPress={350}
      onLongPress={() => openPopover(m)}
      onPress={() => setPopover(null)}
    >
      {children}
    </Pressable>
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
      <View ref={rootRef} style={{ flex: 1 }} collapsable={false}>
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
            {copy.label ? (
              <AppText variant="caption" color={colors.accent} style={{ fontSize: 13, letterSpacing: 0.5, textAlign: 'center' }}>
                {copy.label}
              </AppText>
            ) : null}
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

          {/* 底部导航（按钮文案随步骤变化，设计稿 19/20/03/21） */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <GhostButton
              label={stepIdx === 0 ? '先不记录' : '上一步'}
              labelColor={stepIdx === 0 ? colors.textSecondary : undefined}
              onPress={stepIdx === 0 ? exit : goPrev}
              style={{ flex: 1, height: 54 }}
            />
            {isAccept && acceptCount < 3 ? (
              <PrimaryButton
                label="再说一次"
                soft
                onPress={() => setAcceptCount((c) => Math.min(c + 1, 3))}
                style={{ flex: 1.4, height: 54 }}
              />
            ) : (
              <PrimaryButton
                label={isLastStep(stepIdx) ? '完成今天的记录' : step.key === 'vent' ? '写完了' : '继续'}
                onPress={goNext}
                glow={isLastStep(stepIdx)}
                style={{ flex: 1.4, height: 54 }}
              />
            )}
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

            {/* 消息列表：无气泡的纯文本语言（设计稿 04），长按浮出操作（设计稿 28） */}
            {messages.map((m) =>
              m.role === 'assistant' ? (
                <View key={m.id} style={{ flexDirection: 'row', gap: 12, alignSelf: 'flex-start', maxWidth: '88%' }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: colors.accentSoft,
                      marginTop: 2,
                    }}
                  />
                  <View style={{ flexShrink: 1 }}>
                    {renderMessageBody(
                      m,
                      <AppText style={{ fontSize: 16, lineHeight: 27 }}>{m.content}</AppText>
                    )}
                    {playingId === m.id ? <SpeakingIndicator onStop={stopPlaying} /> : null}
                  </View>
                </View>
              ) : (
                <View key={m.id} style={{ alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '80%' }}>
                  {renderMessageBody(
                    m,
                    <AppText
                      color={colors.textPrimary}
                      style={{ fontSize: 16, lineHeight: 27, textAlign: 'right', opacity: 0.75 }}
                    >
                      {m.content}
                    </AppText>
                  )}
                </View>
              )
            )}

            {/* 流式回复：头像 + 渐隐三点 + 「正在书写...」，文字随流式到达展开（设计稿 04） */}
            {loading && streaming ? (
              <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'flex-start', maxWidth: '88%' }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.accentSoft,
                    marginTop: 2,
                  }}
                />
                <View style={{ flexShrink: 1, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {[0.9, 0.6, 0.3].map((o, i) => (
                        <View
                          key={i}
                          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, opacity: o }}
                        />
                      ))}
                    </View>
                    <AppText variant="caption" secondary style={{ fontSize: 13 }}>正在书写...</AppText>
                  </View>
                  <AppText style={{ fontSize: 16, lineHeight: 27 }}>{streaming}</AppText>
                </View>
              </View>
            ) : null}
            {loading && !streaming ? <WaitingDots /> : null}

            {/* 网络失败（设计稿 23）：无卡片、居中、主色描边按钮 */}
            {coachError === 'network' ? (
              <View style={{ alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 12 }}>
                <Feather name="alert-triangle" size={26} color={colors.danger} />
                <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
                  连接暂时断了一下，{'\n'}先把想说的留在这里，稍后再试。
                </AppText>
                <GhostButton
                  label="重新连接"
                  labelColor={colors.accent}
                  borderColor={accentBorder}
                  onPress={retry}
                  style={{ height: 44, paddingHorizontal: 20 }}
                />
              </View>
            ) : null}

            {/* 未配置 API Key（设计稿 24） */}
            {coachError === 'nokey' ? (
              <Card radius="md" padding={22} style={{ alignItems: 'center', gap: 14 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="info" size={24} color={colors.accent} />
                </View>
                <AppText style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 30 }}>
                  教练还没有准备好
                </AppText>
                <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
                  去「我的」里连接一下，{'\n'}就可以开始对话了。{'\n'}你写下的内容不会因此丢失。
                </AppText>
                <PrimaryButton label="前往设置" onPress={() => router.push('/me')} style={{ height: 44, paddingHorizontal: 28 }} />
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="发送"
                accessibilityState={{ disabled: !coachText.trim() || loading || confirming }}
                disabled={!coachText.trim() || loading || confirming}
                onPress={onSendPress}
                hitSlop={4}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !coachText.trim() || loading || confirming ? 0.4 : pressed ? 0.85 : 1,
                })}
              >
                <Feather name="send" size={18} color={colors.textInverse} />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* 长按操作浮层：全屏透明背板点哪都收起，胶囊锚定在消息上缘附近 */}
        {popover ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable
              accessibilityLabel="收起消息操作"
              onPress={() => setPopover(null)}
              style={StyleSheet.absoluteFill}
            />
            <MessagePopover
              anchor={popover.anchor}
              role={popover.msg.role}
              confirm={popover.confirm}
              onCopy={() => copyMessage(popover.msg)}
              onSpeak={() => {
                setPopover(null);
                togglePlay(popover.msg);
              }}
              onAskRelease={() => setPopover({ ...popover, confirm: true })}
              onKeep={() => setPopover(null)}
              onRelease={() => releaseMessage(popover.msg)}
            />
          </View>
        ) : null}

        {toastKey > 0 ? <CopiedToast key={toastKey} onHide={() => setToastKey(0)} /> : null}

        {finishing ? <CompletionOverlay onDone={() => router.back()} /> : null}
      </View>
    </Screen>
  );
}
