// Dados que vêm com o app: exercícios padrão e treinos sugeridos.
// Preenchidos uma única vez, na primeira abertura.

export const GRUPOS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Quadríceps',
  'Posterior',
  'Glúteos',
  'Panturrilha',
  'Abdômen',
  'Cardio',
];

// Cardio: entra no fim das fichas quando o objetivo é emagrecer.
export const EXERCICIOS_CARDIO = [
  ['Esteira', 'Cardio'],
  ['Bicicleta ergométrica', 'Cardio'],
  ['Elíptico', 'Cardio'],
];

export const EXERCICIOS_PADRAO = [
  ['Supino reto com barra', 'Peito'],
  ['Supino reto com halteres', 'Peito'],
  ['Supino inclinado com halteres', 'Peito'],
  ['Crucifixo com halteres', 'Peito'],
  ['Crossover na polia', 'Peito'],
  ['Voador (peck deck)', 'Peito'],
  ['Flexão de braço', 'Peito'],
  ['Puxada frontal', 'Costas'],
  ['Remada baixa', 'Costas'],
  ['Remada curvada com barra', 'Costas'],
  ['Remada unilateral com halter', 'Costas'],
  ['Barra fixa', 'Costas'],
  ['Pulldown com corda', 'Costas'],
  ['Desenvolvimento com halteres', 'Ombros'],
  ['Elevação lateral', 'Ombros'],
  ['Elevação frontal', 'Ombros'],
  ['Crucifixo invertido', 'Ombros'],
  ['Encolhimento com halteres', 'Ombros'],
  ['Rosca direta com barra', 'Bíceps'],
  ['Rosca alternada', 'Bíceps'],
  ['Rosca martelo', 'Bíceps'],
  ['Rosca na polia', 'Bíceps'],
  ['Tríceps na polia (corda)', 'Tríceps'],
  ['Tríceps testa', 'Tríceps'],
  ['Tríceps francês', 'Tríceps'],
  ['Mergulho no banco', 'Tríceps'],
  ['Agachamento livre', 'Quadríceps'],
  ['Agachamento goblet', 'Quadríceps'],
  ['Leg press 45°', 'Quadríceps'],
  ['Cadeira extensora', 'Quadríceps'],
  ['Afundo (passada)', 'Quadríceps'],
  ['Agachamento búlgaro', 'Quadríceps'],
  ['Mesa flexora', 'Posterior'],
  ['Cadeira flexora', 'Posterior'],
  ['Stiff', 'Posterior'],
  ['Levantamento terra', 'Posterior'],
  ['Elevação pélvica', 'Glúteos'],
  ['Cadeira abdutora', 'Glúteos'],
  ['Coice na polia', 'Glúteos'],
  ['Panturrilha em pé', 'Panturrilha'],
  ['Panturrilha sentado', 'Panturrilha'],
  ['Prancha', 'Abdômen'],
  ['Prancha lateral', 'Abdômen'],
  ['Abdominal crunch', 'Abdômen'],
  ['Elevação de pernas', 'Abdômen'],
  ...EXERCICIOS_CARDIO,
];

