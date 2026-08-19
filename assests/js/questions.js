// questions.js — Banco de perguntas do Aero Run
// Alinhado às habilidades BNCC de Computação

const QUESTIONS = [

  // ── FASE 1 (básico) ─────────────────────────────────────

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
    explanation: "Um algoritmo é uma sequência ordenada de passos."
  },

  {
    phase: 1,
    text: "Qual dispositivo é usado para digitar textos?",
    options: [
      "Monitor",
      "Teclado",
      "Mouse",
      "Impressora"
    ],
    correct: 1,
    explanation: "O teclado é usado para digitação."
  },

  {
    phase: 1,
    text: "O que é a Internet?",
    options: [
      "Um jogo",
      "Uma rede global que conecta computadores",
      "Um antivírus",
      "Um hardware"
    ],
    correct: 1,
    explanation: "A internet conecta computadores no mundo todo."
  },

  {
    phase: 1,
    text: "Qual é a função da CPU?",
    options: [
      "Guardar arquivos",
      "Processar instruções",
      "Imprimir documentos",
      "Aumentar internet"
    ],
    correct: 1,
    explanation: "A CPU executa instruções e processa dados."
  },

  {
    phase: 1,
    text: "Qual destes é um dispositivo de saída?",
    options: [
      "Teclado",
      "Mouse",
      "Monitor",
      "Microfone"
    ],
    correct: 2,
    explanation: "O monitor mostra informações ao usuário."
  },

  {
    phase: 1,
    text: "O que significa salvar um arquivo?",
    options: [
      "Apagar o arquivo",
      "Armazenar o arquivo",
      "Mover o mouse",
      "Desligar o computador"
    ],
    correct: 1,
    explanation: "Salvar significa armazenar o arquivo."
  },

  {
    phase: 1,
    text: "Qual destes é hardware?",
    options: [
      "Google Chrome",
      "Windows",
      "Teclado",
      "Instagram"
    ],
    correct: 2,
    explanation: "Hardware são peças físicas do computador."
  },

  {
    phase: 1,
    text: "Qual destes é um navegador?",
    options: [
      "Chrome",
      "CPU",
      "SSD",
      "RAM"
    ],
    correct: 0,
    explanation: "Chrome é um navegador web."
  },

  {
    phase: 1,
    text: "O mouse serve para:",
    options: [
      "Controlar o cursor",
      "Salvar arquivos",
      "Aumentar memória",
      "Criar internet"
    ],
    correct: 0,
    explanation: "O mouse controla o cursor."
  },

  {
    phase: 1,
    text: "O que é entrada de dados?",
    options: [
      "Resultados do computador",
      "Dados enviados para processamento",
      "Internet rápida",
      "Arquivos apagados"
    ],
    correct: 1,
    explanation: "Entrada são os dados enviados ao computador."
  },

  // ── FASE 2 (intermediário) ──────────────────────────────

  {
    phase: 2,
    text: "O que faz um laço de repetição?",
    options: [
      "Repete instruções",
      "Desliga o computador",
      "Apaga arquivos",
      "Conecta internet"
    ],
    correct: 0,
    explanation: "Laços repetem instruções automaticamente."
  },

  {
    phase: 2,
    text: "O que é programação?",
    options: [
      "Criar peças físicas",
      "Criar instruções para computadores",
      "Montar redes",
      "Apagar bugs"
    ],
    correct: 1,
    explanation: "Programação é criar comandos para computadores."
  },

  {
    phase: 2,
    text: "Qual estrutura usa 'se... senão'?",
    options: [
      "FOR",
      "WHILE",
      "IF/ELSE",
      "HTML"
    ],
    correct: 2,
    explanation: "IF/ELSE executa decisões."
  },

  {
    phase: 2,
    text: "O que é um bug?",
    options: [
      "Erro no código",
      "Um hardware",
      "Uma memória",
      "Um navegador"
    ],
    correct: 0,
    explanation: "Bug é um erro no programa."
  },

  {
    phase: 2,
    text: "O que significa decomposição de problemas?",
    options: [
      "Apagar partes",
      "Dividir problemas em partes menores",
      "Formatar computador",
      "Criar vírus"
    ],
    correct: 1,
    explanation: "Problemas menores são mais fáceis de resolver."
  },

  {
    phase: 2,
    text: "Qual destes é um sistema operacional?",
    options: [
      "Mouse",
      "Windows",
      "Monitor",
      "Teclado"
    ],
    correct: 1,
    explanation: "Windows é um sistema operacional."
  },

  {
    phase: 2,
    text: "O que é lógica computacional?",
    options: [
      "Pensar de forma estruturada",
      "Trocar cabos",
      "Montar computadores",
      "Editar fotos"
    ],
    correct: 0,
    explanation: "Lógica computacional ajuda na resolução de problemas."
  },

  {
    phase: 2,
    text: "O que é um servidor?",
    options: [
      "Um computador que fornece serviços",
      "Um antivírus",
      "Um cabo",
      "Um teclado"
    ],
    correct: 0,
    explanation: "Servidores fornecem serviços para clientes."
  },

  {
    phase: 2,
    text: "O que significa depurar um programa?",
    options: [
      "Instalar internet",
      "Corrigir erros",
      "Trocar memória",
      "Criar vírus"
    ],
    correct: 1,
    explanation: "Depurar é corrigir bugs."
  },

  {
    phase: 2,
    text: "Qual linguagem estrutura páginas web?",
    options: [
      "HTML",
      "RAM",
      "SSD",
      "CPU"
    ],
    correct: 0,
    explanation: "HTML estrutura páginas web."
  },

  // ── FASE 3 (avançado) ───────────────────────────────────

  {
    phase: 3,
    text: "O que é um endereço IP?",
    options: [
      "Senha do Wi-Fi",
      "Identificador de rede",
      "Nome do site",
      "Tipo de monitor"
    ],
    correct: 1,
    explanation: "IP identifica dispositivos na rede."
  },

  {
    phase: 3,
    text: "Qual protocolo acessa páginas web?",
    options: [
      "HTTP",
      "RAM",
      "CPU",
      "SSD"
    ],
    correct: 0,
    explanation: "HTTP comunica navegador e servidor."
  },

  {
    phase: 3,
    text: "O que é uma variável?",
    options: [
      "Erro do sistema",
      "Espaço para armazenar valores",
      "Peça física",
      "Uma internet"
    ],
    correct: 1,
    explanation: "Variáveis armazenam dados."
  },

  {
    phase: 3,
    text: "O que faz um loop?",
    options: [
      "Cria internet",
      "Repete instruções",
      "Desliga o PC",
      "Apaga variáveis"
    ],
    correct: 1,
    explanation: "Loops repetem blocos de código."
  },

  {
    phase: 3,
    text: "Qual a diferença entre hardware e software?",
    options: [
      "São iguais",
      "Hardware é físico; software é programa",
      "Hardware é internet",
      "Software é teclado"
    ],
    correct: 1,
    explanation: "Hardware é físico e software é lógico."
  },

  {
    phase: 3,
    text: "O que é computação em nuvem?",
    options: [
      "Guardar dados online",
      "Usar apenas notebooks",
      "Criar jogos",
      "Desligar servidores"
    ],
    correct: 0,
    explanation: "Cloud computing usa servidores online."
  },

  {
    phase: 3,
    text: "O que é uma função em programação?",
    options: [
      "Bloco reutilizável de código",
      "Um antivírus",
      "Uma placa de vídeo",
      "Um monitor"
    ],
    correct: 0,
    explanation: "Funções organizam tarefas no código."
  },

  {
    phase: 3,
    text: "Qual dispositivo conecta redes?",
    options: [
      "Roteador",
      "Mouse",
      "Teclado",
      "Monitor"
    ],
    correct: 0,
    explanation: "Roteadores conectam dispositivos em rede."
  },

  {
    phase: 3,
    text: "O que significa HTTPS?",
    options: [
      "HTTP seguro",
      "Um hardware",
      "Uma memória",
      "Uma CPU"
    ],
    correct: 0,
    explanation: "HTTPS usa criptografia para segurança."
  },

  {
    phase: 3,
    text: "O que é um Array/Vetor?",
    options: [
      "Um tipo de cabo",
      "Estrutura que guarda vários valores",
      "Um vírus",
      "Uma memória RAM"
    ],
    correct: 1,
    explanation: "Arrays armazenam múltiplos valores."
  }

];

// ── FUNÇÃO PARA PEGAR QUESTÕES ALEATÓRIAS ──────────────────

function getRandomQuestion(phase) {

  // filtra perguntas da fase
  const phaseQuestions = QUESTIONS.filter(q => q.phase === phase);

  // escolhe índice aleatório
  const randomIndex = Math.floor(Math.random() * phaseQuestions.length);

  // retorna pergunta aleatória
  return phaseQuestions[randomIndex];
}

// Retorna todas as perguntas de uma fase, embaralhadas
// (útil caso se queira percorrer a fase sem repetir perguntas)
function getShuffledQuestions(phase) {
  return QUESTIONS
    .filter(q => q.phase === phase)
    .sort(() => Math.random() - 0.5); // embaralha
}


// EXEMPLO:
// const question = getRandomQuestion(1);
// console.log(question);
