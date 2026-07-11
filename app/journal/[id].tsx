import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, Button, ScrollView, View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { JOURNAL_STEPS, nextStep, prevStep, isLastStep } from '../../src/domain/journalSteps';
import { getEntry, saveEntry, addCoachMessage, listCoachMessages } from '../../src/data/journalDao';
import { runCoach } from '../../src/ai/deepseek';
import type { JournalEntry, CoachMessage } from '../../src/types';

// 'accept'（接纳）是交互式一步，不写入任何文本字段，所以不在此映射中。
const FIELD: Partial<Record<string, keyof JournalEntry>> = {
  trigger: 'trigger', admit: 'admitText',
  name: 'nameText', vent: 'ventText', reassure: 'reassureText',
};

export default function JournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptCount, setAcceptCount] = useState(0);

  const router = useRouter();
  const navigation = useNavigation();
  const entryRef = useRef<JournalEntry | null>(null);
  entryRef.current = entry;

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

  if (!entry) return <ActivityIndicator style={{ marginTop: 40 }} />;

  const step = JOURNAL_STEPS[stepIdx];
  const isAccept = step.key === 'accept';
  const field = FIELD[step.key];
  const value = field ? ((entry[field] as string) ?? '') : '';
  const update = (text: string) => { if (field) setEntry({ ...entry, [field]: text }); };
  const persist = async () => { await saveEntry(entry); };

  const askCoach = () => {
    const text = value.trim();
    if (!text) return Alert.alert('先写点内容再问教练');
    Alert.alert('发送确认', '这段内容将发送给 DeepSeek。', [
      { text: '取消', style: 'cancel' },
      { text: '发送', onPress: async () => {
        setLoading(true); setStreaming('');
        await addCoachMessage({ entryId: id!, role: 'user', content: text });
        const history = messages.map(m => ({ role: m.role, content: m.content }));
        try {
          const full = await runCoach(text, history, (d) => setStreaming(s => s + d));
          await addCoachMessage({ entryId: id!, role: 'assistant', content: full });
          setMessages(await listCoachMessages(id!));
        } catch (e: any) {
          Alert.alert('教练暂时无法回应', e.message ?? String(e));
        } finally { setStreaming(''); setLoading(false); }
      }},
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.step}>第 {stepIdx + 1}/{JOURNAL_STEPS.length} 步 · {step.title}</Text>
      <Text style={styles.prompt}>{step.prompt}</Text>
      {isAccept ? (
        <View style={styles.acceptBox}>
          <Button title={`没关系（${acceptCount}/3）`} onPress={() => setAcceptCount(c => Math.min(c + 1, 3))} />
          {acceptCount >= 3 && <Text style={styles.acceptDone}>很好，你已经在接纳它了。</Text>}
        </View>
      ) : (
        <TextInput style={styles.input} multiline value={value} onChangeText={update} onBlur={persist} placeholder="在这里书写…" />
      )}
      <View style={styles.nav}>
        <Button title="上一步" onPress={() => { persist(); setStepIdx(prevStep(stepIdx)); }} disabled={stepIdx === 0} />
        {!isAccept && <Button title="问教练" onPress={askCoach} />}
        <Button title={isLastStep(stepIdx) ? '完成' : '下一步'} onPress={() => { persist(); if (isLastStep(stepIdx)) router.back(); else setStepIdx(nextStep(stepIdx)); }} />
      </View>
      <Text style={styles.h}>教练对话</Text>
      {messages.map(m => (
        <Text key={m.id} style={m.role === 'assistant' ? styles.ai : styles.me}>{m.role === 'assistant' ? '教练：' : '我：'}{m.content}</Text>
      ))}
      {loading && <Text style={styles.ai}>教练：{streaming}<ActivityIndicator /></Text>}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  step: { color: '#7A5Fb0', fontWeight: '600' },
  prompt: { fontSize: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 120, textAlignVertical: 'top' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  ai: { backgroundColor: '#F3EEFA', padding: 8, borderRadius: 8 },
  me: { backgroundColor: '#EEF3FA', padding: 8, borderRadius: 8 },
  acceptBox: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  acceptDone: { color: '#7A5Fb0' },
});
