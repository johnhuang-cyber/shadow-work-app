import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getApiKey, setApiKey, getModel, setModel } from '../../src/services/settingsService';
import { AppText, Card, PrimaryButton, Screen, SoftInput } from '../../src/components';
import { useTheme } from '../../src/theme';

export default function MeScreen() {
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [reasoner, setReasoner] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const { colors, fontFamily, radius } = useTheme();

  useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
    getModel().then(m => setReasoner(m === 'deepseek-reasoner'));
  }, []);

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

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48, gap: 18 }}
      >
        <View style={{ paddingTop: 16, paddingBottom: 8 }}>
          <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32 }}>
            我的空间
          </AppText>
        </View>

        {/* DeepSeek 连接 */}
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

        {/* 模型切换 */}
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

        {/* 隐私说明 */}
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
            你的日记、冥想和信念，只存在你手机本地。仅当你主动「问教练」或「改写信念」时，才把相关文本发送给 DeepSeek。你的分享只属于你自己 · 已加密。
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}
