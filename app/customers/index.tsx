import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, Alert, Text } from 'react-native';
import { List, FAB, Searchbar, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { fetchAllCustomers, deleteCustomer, runBatch } from '../../db/queries';
import { Customer } from '../../types';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  const router = useRouter();

  /* -------------------- Load customers -------------------- */
  const load = useCallback(async () => {
    try {
      const rows = await fetchAllCustomers();
      setCustomers(rows);
    } catch (error) {
      console.error('Failed to load customers', error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* -------------------- Selection logic -------------------- */
  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePress = (id: number) => {
    if (selected.length > 0) {
      toggleSelect(id);
    } else {
      router.push(`/entry/${id}`);
    }
  };

  const handleLongPress = (id: number) => {
    toggleSelect(id);
  };

  /* -------------------- Delete -------------------- */
  const confirmDelete = () => {
    if (selected.length === 0) return;

    Alert.alert(
      'Delete customers',
      `Are you sure you want to delete ${selected.length} customer(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
            onPress: () => {
                try {
                  const statements = selected.map(id => ({ sql: 'DELETE FROM customers WHERE id = ?', params: [id] }));
                  runBatch(statements);
                  setSelected([]);
                  load();
                } catch (error) {
                  console.error('Failed to delete customers', error);
                }
              }
        }
      ]
    );
  };

  /* -------------------- Filter -------------------- */
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase())
  );

  /* -------------------- Render -------------------- */
  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Searchbar
        placeholder="Search customers"
        value={q}
        onChangeText={setQ}
        style={{ marginBottom: 8 }}
      />

      {selected.length > 0 && (
        <Text style={{ marginBottom: 6, color: '#1976D2', fontWeight: '600' }}>
          {selected.length} selected
        </Text>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.id);

          return (
            <List.Item
              title={item.name}
              description={`ID: ${item.id}`}
              onPress={() => handlePress(item.id)}
              onLongPress={() => handleLongPress(item.id)}
              style={{
                backgroundColor: isSelected ? '#E3F2FD' : '#FFFFFF',
                marginVertical: 6,
                borderRadius: 10,
                borderLeftWidth: isSelected ? 5 : 0,
                borderLeftColor: '#2196F3',
                elevation: isSelected ? 2 : 0,
              }}
              left={() =>
                selected.length > 0 ? (
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    onPress={() => toggleSelect(item.id)}
                  />
                ) : null
              }
            />
          );
        }}
      />

      {/* -------------------- FABs -------------------- */}
      {selected.length === 0 ? (
        <FAB
          icon="plus"
          style={{ position: 'absolute', right: 16, bottom: 16 }}
          onPress={() => router.push('/customers/new')}
        />
      ) : (
        <>
          <FAB
            icon="delete"
            style={{ position: 'absolute', right: 16, bottom: 16 }}
            onPress={confirmDelete}
          />
          <FAB
            small
            icon="close"
            style={{ position: 'absolute', right: 16, bottom: 92 }}
            onPress={() => setSelected([])}
          />
        </>
      )}
    </View>
  );
}
