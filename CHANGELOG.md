# Histórico de mudanças

O que mudou em cada versão, quando e por quê. As datas são as do envio para o GitHub. O formato segue a ideia do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/): as mudanças mais novas ficam no topo.

## 2026-11-03

### Novo

- **Editar treino dentro do app.** Um botão abaixo do treino do dia abre a lista de exercícios daquele treino. Dá para trocar um exercício por outro da biblioteca ou por um com nome próprio (com o músculo principal, para o mapa muscular e as estatísticas), mudar séries, repetições, carga, descanso, unidade e esforço, adicionar, remover, mudar a ordem e voltar ao original.
  *Por quê:* trocar uma máquina ou um exercício exigia editar o código. Agora o programa editado fica salvo no aparelho.
- Cada treino é editado no bloco da semana selecionada (ímpar ou par), já que os dois blocos têm exercícios diferentes.
- Os treinos já feitos passam a guardar o programa com que foram feitos, para as estatísticas de séries planejadas e volume não se embaralharem depois de uma edição.

### Corrigido

- **A carga do exercício agora é a da última série concluída da última vez**, em todo lugar: lista do treino, card, "Como fazer", aquecimento e campos das séries. Todas as séries do próximo treino começam com essa carga; as repetições continuam vindo série por série.
  *Por quê:* o "Carga" mostrado no card e no "Como fazer" era o valor fixo do programa e nunca mudava, e o preenchimento copiava série por série, o que trazia de volta pesos antigos. Se você baixou a carga no meio do exercício, é essa carga mais baixa que vale da próxima vez.
- **A regra de 10% a menos virou só uma sugestão.** Quando a série fica abaixo da meta, o app mostra quanto seria 10% a menos, mas não muda mais o peso da próxima série.
  *Por quê:* a troca automática passava despercebida no meio do treino, ficava salva e fazia a carga cair em cascata (15, 13,5, 12, 11 kg) de uma semana para outra.

## 2026-10-23

### Novo

- Primeira versão publicada: treino com séries, timer de descanso e regras de progressão; progresso com gráficos, recordes, medidas e fotos; dieta com calculadora de macros; água com meta e lembretes; perfil com sequência, conquistas, tema claro e backup.
- Botão do README para abrir o app online renomeado para "Dá um bisu".
