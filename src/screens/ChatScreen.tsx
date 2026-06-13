import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { request_id, receiver_id, chat_title } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setupChat();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const setupChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setMyUserId(session.user.id);
    }

    // Fetch initial messages
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', request_id)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }

    // Subscribe to new messages
    supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `request_id=eq.${request_id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !myUserId) return;

    const messageContent = inputText.trim();
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      request_id,
      sender_id: myUserId,
      receiver_id,
      content: messageContent,
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === myUserId;
    return (
      <View style={[styles.messageBubbleWrapper, isMe ? styles.messageBubbleWrapperRight : styles.messageBubbleWrapperLeft]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleRight : styles.messageBubbleLeft]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextRight : styles.messageTextLeft]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isMe ? styles.timestampRight : styles.timestampLeft]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chat_title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.outline}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant + '22' },
  backBtn: { padding: 8 },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface, fontWeight: '700' },
  messageList: { padding: Spacing.md, paddingBottom: Spacing.xl },
  messageBubbleWrapper: { width: '100%', marginBottom: Spacing.md },
  messageBubbleWrapperLeft: { alignItems: 'flex-start' },
  messageBubbleWrapperRight: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  messageBubbleLeft: { backgroundColor: Colors.surfaceContainerLowest, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.outlineVariant + '33' },
  messageBubbleRight: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  messageText: { ...Typography.bodyMd },
  messageTextLeft: { color: Colors.onSurface },
  messageTextRight: { color: Colors.onPrimary },
  timestamp: { ...Typography.labelSm, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timestampLeft: { color: Colors.outline },
  timestampRight: { color: Colors.onPrimary + 'BB' },
  inputContainer: { flexDirection: 'row', padding: Spacing.md, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.outlineVariant + '22', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: Colors.surfaceContainerLowest, borderRadius: 20, borderWidth: 1, borderColor: Colors.outline, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 100, ...Typography.bodyMd, color: Colors.onSurface, marginRight: Spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
