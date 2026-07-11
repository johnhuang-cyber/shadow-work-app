import { FlatList, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MEDITATION_SCRIPTS } from '../../src/domain/meditationScripts';
import type { MedScript } from '../../src/domain/meditationScripts';
import { AppText, Card, Screen } from '../../src/components';
import { useTheme } from '../../src/theme';

function scriptMeta(s: MedScript): string {
  const minutes = Math.round(s.steps.reduce((a, st) => a + st.seconds, 0) / 60);
  return `${s.steps.length} 步 · 约 ${minutes} 分钟`;
}

export default function MeditateScreen() {
  const router = useRouter();
  const { colors, fontFamily, shadow } = useTheme();

  return (
    <Screen>
      <FlatList
        data={MEDITATION_SCRIPTS}
        keyExtractor={(s) => s.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 16, paddingBottom: 26 }}>
            <AppText style={{ fontFamily: fontFamily.serif, fontSize: 22, lineHeight: 32 }}>
              冥想
            </AppText>
            <AppText variant="caption" secondary style={{ marginTop: 6, fontSize: 13 }}>
              给自己几分钟，回到此刻
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => router.push(`/meditate/${item.id}`)}
          >
            <Card
              radius="md"
              padding={20}
              style={{
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                ...shadow.soft,
              }}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <AppText style={{ fontFamily: fontFamily.serif, fontSize: 18, lineHeight: 27 }}>
                  {item.title}
                </AppText>
                <AppText variant="caption" secondary style={{ fontSize: 13 }}>
                  {scriptMeta(item)}
                </AppText>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
