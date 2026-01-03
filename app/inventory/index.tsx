import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Text, Card, List, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { fetchInventoryPerProduct } from '../../db/queries';

export default function InventoryHome() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; name: string; unit: string; current_stock: number }[]>([]);

  useEffect(() => {
    try {
      const rows = fetchInventoryPerProduct();
      // Ensure numeric stock
      setItems(rows.map(r => ({ id: r.id, name: r.name, unit: r.unit, current_stock: Number(r.current_stock ?? 0) })));
    } catch (err) {
      console.error('Failed loading inventory', err);
      setItems([]);
    }
  }, []);

  function openToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    router.push(`/inventory/${yyyy}-${mm}-${dd}`);
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text variant="headlineLarge" style={{ marginBottom: 12 }}>Inventory</Text>

      <Button mode="contained" onPress={openToday} style={{ marginBottom: 12 }}>
        Open Today's Inventory
      </Button>

      <Card style={{ padding: 12, flex: 1 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>All Products</Text>

        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${item.current_stock} ${item.unit}`}
              left={() => <List.Icon icon="package-variant" />}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
        />
      </Card>
    </View>
  );
}
