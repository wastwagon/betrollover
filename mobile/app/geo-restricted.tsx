import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function GeoRestrictedScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Service Unavailable', headerShown: true }} />
    <View style={styles.container}>
      <Text style={styles.title}>Service Not Available</Text>
      <Text style={styles.body}>
        BetRollover is currently only available in licensed jurisdictions, including Ghana.
      </Text>
      <Text style={styles.body}>
        If you believe you are in an eligible region, please check your connection or contact
        support.
      </Text>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#111',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
});
