import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { insertCustomer } from '../../../db/queries';

export default function NewCustomerScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      insertCustomer(trimmed);
      router.back();
    } catch (error) {
      console.error('Failed to insert customer', error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ padding: 16 }}>
        <TextInput
          label="Customer name"
          value={name}
          onChangeText={setName}
          mode="outlined"
        />

        <Button
          mode="contained"
          onPress={onSave}
          loading={loading}
          disabled={!name.trim()}
          style={{ marginTop: 16 }}
        >
          Save
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
