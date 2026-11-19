// Lista de atendimentos perto da pessoa (hospital, UPA, UBS, farmacia, CRAS...), como a API Java
// devolve: orientacao de emergencia (192) quando e hospital ou UPA, aviso de acessibilidade, o
// caminho ate o mais perto e o credito do OpenStreetMap (licenca ODbL), sempre junto da lista.
// Usada pelo assistente e pela tela "Atendimento perto".

import { StyleSheet, View } from 'react-native';

import type { AtendimentosProximos } from '../services/api/types';
import { cores, espacos, fontes } from '../theme';
import { ligarPara } from '../utils/ligar-para';
import { abrirNoMapa } from '../utils/url-do-mapa';
import { Botao } from './Botao';
import { CartaoAtendimento } from './CartaoAtendimento';
import { Texto } from './Texto';

const SAMU = '192';

export function BotaoLigarEmergencia({ telefone }: { telefone: string }) {
  const rotulo =
    telefone === SAMU ? `Ligar para o SAMU, ${telefone}` : `Ligar para a emergência, ${telefone}`;
  return (
    <Botao
      titulo={`Ligar ${telefone}`}
      rotulo={rotulo}
      variante="ajuda"
      icone="call-outline"
      onPress={() => ligarPara(telefone)}
    />
  );
}

export function ListaDeAtendimentos({ dados }: { dados: AtendimentosProximos }) {
  return (
    <View style={styles.lista}>
      {dados.orientacaoEmergencia ? (
        <View style={styles.cartao}>
          <Texto style={styles.resposta}>{dados.orientacaoEmergencia}</Texto>
          {dados.telefoneEmergencia ? (
            <BotaoLigarEmergencia telefone={dados.telefoneEmergencia} />
          ) : null}
        </View>
      ) : null}
      {dados.semAcessivelNoRaio ? (
        <Texto style={styles.destaque}>
          Nenhum local confirmado como acessível por perto. Veja os mais próximos e ligue antes para
          conferir.
        </Texto>
      ) : null}
      {dados.atendimentos.length === 0 ? (
        <Texto style={styles.destaque}>Não encontrei atendimentos por perto.</Texto>
      ) : (
        <>
          {/* Responde a pergunta do Java ("quer que eu abra o caminho?") com um toque. */}
          <Botao
            titulo="Abrir caminho até o mais perto"
            rotulo={`Abrir o caminho até ${dados.atendimentos[0].nome}, o mais perto de você`}
            icone="navigate-outline"
            onPress={() =>
              abrirNoMapa(dados.atendimentos[0].latitude, dados.atendimentos[0].longitude)
            }
          />
          {dados.atendimentos.map((atendimento) => (
            <CartaoAtendimento
              key={atendimento.id}
              atendimento={atendimento}
              aoLigar={ligarPara}
              aoVerNoMapa={abrirNoMapa}
            />
          ))}
        </>
      )}
      {dados.observacao ? <Texto style={styles.fonte}>{dados.observacao}</Texto> : null}
      {/* Credito exigido pela licenca ODbL do OpenStreetMap: sempre visivel junto da lista. */}
      <Texto style={styles.fonte}>{dados.creditoDados}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: espacos.medio,
    padding: espacos.medio,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: cores.acao,
  },
  lista: { gap: espacos.medio },
  resposta: { fontSize: fontes.subtitulo, color: cores.texto },
  destaque: { fontSize: fontes.corpo, fontFamily: fontes.familia.negrito, color: cores.texto },
  fonte: { fontSize: fontes.corpo, color: cores.textoSecundario },
});
