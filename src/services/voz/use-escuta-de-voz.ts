// Estado da escuta por voz para as telas: ouvindo ou nao, mensagem de erro e o aviso que precisa
// ser aceito antes de usar o reconhecedor do sistema (Apple ou Google; ver reconhecimento.ts).
// A tela so desenha; quem decide quando abrir e fechar o microfone e este hook. O aceite do aviso
// vale so enquanto o app esta aberto: nada e gravado no aparelho.

import { useCallback, useEffect, useRef, useState } from 'react';

import { ehErroAparelho } from '../aparelho/erro-aparelho';
import { pararDeFalar } from './falar';
import {
  iniciarReconhecimento,
  reconhecimentoDisponivel,
  type ControleDeReconhecimento,
} from './reconhecimento';

const MSG_FALHA_INESPERADA = 'Não consegui usar a voz agora. Digite o que você precisa.';

interface OpcoesDaEscuta {
  /** Texto reconhecido ate agora; `final` e verdadeiro quando a frase terminou. */
  aoTexto: (texto: string, final: boolean) => void;
}

export interface EscutaDeVoz {
  /** O aparelho tem algum reconhecedor de fala (se nao, a tela esconde o microfone). */
  disponivel: boolean;
  ouvindo: boolean;
  /** O aparelho so entende voz pelo sistema: a tela mostra o aviso e chama aceitar/recusar. */
  precisaAviso: boolean;
  /** Mensagem pronta para a pessoa, ou null. */
  erro: string | null;
  /** Um toque no microfone: comeca a ouvir, ou para se ja estiver ouvindo. */
  alternar: () => Promise<void>;
  aceitarAviso: () => Promise<void>;
  recusarAviso: () => void;
}

export function useEscutaDeVoz({ aoTexto }: OpcoesDaEscuta): EscutaDeVoz {
  const [disponivel] = useState(() => reconhecimentoDisponivel());
  const [ouvindo, setOuvindo] = useState(false);
  const [precisaAviso, setPrecisaAviso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const controle = useRef<ControleDeReconhecimento | null>(null);
  const iniciando = useRef(false);
  const sistemaPermitido = useRef(false);
  const montado = useRef(true);
  // Sempre o "aoTexto" mais recente da tela, sem reiniciar a escuta quando ela re-renderiza.
  const aoTextoAtual = useRef(aoTexto);
  useEffect(() => {
    aoTextoAtual.current = aoTexto;
  });

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      controle.current?.cancelar();
      controle.current = null;
    };
  }, []);

  const comecar = useCallback(async () => {
    if (iniciando.current || controle.current) return;
    iniciando.current = true;
    setErro(null);
    try {
      // O app nao pode ouvir a propria voz lendo a resposta.
      await pararDeFalar();
      const novo = await iniciarReconhecimento(
        {
          aoTexto: (texto, final) => aoTextoAtual.current(texto, final),
          aoErro: (mensagem) => setErro(mensagem),
          aoTerminar: () => {
            controle.current = null;
            setOuvindo(false);
          },
        },
        { permitirSistema: sistemaPermitido.current },
      );
      if (!montado.current) {
        // A pessoa saiu da tela enquanto o microfone abria.
        novo.cancelar();
        return;
      }
      controle.current = novo;
      setOuvindo(true);
    } catch (falha) {
      if (ehErroAparelho(falha) && falha.codigo === 'CONSENTIMENTO_NECESSARIO') {
        setPrecisaAviso(true);
      } else {
        setErro(ehErroAparelho(falha) ? falha.message : MSG_FALHA_INESPERADA);
      }
    } finally {
      iniciando.current = false;
    }
  }, []);

  const alternar = useCallback(async () => {
    if (controle.current) {
      controle.current.parar();
      return;
    }
    await comecar();
  }, [comecar]);

  const aceitarAviso = useCallback(async () => {
    sistemaPermitido.current = true;
    setPrecisaAviso(false);
    await comecar();
  }, [comecar]);

  const recusarAviso = useCallback(() => setPrecisaAviso(false), []);

  return { disponivel, ouvindo, precisaAviso, erro, alternar, aceitarAviso, recusarAviso };
}
