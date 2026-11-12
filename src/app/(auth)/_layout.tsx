import { Stack } from 'expo-router';

// Este arquivo faz a pasta (auth) virar uma rota chamada "(auth)", que o NavegadorRaiz protege.
// Sem ele, as telas da pasta ficariam soltas e a protecao nao as encontraria.
export default function LayoutAuth() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
