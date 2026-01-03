import React, { useEffect, useState } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, Card, TextInput, Button, List, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAllProducts, fetchIncomingByDate, fetchLeftoverUpToDate, upsertIncomingForDate, fetchAllCustomers } from '../../../db/queries';

export default function IncomingByDate() {
  const params = useLocalSearchParams();
  const date = String(params.date || '');
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; name: string; unit: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [view, setView] = useState<'work' | 'incoming'>('work');
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    try {
      // Load products, existing incoming for date, and previous leftover
      const products = fetchAllProducts();
      const incoming = fetchIncomingByDate(String(date));
      const crows = fetchAllCustomers();
      setCustomers(crows.map(c => ({ id: c.id, name: c.name })));

      // previous date (yyyy-mm-dd)
      const prev = (() => {
        const d = new Date(String(date));
        d.setDate(d.getDate() - 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const leftovers = fetchLeftoverUpToDate(prev);
      const leftoverMap: Record<number, number> = {};
      for (const l of leftovers) leftoverMap[l.product_id] = Number(l.leftover ?? 0);

      const list = products.map(p => {
        const inc = incoming.find(i => i.product_id === p.id);
        const initial = inc ? Number(inc.stock_in) : (leftoverMap[p.id] ?? 0);
        return { id: p.id, name: p.name, unit: p.unit, value: String(initial) };
      });

      setItems(list);
    } catch (err) {
      console.error('Failed loading incoming page', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  function setValue(id: number, text: string) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, value: text } : it));
  }

  function save() {
    if (!date) return;
    setSaving(true);
    try {
      const entries = items.map(it => ({ product_id: it.id, stock_in: Number(it.value) || 0 }));
      upsertIncomingForDate(String(date), entries);
      setSnackMsg('Saved');
      setSnackVisible(true);
      setTimeout(() => {
        setSnackVisible(false);
        router.back();
      }, 1100);
    } catch (err) {
      console.error('Failed saving incoming', err);
      setSnackMsg('Failed to save');
      setSnackVisible(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text variant="headlineLarge">Inventory — {date}</Text>
          <Button onPress={() => router.push('/inventory')}>Back</Button>
        </View>

        {/* Toggle between Today's Work (customer entries) and Incoming */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button mode={view === 'work' ? 'contained' : 'outlined'} onPress={() => setView('work')}>Today's Work</Button>
          <Button mode={view === 'incoming' ? 'contained' : 'outlined'} onPress={() => setView('incoming')}>Incoming Stock</Button>
        </View>

        {view === 'work' ? (
          <Card style={{ padding: 12, flex: 1 }}>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Customers</Text>
            <FlatList
              data={customers}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => (
                <List.Item
                  title={item.name}
                  onPress={() => router.push(`/inventory/${date}/customer/${item.id}`)}
                  style={{ backgroundColor: 'white', marginVertical: 6, borderRadius: 8 }}
                />
              )}
            />
          </Card>
        ) : (
          <Card style={{ padding: 12, flex: 1 }}>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>Enter incoming quantities</Text>

            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <ActivityIndicator animating={true} size={36} />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(it) => String(it.id)}
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: 'white', marginVertical: 6, padding: 8, borderRadius: 8 }}>
                    <Text style={{ fontWeight: '600' }}>{item.name} ({item.unit})</Text>
                    <TextInput
                      label="Incoming"
                      mode="outlined"
                      keyboardType="numeric"
                      value={item.value}
                      onChangeText={(t) => setValue(item.id, t)}
                      style={{ marginTop: 8, height: 48 }}
                    />
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
              />
            )}

            <View style={{ marginTop: 12 }}>
              <Button mode="contained" onPress={save} loading={saving} disabled={saving || loading}>Save Incoming</Button>
            </View>
          </Card>
        )}

        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={1600}>{snackMsg}</Snackbar>
      </View>
    </KeyboardAvoidingView>
  );
}
// import React, { useCallback, useEffect, useState } from 'react';
// import { View, FlatList } from 'react-native';
// import { List } from 'react-native-paper';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { fetchAllCustomers } from '../../../db/queries';
// import { Customer } from '../../../types';

// export default function InventoryDateScreen() {
//   const params = useLocalSearchParams();
//   const date = String(params.date || '');
//   const [customers, setCustomers] = useState<Customer[]>([]);
//   const router = useRouter();

//   const load = useCallback(() => {
//     const rows = fetchAllCustomers();
//     setCustomers(rows);
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   return (
//     <View style={{ flex: 1, padding: 10 }}>
//       <FlatList
//         data={customers}
//         keyExtractor={(i) => i.id.toString()}
//         renderItem={({ item }) => (
//           <List.Item
//             title={item.name}
//             description={`ID: ${item.id}`}
//             onPress={() => router.push(`/inventory/${date}/customer/${item.id}`)}
//             style={{ backgroundColor: 'white', marginVertical: 6, borderRadius: 8 }}
//           />
//         )}
//       />
//     </View>
//   );
// }
