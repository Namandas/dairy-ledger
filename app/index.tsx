// app/index.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import { Text, Button, Card, List, IconButton } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { fetchInventorySummary } from '../db/queries';

export default function Home() {
  const router = useRouter();
  const [summary, setSummary] = useState<{ total_products: number; low_stock_count: number; low_stock_items: { id: number; name: string; unit: string; current_stock: number }[] } | null>(null);
  // Configurable low-stock threshold
  const LOW_STOCK_THRESHOLD = 2;

  useEffect(() => {
    try {
      const s = fetchInventorySummary(LOW_STOCK_THRESHOLD);
      setSummary(s);
    } catch (err) {
      console.error('Failed loading inventory summary', err);
      setSummary({ total_products: 0, low_stock_count: 0, low_stock_items: [] });
    }
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text variant="headlineLarge" style={{ marginBottom: 8 }}>
        Dairy Ledger
      </Text>

      {/* Primary actions: Start is full-width; secondary actions spaced below */}
      {/* Primary action */}
<Button
  mode="contained"
  uppercase={false}
  contentStyle={{ height: 52 }}
  style={{
    borderRadius: 12,
    marginBottom: 16,
  }}
  onPress={() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    router.push(`/inventory/${yyyy}-${mm}-${dd}`);
  }}
>
  Start Today
</Button>

{/* Secondary actions */}
<View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
  <Link href="/inventory" asChild>
    <Button
      mode="outlined"
      style={{ flex: 1, borderRadius: 10 }}
      contentStyle={{ height: 48 }}
    >
      Inventory
    </Button>
  </Link>

  <Link href="/customers" asChild>
    <Button
      mode="outlined"
      style={{ flex: 1, borderRadius: 10 }}
      contentStyle={{ height: 48 }}
    >
      Customers
    </Button>
  </Link>
</View>

<View style={{ flexDirection: 'row', gap: 12 }}>
  <Link href="/products" asChild>
    <Button
      mode="outlined"
      style={{ flex: 1, borderRadius: 10 }}
      contentStyle={{ height: 48 }}
    >
      Products
    </Button>
  </Link>

  {/* Placeholder to keep grid balanced */}
  <View style={{ flex: 1 }} />
</View>


      {/* Summary cards */}
      <View style={{ flexDirection: 'row',marginTop:12, marginBottom: 12, gap: 8 }}>
        <Card style={{ flex: 1, padding: 12, marginRight: 8 }}>
          <Text variant="titleMedium">Total Products</Text>
          <Text variant="headlineSmall" style={{ marginTop: 8 }}>{summary ? summary.total_products : '—'}</Text>
        </Card>

        <Card style={{ width: 180, padding: 12 }}>
          <Text variant="titleMedium">Low Stock</Text>
          <Text variant="headlineSmall" style={{ marginTop: 8, color: summary && summary.low_stock_count > 0 ? '#d9534f' : undefined }}>
            {summary ? summary.low_stock_count : '—'}
          </Text>
        </Card>
      </View>

      {/* Low stock section */}
      <Card style={{ padding: 12, flex: 1 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>Low Stock</Text>

        {summary && summary.low_stock_items.length === 0 ? (
          <Text>All inventory levels are healthy</Text>
        ) : (
          <FlatList
            data={summary ? summary.low_stock_items : []}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={`${item.unit}`}
                right={() => (
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 8 }}>
                    <Text style={{ fontWeight: '700', color: item.current_stock <= LOW_STOCK_THRESHOLD ? '#d9534f' : '#333' }}>
                      {item.current_stock}
                    </Text>
                  </View>
                )}
                left={() => <IconButton icon="alert-circle" iconColor={item.current_stock <= LOW_STOCK_THRESHOLD ? '#d9534f' : '#999'} />}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          />
        )}
      </Card>
    </View>
  );
}
