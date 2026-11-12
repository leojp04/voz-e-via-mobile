import { Stack } from 'expo-router';

// Faz a pasta (app) virar uma rota chamada "(app)", que o NavegadorRaiz so libera com sessao.
export default function LayoutApp() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
