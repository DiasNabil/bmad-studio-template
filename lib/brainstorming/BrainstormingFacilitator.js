const chalk = require('chalk');
const inquirer = require('inquirer');

class BrainstormingFacilitator {
  constructor() {
    this.sessionData = {
      topic: '',
      constraints: '',
      goal: '',
      documentOutput: true,
      techniques: [],
      ideas: [],
      insights: [],
      startTime: null,
      endTime: null
    };

    this.techniques = this.loadBrainstormingTechniques();
    this.currentPhase = 'setup';
  }

  loadBrainstormingTechniques() {
    return {
      creative_expansion: [
        {
          id: 'what_if_scenarios',
          name: 'What If Scenarios',
          description: 'Ask provocative questions to explore possibilities',
          duration: '10-15 min',
          execution: this.executeWhatIfScenarios.bind(this)
        },
        {
          id: 'analogical_thinking',
          name: 'Analogical Thinking',
          description: 'Find analogies to spark new perspectives',
          duration: '10-15 min',
          execution: this.executeAnalogicalThinking.bind(this)
        },
        {
          id: 'reversal_inversion',
          name: 'Reversal/Inversion',
          description: 'Explore the opposite to find new solutions',
          duration: '10-15 min',
          execution: this.executeReversalInversion.bind(this)
        },
        {
          id: 'first_principles',
          name: 'First Principles Thinking',
          description: 'Break down to fundamentals and rebuild',
          duration: '15-20 min',
          execution: this.executeFirstPrinciples.bind(this)
        }
      ],
      structured_frameworks: [
        {
          id: 'scamper',
          name: 'SCAMPER Method',
          description: 'Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse',
          duration: '20-25 min',
          execution: this.executeSCAMPER.bind(this)
        },
        {
          id: 'six_thinking_hats',
          name: 'Six Thinking Hats',
          description: 'Explore from different thinking perspectives',
          duration: '20-30 min',
          execution: this.executeSixThinkingHats.bind(this)
        },
        {
          id: 'mind_mapping',
          name: 'Mind Mapping',
          description: 'Visual brainstorming from central concept',
          duration: '15-25 min',
          execution: this.executeMindMapping.bind(this)
        }
      ],
      collaborative: [
        {
          id: 'yes_and_building',
          name: '"Yes, And..." Building',
          description: 'Build ideas collaboratively without judgment',
          duration: '10-20 min',
          execution: this.executeYesAndBuilding.bind(this)
        },
        {
          id: 'brainwriting',
          name: 'Brainwriting/Round Robin',
          description: 'Written idea exchange and building',
          duration: '15-20 min',
          execution: this.executeBrainwriting.bind(this)
        },
        {
          id: 'random_stimulation',
          name: 'Random Stimulation',
          description: 'Use random prompts to trigger new connections',
          duration: '10-15 min',
          execution: this.executeRandomStimulation.bind(this)
        }
      ],
      deep_exploration: [
        {
          id: 'five_whys',
          name: 'Five Whys',
          description: 'Dig deep into root causes and motivations',
          duration: '10-15 min',
          execution: this.executeFiveWhys.bind(this)
        },
        {
          id: 'morphological_analysis',
          name: 'Morphological Analysis',
          description: 'Systematic exploration of solution parameters',
          duration: '20-30 min',
          execution: this.executeMorphologicalAnalysis.bind(this)
        }
      ]
    };
  }

  async facilitateProjectBrainstorming() {
    console.log(chalk.cyan('\n🧠 Session de Brainstorming BMAD Studio\n'));
    console.log('Je vais vous guider dans une session de brainstorming structurée pour');
    console.log('clarifier votre vision projet et générer les idées nécessaires au PRD.\n');

    // Step 1: Session Setup avec questions projet-focus
    await this.setupProjectSession();

    // Step 2: Present approach options
    await this.presentApproachOptions();

    // Step 3: Execute brainstorming techniques
    await this.executeBrainstormingFlow();

    // Step 4: Synthesis and convergence
    const projectInsights = await this.synthesizeProjectInsights();

    // Step 5: Generate project brief
    const projectBrief = this.generateProjectBrief(projectInsights);

    return projectBrief;
  }

