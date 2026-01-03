import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { insertProduct } from '../../../db/queries';

export default function NewProductScreen() {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSave = () => {
    const n = name.trim();
    const u = unit.trim();
    const bp = parseFloat(basePrice) || 0;
    if (!n || !u) return;
    setLoading(true);
    try {
      insertProduct(n, u, bp);
      router.back();
    } catch (error) {
      console.error('Failed to insert product', error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ padding: 16 }}>
        <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" />
        <TextInput label="Unit" value={unit} onChangeText={setUnit} mode="outlined" style={{ marginTop: 8 }} />
        <TextInput label="Base price" value={basePrice} onChangeText={setBasePrice} keyboardType="numeric" mode="outlined" style={{ marginTop: 8 }} />

        <Button mode="contained" onPress={onSave} loading={loading} disabled={!name.trim() || !unit.trim()} style={{ marginTop: 16 }}>
          Save
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
