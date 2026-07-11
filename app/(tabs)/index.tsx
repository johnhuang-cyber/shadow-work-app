import { useState, useCallback } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { createEntry, listEntries } from '../../src/data/journalDao';
import type { JournalEntry } from '../../src/types';

export default function TodayScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  useFocusEffect(useCallback(() => { listEntries().then(setEntries); }, []));
  const start = async () => { const e = await createEntry(); router.push(`/journal/${e.id}`); };
  return (
    <View style={styles.c}>
      <Button title="开始一条阴影日记" onPress={start} />
      <Text style={styles.h}>历史</Text>
      <FlatList
        data={entries}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text style={styles.empty}>还没有记录，开始第一条吧。</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/journal/${item.id}`)}>
            <Text numberOfLines={1} style={{ flex: 1 }}>{item.trigger || '（未命名）'}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, padding: 16, gap: 12 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: '#999', marginLeft: 8 },
  empty: { color: '#999', marginTop: 16 },
});
