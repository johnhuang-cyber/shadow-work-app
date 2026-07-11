import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import { getApiKey, setApiKey, getModel, setModel } from '../../src/services/settingsService';

export default function MeScreen() {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [reasoner, setReasoner] = useState(false);
  useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
    getModel().then(m => setReasoner(m === 'deepseek-reasoner'));
  }, []);
  const save = async () => {
    if (!key.trim()) return Alert.alert('请输入 API Key');
    await setApiKey(key);
    setHasKey(true); setKey('');
    Alert.alert('已保存', 'API Key 已加密存在本机。');
  };
  const toggle = async (v: boolean) => {
    setReasoner(v);
    await setModel(v ? 'deepseek-reasoner' : 'deepseek-chat');
  };
  return (
    <ScrollView contentContainerStyle={styles.c}>
      <Text style={styles.h}>DeepSeek API Key</Text>
      <Text style={styles.hint}>{hasKey ? '✅ 已配置（仅存本机）' : '尚未配置'}</Text>
      <TextInput style={styles.input} placeholder="粘贴 sk-..." value={key} onChangeText={setKey} autoCapitalize="none" secureTextEntry />
      <Button title="保存 Key" onPress={save} />
      <View style={styles.row}>
        <Text>用更强推理模型（deepseek-reasoner）</Text>
        <Switch value={reasoner} onValueChange={toggle} />
      </View>
      <Text style={styles.privacy}>隐私：日记、冥想、信念只存在你手机本地。仅当你主动点"问教练/改写信念"时，才把相关文本发送给 DeepSeek。</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  c: { padding: 16, gap: 12 },
  h: { fontSize: 18, fontWeight: '600' },
  hint: { color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  privacy: { color: '#888', fontSize: 12, marginTop: 16, lineHeight: 18 },
});
