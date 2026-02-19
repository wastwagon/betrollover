import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from 'react-native';
import { Stack } from 'expo-router';

export default function ResponsibleGamblingScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Responsible Gambling', headerShown: true, headerBackVisible: true }} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Responsible Gambling</Text>

      <Text style={styles.section}>Our Commitment</Text>
      <Text style={styles.body}>
        BetRollover is committed to promoting responsible gambling. Our platform provides betting tips
        and information for entertainment. We encourage users to gamble responsibly and within their
        means.
      </Text>

      <Text style={styles.section}>18+ Only</Text>
      <Text style={styles.body}>
        You must be 18 years or older to use BetRollover. We verify age at registration and before
        accessing real-money features.
      </Text>

      <Text style={styles.section}>Gambling Responsibly</Text>
      <Text style={styles.body}>
        • Set limits on time and money before you start{'\n'}
        • Never chase losses{'\n'}
        • Don't gamble when upset or under the influence{'\n'}
        • Gambling should be fun, not a way to make money
      </Text>

      <Text style={styles.section}>Get Help</Text>
      <Text style={styles.body}>
        If you feel you may have a gambling problem, please seek help. Free support is available:
      </Text>
      <Pressable onPress={() => Linking.openURL('https://www.gamcare.org.uk')} style={styles.link}>
        <Text style={styles.linkText}>GamCare – www.gamcare.org.uk</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL('https://www.gamblersanonymous.org')} style={styles.link}>
        <Text style={styles.linkText}>Gamblers Anonymous – www.gamblersanonymous.org</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openURL('https://www.begambleaware.org')} style={styles.link}>
        <Text style={styles.linkText}>BeGambleAware – www.begambleaware.org</Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        BetRollover provides tips and information only. Users are responsible for their own betting
        decisions and must comply with local laws. Gambling can be addictive. Please gamble
        responsibly.
      </Text>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#111',
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    color: '#111',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  link: {
    marginTop: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '500',
  },
  disclaimer: {
    marginTop: 32,
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
