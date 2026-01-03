// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDB } from '../db/database';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <Stack />
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
