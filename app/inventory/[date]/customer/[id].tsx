import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchAllProducts, fetchCustomerPrice, upsertDailySale, runQuery } from '../../../../db/queries';

type Product = {
  id: number;
  name: string;
  unit: string;
  base_price: number;
};

export default function CustomerDailyEntry() {
  const params = useLocalSearchParams();
  const date = String(params.date || '');
  const customerId = Number(params.id);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    try {
      const prods = fetchAllProducts();
      setProducts(prods as Product[]);

      // check for existing sale for this customer and date
      const saleRows = runQuery<{ id: number }>('SELECT id FROM sales WHERE customer_id = ? AND date = ?', [customerId, date]);
      if (saleRows.length > 0) {
        const sid = saleRows[0].id;
        setSaleId(sid);

        // load existing sale_items and prefill quantities and prices using historical price_used
        const items = runQuery<{ product_id: number; quantity: number; price_used: number }>('SELECT product_id, quantity, price_used FROM sale_items WHERE sale_id = ?', [sid]);
        const qmap: Record<number, number> = {};
        const pmap: Record<number, number> = {};
        for (const it of items) {
          qmap[it.product_id] = it.quantity;
          pmap[it.product_id] = it.price_used;
        }
        // for products without existing items, resolve current customer price or base price
        for (const p of prods) {
          if (pmap[p.id] == null) {
            const cp = fetchCustomerPrice(customerId, p.id);
            pmap[p.id] = cp ?? p.base_price;
          }
          if (qmap[p.id] == null) qmap[p.id] = 0;
        }

        setPrices(pmap);
        setQuantities(qmap);
      } else {
        setSaleId(null);
        const pmap: Record<number, number> = {};
        for (const p of prods) {
          const cp = fetchCustomerPrice(customerId, p.id);
          pmap[p.id] = cp ?? p.base_price;
        }
        setPrices(pmap);
        setQuantities({});
      }
    } catch (err) {
      console.error('Failed to preload daily entry', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const onQtyChange = (productId: number, text: string) => {
    const num = parseFloat(text);
    setQuantities(prev => ({ ...prev, [productId]: isNaN(num) ? 0 : num }));
  };

  const perProductCost = useCallback((productId: number) => {
    const q = quantities[productId] ?? 0;
    const price = prices[productId] ?? 0;
    return q * price;
  }, [quantities, prices]);

  const total = useMemo(() => {
    return products.reduce((sum, p) => sum + perProductCost(p.id), 0);
  }, [products, perProductCost]);

  const onSave = () => {
    if (total <= 0) return;
    setSaving(true);
    try {
      const statements: { sql: string; params?: any[] }[] = [];
      statements.push({ sql: 'BEGIN TRANSACTION' });

      if (saleId != null) {
        // update existing sale: remove old items and insert new ones, then update total
        statements.push({ sql: 'DELETE FROM sale_items WHERE sale_id = ?', params: [saleId] });

        for (const p of products) {
          const q = quantities[p.id] ?? 0;
          if (q > 0) {
            const resolvedPrice = fetchCustomerPrice(customerId, p.id) ?? p.base_price;
            statements.push({ sql: 'INSERT INTO sale_items (sale_id, product_id, quantity, price_used) VALUES (?, ?, ?, ?)', params: [saleId, p.id, q, resolvedPrice] });
          }
        }

        statements.push({ sql: 'UPDATE sales SET total = ? WHERE id = ?', params: [total, saleId] });
      } else {
        // create new sale and insert items
        statements.push({ sql: 'INSERT INTO sales (customer_id, date, total) VALUES (?, ?, ?)', params: [customerId, date, total] });

        for (const p of products) {
          const q = quantities[p.id] ?? 0;
          if (q > 0) {
            const resolvedPrice = fetchCustomerPrice(customerId, p.id) ?? p.base_price;
            statements.push({ sql: 'INSERT INTO sale_items (sale_id, product_id, quantity, price_used) VALUES ((SELECT id FROM sales ORDER BY id DESC LIMIT 1), ?, ?, ?)', params: [p.id, q, resolvedPrice] });
          }
        }
      }

      statements.push({ sql: 'COMMIT' });

      // prepare items and delegate atomic upsert to helper
      const items = products
        .map(p => ({ product_id: p.id, quantity: quantities[p.id] ?? 0, price: fetchCustomerPrice(customerId, p.id) ?? p.base_price }))
        .filter(it => it.quantity > 0);

      upsertDailySale(customerId, date, items);

      // if we created a new sale, fetch its id to keep state consistent
      if (saleId == null) {
        const rows = runQuery<{ id: number }>('SELECT id FROM sales WHERE customer_id = ? AND date = ?', [customerId, date]);
        if (rows.length > 0) setSaleId(rows[0].id);
      }

      setSnackMsg('Saved');
      setSnackVisible(true);
      setTimeout(() => {
        setSnackVisible(false);
        router.back();
      }, 1100);
    } catch (error) {
      console.error('Failed to save sale', error);
      setSnackMsg('Failed to save');
      setSnackVisible(true);
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator animating={true} size={48} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 12 }}>
          Products for {date}
        </Text>

        {products.map(p => (
          <View key={p.id} style={{ marginBottom: 12, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <Text style={{ fontWeight: '600' }}>{p.name} ({p.unit})</Text>
            <Text style={{ marginTop: 4 }}>Price: {prices[p.id] ?? p.base_price}</Text>
            <TextInput
              label="Quantity"
              value={(quantities[p.id] ?? 0).toString()}
              onChangeText={(t) => onQtyChange(p.id, t)}
              keyboardType="numeric"
              style={{ marginTop: 8 }}
            />
            <Text style={{ marginTop: 8 }}>Cost: {perProductCost(p.id).toFixed(2)}</Text>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <Text variant="bodyLarge">Total: {total.toFixed(2)}</Text>
          <Button mode="contained" onPress={onSave} loading={saving} disabled={total <= 0} style={{ marginTop: 12 }}>
            Save Daily Entry
          </Button>
        </View>
        </ScrollView>
      )}
      <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2000}>{snackMsg}</Snackbar>
    </KeyboardAvoidingView>
  );
}
