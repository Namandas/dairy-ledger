// components/ProductRow.tsx
import React from 'react';
import { View } from 'react-native';
import { Card, TextInput, Text } from 'react-native-paper';
import { ProductWithRate } from '../types';

type Props = {
  product: ProductWithRate;
  value?: string;
  onChange: (text: string) => void;
};

export default function ProductRow({ product, value, onChange }: Props) {
  return (
    <Card style={{ marginBottom: 8 }}>
      <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 2 }}>
          <Text variant="titleMedium">{product.name}</Text>
          <Text style={{ color: product.is_special ? 'green' : 'gray' }}>
            @ ₹{product.effective_rate}/{product.unit} {product.is_special ? '(Special)' : ''}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <TextInput
            mode="outlined"
            label="Qty"
            keyboardType="numeric"
            value={value}
            onChangeText={onChange}
          />
        </View>
      </Card.Content>
    </Card>
  );
}
