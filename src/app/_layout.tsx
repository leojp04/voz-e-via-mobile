import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
  useFonts,
} from '@expo-google-fonts/atkinson-hyperlegible';
import * as SplashScreen from 'expo-splash-screen';

import { NavegadorRaiz } from '../components/NavegadorRaiz';
import { AppProviders } from '../contexts/AppProviders';
import { usarApiFalsaDoAmbiente } from '../services/api/fabrica';

// Mantem o splash aberto ate a sessao ser lida do cofre; o NavegadorRaiz o esconde depois.
SplashScreen.preventAutoHideAsync().catch(() => {});

const URL_JAVA_PUBLICADA = 'https://app-vozviva-rm562312.azurewebsites.net';
const URL_DOTNET_PUBLICADA = 'https://app-zeladoria-rm562312.azurewebsites.net';

export default function RootLayout() {
  // Atkinson Hyperlegible (ver ADR 0007). Enquanto as fontes carregam, nada e desenhado e o
  // splash continua aberto; se o carregamento falhar, o app segue com a fonte do sistema.
  const [fontesCarregadas, erroDeFonte] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  if (!fontesCarregadas && !erroDeFonte) return null;

  // O Expo so troca process.env.EXPO_PUBLIC_* quando o acesso e literal, por isso a leitura
  // fica aqui e os valores descem por props (o que tambem deixa o AppProviders testavel).
  // Sem .env, o app usa as APIs publicadas na Azure: um build sem .env nunca aponta para localhost.
  return (
    <AppProviders
      usarApiFalsa={usarApiFalsaDoAmbiente(process.env.EXPO_PUBLIC_USE_FAKE_API)}
      urlJava={process.env.EXPO_PUBLIC_JAVA_API_URL ?? URL_JAVA_PUBLICADA}
      urlDotnet={process.env.EXPO_PUBLIC_DOTNET_API_URL ?? URL_DOTNET_PUBLICADA}
    >
      <NavegadorRaiz />
    </AppProviders>
  );
}
