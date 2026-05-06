// questions.js — Banco de perguntas do Aero Run
// Alinhado às habilidades BNCC de Computação

const QUESTIONS = [
  // ── FASE 1 (básico) ──────────────────────────────────────────────────
  {
    phase: 1,
    text: "O que é um algoritmo?",
    options: [
      "Um tipo de vírus de computador",
      "Uma sequência de passos para resolver um problema",
      "O nome de uma linguagem de programação",
      "Uma parte física do computador"
    ],
    correct: 1,
    explanation: "Um algoritmo é uma sequência ordenada de passos para resolver um problema ou realizar uma tarefa."
  },
  {
    phase: 1,
    text: "Qual das opções representa uma sequência lógica para fazer um sanduíche?",
    options: [
      "Comer → Pegar o pão → Adicionar recheio",
      "Pegar o pão → Adicionar recheio → Comer",
      "Adicionar recheio → Comer → Pegar o pão",
      "Comer → Adicionar recheio → Pegar o pão"
    ],
    correct: 1,
    explanation: "A sequência correta segue uma ordem lógica: primeiro pegar o pão, depois adicionar o recheio e, por fim, comer."
  },
  {
    phase: 1,
    text: "O que significa 'entrada' em computação?",
    options: [
      "A porta do servidor",
      "Os dados que enviamos para o computador processar",
      "O resultado que o computador nos dá",
      "O nome do processador"
    ],
    correct: 1,
    explanation: "Entrada são os dados fornecidos ao computador para serem processados (ex.: digitar um texto ou pressionar uma tecla)."
  },
  {
    phase: 1,
    text: "O que é a Internet?",
    options: [
      "Um programa instalado no computador",
      "Uma rede global que conecta computadores",
      "Um tipo de hardware",
      "O sistema operacional da Microsoft"
    ],
    correct: 1,
    explanation: "A Internet é uma rede mundial que interliga computadores e dispositivos, permitindo a troca de informações."
  },
  {
    phase: 1,
    text: "Qual é a função principal do processador (CPU)?",
    options: [
      "Armazenar arquivos permanentemente",
      "Conectar à Internet",
      "Processar e executar instruções",
      "Exibir imagens na tela"
    ],
    correct: 2,
    explanation: "A CPU (Unidade Central de Processamento) é o 'cérebro' do computador, responsável por executar instruções e processar dados."
  },
  {
    phase: 1,
    text: "O que são dados de 'saída' em um sistema computacional?",
    options: [
      "Os dados que digitamos no teclado",
      "Os resultados gerados pelo processamento",
      "Os arquivos deletados",
      "A conexão com a Internet"
    ],
    correct: 1,
    explanation: "Saída são os resultados produzidos pelo computador após processar as entradas (ex.: imagem na tela, texto impresso)."
  },

  // ── FASE 2 (intermediário) ────────────────────────────────────────────
  {
    phase: 2,
    text: "O que é uma estrutura de decisão em programação?",
    options: [
      "Um laço que repete instruções",
      "Uma instrução que escolhe um caminho com base em uma condição",
      "Um tipo de variável",
      "Uma função matemática"
    ],
    correct: 1,
    explanation: "Estruturas de decisão (como o IF/ELSE) permitem que o programa escolha diferentes caminhos dependendo de uma condição verdadeira ou falsa."
  },
  {
    phase: 2,
    text: "Em qual estrutura de decisão usamos 'se... senão'?",
    options: [
      "FOR",
      "WHILE",
      "IF / ELSE",
      "SWITCH avançado"
    ],
    correct: 2,
    explanation: "O IF/ELSE (se/senão) é a estrutura de decisão mais comum: executa um bloco se a condição for verdadeira, outro bloco se for falsa."
  },
  {
    phase: 2,
    text: "O que significa 'decomposição de problemas'?",
    options: [
      "Deletar partes de um programa",
      "Dividir um problema grande em partes menores e mais fáceis de resolver",
      "Compactar arquivos no computador",
      "Formatar o disco rígido"
    ],
    correct: 1,
    explanation: "Decompor um problema significa dividi-lo em subproblemas menores, tornando a solução mais simples e organizada."
  },
  {
    phase: 2,
    text: "O que é um sistema distribuído?",
    options: [
      "Um único computador muito potente",
      "Vários computadores trabalhando juntos para realizar tarefas",
      "Um software de edição de vídeos",
      "Uma impressora em rede"
    ],
    correct: 1,
    explanation: "Sistemas distribuídos são conjuntos de computadores independentes que se comunicam e cooperam para atingir um objetivo comum."
  },
  {
    phase: 2,
    text: "O que é um servidor?",
    options: [
      "Um computador que fornece serviços e recursos para outros computadores",
      "O mouse do computador",
      "Um tipo de vírus",
      "O cabo de rede"
    ],
    correct: 0,
    explanation: "Um servidor é um computador que oferece serviços (como páginas web, e-mails ou arquivos) para outros computadores chamados de clientes."
  },
  {
    phase: 2,
    text: "O que é lógica computacional?",
    options: [
      "A forma como os fios do computador são organizados",
      "A capacidade de raciocinar de forma estruturada para resolver problemas usando o computador",
      "O idioma de programação mais usado",
      "O design de interfaces gráficas"
    ],
    correct: 1,
    explanation: "Lógica computacional é a habilidade de pensar de forma estruturada e sequencial para criar soluções que o computador possa executar."
  },

  // ── FASE 3 (avançado) ─────────────────────────────────────────────────
  {
    phase: 3,
    text: "Qual protocolo é responsável por endereçar e rotear pacotes na Internet?",
    options: [
      "HTTP",
      "IP (Internet Protocol)",
      "FTP",
      "SMTP"
    ],
    correct: 1,
    explanation: "O IP (Protocolo de Internet) é responsável por endereçar computadores na rede e rotear os pacotes de dados até o destino correto."
  },
  {
    phase: 3,
    text: "O que é um endereço IP?",
    options: [
      "O nome de um site na web",
      "Um identificador numérico único para cada dispositivo em uma rede",
      "A senha do Wi-Fi",
      "O nome do provedor de Internet"
    ],
    correct: 1,
    explanation: "O endereço IP é um número único que identifica cada dispositivo em uma rede, assim como um CEP identifica um endereço físico."
  },
  {
    phase: 3,
    text: "O que é uma variável em programação?",
    options: [
      "Um erro no código",
      "Um espaço na memória para armazenar um valor que pode mudar",
      "Uma função matemática complexa",
      "O resultado final de um programa"
    ],
    correct: 1,
    explanation: "Uma variável é um espaço reservado na memória do computador com um nome, onde podemos guardar e modificar valores durante a execução do programa."
  },
  {
    phase: 3,
    text: "Qual a diferença entre hardware e software?",
    options: [
      "Hardware é o programa; software é a peça física",
      "Hardware são as peças físicas; software são os programas e sistemas",
      "Ambos são iguais",
      "Hardware é a Internet; software é o e-mail"
    ],
    correct: 1,
    explanation: "Hardware são os componentes físicos do computador (teclado, placa-mãe, HD), enquanto software são os programas e sistemas que funcionam nele."
  },
  {
    phase: 3,
    text: "O que faz um loop (laço de repetição) em programação?",
    options: [
      "Encerra o programa imediatamente",
      "Executa um bloco de código repetidamente enquanto uma condição for verdadeira",
      "Cria uma nova variável",
      "Conecta dois programas diferentes"
    ],
    correct: 1,
    explanation: "Um loop repete um conjunto de instruções várias vezes enquanto a condição definida for verdadeira, evitando repetição manual de código."
  }
];
