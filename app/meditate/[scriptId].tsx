import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS, medReducer, initMedState } from '../../src/domain/meditationScripts';
import type { MedState, MedAction } from '../../src/domain/meditationScripts';
import { addSession } from '../../src/data/meditationDao';
import { AppText } from '../../src/components';
import { darkColors, fontFamily } from '../../src/theme';

const USE_NATIVE = Platform.OS !== 'web';

// 沉浸态永远使用深色底（设计稿 05/06 的 bgDeep），与系统外观无关。
const C = darkColors;
/** 深色底上的米白文字（textInverse 的 alpha 变体，设计稿 rgba(245,241,232,x)）。 */
const cream = (alpha: number) => `rgba(245,241,232,${alpha})`;

function formatRemaining(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 中央呼吸圆环：4 秒吸气放大 / 6 秒呼气收缩（同日记页的 BreathingCircle，深色版）。 */
function DarkBreathingRing() {
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
    <View style={{ width: 230, height: 230, alignItems: 'center', justifyContent: 'center' }}>
      {/* 外层临在色柔光 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 230,
          height: 230,
          borderRadius: 115,
          backgroundColor: C.presenceSoft,
          opacity: 0.8,
          transform: [{ scale }],
        }}
      />
      {/* 呼吸细环 */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 190,
          height: 190,
          borderRadius: 95,
          borderWidth: 1,
          borderColor: cream(0.18),
          transform: [{ scale }],
        }}
      />
      {/* 内圆 */}
      <View
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: cream(0.06),
          borderWidth: 1,
          borderColor: cream(0.14),
        }}
      />
    </View>
  );
}

/** 完成态（设计稿 06）：柔光 + 「此刻，你已完整。」 */
function Completion({ onBack }: { onBack: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 30, paddingHorizontal: 40, opacity }}
    >
      <View
        style={{
          position: 'absolute',
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: C.accentSoft,
          opacity: 0.9,
        }}
      />
      <AppText
        color={C.textPrimary}
        style={{
          fontFamily: fontFamily.serif,
          fontStyle: 'italic',
          fontSize: 26,
          lineHeight: 42,
          textAlign: 'center',
        }}
      >
        此刻，{'\n'}你已完整。
      </AppText>
      <AppText color={cream(0.5)} style={{ fontSize: 14, lineHeight: 24, textAlign: 'center' }}>
        你为自己，{'\n'}腾出了一段安静的时间。
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => ({
          marginTop: 10,
          borderWidth: 1,
          borderColor: cream(0.25),
          borderRadius: 999,
          paddingVertical: 12,
          paddingHorizontal: 28,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <AppText color={cream(0.65)} style={{ fontSize: 13, lineHeight: 18 }}>回到今天</AppText>
      </Pressable>
    </Animated.View>
  );
}

