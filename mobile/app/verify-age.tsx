import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';

/** Age verification disabled. Redirect to profile. */
export default function VerifyAgeScreen() {
  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Age Verification', headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.text}>Age verification is not required.</Text>
        <Text style={styles.sub}>Redirecting...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
