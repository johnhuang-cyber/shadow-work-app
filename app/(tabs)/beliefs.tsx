import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { runReframe } from '../../src/ai/deepseek';
import { parseReframe, type ReframeResult } from '../../src/ai/reframeParse';
import { addBelief, listBeliefs } from '../../src/data/beliefDao';
import {
  getAiConsent, setAiConsent, getReminderFlag, setReminderFlag,
} from '../../src/services/settingsService';
import type { Belief } from '../../src/types';
import { AppText, Card, GhostButton, PrimaryButton, Screen, SoftInput } from '../../src/components';
import { useTheme } from '../../src/theme';

const USE_NATIVE = Platform.OS !== 'web';

/** 频率卡渐变与「旧：」文字色（设计稿 07/25 指定的暖调 / 静蓝调）。 */
const WARM_GRADIENT_LIGHT = ['#FBF8F1', '#F3E4D6'] as const;
const COOL_GRADIENT_LIGHT = ['#FBF8F1', '#E4EEEF'] as const;
const WARM_GRADIENT_DARK = ['#2A2440', '#39294A'] as const;
const COOL_GRADIENT_DARK = ['#2A2440', '#283548'] as const;
const WARM_BORDER = 'rgba(201,123,90,0.25)';
const COOL_BORDER = 'rgba(110,139,150,0.28)';
const OLD_META_WARM = '#B49076';
const OLD_META_COOL = '#8FA8AE';

/** 改写等待态：三个呼吸的小圆点（同教练等待态）。 */
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
      <AppText variant="caption" secondary>正在调成新的频率...</AppText>
    </View>
  );
}