export default function PlayerScreen() {
  const { scriptId } = useLocalSearchParams<{ scriptId: string }>();
  const router = useRouter();
  const script = MEDITATION_SCRIPTS.find(s => s.id === scriptId)!;
  const [running, setRunning] = useState(true);
  const [muted, setMuted] = useState(false);
  const [state, dispatch] = useReducer(
    (s: MedState, a: MedAction) => medReducer(s, a, script), script, initMedState
  );
  const spokenStep = useRef(-1);
  const startedAt = useRef(Date.now());
  const mutedRef = useRef(false);
  const voiceRef = useRef<string | undefined>(undefined);

  // 挑一个更自然的中文语音（enhanced/premium/neural 优先），去掉机器人感。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const zh = voices.filter(v => v.language?.toLowerCase().startsWith('zh'));
        if (!zh.length) return;
        const pick =
          zh.find(v => /enhanced|premium|neural/i.test(v.identifier)) ??
          zh.find(v => v.quality === Speech.VoiceQuality.Enhanced) ??
          zh[0];
        if (!cancelled) voiceRef.current = pick.identifier;
      } catch {
        // Web 等环境可能不支持，静默回退到系统默认音色
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state.stepIndex !== spokenStep.current && !state.completed) {
      spokenStep.current = state.stepIndex;
      if (!mutedRef.current) {
        Speech.speak(script.steps[state.stepIndex].text, {
          language: 'zh-CN',
          rate: 0.8,
          pitch: 0.95,
          voice: voiceRef.current,
        });
      }
    }
  }, [state.stepIndex, state.completed]);

  useEffect(() => {
    if (!running || state.completed) return;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [running, state.completed]);

  useEffect(() => {
    if (state.completed) {
      Speech.stop();
      addSession({ scriptId: script.id, durationSec: Math.round((Date.now() - startedAt.current) / 1000), completed: true })
        .catch(e => console.error('保存冥想记录失败', e));
    }
  }, [state.completed]);

  // 离开页面（含 OS 手势返回）时停止朗读
  useEffect(() => () => { Speech.stop(); }, []);

  const restart = () => {
    Speech.stop();
    spokenStep.current = -1;
    startedAt.current = Date.now();
    dispatch({ type: 'RESET' });
    setRunning(true);
  };
  const end = () => { Speech.stop(); router.back(); };

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    if (next) Speech.stop();
  };

  const elapsed = script.steps.slice(0, state.stepIndex).reduce((a, s) => a + s.seconds, 0) + state.secondsInStep;
  const totalSec = script.steps.reduce((a, s) => a + s.seconds, 0);
  const remaining = Math.max(totalSec - elapsed, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      {state.completed ? (
        <Completion onBack={() => router.back()} />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 18 }}>
          {/* 顶部：标题居中，右侧静音开关 */}
          <View style={{ minHeight: 44, justifyContent: 'center' }}>
            <AppText
              color={cream(0.5)}
              style={{ fontSize: 13, lineHeight: 18, letterSpacing: 0.5, textAlign: 'center' }}
            >
              {script.title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={muted ? '开启语音引导' : '关闭语音引导'}
              onPress={toggleMute}
              style={({ pressed }) => ({
                position: 'absolute',
                right: -10,
                top: 0,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Feather name={muted ? 'volume-x' : 'volume-2'} size={20} color={cream(0.6)} />
            </Pressable>
          </View>

          {/* 中央：呼吸圆环 + 当前引导语 */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40 }}>
            <DarkBreathingRing />
            <View style={{ alignItems: 'center', gap: 16 }}>
              <AppText
                color={C.textPrimary}
                style={{
                  fontFamily: fontFamily.serif,
                  fontStyle: 'italic',
                  fontSize: 24,
                  lineHeight: 38,
                  textAlign: 'center',
                  maxWidth: 280,
                }}
              >
                {script.steps[state.stepIndex].text}
              </AppText>
              <AppText color={cream(0.45)} style={{ fontSize: 13, lineHeight: 18, letterSpacing: 0.6 }}>
                第 {state.stepIndex + 1} / {script.steps.length} 步
              </AppText>
            </View>
          </View>

          {/* 底部：剩余时间 · 进度点 · 控制 */}
          <View style={{ alignItems: 'center', gap: 22, paddingBottom: 40 }}>
            <AppText color={cream(0.45)} style={{ fontSize: 13, lineHeight: 18, letterSpacing: 0.8 }}>
              {formatRemaining(remaining)}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {script.steps.map((s, i) => (
                <View
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: i === state.stepIndex ? C.presence : cream(0.18),
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 34 }}>
              <Pressable accessibilityRole="button" onPress={restart} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <AppText color={cream(0.55)} style={{ fontSize: 13, lineHeight: 18 }}>重来</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={running ? '暂停' : '继续'}
                onPress={() => setRunning(r => !r)}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: cream(0.12),
                  borderWidth: 1,
                  borderColor: cream(0.2),
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Feather name={running ? 'pause' : 'play'} size={20} color={C.textPrimary} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={end} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <AppText color={cream(0.55)} style={{ fontSize: 13, lineHeight: 18 }}>结束</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
