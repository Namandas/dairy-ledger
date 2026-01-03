import React, { useCallback, useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchProductById, updateProduct } from '../../../db/queries';

export default function EditProductScreen() {
  const params = useLocalSearchParams();
  const id = Number(params.id);
  const router = useRouter();

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    const p = fetchProductById(id);
    if (p) {
      setName(p.name);
      setUnit(p.unit);
      setBasePrice(String(p.base_price));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = () => {
    const n = name.trim();
    const u = unit.trim();
    const bp = parseFloat(basePrice) || 0;
    if (!n || !u) return;
    setLoading(true);
    try {
      updateProduct(id, n, u, bp);
      router.back();
    } catch (error) {
      console.error('Failed to update product', error);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 12 }}>Edit product</Text>
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
