import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { runReframe } from '../../src/ai/deepseek';
import { parseReframe } from '../../src/ai/reframeParse';
import { addBelief, listBeliefs } from '../../src/data/beliefDao';
import { getAiConsent, setAiConsent } from '../../src/services/settingsService';
import type { Belief } from '../../src/types';
import { AppText, Card, GhostButton, PrimaryButton, Screen, SoftInput } from '../../src/components';
import { useTheme } from '../../src/theme';

const USE_NATIVE = Platform.OS !== 'web';

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

/** 频率卡（设计稿 25）：暖调 / 静蓝调交替，轻触展开「旧 → 新」的蜕变。 */
function BeliefCard({ belief, warm }: { belief: Belief; warm: boolean }) {
  const { colors, fontFamily, shadow } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const tint = warm ? colors.accent : colors.presence;
  const tintSoft = warm ? colors.accentSoft : colors.presenceSoft;

  return (
    <Pressable accessibilityRole="button" onPress={() => setExpanded((e) => !e)}>
      <Card
        radius="md"
        padding={22}
        style={{ marginBottom: 16, borderWidth: 1, borderColor: tintSoft, ...shadow.soft }}
      >
        <AppText variant="caption" color={tint} style={{ fontSize: 11, lineHeight: 16, letterSpacing: 0.6, marginBottom: 8 }}>
          新频率
        </AppText>
        <AppText style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 29 }}>
          {belief.mantra || belief.empoweringBelief}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
          <AppText variant="caption" secondary numberOfLines={expanded ? undefined : 1} style={{ flex: 1, fontSize: 11, lineHeight: 17 }}>
            旧：{belief.limitingBelief}
          </AppText>
          <Feather name="heart" size={16} color={tint} />
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
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export default function BeliefsScreen() {
  const [input, setInput] = useState('');
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
      const r = parseReframe(raw);
      await addBelief(r);
      setInput('');
      setList(await listBeliefs());
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg.includes('API Key') ? 'nokey' : 'network');
    } finally {
      setStream('');
      setLoading(false);
    }
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
            label="收藏这张频率卡片"
            disabled={!input.trim() || loading || confirming}
            onPress={onSendPress}
            style={{ height: 54 }}
          />
        </View>

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