/** 每日提醒开关行（设计稿 07/25b）。 */
function ReminderRow({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 16, paddingHorizontal: 4, gap: 14,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontSize: 14, lineHeight: 21 }}>设为每日提醒</AppText>
        <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 18 }}>
          每天早上 8:00 温柔地提醒你
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.hairline, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/** 蜕变时刻结果页（设计稿 07）：旧频率 → 新频率的展示，收藏后才入卡墙。 */
function TransformResult({
  result, reminderOn, onReminderChange, onSave, onDiscard,
}: {
  result: ReframeResult;
  reminderOn: boolean;
  onReminderChange: (v: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { colors, fontFamily, isDark } = useTheme();
  // 旧频率卡底色：设计稿 #EDE8DC（浅色 hairline 调的表层）；深色用米白低透明度。
  const oldBg = isDark ? 'rgba(245,241,232,0.08)' : '#EDE8DC';
  const oldText = isDark ? colors.textSecondary : '#6E655A';

  return (
    <View style={{ marginTop: 26, alignItems: 'center', gap: 18 }}>
      {/* 旧频率（弱化 + 删除线） */}
      <View style={{ width: '100%', opacity: 0.55 }}>
        <AppText
          variant="caption" secondary
          style={{ fontSize: 11, lineHeight: 16, letterSpacing: 0.7, textAlign: 'center', marginBottom: 8 }}
        >
          旧频率
        </AppText>
        <View style={{ backgroundColor: oldBg, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18 }}>
          <AppText
            color={oldText}
            style={{ fontSize: 15, lineHeight: 25, textAlign: 'center', textDecorationLine: 'line-through' }}
          >
            {result.limitingBelief}
          </AppText>
        </View>
      </View>

      <Feather name="arrow-down" size={22} color={colors.accent} />

      {/* 新频率（渐变展示卡） */}
      <View style={{ width: '100%' }}>
        <AppText
          variant="caption" color={colors.accent}
          style={{ fontSize: 11, lineHeight: 16, letterSpacing: 0.7, textAlign: 'center', marginBottom: 10 }}
        >
          新频率
        </AppText>
        <LinearGradient
          colors={[...(isDark ? WARM_GRADIENT_DARK : WARM_GRADIENT_LIGHT)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={{
            borderRadius: 24, borderWidth: 1, borderColor: WARM_BORDER,
            paddingVertical: 34, paddingHorizontal: 22, alignItems: 'center', gap: 12,
            shadowColor: '#C97B5A', shadowOpacity: 0.16, shadowRadius: 32,
            shadowOffset: { width: 0, height: 16 }, elevation: 5,
          }}
        >
          <AppText
            style={{
              fontFamily: fontFamily.serif, fontStyle: 'italic',
              fontSize: 21, lineHeight: 34, textAlign: 'center',
            }}
          >
            {result.empoweringBelief}
          </AppText>
          {result.mantra ? (
            <AppText variant="caption" color={OLD_META_WARM} style={{ fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
              {result.mantra}
            </AppText>
          ) : null}
        </LinearGradient>
      </View>

      {/* 设为每日提醒（收藏后才持久化） */}
      <View style={{ width: '100%' }}>
        <ReminderRow value={reminderOn} onChange={onReminderChange} />
      </View>

      <PrimaryButton glow label="收藏这张频率卡片" onPress={onSave} style={{ height: 54, alignSelf: 'stretch' }} />
      <Pressable accessibilityRole="button" onPress={onDiscard} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <AppText variant="caption" secondary style={{ fontSize: 13, paddingVertical: 4 }}>
          先不收藏，换一句再写
        </AppText>
      </Pressable>
    </View>
  );
}

/** 频率卡（设计稿 25/25b）：暖调 / 静蓝调渐变交替，轻触展开蜕变详情与每日提醒。 */
function BeliefCard({ belief, warm }: { belief: Belief; warm: boolean }) {
  const { colors, fontFamily, shadow, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [reminder, setReminder] = useState(false);

  useEffect(() => {
    getReminderFlag(belief.id).then(setReminder).catch(() => {});
  }, [belief.id]);

  const toggleReminder = (v: boolean) => {
    setReminder(v);
    // 注意：目前只持久化开关状态，真正的每日 8:00 本地通知排程是后续工作。
    setReminderFlag(belief.id, v).catch(() => {});
  };

  const tint = warm ? colors.accent : colors.presence;
  const metaTint = warm ? OLD_META_WARM : OLD_META_COOL;
  const gradient = isDark
    ? (warm ? WARM_GRADIENT_DARK : COOL_GRADIENT_DARK)
    : (warm ? WARM_GRADIENT_LIGHT : COOL_GRADIENT_LIGHT);
  const d = new Date(belief.createdAt);

  return (
    <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)}>
      <LinearGradient
        colors={[...gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={{
          borderRadius: 22, paddingVertical: 22, paddingHorizontal: 24,
          borderWidth: 1, borderColor: warm ? WARM_BORDER : COOL_BORDER,
          marginBottom: 16, ...shadow.soft,
        }}
      >
        <AppText variant="caption" color={tint} style={{ fontSize: 11, lineHeight: 16, letterSpacing: 0.6, marginBottom: 8 }}>
          新频率
        </AppText>
        <AppText style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 29 }}>
          {belief.mantra || belief.empoweringBelief}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
          <AppText color={metaTint} numberOfLines={expanded ? undefined : 1} style={{ flex: 1, fontSize: 11, lineHeight: 17 }}>
            旧：{belief.limitingBelief}
          </AppText>
          <Ionicons name="heart" size={17} color={tint} />
        </View>
        {expanded ? (
          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.hairline, gap: 8 }}>
            <AppText
              variant="caption"
              secondary
              style={{ fontSize: 13, lineHeight: 22, textDecorationLine: 'line-through' }}
            >
              旧频率：{belief.limitingBelief}
            </AppText>
            {belief.source ? (
              <AppText variant="caption" secondary style={{ fontSize: 13, lineHeight: 22 }}>
                来源：{belief.source}
              </AppText>
            ) : null}
            <AppText variant="caption" color={tint} style={{ fontSize: 13, lineHeight: 22 }}>
              新频率：{belief.empoweringBelief}
            </AppText>
            <AppText variant="caption" color={metaTint} style={{ fontSize: 12, lineHeight: 18 }}>
              收藏于 {d.getMonth() + 1} 月 {d.getDate()} 日
            </AppText>
            <ReminderRow value={reminder} onChange={toggleReminder} />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

export default function BeliefsScreen() {
  const [input, setInput] = useState('');
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ReframeResult | null>(null);
  const [reminderOn, setReminderOn] = useState(false);
  const [error, setError] = useState<'network' | 'nokey' | null>(null);
  const [list, setList] = useState<Belief[]>([]);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { colors, fontFamily, radius, shadow } = useTheme();

  useFocusEffect(useCallback(() => { listBeliefs().then(setList); }, []));

  /** 发送入口：第一次询问一次同意，之后直接发送。 */
  const onSendPress = async () => {
    if (await getAiConsent()) await confirmSend();
    else setConfirming(true);
  };

  const acceptAndSend = async () => {
    await setAiConsent();
    await confirmSend();
  };

  const confirmSend = async () => {
    setConfirming(false);
    setLoading(true);
    setStream('');
    setError(null);
    try {
      const raw = await runReframe(input.trim(), (d) => setStream((s) => s + d));
      // 蜕变时刻（设计稿 07）：先展示结果，由用户决定是否收藏，不再静默入库。
      setResult(parseReframe(raw));
      setReminderOn(false);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg.includes('API Key') ? 'nokey' : 'network');
    } finally {
      setStream('');
      setLoading(false);
    }
  };

  /** 收藏：入库 + 持久化每日提醒开关 + 收起结果页刷新卡墙。 */
  const saveCard = async () => {
    if (!result) return;
    await addBelief(result);
    const fresh = await listBeliefs();
    // 列表按 createdAt 倒序，刚收藏的卡片在最前；提醒开关跟随这张卡持久化。
    // 注意：目前只保存开关状态（reminder_<beliefId>），真正的本地通知排程是后续工作。
    if (reminderOn && fresh[0]) await setReminderFlag(fresh[0].id, true);
    setList(fresh);
    setResult(null);
    setInput('');
  };

  const discard = () => {
    setResult(null);
    setReminderOn(false);
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* 改写区（设计稿 07） */}
        <AppText
          style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32, textAlign: 'center', paddingTop: 16 }}
        >
          信念改写
        </AppText>

        {result ? (
          /* 蜕变时刻结果页（设计稿 07） */
          <TransformResult
            result={result}
            reminderOn={reminderOn}
            onReminderChange={setReminderOn}
            onSave={saveCard}
            onDiscard={discard}
          />
        ) : (
          <View style={{ marginTop: 26, gap: 14 }}>
            <AppText
              variant="caption"
              secondary
              style={{ fontSize: 11, lineHeight: 16, letterSpacing: 0.7, textAlign: 'center' }}
            >
              旧频率
            </AppText>
            <SoftInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={'写下一句限制你的信念，比如\n「我总是要足够好，才值得被爱」'}
              style={{
                borderWidth: 0,
                borderRadius: radius.lg,
                padding: 22,
                minHeight: 120,
                ...shadow.soft,
              }}
            />
            {/* 首次发送前确认一次（内联，不用 Alert；之后不再询问） */}
            {confirming ? (
              <Card radius="md" padding={18} style={{ gap: 14 }}>
                <AppText variant="caption" secondary style={{ lineHeight: 22 }}>
                  这句信念将发送给 DeepSeek，用于改写成新的频率。你的分享只属于你自己 · 已加密。只在第一次发送前问你这一次。
                </AppText>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <GhostButton label="取消" onPress={() => setConfirming(false)} style={{ flex: 1, height: 48 }} />
                  <PrimaryButton label="确认发送" onPress={acceptAndSend} style={{ flex: 1.4, height: 48 }} />
                </View>
              </Card>
            ) : null}
            <PrimaryButton
              glow
              label="开始改写"
              disabled={!input.trim() || loading || confirming}
              onPress={onSendPress}
              style={{ height: 54 }}
            />
          </View>
        )}

        {/* 流式改写 / 等待态 */}
        {loading && stream ? (
          <Card radius="md" padding={18} style={{ marginTop: 18, ...shadow.soft }}>
            <AppText style={{ fontSize: 15, lineHeight: 26 }}>{stream}</AppText>
          </Card>
        ) : null}
        {loading && !stream ? <View style={{ marginTop: 10 }}><WaitingDots /></View> : null}

        {/* 网络失败 */}
        {error === 'network' ? (
          <Card radius="md" padding={20} style={{ marginTop: 18, alignItems: 'center', gap: 14 }}>
            <Feather name="alert-triangle" size={26} color={colors.danger} />
            <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
              连接暂时断了一下，{'\n'}这句信念还留在这里，稍后再试。
            </AppText>
            <GhostButton label="重新连接" onPress={confirmSend} style={{ height: 44, paddingHorizontal: 20 }} />
          </Card>
        ) : null}

        {/* 未配置 API Key */}
        {error === 'nokey' ? (
          <Card radius="md" padding={22} style={{ marginTop: 18, alignItems: 'center', gap: 14 }}>
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
              改写还没有准备好
            </AppText>
            <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24 }}>
              去「我的」里连接一下，{'\n'}就可以开始改写了。{'\n'}你写下的信念不会因此丢失。
            </AppText>
            <GhostButton label="前往设置" onPress={() => router.push('/me')} style={{ height: 44, paddingHorizontal: 24 }} />
          </Card>
        ) : null}

        {/* 频率卡卡墙（设计稿 25 / 26） */}
        <View style={{ marginTop: 44, borderTopWidth: 1, borderTopColor: colors.hairline, paddingTop: 26 }}>
          <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32 }}>我的频率卡</AppText>
          {list.length > 0 ? (
            <AppText variant="caption" secondary style={{ marginTop: 6, fontSize: 13 }}>
              {list.length} 张卡片 · 轻触翻看蜕变
            </AppText>
          ) : null}

          {list.length === 0 && !loading ? (
            /* 空态（设计稿 26） */
            <View style={{ alignItems: 'center', gap: 22, paddingVertical: 44 }}>
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: colors.accentSoft,
                  opacity: 0.7,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="heart" size={32} color={colors.accent} />
              </View>
              <AppText style={{ fontSize: 16, lineHeight: 27, textAlign: 'center' }}>还没有频率卡</AppText>
              <AppText variant="caption" secondary style={{ textAlign: 'center', lineHeight: 24, maxWidth: 230 }}>
                从一次信念改写开始，{'\n'}把新的频率，留在身边。
              </AppText>
              <PrimaryButton
                label="开始信念改写"
                onPress={() => inputRef.current?.focus()}
                style={{ marginTop: 6, height: 48, paddingHorizontal: 28 }}
              />
            </View>
          ) : (
            <View style={{ marginTop: 18 }}>
              {list.map((b, i) => (
                <BeliefCard key={b.id} belief={b} warm={i % 2 === 0} />
              ))}
              <View
                style={{
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.hairline,
                  paddingVertical: 22,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                }}
              >
                <AppText variant="caption" secondary style={{ fontSize: 13 }}>
                  再收藏一张，让新的频率生根
                </AppText>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
