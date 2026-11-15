// Cartao de um atendimento proximo (hospital, farmacia, CRAS...) na resposta do assistente: nome,
// tipo, distancia, endereco e acessibilidade, com os botoes "Ligar" (se houver telefone) e
// "Ver no mapa". A acessibilidade vem SEMPRE em texto, nunca so por cor, e o aviso do Java
// ("ligue antes") aparece junto: quem usa cadeira de rodas precisa saber antes de ir.
// Os botoes so chamam as funcoes recebidas: a tela decide como discar e abrir o mapa.

import { StyleSheet, View } from 'react-native';

import type { Acessibilidade, AtendimentoProximo, TipoAtendimento } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { formatarDistancia } from '../utils/formatar-distancia';
import { Botao } from './Botao';
import { Texto } from './Texto';

const NOME_DO_TIPO: Record<TipoAtendimento, string> = {
  HOSPITAL: 'Hospital',
  UPA: 'UPA (pronto atendimento)',
  UBS: 'Posto de saúde (UBS)',
  FARMACIA: 'Farmácia',
  CRAS: 'CRAS (assistência social)',
  DELEGACIA: 'Delegacia',
  DEFENSORIA: 'Defensoria Pública',
};

const TEXTO_DA_ACESSIBILIDADE: Record<Acessibilidade, string> = {
  SIM: 'Acessível',
  PARCIAL: 'Acessibilidade parcial',
  NAO: 'Sem acessibilidade',
  DESCONHECIDA: 'Acessibilidade não confirmada',
};

interface PropsCartaoAtendimento {
  atendimento: AtendimentoProximo;
  aoLigar: (telefone: string) => void;
  aoVerNoMapa: (latitude: number, longitude: number) => void;
}

export function CartaoAtendimento({ atendimento, aoLigar, aoVerNoMapa }: PropsCartaoAtendimento) {
  const { nome, telefone } = atendimento;
  return (
    <View style={styles.cartao}>
      <Texto style={styles.nome}>{nome}</Texto>
      <Texto style={styles.detalhes}>{NOME_DO_TIPO[atendimento.tipo]}</Texto>
      <Texto style={styles.detalhes}>{formatarDistancia(atendimento.distanciaMetros)}</Texto>
      <Texto style={styles.detalhes}>{atendimento.endereco}</Texto>
      <Texto style={styles.acessibilidade}>
        {TEXTO_DA_ACESSIBILIDADE[atendimento.acessibilidade]}
      </Texto>
      {atendimento.banheiroAdaptado ? (
        <Texto style={styles.detalhes}>Banheiro adaptado</Texto>
      ) : null}
      {atendimento.funciona24h ? <Texto style={styles.detalhes}>Aberto 24 horas</Texto> : null}
      {atendimento.aviso ? <Texto style={styles.aviso}>{atendimento.aviso}</Texto> : null}
      {telefone ? (
        <Botao
          titulo="Ligar"
          rotulo={`Ligar para ${nome}`}
          icone="call-outline"
          onPress={() => aoLigar(telefone)}
        />
      ) : null}
      <Botao
        titulo="Ver no mapa"
        rotulo={`Ver ${nome} no mapa`}
        variante="secundario"
        icone="map-outline"
        onPress={() => aoVerNoMapa(atendimento.latitude, atendimento.longitude)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    padding: espacos.medio,
    gap: espacos.pequeno,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: cores.acao,
    backgroundColor: cores.fundo,
  },
  nome: { fontSize: fontes.subtitulo, fontFamily: fontes.familia.negrito, color: cores.texto },
  detalhes: { fontSize: fontes.corpo, color: cores.textoSecundario },
  acessibilidade: {
    fontSize: fontes.corpo,
    fontFamily: fontes.familia.negrito,
    color: cores.texto,
  },
  aviso: {
    fontSize: fontes.corpo,
    color: cores.erro,
    padding: espacos.pequeno,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.erro,
    backgroundColor: cores.fundoErro,
  },
});
