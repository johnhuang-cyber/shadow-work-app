import { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS, medReducer, initMedState } from '../../src/domain/meditationScripts';
import type { MedState, MedAction, MedScript } from '../../src/domain/meditationScripts';
import { addSession } from '../../src/data/meditationDao';

export default function PlayerScreen() {
  const { scriptId } = useLocalSearchParams<{ scriptId: string }>();
  const router = useRouter();
  const script = MEDITATION_SCRIPTS.find(s => s.id === scriptId)!;
  const [running, setRunning] = useState(true);
  const [state, dispatch] = useReducer(
    (s: MedState, a: MedAction) => medReducer(s, a, script), script, initMedState
  );
  const spokenStep = useRef(-1);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (state.stepIndex !== spokenStep.current && !state.completed) {
      spokenStep.current = state.stepIndex;
      Speech.speak(script.steps[state.stepIndex].text, { language: 'zh-CN' });
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
      addSession({ scriptId: script.id, durationSec: Math.round((Date.now() - startedAt.current) / 1000), completed: true });
    }
  }, [state.completed]);

  return (
    <View style={styles.c}>
      <Text style={styles.title}>{script.title}</Text>
      {state.completed ? (
        <>
          <Text style={styles.done}>练习完成 🌿</Text>
          <Button title="返回" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={styles.text}>{script.steps[state.stepIndex].text}</Text>
          <Text style={styles.step}>第 {state.stepIndex + 1}/{script.steps.length} 步</Text>
          <View style={styles.row}>
            <Button title={running ? '暂停' : '继续'} onPress={() => setRunning(r => !r)} />
            <Button title="重来" onPress={() => { Speech.stop(); spokenStep.current = -1; startedAt.current = Date.now(); dispatch({ type: 'RESET' }); setRunning(true); }} />
            <Button title="结束" onPress={() => { Speech.stop(); router.back(); }} />
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', color: '#7A5Fb0' },
  text: { fontSize: 22, textAlign: 'center', lineHeight: 34 },
  step: { textAlign: 'center', color: '#999' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24 },
  done: { fontSize: 20, textAlign: 'center' },
});