// Fotos dos exercícios padrão: Free Exercise DB (domínio público, Unlicense),
// https://github.com/yuhonas/free-exercise-db. Ficam em public/exercicios/.
export const IMAGENS_PADRAO = {
  "Supino reto com barra": 'app:exercicios/barbell-bench-press-medium-grip.jpg',
  "Supino reto com halteres": 'app:exercicios/dumbbell-bench-press.jpg',
  "Supino inclinado com halteres": 'app:exercicios/incline-dumbbell-bench-with-palms-facing-in.jpg',
  "Crucifixo com halteres": 'app:exercicios/dumbbell-flyes.jpg',
  "Crossover na polia": 'app:exercicios/cable-crossover.jpg',
  "Voador (peck deck)": 'app:exercicios/butterfly.jpg',
  "Flexão de braço": 'app:exercicios/pushups.jpg',
  "Puxada frontal": 'app:exercicios/wide-grip-lat-pulldown.jpg',
  "Remada baixa": 'app:exercicios/seated-cable-rows.jpg',
  "Remada curvada com barra": 'app:exercicios/bent-over-barbell-row.jpg',
  "Remada unilateral com halter": 'app:exercicios/one-arm-dumbbell-row.jpg',
  "Barra fixa": 'app:exercicios/pullups.jpg',
  "Pulldown com corda": 'app:exercicios/rope-straight-arm-pulldown.jpg',
  "Desenvolvimento com halteres": 'app:exercicios/dumbbell-shoulder-press.jpg',
  "Elevação lateral": 'app:exercicios/side-lateral-raise.jpg',
  "Elevação frontal": 'app:exercicios/front-dumbbell-raise.jpg',
  "Crucifixo invertido": 'app:exercicios/reverse-flyes.jpg',
  "Encolhimento com halteres": 'app:exercicios/dumbbell-shrug.jpg',
  "Rosca direta com barra": 'app:exercicios/barbell-curl.jpg',
  "Rosca alternada": 'app:exercicios/dumbbell-alternate-bicep-curl.jpg',
  "Rosca martelo": 'app:exercicios/hammer-curls.jpg',
  "Rosca na polia": 'app:exercicios/standing-biceps-cable-curl.jpg',
  "Tríceps na polia (corda)": 'app:exercicios/triceps-pushdown-rope-attachment.jpg',
  "Tríceps testa": 'app:exercicios/lying-triceps-press.jpg',
  "Tríceps francês": 'app:exercicios/standing-dumbbell-triceps-extension.jpg',
  "Mergulho no banco": 'app:exercicios/bench-dips.jpg',
  "Agachamento livre": 'app:exercicios/barbell-squat.jpg',
  "Agachamento goblet": 'app:exercicios/goblet-squat.jpg',
  "Leg press 45°": 'app:exercicios/leg-press.jpg',
  "Cadeira extensora": 'app:exercicios/leg-extensions.jpg',
  "Afundo (passada)": 'app:exercicios/dumbbell-lunges.jpg',
  "Agachamento búlgaro": 'app:exercicios/split-squat-with-dumbbells.jpg',
  "Mesa flexora": 'app:exercicios/lying-leg-curls.jpg',
  "Cadeira flexora": 'app:exercicios/seated-leg-curl.jpg',
  "Stiff": 'app:exercicios/stiff-legged-barbell-deadlift.jpg',
  "Levantamento terra": 'app:exercicios/barbell-deadlift.jpg',
  "Elevação pélvica": 'app:exercicios/barbell-hip-thrust.jpg',
  "Cadeira abdutora": 'app:exercicios/thigh-abductor.jpg',
  "Coice na polia": 'app:exercicios/one-legged-cable-kickback.jpg',
  "Panturrilha em pé": 'app:exercicios/standing-calf-raises.jpg',
  "Panturrilha sentado": 'app:exercicios/seated-calf-raise.jpg',
  "Prancha": 'app:exercicios/plank.jpg',
  "Prancha lateral": 'app:exercicios/side-bridge.jpg',
  "Abdominal crunch": 'app:exercicios/crunches.jpg',
  "Elevação de pernas": 'app:exercicios/flat-bench-lying-leg-raise.jpg',
  "Esteira": 'app:exercicios/esteira.jpg',
  "Bicicleta ergométrica": 'app:exercicios/bicicleta-ergometrica.jpg',
  "Elíptico": 'app:exercicios/eliptico.jpg',
};

