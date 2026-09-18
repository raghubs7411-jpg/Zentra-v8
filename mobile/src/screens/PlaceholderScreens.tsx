// Placeholder screens — will be built out in subsequent iterations
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Placeholder = ({ title }: { title: string }) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming in next build</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 8 },
});

export const NewSaleScreen = () => <Placeholder title="New Sale (POS)" />;
export const CustomersScreen = () => <Placeholder title="Customers" />;
export const KhataScreen = () => <Placeholder title="Khata (Ledger)" />;
export const MoreScreen = () => <Placeholder title="More" />;