  async setupProjectSession() {
    console.log(chalk.yellow('📋 Configuration de la session\n'));

    const setupQuestions = [
      {
        type: 'input',
        name: 'projectTopic',
        message: '🎯 Quel est votre projet ? (décrivez en quelques mots)',
        validate: input => input.length > 0 || 'Veuillez décrire votre projet'
      },
      {
        type: 'input',
        name: 'constraints',
        message: '⚠️  Avez-vous des contraintes spécifiques ? (budget, délais, techno, etc.)',
        default: 'Aucune contrainte particulière'
      },
      {
        type: 'list',
        name: 'goal',
        message: '🎪 Objectif de la session :',
        choices: [
          { name: '🌊 Exploration large - générer un maximum d\'idées', value: 'broad' },
          { name: '🎯 Idéation focalisée - approfondir des aspects précis', value: 'focused' },
          { name: '🔍 Clarification - mieux définir le besoin et la solution', value: 'clarification' },
          { name: '🚀 Innovation - trouver des approches disruptives', value: 'innovation' }
        ]
      },
      {
        type: 'input',
        name: 'timeAvailable',
        message: '⏰ Combien de temps avez-vous pour cette session ? (en minutes)',
        default: '45',
        validate: input => !isNaN(parseInt(input)) || 'Veuillez entrer un nombre'
      },
      {
        type: 'confirm',
        name: 'documentOutput',
        message: '📝 Souhaitez-vous un document structuré de résultats ?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(setupQuestions);

    this.sessionData = {
      ...this.sessionData,
      topic: answers.projectTopic,
      constraints: answers.constraints,
      goal: answers.goal,
      timeAvailable: parseInt(answers.timeAvailable),
      documentOutput: answers.documentOutput,
      startTime: new Date()
    };

    console.log(chalk.green('\n✅ Session configurée !'));
    console.log(`📌 Projet: ${this.sessionData.topic}`);
    console.log(`🎯 Objectif: ${this.getGoalDescription(this.sessionData.goal)}`);
    console.log(`⏱️  Durée: ${this.sessionData.timeAvailable} minutes\n`);
  }

  getGoalDescription(goal) {
    const descriptions = {
      'broad': 'Exploration large',
      'focused': 'Idéation focalisée',
      'clarification': 'Clarification',
      'innovation': 'Innovation'
    };
    return descriptions[goal] || goal;
  }

  async presentApproachOptions() {
    console.log(chalk.cyan('🛤️  Choisissez votre approche de brainstorming:\n'));

    const approachQuestion = {
      type: 'list',
      name: 'approach',
      message: 'Comment souhaitez-vous procéder ?',
      choices: [
        {
          name: '🎯 Je choisis des techniques spécifiques',
          value: 'user_select',
          short: 'Sélection manuelle'
        },
        {
          name: '🤖 Recommandations basées sur mon contexte',
          value: 'ai_recommend',
          short: 'Recommandations IA'
        },
        {
          name: '🎲 Sélection aléatoire pour la créativité',
          value: 'random',
          short: 'Aléatoire'
        },
        {
          name: '🌊 Flux progressif (large → focalisé)',
          value: 'progressive',
          short: 'Progressif'
        }
      ]
    };

    const { approach } = await inquirer.prompt([approachQuestion]);
    this.sessionData.approach = approach;

    console.log(chalk.green(`\n✨ Approche sélectionnée: ${this.getApproachDescription(approach)}\n`));
  }

  getApproachDescription(approach) {
    const descriptions = {
      'user_select': 'Sélection manuelle des techniques',
      'ai_recommend': 'Recommandations intelligentes',
      'random': 'Sélection créative aléatoire',
      'progressive': 'Flux progressif structuré'
    };
    return descriptions[approach] || approach;
  }

  async executeBrainstormingFlow() {
    this.currentPhase = 'divergent';

    switch (this.sessionData.approach) {
    case 'user_select':
      await this.executeUserSelectedTechniques();
      break;
    case 'ai_recommend':
      await this.executeRecommendedTechniques();
      break;
    case 'random':
      await this.executeRandomTechniques();
      break;
    case 'progressive':
      await this.executeProgressiveFlow();
      break;
    }
  }

  async executeUserSelectedTechniques() {
    const allTechniques = this.getAllTechniques();

    const techniqueChoices = allTechniques.map((tech, _index) => ({
      name: `${tech.name} - ${tech.description} (${tech.duration})`,
      value: tech,
      short: tech.name
    }));

    let continueBrainstorming = true;
    while (continueBrainstorming) {
      const { selectedTechnique } = await inquirer.prompt([{
        type: 'list',
        name: 'selectedTechnique',
        message: '🎨 Choisissez une technique de brainstorming:',
        choices: [
          ...techniqueChoices,
          new inquirer.Separator(),
          { name: '🏁 Terminer et passer à la synthèse', value: 'finish' }
        ]
      }]);

      if (selectedTechnique === 'finish') {
        continueBrainstorming = false;
        break;
      }

      await this.executeTechnique(selectedTechnique);

      const { continueSession } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueSession',
        message: 'Voulez-vous essayer une autre technique ?',
        default: true
      }]);

      if (!continueSession) {
        continueBrainstorming = false;
        break;
      }
    }
  }

  async executeRecommendedTechniques() {
    const recommendedTechniques = this.getRecommendedTechniques();

    console.log(chalk.cyan('🤖 Techniques recommandées basées sur votre contexte:\n'));

    for (const technique of recommendedTechniques) {
      console.log(chalk.yellow(`\n🎯 Technique recommandée: ${technique.name}`));
      console.log(`📝 ${technique.description}`);
      console.log(`⏱️  Durée estimée: ${technique.duration}\n`);

      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Voulez-vous essayer cette technique ?',
        default: true
      }]);

      if (proceed) {
        await this.executeTechnique(technique);
      }

      const { continueRecommended } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continueRecommended',
        message: 'Continuer avec les autres recommandations ?',
        default: true
      }]);

      if (!continueRecommended) break;
    }
  }

  getRecommendedTechniques() {
    const { goal, timeAvailable } = this.sessionData;
    // const allTechniques = this.getAllTechniques();

    // Logique de recommandation basée sur le contexte
    let recommended = [];

    if (goal === 'broad') {
      recommended = [
        this.findTechnique('mind_mapping'),
        this.findTechnique('what_if_scenarios'),
        this.findTechnique('random_stimulation')
      ];
    } else if (goal === 'focused') {
      recommended = [
        this.findTechnique('five_whys'),
        this.findTechnique('scamper'),
        this.findTechnique('morphological_analysis')
      ];
    } else if (goal === 'clarification') {
      recommended = [
        this.findTechnique('first_principles'),
        this.findTechnique('five_whys'),
        this.findTechnique('six_thinking_hats')
      ];
    } else if (goal === 'innovation') {
      recommended = [
        this.findTechnique('reversal_inversion'),
        this.findTechnique('analogical_thinking'),
        this.findTechnique('random_stimulation')
      ];
    }

    // Filtrer selon le temps disponible
    if (timeAvailable < 30) {
      recommended = recommended.filter(t => t && this.getTechniqueDuration(t) <= 15);
    }

    return recommended.filter(t => t !== null).slice(0, 3);
  }

  findTechnique(id) {
    const allTechniques = this.getAllTechniques();
    return allTechniques.find(t => t.id === id) || null;
  }

  getTechniqueDuration(technique) {
    const match = technique.duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 15;
  }

  async executeProgressiveFlow() {
    console.log(chalk.cyan('🌊 Flux progressif: Exploration → Focalisation → Synthèse\n'));

    // Phase 1: Warm-up (5-10 min)
    console.log(chalk.yellow('🔥 Phase 1: Échauffement créatif'));
    await this.executeTechnique(this.findTechnique('mind_mapping'));

    // Phase 2: Divergent (20-30 min)
    console.log(chalk.yellow('\n🌟 Phase 2: Génération d\'idées'));
    await this.executeTechnique(this.findTechnique('what_if_scenarios'));
    await this.executeTechnique(this.findTechnique('yes_and_building'));

    // Phase 3: Convergent (15-20 min)
    console.log(chalk.yellow('\n🎯 Phase 3: Focalisation et approfondissement'));
    await this.executeTechnique(this.findTechnique('five_whys'));

    // Phase 4: Synthesis (10-15 min) - handled in synthesizeProjectInsights
    console.log(chalk.yellow('\n🔬 Phase 4: Synthèse (à venir)'));
  }

  async executeTechnique(technique) {
    if (!technique || !technique.execution) {
      console.log(chalk.red('❌ Technique non disponible'));
      return;
    }

    console.log(chalk.green(`\n🎨 === ${technique.name.toUpperCase()} ===`));
    console.log(`📝 ${technique.description}`);
    console.log(`⏱️  Durée: ${technique.duration}\n`);

    const techniqueResults = await technique.execution();

    // Stocker les résultats
    this.sessionData.techniques.push({
      name: technique.name,
      id: technique.id,
      duration: technique.duration,
      results: techniqueResults,
      timestamp: new Date()
    });

    console.log(chalk.green(`\n✅ ${technique.name} terminé !`));

    // Pause entre les techniques
    if (this.sessionData.techniques.length > 1) {
      await this.shortBreak();
    }
  }

  async shortBreak() {
    console.log(chalk.blue('\n⏸️  Petite pause...'));
    const { ready } = await inquirer.prompt([{
      type: 'confirm',
      name: 'ready',
      message: 'Prêt(e) à continuer ?',
      default: true
    }]);

    if (ready) {
      console.log(chalk.green('🚀 C\'est reparti !\n'));
    }
  }

  // Implémentation des techniques de brainstorming
  async executeWhatIfScenarios() {
    const scenarios = [];

    console.log('💭 Explorons des scénarios "Et si..." pour votre projet.\n');

    const questions = [
      `Et si vous aviez un budget illimité pour ${this.sessionData.topic} ?`,
      'Et si votre projet devait être lancé demain ?',
      'Et si vos utilisateurs étaient complètement différents ?',
      'Et si la technologie n\'était pas une contrainte ?',
      'Et si vous deviez faire le contraire de ce qui est habituel ?'
    ];

    for (let i = 0; i < Math.min(3, questions.length); i++) {
      const { scenario } = await inquirer.prompt([{
        type: 'input',
        name: 'scenario',
        message: `🤔 ${questions[i]}`,
        validate: input => input.length > 0 || 'Partagez votre réflexion'
      }]);

      scenarios.push({
        question: questions[i],
        response: scenario
      });

      // Creusons un peu plus
      if (scenario.length > 10) {
        const { deeper } = await inquirer.prompt([{
          type: 'input',
          name: 'deeper',
          message: '🔍 Qu\'est-ce que cela révèle sur votre projet ?',
          default: 'Passons au suivant'
        }]);

        if (deeper !== 'Passons au suivant') {
          scenarios[scenarios.length - 1].insight = deeper;
        }
      }
    }

    return { scenarios };
  }

  async executeFirstPrinciples() {
    console.log('🧱 Décomposons votre projet en principes fondamentaux.\n');

    const { fundamentals } = await inquirer.prompt([{
      type: 'input',
      name: 'fundamentals',
      message: `🔬 Quels sont les éléments absolument essentiels de ${this.sessionData.topic} ?`,
      validate: input => input.length > 0 || 'Identifiez les fondamentaux'
    }]);

    const { assumptions } = await inquirer.prompt([{
      type: 'input',
      name: 'assumptions',
      message: '🤔 Quelles sont vos hypothèses sur ce projet ? (que tenez-vous pour acquis ?)'
    }]);

    const { rebuild } = await inquirer.prompt([{
      type: 'input',
      name: 'rebuild',
      message: '🏗️  Si vous repartiez de zéro avec ces fondamentaux, que feriez-vous différemment ?'
    }]);

    return {
      fundamentals,
      assumptions,
      rebuild
    };
  }

  async executeMindMapping() {
    console.log('🗺️  Créons une carte mentale de votre projet.\n');

    const branches = [];
    const { centralConcept } = await inquirer.prompt([{
      type: 'input',
      name: 'centralConcept',
      message: '🎯 Quel est le concept central de votre projet ?',
      default: this.sessionData.topic
    }]);

    console.log(`\n📍 Concept central: "${centralConcept}"\n`);

    const branchPrompts = [
      'Qui sont les utilisateurs/bénéficiaires ?',
      'Quelles sont les fonctionnalités principales ?',
      'Quels sont les défis à relever ?',
      'Quelles sont les opportunités ?',
      'Quels sont les moyens/ressources nécessaires ?'
    ];

    for (const prompt of branchPrompts) {
      const { branch } = await inquirer.prompt([{
        type: 'input',
        name: 'branch',
        message: `🌿 ${prompt}`,
        default: 'Passer'
      }]);

      if (branch !== 'Passer') {
        branches.push({
          prompt,
          content: branch
        });
      }
    }

    return {
      centralConcept,
      branches
    };
  }

  async executeFiveWhys() {
    console.log('❓ Explorons en profondeur avec la méthode des 5 Pourquoi.\n');

    const { initialWhy } = await inquirer.prompt([{
      type: 'input',
      name: 'initialWhy',
      message: `🎯 Pourquoi voulez-vous réaliser ${this.sessionData.topic} ?`,
      validate: input => input.length > 0 || 'Expliquez votre motivation'
    }]);

    const whys = [{ level: 1, question: 'Pourquoi ce projet ?', answer: initialWhy }];
    let currentAnswer = initialWhy;

    for (let i = 2; i <= 5; i++) {
      const { nextWhy } = await inquirer.prompt([{
        type: 'input',
        name: 'nextWhy',
        message: `🔍 Pourquoi ${currentAnswer.toLowerCase()} ?`,
        default: 'C\'est suffisant'
      }]);

      if (nextWhy === 'C\'est suffisant' || nextWhy.length < 5) {
        break;
      }

      whys.push({
        level: i,
        question: `Pourquoi ${currentAnswer.toLowerCase()} ?`,
        answer: nextWhy
      });

      currentAnswer = nextWhy;
    }

    const { rootCause } = await inquirer.prompt([{
      type: 'input',
      name: 'rootCause',
      message: '💡 Quel besoin/problème fondamental avez-vous identifié ?'
    }]);

    return {
      whys,
      rootCause
    };
  }

  async executeYesAndBuilding() {
    console.log('✨ Construction collaborative d\'idées avec "Oui, et..."\n');

    const { initialIdea } = await inquirer.prompt([{
      type: 'input',
      name: 'initialIdea',
      message: '💡 Proposez une première idée pour votre projet:',
      validate: input => input.length > 0 || 'Partagez une idée'
    }]);

    const buildingChain = [{ role: 'user', idea: initialIdea }];

    console.log(`\n🔗 Votre idée: "${initialIdea}"`);

    for (let i = 0; i < 3; i++) {
      // L'IA construit sur l'idée précédente
      const lastIdea = buildingChain[buildingChain.length - 1].idea;
      const aiBuild = this.generateYesAndResponse(lastIdea);
      buildingChain.push({ role: 'ai', idea: aiBuild });

      console.log(`\n✅ Oui, et... ${aiBuild}`);

      // L'utilisateur construit à son tour
      const { userBuild } = await inquirer.prompt([{
        type: 'input',
        name: 'userBuild',
        message: '✨ Oui, et vous ajouteriez quoi ?',
        default: 'Parfait comme ça'
      }]);

      if (userBuild === 'Parfait comme ça' || userBuild.length < 5) {
        break;
      }

      buildingChain.push({ role: 'user', idea: userBuild });
      console.log(`\n🚀 Génial ! "${userBuild}"`);
    }

    return { buildingChain };
  }

  async executeAnalogicalThinking() {
    console.log('🔗 Pensée analogique: Trouvons des parallèles inspirants\n');

    const { domain } = await inquirer.prompt([{
      type: 'input',
      name: 'domain',
      message: '🌍 Quel domaine/secteur admirez-vous pour son innovation ?',
      default: 'Nature, sport, divertissement, médecine, etc.'
    }]);

    const analogies = [];

    for (let i = 0; i < 2; i++) {
      const { analogy } = await inquirer.prompt([{
        type: 'input',
        name: 'analogy',
        message: `🔍 Comment ${domain} résout-il des problèmes similaires au vôtre ?`,
        validate: input => input.length > 0 || 'Partagez une analogie'
      }]);

      const { application } = await inquirer.prompt([{
        type: 'input',
        name: 'application',
        message: '⚡ Comment adapter cette approche à votre projet ?'
      }]);

      analogies.push({ domain, analogy, application });
    }

    return { analogies };
  }

  async executeReversalInversion() {
    console.log('🔄 Inversion/Renversement: Explorons le contraire\n');

    const { currentApproach } = await inquirer.prompt([{
      type: 'input',
      name: 'currentApproach',
      message: '📝 Décrivez votre approche actuelle en une phrase:',
      validate: input => input.length > 0 || 'Décrivez votre approche'
    }]);

    const { reversal } = await inquirer.prompt([{
      type: 'input',
      name: 'reversal',
      message: '🔄 Et si vous faisiez exactement le contraire ?'
    }]);

    const { insights } = await inquirer.prompt([{
      type: 'input',
      name: 'insights',
      message: '💡 Qu\'est-ce que cette inversion révèle ?'
    }]);

    return { currentApproach, reversal, insights };
  }

  async executeSCAMPER() {
    console.log('⚡ Méthode SCAMPER: Transformation systématique\n');

    const scamperActions = [
      { letter: 'S', action: 'Substituer', question: 'Que pourriez-vous remplacer ou substituer ?' },
      { letter: 'C', action: 'Combiner', question: 'Que pourriez-vous combiner avec autre chose ?' },
      { letter: 'A', action: 'Adapter', question: 'Que pourriez-vous adapter ou ajuster ?' },
      { letter: 'M', action: 'Modifier', question: 'Que pourriez-vous modifier ou magnifier ?' }
    ];

    const results = [];

    for (const item of scamperActions.slice(0, 3)) {
      console.log(`\n${item.letter} - ${item.action}`);
      const { response } = await inquirer.prompt([{
        type: 'input',
        name: 'response',
        message: `🎯 ${item.question}`,
        default: 'Passer à la suivante'
      }]);

      if (response !== 'Passer à la suivante') {
        results.push({ action: item.action, response });
      }
    }

    return { scamperResults: results };
  }

  async executeSixThinkingHats() {
    console.log('🎩 Six chapeaux de Bono: Perspectives multiples\n');

    const hats = [
      { color: 'Blanc', focus: 'Faits', question: '📊 Quels sont les faits objectifs ?' },
      { color: 'Rouge', focus: 'Émotions', question: '❤️ Que ressentez-vous intuitivement ?' },
      { color: 'Vert', focus: 'Créativité', question: '💚 Quelles sont vos idées créatives ?' }
    ];

    const perspectives = [];

    for (const hat of hats) {
      console.log(`\n🎩 Chapeau ${hat.color} - ${hat.focus}`);
      const { response } = await inquirer.prompt([{
        type: 'input',
        name: 'response',
        message: hat.question
      }]);

      perspectives.push({ hat: hat.color, focus: hat.focus, response });
    }

    return { perspectives };
  }

  async executeBrainwriting() {
    console.log('✍️ Brainwriting: Génération silencieuse d\'idées\n');

    const { topic } = await inquirer.prompt([{
      type: 'input',
      name: 'topic',
      message: '🎯 Sur quel aspect spécifique concentrer le brainwriting ?',
      default: this.sessionData.topic
    }]);

    const ideas = [];

    for (let round = 1; round <= 3; round++) {
      console.log(`\n📝 Round ${round}/3`);
      const { idea } = await inquirer.prompt([{
        type: 'input',
        name: 'idea',
        message: `💡 Idée ${round} pour "${topic}":`,
        validate: input => input.length > 0 || 'Notez une idée'
      }]);

      ideas.push({ round, idea });
    }

    return { topic, ideas };
  }

  async executeRandomStimulation() {
    console.log('🎲 Stimulation aléatoire: Inspiration inattendue\n');

    const randomStimuli = [
      'océan', 'horloge', 'miroir', 'pont', 'clé', 'livre', 'arbre', 'étoile',
      'montagne', 'rivière', 'feu', 'nuage', 'diamant', 'labyrinthe'
    ];

    const stimulus = randomStimuli[Math.floor(Math.random() * randomStimuli.length)];

    console.log(`🎯 Votre stimulus aléatoire: "${stimulus}"\n`);

    const { connection } = await inquirer.prompt([{
      type: 'input',
      name: 'connection',
      message: `🔗 Quel lien voyez-vous entre "${stimulus}" et votre projet ?`
    }]);

    const { insight } = await inquirer.prompt([{
      type: 'input',
      name: 'insight',
      message: '💡 Quelle idée ou insight cela vous donne-t-il ?'
    }]);

    return { stimulus, connection, insight };
  }

  async executeMorphologicalAnalysis() {
    console.log('🔧 Analyse morphologique: Décomposition systématique\n');

    const parameters = [];

    for (let i = 0; i < 3; i++) {
      const { parameter } = await inquirer.prompt([{
        type: 'input',
        name: 'parameter',
        message: `📊 Paramètre ${i + 1} de votre projet (ex: interface, modèle économique):`,
        validate: input => input.length > 0 || 'Nommez un paramètre'
      }]);

      const { options } = await inquirer.prompt([{
        type: 'input',
        name: 'options',
        message: `⚙️ Options possibles pour "${parameter}" (séparez par des virgules):`,
        validate: input => input.length > 0 || 'Listez des options'
      }]);

      parameters.push({
        name: parameter,
        options: options.split(',').map(opt => opt.trim())
      });
    }

    const { combination } = await inquirer.prompt([{
      type: 'input',
      name: 'combination',
      message: '🔄 Quelle combinaison innovante vous inspire ?'
    }]);

    return { parameters, combination };
  }

  generateYesAndResponse(_previousIdea) {
    const responses = [
      'on pourrait aussi intégrer un système de personnalisation avancé',
      'cela permettrait d\'ajouter une dimension communautaire',
      'on pourrait automatiser certains aspects avec de l\'IA',
      'cela ouvre la possibilité d\'une version mobile dédiée',
      'on pourrait y ajouter des analytics en temps réel',
      'cela permettrait d\'intégrer des fonctionnalités collaboratives'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  async synthesizeProjectInsights() {
    this.currentPhase = 'convergent';
    this.sessionData.endTime = new Date();

    console.log(chalk.cyan('\n🔬 === SYNTHÈSE DES INSIGHTS PROJET ===\n'));

    // Compiler toutes les idées générées
    const allIdeas = [];
    const allInsights = [];

    this.sessionData.techniques.forEach(technique => {
      if (technique.results) {
        this.extractIdeasFromResults(technique.results, allIdeas, allInsights);
      }
    });

    console.log(`💡 ${allIdeas.length} idées générées au total`);
    console.log(`🔍 ${allInsights.length} insights identifiés\n`);

    // Catégorisation interactive
    const categories = await this.categorizeIdeas(allIdeas);

    // Priorités
    const priorities = await this.identifyPriorities(categories);

    // Vision clarifiée
    const clarifiedVision = await this.clarifyProjectVision();

    return {
      allIdeas,
      allInsights,
      categories,
      priorities,
      clarifiedVision,
      sessionSummary: this.generateSessionSummary()
    };
  }

  extractIdeasFromResults(results, allIdeas, allInsights) {
    // Extraction intelligente selon le type de résultats
    if (results.scenarios) {
      results.scenarios.forEach(scenario => {
        allIdeas.push(scenario.response);
        if (scenario.insight) {
          allInsights.push(scenario.insight);
        }
      });
    }

    if (results.branches) {
      results.branches.forEach(branch => {
        allIdeas.push(branch.content);
      });
    }

    if (results.buildingChain) {
      results.buildingChain.forEach(item => {
        allIdeas.push(item.idea);
      });
    }

    if (results.whys) {
      results.whys.forEach(why => {
        allInsights.push(why.answer);
      });
      if (results.rootCause) {
        allInsights.push(results.rootCause);
      }
    }

    if (results.fundamentals) {
      allInsights.push(results.fundamentals);
    }
  }

  async categorizeIdeas(allIdeas) {
    console.log(chalk.yellow('📂 Catégorisation des idées\n'));

    const categories = {
      immediate: [],
      future: [],
      moonshots: [],
      insights: []
    };

    // Présenter les idées pour catégorisation
    for (const idea of allIdeas.slice(0, 10)) { // Limiter pour éviter la fatigue
      console.log(`💡 Idée: "${idea}"`);

      const { category } = await inquirer.prompt([{
        type: 'list',
        name: 'category',
        message: 'Comment classeriez-vous cette idée ?',
        choices: [
          { name: '🚀 Opportunité immédiate - à implémenter maintenant', value: 'immediate' },
          { name: '🔮 Innovation future - nécessite développement', value: 'future' },
          { name: '🌙 Moonshot - ambitieux et transformateur', value: 'moonshots' },
          { name: '💡 Insight - apprentissage clé', value: 'insights' },
          { name: '⏭️  Passer', value: 'skip' }
        ]
      }]);

      if (category !== 'skip') {
        categories[category].push(idea);
      }
    }

    return categories;
  }

  async identifyPriorities(categories) {
    console.log(chalk.yellow('\n🎯 Identification des priorités\n'));

    const allActionableIdeas = [...categories.immediate, ...categories.future];

    if (allActionableIdeas.length === 0) {
      return { top3: [], rationale: 'Aucune idée actionnable identifiée' };
    }

    const priorityChoices = allActionableIdeas.slice(0, 8).map((idea, _index) => ({
      name: `${idea.substring(0, 60)}${idea.length > 60 ? '...' : ''}`,
      value: idea
    }));

    const { top3 } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'top3',
      message: 'Sélectionnez vos 3 priorités principales:',
      choices: priorityChoices,
      validate: input => input.length > 0 && input.length <= 3 || 'Sélectionnez 1 à 3 priorités'
    }]);

    const { rationale } = await inquirer.prompt([{
      type: 'input',
      name: 'rationale',
      message: '📝 Pourquoi ces priorités ? (rationale)',
      default: 'Alignement avec les objectifs projet'
    }]);

    return { top3, rationale };
  }

  async clarifyProjectVision() {
    console.log(chalk.yellow('\n🎯 Clarification de la vision projet\n'));

    const visionQuestions = [
      {
        type: 'input',
        name: 'coreValue',
        message: '💎 Quelle est la valeur fondamentale que votre projet apporte ?'
      },
      {
        type: 'input',
        name: 'targetUser',
        message: '👥 Qui est votre utilisateur idéal après cette session ?'
      },
      {
        type: 'input',
        name: 'keyDifferentiator',
        message: '⭐ Qu\'est-ce qui rend votre projet unique ?'
      },
      {
        type: 'input',
        name: 'successMetric',
        message: '📊 Comment saurez-vous que votre projet est un succès ?'
      }
    ];

    return await inquirer.prompt(visionQuestions);
  }

  generateSessionSummary() {
    const duration = this.sessionData.endTime - this.sessionData.startTime;
    const durationMinutes = Math.round(duration / (1000 * 60));

    return {
      duration: `${durationMinutes} minutes`,
      techniquesUsed: this.sessionData.techniques.length,
      totalIdeas: this.sessionData.ideas.length,
      approach: this.sessionData.approach,
      goal: this.sessionData.goal
    };
  }

  generateProjectBrief(insights) {
    // Transformer les insights de brainstorming en brief projet structuré
    return {
      projectName: this.sessionData.topic,
      vision: insights.clarifiedVision?.coreValue || 'Vision à définir',
      targetUsers: insights.clarifiedVision?.targetUser || 'Utilisateurs à identifier',
      valueProposition: insights.clarifiedVision?.keyDifferentiator || 'Valeur unique',
      successCriteria: insights.clarifiedVision?.successMetric || 'Métriques de succès',

      // Idées catégorisées
      immediateOpportunities: insights.categories.immediate,
      futureInnovations: insights.categories.future,
      moonshots: insights.categories.moonshots,
      keyInsights: insights.categories.insights,

      // Priorités
      topPriorities: insights.priorities.top3,
      priorityRationale: insights.priorities.rationale,

      // Métadonnées de session
      brainstormingSession: {
        ...insights.sessionSummary,
        techniques: this.sessionData.techniques.map(t => ({
          name: t.name,
          id: t.id,
          duration: t.duration
        })),
        constraints: this.sessionData.constraints,
        timeInvested: insights.sessionSummary.duration
      },

      // Pour le système de génération PRD
      projectComplexity: this.inferComplexity(insights),
      projectTypes: this.inferProjectTypes(insights),
      stakeholders: this.inferStakeholders(insights),
      technicalPreferences: this.inferTechPreferences(insights),
      timeline: this.inferTimeline(insights)
    };
  }

  inferComplexity(insights) {
    const { moonshots, future, immediate } = insights.categories;

    if (moonshots.length > 2) return 'very-complex';
    if (future.length > immediate.length) return 'complex';
    if (immediate.length > 3) return 'moderate';
    return 'simple';
  }

  inferProjectTypes(insights) {
    const allText = JSON.stringify(insights).toLowerCase();
    const types = [];

    if (allText.includes('web') || allText.includes('site') || allText.includes('application')) {
      types.push('web-app');
    }
    if (allText.includes('mobile') || allText.includes('app') || allText.includes('smartphone')) {
      types.push('mobile-app');
    }
    if (allText.includes('commerce') || allText.includes('vente') || allText.includes('marketplace')) {
      types.push('ecommerce');
    }
    if (allText.includes('enterprise') || allText.includes('entreprise') || allText.includes('business')) {
      types.push('enterprise');
    }
    if (allText.includes('ai') || allText.includes('intelligence') || allText.includes('machine learning')) {
      types.push('ai-ml');
    }

    return types.length > 0 ? types : ['web-app'];
  }

  inferStakeholders(insights) {
    const stakeholders = ['end-users'];

    const allText = JSON.stringify(insights).toLowerCase();

    if (allText.includes('design') || allText.includes('interface') || allText.includes('expérience')) {
      stakeholders.push('design-team');
    }
    if (allText.includes('business') || allText.includes('commercial') || allText.includes('vente')) {
      stakeholders.push('business');
    }
    if (allText.includes('développ') || allText.includes('technique') || allText.includes('code')) {
      stakeholders.push('dev-team');
    }

    return stakeholders;
  }

  inferTechPreferences(insights) {
    const allText = JSON.stringify(insights).toLowerCase();
    const preferences = [];

    if (allText.includes('react')) preferences.push('react');
    if (allText.includes('vue')) preferences.push('vue');
    if (allText.includes('angular')) preferences.push('angular');
    if (allText.includes('node')) preferences.push('nodejs');
    if (allText.includes('python')) preferences.push('python');
    if (allText.includes('typescript')) preferences.push('typescript');

    return preferences;
  }

  inferTimeline(insights) {
    const { immediate, future, moonshots } = insights.categories;

    if (moonshots.length > 2) return 'long-term';
    if (future.length > immediate.length * 2) return 'medium';
    if (immediate.length > 5) return 'mvp';
    return 'sprint';
  }

  getAllTechniques() {
    const all = [];
    Object.values(this.techniques).forEach(category => {
      all.push(...category);
    });
    return all;
  }
}

module.exports = { BrainstormingFacilitator };
