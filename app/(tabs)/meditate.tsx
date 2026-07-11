import { Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS } from '../../src/domain/meditationScripts';

export default function MeditateScreen() {
  const router = useRouter();
  return (
    <FlatList
      contentContainerStyle={styles.c}
      data={MEDITATION_SCRIPTS}
      keyExtractor={s => s.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => router.push(`/meditate/${item.id}`)}>
          <Text style={styles.t}>{item.title}</Text>
          <Text style={styles.sub}>{item.steps.length} 步 · 约 {Math.round(item.steps.reduce((a, s) => a + s.seconds, 0) / 60)} 分钟</Text>
        </TouchableOpacity>
      )}
    />
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 10 },
  row: { padding: 16, borderRadius: 10, backgroundColor: '#F3EEFA' },
  t: { fontSize: 16, fontWeight: '600' },
  sub: { color: '#666', marginTop: 4 },
});
