// Navegador raiz: decide quais grupos de rotas o usuario pode ver conforme a sessao.
// Usa Stack.Protected do Expo Router (docs.expo.dev/router/advanced/protected): um grupo cujo
// "guard" e falso fica inacessivel, e quem tenta abri-lo (ou esta nele quando o guard vira falso,
// como no logout) e redirecionado. As rotas ficam em src/app: (auth) = login e cadastro,
// (app) = telas que exigem sessao.

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useAuth } from '../contexts/AuthContext';

export function NavegadorRaiz() {
  const { status } = useAuth();

  // O splash (tela de abertura) segue visivel enquanto o app le a sessao do cofre; assim o
  // usuario nao ve o login piscar antes de cair no inicio.
  useEffect(() => {
    if (status !== 'carregando') SplashScreen.hide();
  }, [status]);

  if (status === 'carregando') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'autenticado'} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'anonimo'} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
