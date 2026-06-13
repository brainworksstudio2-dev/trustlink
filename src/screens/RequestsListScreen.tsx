import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: any;
};

export default function RequestsListScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorker, setIsWorker] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRequests();
    });
    return unsubscribe;
  }, [activeTab]);

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    // Check if user is a worker
    const { data: workerData } = await supabase
      .from('workers')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (workerData) {
      setIsWorker(true);
      setWorkerId(workerData.id);
    }

    if (activeTab === 'sent') {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, workers(name, specialty, avatar_url, user_id)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (data) setRequests(data);
    } else if (activeTab === 'received' && workerData) {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, users:user_id(raw_user_meta_data)')
        .eq('worker_id', workerData.id)
        .order('created_at', { ascending: false });
      
      if (data) setRequests(data);
    }
    
    setIsLoading(false);
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) {
      Alert.alert('Update Failed', error.message || 'Could not update status');
    } else if (!data || data.length === 0) {
      Alert.alert('Update Failed', 'You might not have permission to update this request. Check Supabase RLS policies.');
    } else {
      fetchRequests();
    }
  };

  const renderStatusBadge = (status: string = 'pending') => {
    let color = Colors.busyOrange;
    let bg = Colors.busyBg;
    if (status === 'accepted') {
      color = Colors.availableGreen;
      bg = Colors.availableBg;
    } else if (status === 'completed') {
      color = Colors.primary;
      bg = Colors.primaryContainer;
    } else if (status === 'declined') {
      color = Colors.error;
      bg = Colors.error + '22';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <Text style={[styles.statusText, { color }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  const openChat = (req: any) => {
    // If I am the client, receiver is the worker's user_id
    // If I am the worker, receiver is the client's user_id (req.user_id)
    const receiverId = activeTab === 'sent' ? req.workers?.user_id : req.user_id;
    const title = activeTab === 'sent' ? req.workers?.name : req.users?.raw_user_meta_data?.full_name;

    if (!receiverId) {
      Alert.alert('Cannot chat', 'User information missing');
      return;
    }

    navigation.navigate('Chat', {
      request_id: req.id,
      receiver_id: receiverId,
      chat_title: title || 'Chat',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {isWorker && (
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>My Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>Received Jobs</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.outline} />
              <Text style={styles.emptyText}>No bookings found.</Text>
            </View>
          ) : (
            requests.map(req => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceType}>{req.service_type.toUpperCase()}</Text>
                  {renderStatusBadge(req.status)}
                </View>

                {activeTab === 'sent' ? (
                  <Text style={styles.personName}>Pro: {req.workers?.name || 'Any Available'}</Text>
                ) : (
                  <Text style={styles.personName}>Client: {req.users?.raw_user_meta_data?.full_name || 'Anonymous'}</Text>
                )}

                <Text style={styles.dateText}>
                  {new Date(req.scheduled_date).toLocaleDateString()} at {new Date(req.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>

                <Text style={styles.description} numberOfLines={2}>{req.description}</Text>
                
                <View style={styles.actionRow}>
                  {activeTab === 'received' && (!req.status || req.status === 'pending') && (
                    <>
                      <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => updateRequestStatus(req.id, 'accepted')}>
                        <Text style={styles.btnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => updateRequestStatus(req.id, 'declined')}>
                        <Text style={styles.btnText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  {((req.status === 'accepted') || (req.status === 'completed')) && (
                    <TouchableOpacity style={[styles.btn, styles.chatBtn]} onPress={() => openChat(req)}>
                      <Ionicons name="chatbubbles" size={16} color={Colors.onPrimary} />
                      <Text style={styles.btnText}>Open Chat</Text>
                    </TouchableOpacity>
                  )}
                  
                  {activeTab === 'received' && req.status === 'accepted' && (
                    <TouchableOpacity style={[styles.btn, styles.completeBtn]} onPress={() => updateRequestStatus(req.id, 'completed')}>
                      <Text style={[styles.btnText, {color: Colors.primary}]}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { height: 56, justifyContent: 'center', paddingHorizontal: Spacing.containerMobile, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant + '22' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700' },
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant + '22' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.labelMd, color: Colors.outline },
  activeTabText: { color: Colors.primary, fontWeight: '700' },
  listContainer: { padding: Spacing.containerMobile, gap: Spacing.md },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { ...Typography.bodyMd, color: Colors.outline, marginTop: 12 },
  card: { backgroundColor: Colors.surfaceContainerLowest, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.outlineVariant + '33', ...Shadow.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serviceType: { ...Typography.labelSm, color: Colors.outline, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { ...Typography.labelSm, fontSize: 10, fontWeight: '700' },
  personName: { ...Typography.labelMd, color: Colors.onSurface, fontWeight: '700', marginBottom: 4 },
  dateText: { ...Typography.labelSm, color: Colors.primary, marginBottom: 8 },
  description: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  acceptBtn: { backgroundColor: Colors.availableGreen },
  declineBtn: { backgroundColor: Colors.error },
  chatBtn: { backgroundColor: Colors.primary },
  completeBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  btnText: { ...Typography.labelSm, color: Colors.onPrimary, fontWeight: '700' },
});
