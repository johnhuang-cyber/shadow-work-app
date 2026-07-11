import { useState, useCallback } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { runReframe } from '../../src/ai/deepseek';
import { parseReframe } from '../../src/ai/reframeParse';
import { addBelief, listBeliefs } from '../../src/data/beliefDao';
import type { Belief } from '../../src/types';

export default function BeliefsScreen() {
  const [input, setInput] = useState('');
  const [stream, setStream] = useState('');
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<Belief[]>([]);
  useFocusEffect(useCallback(() => { listBeliefs().then(setList); }, []));
  const reframe = () => {
    if (!input.trim()) return Alert.alert('先写下一个限制性信念');
    Alert.alert('发送确认', '这句信念将发送给 DeepSeek。', [
      { text: '取消', style: 'cancel' },
      { text: '发送', onPress: async () => {
        setLoading(true); setStream('');
        try {
          const raw = await runReframe(input.trim(), d => setStream(s => s + d));
          const r = parseReframe(raw);
          await addBelief(r);
          setInput(''); setStream('');
          setList(await listBeliefs());
          Alert.alert('已改写并保存', r.mantra || '完成');
        } catch (e: any) {
          Alert.alert('改写失败', e.message ?? String(e));
        } finally { setLoading(false); }
      }},
    ]);
  };
  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.h}>信念改写</Text>
      <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder={'写下一个限制你的信念，如“我不擅长理财”'} multiline />
      <Button title="改写成赋能信念" onPress={reframe} />
      {loading && <View style={styles.card}><Text>{stream}</Text><ActivityIndicator /></View>}
      <Text style={styles.h}>我的赋能信念</Text>
      {list.length === 0 && !loading && <Text style={styles.empty}>还没有，写下第一个吧。</Text>}
      {list.map(b => (
        <View key={b.id} style={styles.card}>
          <Text style={styles.mantra}>{b.mantra}</Text>
          <Text style={styles.small}>原：{b.limitingBelief}</Text>
          <Text style={styles.small}>新：{b.empoweringBelief}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 70, textAlignVertical: 'top' },
  card: { backgroundColor: '#F3EEFA', borderRadius: 8, padding: 10, gap: 4 },
  mantra: { fontSize: 15, fontWeight: '600' },
  small: { color: '#666', fontSize: 12 },
  empty: { color: '#999' },
});