// Cada divisão gera várias fichas (A, B, C…). Itens: [exercício, séries, repetições].
export const MODELOS = [
  {
    divisao: 'Full body A/B',
    nivel: 'iniciante',
    dias: '2-3',
    fichas: [
      {
        nome: 'Treino A — corpo inteiro',
        itens: [
          ['Agachamento goblet', 3, '12'],
          ['Supino reto com halteres', 3, '12'],
          ['Puxada frontal', 3, '12'],
          ['Desenvolvimento com halteres', 3, '12'],
          ['Mesa flexora', 3, '12'],
          ['Prancha', 3, '30 s'],
        ],
      },
      {
        nome: 'Treino B — corpo inteiro',
        itens: [
          ['Leg press 45°', 3, '12'],
          ['Remada baixa', 3, '12'],
          ['Supino inclinado com halteres', 3, '12'],
          ['Elevação pélvica', 3, '12'],
          ['Elevação lateral', 3, '12'],
          ['Abdominal crunch', 3, '15'],
        ],
      },
    ],
  },
  {
    divisao: 'A/B superiores e inferiores',
    nivel: 'intermediario',
    dias: '3-4',
    fichas: [
      {
        nome: 'Treino A — superiores',
        itens: [
          ['Supino reto com barra', 4, '8-10'],
          ['Puxada frontal', 4, '10'],
          ['Supino inclinado com halteres', 3, '10'],
          ['Remada curvada com barra', 3, '10'],
          ['Desenvolvimento com halteres', 3, '10'],
          ['Elevação lateral', 3, '12'],
          ['Rosca direta com barra', 3, '10'],
          ['Tríceps na polia (corda)', 3, '12'],
        ],
      },
      {
        nome: 'Treino B — inferiores',
        itens: [
          ['Agachamento livre', 4, '8-10'],
          ['Leg press 45°', 4, '10-12'],
          ['Stiff', 3, '10'],
          ['Cadeira extensora', 3, '12'],
          ['Mesa flexora', 3, '12'],
          ['Elevação pélvica', 3, '10'],
          ['Panturrilha em pé', 4, '15'],
          ['Prancha', 3, '40 s'],
        ],
      },
    ],
  },
  {
    divisao: 'A/B/C',
    nivel: 'avancado',
    dias: '4',
    fichas: [
      {
        nome: 'Treino A — peito, ombros e tríceps',
        itens: [
          ['Supino reto com barra', 4, '8'],
          ['Supino inclinado com halteres', 4, '10'],
          ['Crossover na polia', 3, '12'],
          ['Desenvolvimento com halteres', 4, '10'],
          ['Elevação lateral', 4, '12'],
          ['Tríceps testa', 3, '10'],
          ['Tríceps na polia (corda)', 3, '12'],
        ],
      },
      {
        nome: 'Treino B — costas e bíceps',
        itens: [
          ['Barra fixa', 4, '8'],
          ['Remada curvada com barra', 4, '8-10'],
          ['Puxada frontal', 3, '10'],
          ['Remada unilateral com halter', 3, '10'],
          ['Crucifixo invertido', 3, '12'],
          ['Rosca direta com barra', 3, '10'],
          ['Rosca martelo', 3, '12'],
        ],
      },
      {
        nome: 'Treino C — pernas',
        itens: [
          ['Agachamento livre', 4, '8'],
          ['Leg press 45°', 4, '10'],
          ['Agachamento búlgaro', 3, '10'],
          ['Stiff', 4, '10'],
          ['Cadeira extensora', 3, '12'],
          ['Mesa flexora', 3, '12'],
          ['Elevação pélvica', 3, '10'],
          ['Panturrilha em pé', 4, '15'],
        ],
      },
    ],
  },
  {
    divisao: 'A/B/C/D',
    nivel: 'avancado',
    dias: '5',
    fichas: [
      {
        nome: 'Treino A — peito e tríceps',
        itens: [
          ['Supino reto com barra', 4, '8'],
          ['Supino inclinado com halteres', 4, '10'],
          ['Voador (peck deck)', 3, '12'],
          ['Crossover na polia', 3, '12'],
          ['Tríceps testa', 3, '10'],
          ['Tríceps francês', 3, '10'],
          ['Tríceps na polia (corda)', 3, '12'],
        ],
      },
      {
        nome: 'Treino B — costas e bíceps',
        itens: [
          ['Barra fixa', 4, '8'],
          ['Remada curvada com barra', 4, '8-10'],
          ['Puxada frontal', 3, '10'],
          ['Remada baixa', 3, '10'],
          ['Pulldown com corda', 3, '12'],
          ['Rosca alternada', 3, '10'],
          ['Rosca martelo', 3, '12'],
        ],
      },
      {
        nome: 'Treino C — pernas',
        itens: [
          ['Agachamento livre', 4, '8'],
          ['Leg press 45°', 4, '10'],
          ['Afundo (passada)', 3, '10'],
          ['Levantamento terra', 4, '6-8'],
          ['Cadeira extensora', 3, '12'],
          ['Cadeira flexora', 3, '12'],
          ['Elevação pélvica', 3, '10'],
          ['Panturrilha sentado', 4, '15'],
        ],
      },
      {
        nome: 'Treino D — ombros e abdômen',
        itens: [
          ['Desenvolvimento com halteres', 4, '8-10'],
          ['Elevação lateral', 4, '12'],
          ['Elevação frontal', 3, '12'],
          ['Crucifixo invertido', 3, '12'],
          ['Encolhimento com halteres', 3, '12'],
          ['Abdominal crunch', 3, '15'],
          ['Elevação de pernas', 3, '12'],
          ['Prancha lateral', 3, '30 s'],
        ],
      },
    ],
  },
];

export async function seed(db) {
  const ids = {};
  for (const [nome, grupo] of EXERCICIOS_PADRAO) {
    const { lastId } = await db.run(
      'INSERT INTO exercicios (nome, grupo_muscular, imagem_url, padrao) VALUES (?, ?, ?, 1)',
      [nome, grupo, IMAGENS_PADRAO[nome] ?? null],
    );
    ids[nome] = lastId;
  }
  let ordem = 0;
  for (const m of MODELOS) {
    for (const f of m.fichas) {
      const { lastId: modeloId } = await db.run(
        'INSERT INTO modelos_treino (nome, nivel, dias_semana, divisao, ordem) VALUES (?, ?, ?, ?, ?)',
        [f.nome, m.nivel, m.dias, m.divisao, ordem++],
      );
      let i = 0;
      for (const [ex, series, reps] of f.itens) {
        if (!ids[ex]) throw new Error(`Exercício do modelo não existe: ${ex}`);
        await db.run(
          'INSERT INTO modelo_itens (modelo_id, exercicio_id, ordem, series, repeticoes) VALUES (?, ?, ?, ?, ?)',
          [modeloId, ids[ex], i++, series, reps],
        );
      }
    }
  }
  await db.run('INSERT OR IGNORE INTO perfil (id) VALUES (1)');
}
