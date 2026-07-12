import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { createEntry, deleteEntry, listEntries } from '../../src/data/journalDao';
import { addBelief, listBeliefs } from '../../src/data/beliefDao';
import { QUOTES } from '../../src/content/quotes';
import { dayOfYear } from '../../src/domain/quotePick';
import { getQuoteOffset, setQuoteOffset } from '../../src/services/settingsService';
import type { JournalEntry } from '../../src/types';
import { AppText, Card, GhostButton, PrimaryButton, Screen } from '../../src/components';
import { useTheme } from '../../src/theme';

const USE_NATIVE = Platform.OS !== 'web';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatToday(d: Date): string {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${WEEKDAYS[d.getDay()]}`;
}

function formatEntryDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// ——— 左滑删除（设计稿 27a/27b）———
const REVEAL_W = 86; // 打开后卡片左移的距离（设计稿卡片 left:-86px）
const OPEN_THRESHOLD = 72; // 松手时超过此位移则吸附展开，否则弹回
// 设计稿 27 的确认「放下」按钮在深浅两个模式下都是柔赭红 #B5493A
const RELEASE_BG = '#B5493A';
const RELEASE_TEXT = '#F5F1E8';

interface HistoryCardProps {
  item: JournalEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPress: () => void;
  onDeleted: () => void;
}

/**
 * 历史记录卡片：左滑露出「放下」入口 → 内联确认（放下/留着）→
 * 淡出 + 高度收合后删除。同一时刻只允许一张卡片处于打开态（由父级 openId 控制）。
 */
function HistoryCard({ item, open, onOpenChange, onPress, onDeleted }: HistoryCardProps) {
  const { colors, component, fontFamily, radius, shadow, isDark } = useTheme();
  const swipe = component.swipeDelete;
  const [confirming, setConfirming] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const tx = useRef(new Animated.Value(0)).current;
  const txVal = useRef(0);
  const startX = useRef(0);
  const rowH = useRef(0);
  const collapse = useRef(new Animated.Value(1)).current;
  const openChangeRef = useRef(onOpenChange);
  openChangeRef.current = onOpenChange;
  const confirmingRef = useRef(confirming);
  confirmingRef.current = confirming;

  useEffect(() => {
    const sub = tx.addListener(({ value }) => { txVal.current = value; });
    return () => tx.removeListener(sub);
  }, [tx]);

  // 别的卡片被打开（或列表滚动）时父级会把 open 置回 false：滑回并退出确认态
  useEffect(() => {
    if (!open) {
      setConfirming(false);
      Animated.spring(tx, { toValue: 0, bounciness: 4, useNativeDriver: USE_NATIVE }).start();
    }
  }, [open, tx]);

  const snap = useRef((toOpen: boolean) => {
    openChangeRef.current(toOpen);
    Animated.spring(tx, { toValue: toOpen ? -REVEAL_W : 0, bounciness: 4, useNativeDriver: USE_NATIVE }).start();
  }).current;

  const pan = useRef(
    PanResponder.create({
      // 只截获明确的横向手势，纵向滚动完全交还给列表
      onMoveShouldSetPanResponder: (_e, g) =>
        !confirmingRef.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => { startX.current = txVal.current; },
      onPanResponderMove: (_e, g) => {
        tx.setValue(Math.min(0, Math.max(-REVEAL_W - 18, startX.current + g.dx)));
      },
      onPanResponderRelease: () => snap(txVal.current <= -OPEN_THRESHOLD),
      onPanResponderTerminate: () => snap(txVal.current <= -OPEN_THRESHOLD),
    })
  ).current;

  const keep = () => {
    setConfirming(false);
    tx.setValue(0);
    onOpenChange(false);
  };

  const confirmDelete = () => {
    setCollapsing(true);
    Animated.timing(collapse, {
      toValue: 0,
      duration: swipe.collapseMs,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // 高度/边距动画无法走原生驱动
    }).start(() => onDeleted());
  };

  const collapseStyle = collapsing
    ? {
        opacity: collapse,
        height: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, rowH.current] }),
        marginBottom: collapse.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
        overflow: 'hidden' as const,
      }
    : { marginBottom: 12 };

  const onRowLayout = (h: number) => { if (!collapsing) rowH.current = h; };

  // 内联确认态（设计稿 27 第三张卡片）：要放下这段记录吗？ 留着 / 放下
  if (confirming) {
    return (
      <Animated.View style={collapseStyle} onLayout={(e) => onRowLayout(e.nativeEvent.layout.height)}>
        <Card
          radius="md"
          padding={20}
          style={{
            borderWidth: 1,
            borderColor: isDark ? 'rgba(217,136,120,0.3)' : 'rgba(181,73,58,0.25)',
            ...shadow.soft,
          }}
        >
          <AppText style={{ fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 14 }}>
            要放下这段记录吗？
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={keep}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(245,241,232,0.18)' : 'rgba(42,38,34,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AppText style={{ fontSize: 14, lineHeight: 20 }}>{swipe.cancelLabel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              disabled={collapsing}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 22,
                backgroundColor: RELEASE_BG,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText style={{ fontSize: 14, lineHeight: 20, fontFamily: fontFamily.sansSemiBold, color: RELEASE_TEXT }}>
                {swipe.confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Card>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={collapseStyle} onLayout={(e) => onRowLayout(e.nativeEvent.layout.height)}>
      <View style={{ borderRadius: radius.md, overflow: 'hidden' }}>
        {/* 左滑露出的「放下」区域 */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? swipe.revealBgDark : swipe.revealBg,
              borderRadius: radius.md,
              alignItems: 'flex-end',
              justifyContent: 'center',
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="放下这条记录"
            onPress={() => setConfirming(true)}
            style={{ width: REVEAL_W, alignItems: 'center', gap: 4, paddingVertical: 10 }}
          >
            <Feather name="trash-2" size={18} color={colors.danger} />
            <AppText style={{ fontSize: 11, lineHeight: 15, color: colors.danger }}>{swipe.confirmLabel}</AppText>
          </Pressable>
        </View>
        <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: tx }] }}>
          <Pressable accessibilityRole="button" onPress={open ? () => snap(false) : onPress}>
            <Card radius="md" padding={18} style={shadow.soft}>
              <AppText numberOfLines={1} style={{ fontSize: 16, lineHeight: 24, paddingRight: Platform.OS === 'web' ? 24 : 0 }}>
                {item.trigger || '（未命名的一次记录）'}
              </AppText>
              <AppText variant="caption" secondary style={{ marginTop: 6, fontSize: 13 }}>
                {formatEntryDate(item.createdAt)}
              </AppText>
              {Platform.OS === 'web' ? (
                // Web 兜底：鼠标用户不便左滑，卡片右上角常驻一枚低调删除入口
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="放下这条记录"
                  onPress={() => {
                    onOpenChange(true);
                    setConfirming(true);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    opacity: pressed ? 0.9 : 0.4,
                  })}
                >
                  <Feather name="trash-2" size={14} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </Card>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { colors, fontFamily } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [containerH, setContainerH] = useState(0);
  // 当前左滑打开的卡片 id；同一时刻最多一张（打开另一张时上一张自动滑回）
  const [openId, setOpenId] = useState<string | null>(null);
  // 今日语录是否已收进频率卡（会话内状态；进入页面时按 mantra 与卡墙对齐）
  const [collected, setCollected] = useState(false);
  // 「换一句」的当天偏移：切到哪句就停在哪句（按天持久化）
  const [quoteOffset, setQuoteOffsetState] = useState(0);
  const listRef = useRef<FlatList<JournalEntry>>(null);
  const quoteFade = useRef(new Animated.Value(1)).current;

  // 每日一句：Katie Clarke 语录，按年内天数轮换 + 用户当天的「换一句」偏移
  const todayKey = new Date().toISOString().slice(0, 10);
  const quote = QUOTES[(dayOfYear(new Date()) + quoteOffset) % QUOTES.length];

  useFocusEffect(
    useCallback(() => {
      listEntries().then(setEntries);
      getQuoteOffset(todayKey).then(setQuoteOffsetState).catch(() => {});
      listBeliefs()
        .then((bs) => setCollected(bs.some((b) => b.mantra === quote.zh)))
        .catch(() => {});
    }, [quote.zh, todayKey])
  );

  /** 换一句：柔和淡出 → 切换 → 淡入；当天偏移持久化。 */
  const nextQuote = () => {
    Animated.timing(quoteFade, {
      toValue: 0, duration: 160, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE,
    }).start(() => {
      const next = quoteOffset + 1;
      setQuoteOffsetState(next);
      setQuoteOffset(todayKey, next).catch(() => {});
      const zh = QUOTES[(dayOfYear(new Date()) + next) % QUOTES.length].zh;
      listBeliefs().then((bs) => setCollected(bs.some((b) => b.mantra === zh))).catch(() => {});
      Animated.timing(quoteFade, {
        toValue: 1, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: USE_NATIVE,
      }).start();
    });
  };

  /** 收藏今日语录：中文作 mantra、英文原句作新频率，落进频率卡墙（去重）。 */
  const collectQuote = async () => {
    if (collected) return;
    try {
      const existing = await listBeliefs();
      if (!existing.some((b) => b.mantra === quote.zh)) {
        await addBelief({
          limitingBelief: '',
          source: 'Katie Clarke',
          empoweringBelief: quote.en,
          mantra: quote.zh,
        });
      }
      setCollected(true);
    } catch {
      // 存储失败不打断首页；下次进入或再点一次会重试
    }
  };

  const start = async () => {
    try {
      setCreateError(null);
      const e = await createEntry();
      router.push(`/journal/${e.id}`);
    } catch (err: any) {
      setCreateError(`无法创建记录：${err?.message ?? String(err)}`);
    }
  };

  const scrollToHistory = () => {
    listRef.current?.scrollToOffset({ offset: Math.max(containerH - 24, 400), animated: true });
  };

  const hero = (
    <View style={{ minHeight: containerH || 560, paddingTop: 16, paddingBottom: 28 }}>
      <AppText variant="caption" secondary style={{ fontSize: 13, letterSpacing: 0.4 }}>
        {formatToday(new Date())}
      </AppText>
      <Animated.View style={{ flex: 1, justifyContent: 'center', gap: 22, opacity: quoteFade }}>
        <AppText
          lineBreakStrategyIOS="standard"
          style={{ fontFamily: fontFamily.serif, fontSize: 32, lineHeight: 43 }}
        >
          {quote.zh}
        </AppText>
        <AppText
          secondary
          style={{
            fontFamily: fontFamily.serif,
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 21,
            maxWidth: 300,
          }}
        >
          {quote.en}
        </AppText>
        {/* 收藏这句 → 收进频率卡墙（去重）；换一句 → 当天偏移持久化 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collected ? '已收进频率卡' : '收藏这句'}
            onPress={collectQuote}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: pressed ? 0.5 : collected ? 1 : 0.7,
            })}
          >
            <Ionicons
              name={collected ? 'heart' : 'heart-outline'}
              size={14}
              color={collected ? colors.accent : colors.textSecondary}
            />
            <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 17 }}>
              {collected ? '已收进频率卡' : '收藏这句'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="换一句"
            onPress={nextQuote}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: pressed ? 0.5 : 0.7,
            })}
          >
            <Ionicons name="refresh" size={14} color={colors.textSecondary} />
            <AppText variant="caption" secondary style={{ fontSize: 12, lineHeight: 17 }}>
              换一句
            </AppText>
          </Pressable>
        </View>
      </Animated.View>
      <View style={{ gap: 14 }}>
        {createError ? (
          <AppText variant="caption" color={colors.danger} style={{ textAlign: 'center' }}>
            {createError}
          </AppText>
        ) : null}
        <PrimaryButton glow label="陪自己坐一会儿" onPress={start} style={{ height: 58 }} />
        <Pressable accessibilityRole="button" onPress={scrollToHistory} hitSlop={8}>
          <AppText variant="caption" secondary style={{ textAlign: 'center', paddingVertical: 8 }}>
            查看过去的记录 →
          </AppText>
        </Pressable>
      </View>
    </View>
  );

  const emptyState = (
    <View style={{ minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
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
        <Feather name="file-text" size={34} color={colors.accent} />
      </View>
      <AppText style={{ fontSize: 16, lineHeight: 27, textAlign: 'center' }}>这里还没有记录</AppText>
      <AppText
        variant="caption"
        secondary
        style={{ textAlign: 'center', lineHeight: 24, maxWidth: 230 }}
      >
        慢慢来，你的故事会在{'\n'}这里被温柔地收藏。
      </AppText>
      <GhostButton label="开始第一次记录" onPress={start} style={{ marginTop: 6 }} />
    </View>
  );

  return (
    <Screen>
      <View style={{ flex: 1 }} onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}>
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
          ListHeaderComponent={
            <>
              {hero}
              <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32, marginBottom: 18 }}>
                过去的记录
              </AppText>
            </>
          }
          ListEmptyComponent={emptyState}
          extraData={openId}
          onScrollBeginDrag={() => setOpenId(null)}
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              open={openId === item.id}
              onOpenChange={(o) => setOpenId((p) => (o ? item.id : p === item.id ? null : p))}
              onPress={() => router.push(`/journal/${item.id}`)}
              onDeleted={async () => {
                await deleteEntry(item.id);
                setOpenId((p) => (p === item.id ? null : p));
                setEntries(await listEntries());
              }}
            />
          )}
        />
      </View>
    </Screen>
  );
}
