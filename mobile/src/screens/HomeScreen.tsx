/**
 * HomeScreen — Mobile Dashboard
 * Shows today's sales summary, outstanding total, low stock alerts, recent payments
 * Real-time updates via Supabase subscriptions
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';

export const HomeScreen = () => {
  const [todaySales, setTodaySales] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    // TODO: Fetch real data from Supabase based on the logged-in user's business_id
    // For now, this is the screen skeleton
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.header}>Dashboard</Text>

        {/* Today's Sales Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today's Sales</Text>
          <Text style={styles.cardValueGreen}>₹{todaySales.toLocaleString('en-IN')}</Text>
        </View>

        {/* Outstanding Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Outstanding Balance</Text>
          <Text style={styles.cardValueAmber}>₹{outstanding.toLocaleString('en-IN')}</Text>
        </View>

        {/* Low Stock Alert */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Low Stock Items</Text>
          <Text style={styles.cardValueRed}>{lowStockCount} products need restocking</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>+ New Sale</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', padding: 16 },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardValueGreen: { fontSize: 28, fontWeight: 'bold', color: '#059669', marginTop: 4 },
  cardValueAmber: { fontSize: 28, fontWeight: 'bold', color: '#d97706', marginTop: 4 },
  cardValueRed: { fontSize: 16, fontWeight: '600', color: '#dc2626', marginTop: 4 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});
