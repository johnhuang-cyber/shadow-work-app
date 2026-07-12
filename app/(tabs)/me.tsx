import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Switch, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getApiKey, setApiKey, getModel, setModel, getPowerScore, setPowerScore,
} from '../../src/services/settingsService';
import { exportAllData } from '../../src/services/exportService';
import { listBeliefs } from '../../src/data/beliefDao';
import { listEntries } from '../../src/data/journalDao';
import { derivePartsSummary, type PartSummary } from '../../src/domain/parts';
import type { Belief } from '../../src/types';
import { AppText, Card, PrimaryButton, Screen, SoftInput } from '../../src/components';
import { useTheme, useThemePref } from '../../src/theme';

/** 频率卡渐变（设计稿 08/25）：暖调 / 静蓝调交替；深色用深表层色调。 */
const WARM_GRADIENT_LIGHT = ['#FBF8F1', '#F3E4D6'] as const;
const COOL_GRADIENT_LIGHT = ['#FBF8F1', '#E4EEEF'] as const;
const WARM_GRADIENT_DARK = ['#2A2440', '#39294A'] as const;
const COOL_GRADIENT_DARK = ['#2A2440', '#283548'] as const;

const todayKey = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** 今日力量感（设计稿 08）：120px 光晕圆 + 衬线数字，轻触展开 − / + 微调。 */
function PowerCircle() {
  const { colors, fontFamily } = useTheme();
  const [score, setScore] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  useFocusEffect(useCallback(() => {
    getPowerScore(todayKey()).then(setScore).catch(() => {});
  }, []));

  const adjust = (delta: number) => {
    const next = Math.min(Math.max((score ?? 5) + delta, 1), 10);
    setScore(next);
    setPowerScore(todayKey(), next).catch(() => {});
  };

  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="今日力量感"
        onPress={() => setEditing((e) => !e)}
        style={{ width: 148, height: 148, alignItems: 'center', justifyContent: 'center' }}
      >
        {/* 柔和光晕：层叠的 accentSoft 圆 */}
        <View
          style={{
            position: 'absolute', width: 148, height: 148, borderRadius: 74,
            backgroundColor: colors.accentSoft, opacity: 0.45,
          }}
        />
        <View
          style={{
            position: 'absolute', width: 134, height: 134, borderRadius: 67,
            backgroundColor: colors.accentSoft, opacity: 0.55,
          }}
        />
        <View
          style={{
            width: 120, height: 120, borderRadius: 60,
            backgroundColor: colors.surface,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#2A2622', shadowOpacity: 0.08, shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 }, elevation: 3,
          }}
        >
          <AppText color={colors.accent} style={{ fontFamily: fontFamily.serif, fontSize: 34, lineHeight: 46 }}>
            {score ?? '—'}
          </AppText>
        </View>
      </Pressable>
      <AppText variant="caption" secondary style={{ fontSize: 13 }}>今日力量感</AppText>
      {editing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 2 }}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="降低力量感"
            onPress={() => adjust(-1)} hitSlop={8}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Feather name="minus" size={16} color={colors.textSecondary} />
          </Pressable>
          <AppText variant="caption" secondary style={{ fontSize: 12 }}>1 – 10</AppText>
          <Pressable
            accessibilityRole="button" accessibilityLabel="提升力量感"
            onPress={() => adjust(1)} hitSlop={8}
            style={({ pressed }) => ({
              width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Feather name="plus" size={16} color={colors.accent} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** 我的内在部分：跨日记统计被命名的部分，柔和胶囊换行排列；没有时整块隐藏。 */
function InnerParts() {
  const { colors, fontFamily, radius } = useTheme();
  const [parts, setParts] = useState<PartSummary[]>([]);

  useFocusEffect(useCallback(() => {
    listEntries().then((es) => setParts(derivePartsSummary(es))).catch(() => {});
  }, []));

  if (parts.length === 0) return null;

  return (
    <View>
      <AppText style={{ fontSize: 13, lineHeight: 20, fontFamily: fontFamily.sansSemiBold }}>
        我的内在部分
      </AppText>
      <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 18, marginTop: 4 }}>
        这些部分被你看见的次数
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {parts.map((p) => (
          <View
            key={p.label}
            style={{
              backgroundColor: colors.accentSoft,
              borderRadius: radius.pill,
              paddingVertical: 7,
              paddingHorizontal: 14,
            }}
          >
            <AppText variant="caption" style={{ fontSize: 13, lineHeight: 18 }}>
              {p.label} ×{p.count}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 收藏的频率卡片（设计稿 08）：横向迷你卡预览，最多 3 张。 */
function BeliefPreview({ beliefs }: { beliefs: Belief[] }) {
  const { colors, fontFamily, isDark } = useTheme();
  const router = useRouter();

  if (beliefs.length === 0) return null;

  return (
    <View>
      <AppText style={{ fontSize: 13, lineHeight: 20, fontFamily: fontFamily.sansSemiBold, marginBottom: 12 }}>
        收藏的频率卡片
      </AppText>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={beliefs.slice(0, 3)}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item, index }) => {
          const warm = index % 2 === 0;
          const gradient = isDark
            ? (warm ? WARM_GRADIENT_DARK : COOL_GRADIENT_DARK)
            : (warm ? WARM_GRADIENT_LIGHT : COOL_GRADIENT_LIGHT);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/beliefs')}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <LinearGradient
                colors={[...gradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 1 }}
                style={{
                  width: 130, height: 88, borderRadius: 16, padding: 14, justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: warm ? 'rgba(201,123,90,0.2)' : 'rgba(110,139,150,0.25)',
                }}
              >
                <AppText
                  numberOfLines={2}
                  style={{ fontFamily: fontFamily.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 20 }}
                >
                  {item.mantra || item.empoweringBelief}
                </AppText>
              </LinearGradient>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const PRIVACY_NOTE =
  '你的日记、冥想和信念，只存在你手机本地。仅当你主动「问教练」或「改写信念」时，才把相关文本发送给 DeepSeek。你的分享只属于你自己 · 已加密。';

/** 设置列表行（设计稿 08）：1.5 描边图标 + 标签 + 右侧元素。 */
function SettingsRow({
  icon, label, onPress, right, last, children,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.hairline }}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 14,
          paddingVertical: 15, paddingHorizontal: 18,
          opacity: pressed && onPress ? 0.6 : 1,
        })}
      >
        <Feather name={icon} size={18} color={colors.textSecondary} />
        <AppText style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{label}</AppText>
        {right ?? <Feather name="chevron-right" size={16} color={colors.textSecondary} />}
      </Pressable>
      {children}
    </View>
  );
}

export default function MeScreen() {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [reasoner, setReasoner] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [notifyHint, setNotifyHint] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const { colors, fontFamily, radius } = useTheme();
  const { pref, setPref } = useThemePref();

  useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
    getModel().then(m => setReasoner(m === 'deepseek-reasoner'));
  }, []);

  useFocusEffect(useCallback(() => { listBeliefs().then(setBeliefs).catch(() => {}); }, []));

  const save = async () => {
    if (!key.trim()) {
      setFeedback({ kind: 'error', text: '请先粘贴 API Key' });
      return;
    }
    await setApiKey(key);
    setHasKey(true);
    setKey('');
    setFeedback({ kind: 'ok', text: '已保存，只存在你的手机里' });
  };

  const toggle = async (v: boolean) => {
    setReasoner(v);
    await setModel(v ? 'deepseek-reasoner' : 'deepseek-chat');
  };

  /** 导出全部本地数据为 Markdown：原生调起分享面板，Web 直接下载。 */
  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportFeedback(null);
    try {
      await exportAllData();
      setExportFeedback({ kind: 'ok', text: '已生成，请选择保存位置' });
    } catch (e: any) {
      setExportFeedback({ kind: 'error', text: e?.message ?? '导出没有成功，请稍后再试。' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48, gap: 28 }}
      >
        <View style={{ paddingTop: 16 }}>
          <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32 }}>
            我的空间
          </AppText>
        </View>

        {/* 今日力量感（设计稿 08） */}
        <PowerCircle />

        {/* 我的内在部分——没有命名过时整块隐藏 */}
        <InnerParts />

        {/* 收藏的频率卡片（设计稿 08）——无卡片时整块隐藏 */}
        <BeliefPreview beliefs={beliefs} />

        {/* 设置列表（设计稿 08） */}
        <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface }}>
          <SettingsRow icon="bell" label="通知" onPress={() => setNotifyHint((v) => !v)}>
            {notifyHint ? (
              <AppText variant="caption" secondary style={{ fontSize: 12, paddingHorizontal: 50, paddingBottom: 14 }}>
                即将到来
              </AppText>
            ) : null}
          </SettingsRow>
          <SettingsRow icon="lock" label="隐私" onPress={() => setPrivacyOpen((v) => !v)}>
            {privacyOpen ? (
              <AppText
                variant="caption" secondary
                style={{ fontSize: 13, lineHeight: 22, paddingHorizontal: 50, paddingBottom: 16 }}
              >
                {PRIVACY_NOTE}
              </AppText>
            ) : null}
          </SettingsRow>
          <SettingsRow
            icon="moon"
            label="深色模式"
            last
            right={
              <Switch
                value={pref === 'dark'}
                onValueChange={(v) => setPref(v ? 'dark' : 'system')}
                trackColor={{ false: colors.hairline, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            }
          >
            <AppText variant="caption" secondary style={{ fontSize: 12, paddingHorizontal: 50, paddingBottom: 14, marginTop: -6 }}>
              关闭时跟随系统
            </AppText>
          </SettingsRow>
        </View>

        {/* 连接（DeepSeek 配置，移至页面底部） */}
        <View style={{ gap: 14 }}>
          <AppText style={{ fontSize: 13, lineHeight: 20, fontFamily: fontFamily.sansSemiBold }}>
            连接
          </AppText>

          <Card radius="md" padding={22} style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="key" size={16} color={colors.textSecondary} />
              <AppText style={{ fontSize: 15, lineHeight: 22, fontFamily: fontFamily.sansSemiBold }}>
                DeepSeek API Key
              </AppText>
            </View>
            <AppText variant="caption" secondary style={{ fontSize: 13 }}>
              {hasKey ? '✅ 已配置（仅存本机）' : '尚未配置'}
            </AppText>
            <SoftInput
              multiline={false}
              value={key}
              onChangeText={(t) => { setKey(t); setFeedback(null); }}
              placeholder="粘贴 sk-..."
              autoCapitalize="none"
              secureTextEntry
              style={{
                minHeight: 48,
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: radius.pill,
                backgroundColor: colors.bg,
              }}
            />
            {feedback ? (
              <AppText
                variant="caption"
                color={feedback.kind === 'ok' ? colors.success : colors.danger}
                style={{ fontSize: 13 }}
              >
                {feedback.text}
              </AppText>
            ) : null}
            <PrimaryButton label="保存" onPress={save} style={{ height: 48 }} />
          </Card>

          <Card radius="md" padding={22}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText style={{ fontSize: 15, lineHeight: 22 }}>用更强推理模型</AppText>
                <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 18 }}>
                  deepseek-reasoner · 回应更慢，但想得更深
                </AppText>
              </View>
              <Switch
                value={reasoner}
                onValueChange={toggle}
                trackColor={{ false: colors.hairline, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>

          {/* 导出我的数据：随时把日记、频率卡与冥想记录带走 */}
          <View style={{ borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface }}>
            <SettingsRow
              icon="download"
              label="导出我的数据"
              onPress={doExport}
              last
              right={exporting ? <ActivityIndicator size="small" color={colors.accent} /> : undefined}
            >
              {exportFeedback ? (
                <AppText
                  variant="caption"
                  color={exportFeedback.kind === 'ok' ? colors.success : colors.danger}
                  style={{ fontSize: 12, lineHeight: 18, paddingHorizontal: 50, paddingBottom: 14 }}
                >
                  {exportFeedback.text}
                </AppText>
              ) : null}
            </SettingsRow>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              backgroundColor: colors.accentSoft,
              borderRadius: radius.md,
              padding: 18,
            }}
          >
            <Feather name="lock" size={16} color={colors.textSecondary} style={{ marginTop: 3 }} />
            <AppText variant="caption" secondary style={{ flex: 1, fontSize: 13, lineHeight: 22 }}>
              {PRIVACY_NOTE}
            </AppText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
