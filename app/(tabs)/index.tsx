import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { createEntry, listEntries } from '../../src/data/journalDao';
import type { JournalEntry } from '../../src/types';
import { AppText, Card, GhostButton, PrimaryButton, Screen } from '../../src/components';
import { useTheme } from '../../src/theme';

// 每日引导语，按一年中的第几天轮换。第一组文案来自设计稿 01。
const GUIDANCE: { title: string; sub: string }[] = [
  { title: '此刻，你不需要\n成为任何人。', sub: '只需要，坐下来，\n和自己在一起。' },
  { title: '慢一点，\n也没有关系。', sub: '今天的你，\n已经走了很远。' },
  { title: '情绪来了，\n就让它来。', sub: '它只是想，\n被你看见。' },
  { title: '你已经做得\n够多了。', sub: '现在，轻轻放下，\n回到自己。' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatToday(d: Date): string {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${WEEKDAYS[d.getDay()]}`;
}

function formatEntryDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
}

export default function TodayScreen() {
  const router = useRouter();
  const { colors, fontFamily, shadow } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [containerH, setContainerH] = useState(0);
  const listRef = useRef<FlatList<JournalEntry>>(null);

  useFocusEffect(useCallback(() => { listEntries().then(setEntries); }, []));

  const guidance = GUIDANCE[dayOfYear(new Date()) % GUIDANCE.length];

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
      <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
        <AppText style={{ fontFamily: fontFamily.serif, fontSize: 32, lineHeight: 43 }}>
          {guidance.title}
        </AppText>
        <AppText secondary style={{ fontSize: 16, lineHeight: 27, maxWidth: 260 }}>
          {guidance.sub}
        </AppText>
      </View>
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
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/journal/${item.id}`)}>
              <Card radius="md" padding={18} style={{ marginBottom: 12, ...shadow.soft }}>
                <AppText numberOfLines={1} style={{ fontSize: 16, lineHeight: 24 }}>
                  {item.trigger || '（未命名的一次记录）'}
                </AppText>
                <AppText variant="caption" secondary style={{ marginTop: 6, fontSize: 13 }}>
                  {formatEntryDate(item.createdAt)}
                </AppText>
              </Card>
            </Pressable>
          )}
        />
      </View>
    </Screen>
  );
}
