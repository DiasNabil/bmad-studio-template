const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const inquirer = require('inquirer');

const { BrainstormingFacilitator } = require('../brainstorming/BrainstormingFacilitator');
const { BriefAnalyzer } = require('../analyzers/BriefAnalyzer');
const { PRDGenerator } = require('../generators/PRDGenerator');
const { AgentConfigurator } = require('../configurators/AgentConfigurator');
const { DynamicAgentConfigurator } = require('./DynamicAgentConfigurator');
const { WorkflowGenerator } = require('../generators/WorkflowGenerator');

class IntegratedInitializer {
  constructor(options = {}) {
    this.options = {
      projectName: options.projectName || '',
      interactive: options.interactive !== false,
      skipBrainstorming: options.skipBrainstorming || false,
      briefFile: options.briefFile || null,
      outputPath: options.outputPath || process.cwd(),
      ...options
    };

    this.brainstormingFacilitator = new BrainstormingFacilitator();
    this.briefAnalyzer = new BriefAnalyzer();
    this.prdGenerator = new PRDGenerator();
    this.agentConfigurator = new AgentConfigurator();
    this.dynamicAgentConfigurator = new DynamicAgentConfigurator();
    this.workflowGenerator = new WorkflowGenerator();

    this.projectData = {
      name: '',
      brief: null,
      analysis: null,
      prd: null,
      architecture: null,
      agentConfig: null,
      workflows: null,
      mcpConfig: null
    };
  }

  async initialize() {
    try {
      await this.displayWelcome();

      // Phase 1: Collecte des informations projet
      await this.collectProjectInfo();

      // Phase 2: Brainstorming interactif (si souhaité)
      if (!this.options.skipBrainstorming && this.options.interactive) {
        await this.conductBrainstormingSession();
      }

      // Phase 3: Analyse et génération PRD/Architecture
      await this.generateProjectDocuments();

      // Phase 4: Configuration agents et workflows
      await this.configureProjectInfrastructure();

      // Phase 5: Initialisation structure projet
      await this.initializeProjectStructure();

      // Phase 6: Finalisation et documentation
      await this.finalizeProject();

      this.displaySuccess();

      return this.projectData;

    } catch (error) {
      console.error(chalk.red(`\n❌ Erreur d'initialisation: ${error.message}`));
      throw error;
    }
  }

  async displayWelcome() {
    console.clear();

    const logo = `
██████╗ ███╗   ███╗ █████╗ ██████╗     ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗ 
██╔══██╗████╗ ████║██╔══██╗██╔══██╗    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
██████╔╝██╔████╔██║███████║██║  ██║    ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
██╔══██╗██║╚██╔╝██║██╔══██║██║  ██║    ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝     ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝
    `;

    console.log(chalk.cyan(logo));
    console.log(chalk.yellow('🚀 Initialisation Intelligente de Projet BMAD Studio\n'));
    console.log(chalk.blue('Ce processus intégré vous guide de la vision à l\'implémentation :'));
    console.log('  💭 Brainstorming structuré (optionnel)');
    console.log('  📋 Génération automatique PRD et Architecture');
    console.log('  🤖 Configuration optimisée des agents');
    console.log('  ⚙️  Setup complet MCP et workflows\n');
  }

  async collectProjectInfo() {
    console.log(chalk.cyan('📋 === COLLECTE D\'INFORMATIONS PROJET ===\n'));

    if (this.options.briefFile) {
      // Charger depuis fichier brief existant
      await this.loadExistingBrief();
    } else {
      // Collecte interactive
      await this.interactiveProjectSetup();
    }
  }

  async loadExistingBrief() {
    const spinner = ora('📄 Chargement du brief existant...').start();

    try {
      const briefContent = await fs.readJSON(this.options.briefFile);
      this.projectData.brief = briefContent;
      this.projectData.name = briefContent.projectName || this.options.projectName;

      spinner.succeed('✅ Brief chargé avec succès');

      console.log(chalk.green(`📌 Projet: ${this.projectData.name}`));
      console.log(chalk.blue(`📝 Brief: ${this.options.briefFile}`));

    } catch (error) {
      spinner.fail('❌ Erreur de chargement du brief');
      throw new Error(`Impossible de charger le brief: ${error.message}`);
    }
  }

  async interactiveProjectSetup() {
    const questions = [
      {
        type: 'input',
        name: 'projectName',
        message: '🎯 Nom de votre projet:',
        default: this.options.projectName,
        validate: input => input.length > 0 || 'Le nom du projet est requis'
      },
      {
        type: 'input',
        name: 'description',
        message: '📝 Description courte du projet:',
        validate: input => input.length > 0 || 'Une description est requise'
      },
      {
        type: 'confirm',
        name: 'wantsBrainstorming',
        message: '💭 Souhaitez-vous une session de brainstorming pour clarifier votre vision ?',
        default: true
      }
    ];

    const answers = await inquirer.prompt(questions);

    this.projectData.name = answers.projectName;
    this.projectData.brief = {
      projectName: answers.projectName,
      description: answers.description,
      createdAt: new Date().toISOString()
    };

    this.options.skipBrainstorming = !answers.wantsBrainstorming;

    console.log(chalk.green('\n✅ Informations projet collectées'));
  }

  async conductBrainstormingSession() {
    console.log(chalk.cyan('\n💭 === SESSION DE BRAINSTORMING STRUCTURÉ ===\n'));

    const spinner = ora('🧠 Préparation de la session de brainstorming...').start();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause dramatique
    spinner.stop();

    console.log(chalk.yellow('🎪 Nous allons maintenant explorer votre projet en profondeur.'));
    console.log('Cette session vous aidera à clarifier votre vision, identifier');
    console.log('les opportunités et structurer vos idées pour le PRD.\n');

    const { proceedWithBrainstorming } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceedWithBrainstorming',
      message: '🚀 Êtes-vous prêt(e) à commencer ?',
      default: true
    }]);

    if (!proceedWithBrainstorming) {
      console.log(chalk.yellow('⏩ Session de brainstorming sautée'));
      return;
    }

    try {
      // Configuration du facilitateur avec données projet existantes
      this.brainstormingFacilitator.sessionData.topic = this.projectData.name;

      // Lancement de la session complète
      const brainstormingResults = await this.brainstormingFacilitator.facilitateProjectBrainstorming();

      // Mise à jour du brief avec les résultats
      this.projectData.brief = {
        ...this.projectData.brief,
        ...brainstormingResults,
        brainstormingCompleted: true,
        brainstormingDate: new Date().toISOString()
      };

      console.log(chalk.green('\n✨ Session de brainstorming terminée avec succès !'));
      console.log(chalk.blue(`💡 ${brainstormingResults.immediateOpportunities?.length || 0} opportunités immédiates identifiées`));
      console.log(chalk.blue(`🔮 ${brainstormingResults.futureInnovations?.length || 0} innovations futures explorées`));
      console.log(chalk.blue(`🌙 ${brainstormingResults.moonshots?.length || 0} moonshots ambitieux`));

    } catch (error) {
      console.error(chalk.red('❌ Erreur lors du brainstorming:', error.message));
      console.log(chalk.yellow('⚠️  Continuant avec les informations déjà collectées...'));
    }
  }

  async generateProjectDocuments() {
    console.log(chalk.cyan('\n📊 === GÉNÉRATION PRD ET ARCHITECTURE ===\n'));

    const spinner = ora('🔬 Analyse du brief projet...').start();

    try {
      // Analyse du brief (enrichi par le brainstorming)
      spinner.text = '🔍 Analyse approfondie du projet...';
      this.projectData.analysis = await this.briefAnalyzer.analyzeBrief(this.projectData.brief);

      spinner.text = '📋 Génération du PRD...';
      this.projectData.prd = await this.prdGenerator.generatePRD(this.projectData.analysis);

      spinner.text = '🏗️ Génération de l\'architecture...';
      this.projectData.architecture = await this.generateArchitecture(this.projectData.analysis);

      spinner.succeed('✅ Documents projet générés');

      console.log(chalk.green('📄 PRD complet généré'));
      console.log(chalk.green('🏗️ Architecture technique définie'));
      console.log(chalk.blue(`🎯 Complexité détectée: ${this.projectData.analysis.complexity}`));
      console.log(chalk.blue(`🏷️ Types de projet: ${this.projectData.analysis.projectTypes.join(', ')}`));

    } catch (error) {
      spinner.fail('❌ Erreur de génération des documents');
      throw error;
    }
  }

  async generateArchitecture(analysis) {
    // Génération d'architecture simplifiée - pourrait être étendue
    return {
      title: `${analysis.projectName} - Technical Architecture`,
      version: '1.0.0',
      generated: new Date().toISOString(),
      type: this.determineArchitectureType(analysis),
      layers: this.defineArchitectureLayers(analysis),
      technologies: this.selectTechnologies(analysis),
      patterns: this.selectArchitecturePatterns(analysis),
      infrastructure: this.planInfrastructure(analysis),
      security: this.defineSecurityArchitecture(analysis),
      scalability: this.defineScalabilityStrategy(analysis),
      deployment: this.defineDeploymentStrategy(analysis)
    };
  }

  determineArchitectureType(analysis) {
    if (analysis.complexity === 'very-complex') return 'microservices';
    if (analysis.complexity === 'complex') return 'modular-monolith';
    return 'monolith';
  }

  defineArchitectureLayers(analysis) {
    const baseLayers = [
      { name: 'Presentation', description: 'Interface utilisateur et API' },
      { name: 'Business Logic', description: 'Logique métier et règles' },
      { name: 'Data Access', description: 'Accès aux données et persistance' }
    ];

    if (analysis.projectTypes.includes('enterprise')) {
      baseLayers.push({ name: 'Integration', description: 'Intégrations tierces' });
    }

    return baseLayers;
  }

  selectTechnologies(analysis) {
    const technologies = {
      frontend: this.selectFrontendTech(analysis),
      backend: this.selectBackendTech(analysis),
      database: this.selectDatabaseTech(analysis),
      tools: ['Docker', 'Git', 'CI/CD']
    };

    if (analysis.projectTypes.includes('mobile-app')) {
      technologies.mobile = 'React Native';
    }

    return technologies;
  }

  selectFrontendTech(analysis) {
    if (analysis.techPreferences?.includes('react')) return 'React + TypeScript';
    if (analysis.techPreferences?.includes('vue')) return 'Vue.js 3 + TypeScript';
    if (analysis.techPreferences?.includes('angular')) return 'Angular + TypeScript';

    return 'React + TypeScript'; // Default
  }

  selectBackendTech(analysis) {
    if (analysis.techPreferences?.includes('nodejs')) return 'Node.js + Express';
    if (analysis.techPreferences?.includes('python')) return 'Python + FastAPI';

    return 'Node.js + Express'; // Default
  }

  selectDatabaseTech(analysis) {
    if (analysis.projectTypes.includes('ecommerce')) return 'PostgreSQL + Redis';
    if (analysis.projectTypes.includes('enterprise')) return 'PostgreSQL';

    return 'PostgreSQL'; // Default
  }

  selectArchitecturePatterns(analysis) {
    const patterns = ['MVC', 'Repository Pattern'];

    if (analysis.projectTypes.includes('ecommerce')) {
      patterns.push('Event Sourcing', 'CQRS');
    }

    if (analysis.complexity === 'complex') {
      patterns.push('Domain-Driven Design');
    }

    return patterns;
  }

  planInfrastructure(analysis) {
    const infrastructure = {
      hosting: 'Cloud (AWS/Azure/GCP)',
      containerization: 'Docker',
      orchestration: analysis.complexity === 'complex' ? 'Kubernetes' : 'Docker Compose',
      monitoring: 'Application Performance Monitoring',
      logging: 'Centralized Logging',
      backup: 'Automated Backups'
    };

    return infrastructure;
  }

  defineSecurityArchitecture(analysis) {
    const security = {
      authentication: 'JWT + Refresh Tokens',
      authorization: 'RBAC',
      encryption: 'AES-256 + TLS 1.3',
      dataProtection: 'GDPR Compliant'
    };

    if (analysis.projectTypes.includes('enterprise')) {
      security.sso = 'Enterprise SSO';
      security.audit = 'Comprehensive Audit Logging';
    }

    return security;
  }

  defineScalabilityStrategy(analysis) {
    const strategies = {
      'simple': 'Vertical scaling with monitoring',
      'moderate': 'Horizontal scaling with load balancing',
      'complex': 'Auto-scaling with CDN and caching',
      'very-complex': 'Multi-region deployment with edge computing'
    };

    return strategies[analysis.complexity] || strategies['moderate'];
  }

  defineDeploymentStrategy(_analysis) {
    return {
      strategy: 'Blue-Green Deployment',
      automation: 'CI/CD Pipeline',
      testing: 'Automated Testing + Manual QA',
      rollback: 'Automated Rollback on Failure',
      environments: ['Development', 'Staging', 'Production']
    };
  }

  async configureProjectInfrastructure() {
    console.log(chalk.cyan('\n⚙️ === CONFIGURATION INFRASTRUCTURE PROJET ===\n'));

    const spinner = ora('🤖 Configuration des agents...').start();

    try {
      // Configuration des agents avec le nouveau système dynamique
      spinner.text = '🎭 Sélection et configuration des agents...';
      
      // Créer un profil projet compatible avec DynamicAgentConfigurator
      const projectProfile = this.createProjectProfile(this.projectData.analysis);
      
      // Utiliser le configurateur dynamique comme système principal
      const dynamicConfig = await this.dynamicAgentConfigurator.resolveProjectAgents(projectProfile);
      
      // Fallback sur l'ancien système si nécessaire
      const legacyConfig = await this.agentConfigurator.configure(this.projectData.analysis);
      
      // Fusionner les configurations
      this.projectData.agentConfig = this.mergeAgentConfigurations(dynamicConfig, legacyConfig);
      this.projectData.mcpConfigGenerated = dynamicConfig;

      // Génération des workflows
      spinner.text = '⚙️ Génération des workflows...';
      this.projectData.workflows = await this.workflowGenerator.generate(
        this.projectData.analysis,
        this.projectData.agentConfig
      );

      // Configuration MCP (utilise la configuration dynamique générée)
      spinner.text = '🔌 Configuration MCP et hooks...';
      this.projectData.mcpConfig = this.projectData.mcpConfigGenerated || await this.configureMCP();

      spinner.succeed('✅ Infrastructure configurée');

      const agentCount = this.projectData.agentConfig.selectedAgents?.length || 
                        Object.keys(this.projectData.agentConfig.agents || {}).length;
      console.log(chalk.green(`🤖 ${agentCount} agents configurés dynamiquement`));
      
      if (this.projectData.mcpConfigGenerated?.metadata?.confidence) {
        const confidence = Math.round(this.projectData.mcpConfigGenerated.metadata.confidence * 100);
        console.log(chalk.blue(`🎯 Confiance de configuration: ${confidence}%`));
      }
      console.log(chalk.green(`⚙️ ${this.projectData.workflows.enabled.length} workflows activés`));
      console.log(chalk.blue('🔌 Intégration MCP configurée'));

    } catch (error) {
      spinner.fail('❌ Erreur de configuration');
      throw error;
    }
  }

  async configureMCP() {
    const hooks = ['pre-commit', 'story-validation'];

    if (this.projectData.analysis.projectTypes.includes('ecommerce')) {
      hooks.push('marketplace-validation');
    }

    if (this.projectData.analysis.complexity === 'complex') {
      hooks.push('performance-monitoring', 'security-scanning');
    }

    return {
      enabled: true,
      hooks: hooks,
      agents: this.projectData.agentConfig.selectedAgents,
      tools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob'],
      workflows: this.projectData.workflows.enabled,
      monitoring: {
        performance: true,
        errors: true,
        usage: true
      }
    };
  }

  async initializeProjectStructure() {
    console.log(chalk.cyan('\n🏗️ === INITIALISATION STRUCTURE PROJET ===\n'));

    const projectPath = path.join(this.options.outputPath, this.projectData.name);
    const spinner = ora(`📁 Création de la structure dans ${projectPath}...`).start();

    try {
      // Vérifier que le dossier n'existe pas
      if (await fs.pathExists(projectPath)) {
        spinner.fail('❌ Le dossier projet existe déjà');

        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: '⚠️  Le dossier existe. Voulez-vous l\'écraser ?',
          default: false
        }]);

        if (!overwrite) {
          throw new Error('Initialisation annulée - dossier existant');
        }

        await fs.remove(projectPath);
      }

      spinner.text = '📁 Création de la structure de base...';
      await this.createProjectStructure(projectPath);

      spinner.text = '📋 Génération des fichiers de configuration...';
      await this.generateConfigFiles(projectPath);

      spinner.text = '📄 Génération de la documentation...';
      await this.generateDocumentation(projectPath);

      spinner.text = '🤖 Configuration des agents BMAD...';
      await this.setupBMADCore(projectPath);

      spinner.text = '🔌 Configuration Claude MCP...';
      await this.setupMCPIntegration(projectPath);

      spinner.succeed(`✅ Structure projet créée dans ${projectPath}`);

    } catch (error) {
      spinner.fail('❌ Erreur de création de la structure');
      throw error;
    }
  }

  async createProjectStructure(projectPath) {
    // Structure de base du projet
    const directories = [
      'src',
      'tests',
      'docs',
      'config',
      '.bmad-core/agents',
      '.bmad-core/workflows',
      '.bmad-core/templates',
      '.bmad-core/tasks',
      '.bmad-core/checklists',
      '.bmad-core/data',
      '.claude',
      '.vscode'
    ];

    for (const dir of directories) {
      await fs.ensureDir(path.join(projectPath, dir));
    }

    // Copier les templates de base
    const templatesPath = path.join(__dirname, '../../templates/base');
    if (await fs.pathExists(templatesPath)) {
      await fs.copy(templatesPath, projectPath, { overwrite: true });
    }
  }

  async generateConfigFiles(projectPath) {
    // Package.json
    const packageJson = {
      name: this.projectData.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: this.projectData.brief.description,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        build: 'npm run build:prod',
        test: 'jest',
        lint: 'eslint src/',
        'lint:fix': 'eslint src/ --fix'
      },
      bmadStudio: {
        version: '1.0.0',
        generated: new Date().toISOString(),
        projectType: this.projectData.analysis.projectTypes,
        complexity: this.projectData.analysis.complexity
      },
      dependencies: this.generateDependencies(),
      devDependencies: this.generateDevDependencies()
    };

    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

    // BMAD Core Config
    const bmadConfig = {
      project: {
        name: this.projectData.name,
        type: this.projectData.analysis.projectTypes,
        complexity: this.projectData.analysis.complexity,
        version: '1.0.0'
      },
      agents: {
        available: this.projectData.agentConfig.selectedAgents,
        default: 'bmad-orchestrator'
      },
      workflows: {
        enabled: this.projectData.workflows.enabled,
        default: this.projectData.workflows.enabled[0]
      },
      mcp: this.projectData.mcpConfig,
      generated: new Date().toISOString()
    };

    // Conversion en YAML pour BMAD
    const yaml = require('yaml');
    await fs.writeFile(
      path.join(projectPath, '.bmad-core', 'core-config.yaml'),
      yaml.stringify(bmadConfig)
    );
  }

  generateDependencies() {
    const deps = {};

    // Base dependencies selon le stack technique
    const techStack = this.projectData.architecture.technologies;

    if (techStack.frontend?.includes('React')) {
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    }

    if (techStack.backend?.includes('Express')) {
      deps['express'] = '^4.18.0';
    }

    if (techStack.backend?.includes('Node.js')) {
      deps['cors'] = '^2.8.5';
      deps['helmet'] = '^7.0.0';
    }

    return deps;
  }

  generateDevDependencies() {
    const devDeps = {
      'eslint': '^8.40.0',
      'jest': '^29.5.0',
      'nodemon': '^2.0.22'
    };

    if (this.projectData.architecture.technologies.frontend?.includes('TypeScript')) {
      devDeps['typescript'] = '^5.0.0';
      devDeps['@types/node'] = '^20.0.0';
    }

    return devDeps;
  }

  async generateDocumentation(projectPath) {
    const docsPath = path.join(projectPath, 'docs');

    // PRD
    await fs.writeJSON(
      path.join(docsPath, 'prd.json'),
      this.projectData.prd,
      { spaces: 2 }
    );

    // Architecture
    await fs.writeJSON(
      path.join(docsPath, 'architecture.json'),
      this.projectData.architecture,
      { spaces: 2 }
    );

    // README principal
    await this.generateREADME(projectPath);
  }

  async generateREADME(projectPath) {
    const readme = `# ${this.projectData.name}

> ${this.projectData.brief.description}

**Généré avec BMAD Studio Template** 🚀

## 🎯 Vision du Projet

${this.projectData.brief.vision || 'Vision définie lors du brainstorming'}

## 🏗️ Architecture

- **Type**: ${this.projectData.architecture.type}
- **Frontend**: ${this.projectData.architecture.technologies.frontend}
- **Backend**: ${this.projectData.architecture.technologies.backend}
- **Database**: ${this.projectData.architecture.technologies.database}

## 🤖 Agents BMAD Configurés

${this.projectData.agentConfig.selectedAgents.map(agent => `- **${agent}**`).join('\n')}

## ⚙️ Workflows Disponibles

${this.projectData.workflows.enabled.map(workflow => `- **${workflow}**`).join('\n')}

## 🚀 Démarrage Rapide

\`\`\`bash
# Installation
npm install

# Développement
npm run dev

# Tests
npm test

# Linting
npm run lint
\`\`\`

## 🤖 Utilisation BMAD

\`\`\`bash
# Activer l'orchestrateur principal
*agent bmad-orchestrator

# Voir tous les agents
*agent

# Lancer un workflow
*workflow ${this.projectData.workflows.enabled[0] || 'default'}
\`\`\`

## 📚 Documentation

- [PRD](docs/prd.json)
- [Architecture](docs/architecture.json)
${this.projectData.brief.brainstormingCompleted ? '- Session de brainstorming complétée' : ''}

---

*Généré le ${new Date().toLocaleDateString()} avec BMAD Studio Template*
`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
  }

  async setupBMADCore(projectPath) {
    const bmadCorePath = path.join(projectPath, '.bmad-core');

    // Copier les agents configurés
    const agentTemplatesPath = path.join(__dirname, '../../templates/base/.bmad-core/agents');
    const targetAgentsPath = path.join(bmadCorePath, 'agents');

    if (await fs.pathExists(agentTemplatesPath)) {
      await fs.copy(agentTemplatesPath, targetAgentsPath, { overwrite: true });
    }

    // Générer les workflows spécifiques
    for (const workflowName of this.projectData.workflows.enabled) {
      const workflowConfig = this.projectData.workflows.configurations[workflowName];
      if (workflowConfig) {
        await fs.writeJSON(
          path.join(bmadCorePath, 'workflows', `${workflowName}.yaml`),
          workflowConfig,
          { spaces: 2 }
        );
      }
    }
  }

  async setupMCPIntegration(projectPath) {
    const claudePath = path.join(projectPath, '.claude');

    // Utiliser la configuration MCP générée dynamiquement si disponible
    let mcpConfig;
    
    if (this.projectData.mcpConfigGenerated) {
      // Configuration générée par DynamicAgentConfigurator
      mcpConfig = {
        mcpServers: this.projectData.mcpConfigGenerated.mcp_servers,
        hooks: Object.entries(this.projectData.mcpConfigGenerated.hooks).map(([name, config]) => ({
          name: name,
          enabled: true,
          trigger: config.trigger,
          action: config.action
        })),
        agents: Object.entries(this.projectData.mcpConfigGenerated.agents).map(([id, config]) => ({
          id: id,
          enabled: config.enabled || true,
          description: config.description,
          capabilities: config.capabilities
        })),
        workflows: this.projectData.mcpConfigGenerated.workflows,
        tools: {
          enabled: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob']
        },
        metadata: this.projectData.mcpConfigGenerated.metadata
      };
    } else {
      // Configuration legacy
      mcpConfig = {
        mcpServers: {
          'bmad-studio': {
            command: 'node',
            args: ['.bmad-core/mcp-server.js'],
            env: {
              BMAD_PROJECT_PATH: '.',
              BMAD_CONFIG_PATH: '.bmad-core/core-config.yaml'
            }
          }
        },
        hooks: this.projectData.mcpConfig.hooks.map(hook => ({
          name: hook,
          enabled: true,
          trigger: this.getHookTrigger(hook)
        })),
        agents: this.projectData.mcpConfig.agents.map(agent => ({
          id: agent,
          enabled: true
        })),
        tools: {
          enabled: this.projectData.mcpConfig.tools
        }
      };
    }

    await fs.writeJSON(
      path.join(claudePath, 'project.mcp.json'),
      mcpConfig,
      { spaces: 2 }
    );

    // Session brief pour Claude
    const sessionBrief = this.generateSessionBrief();
    await fs.writeFile(
      path.join(claudePath, 'session-brief.md'),
      sessionBrief
    );
  }

  getHookTrigger(hookName) {
    const triggers = {
      'pre-commit': 'git commit',
      'story-validation': 'story completion',
      'marketplace-validation': 'marketplace deployment',
      'performance-monitoring': 'performance threshold',
      'security-scanning': 'security check'
    };

    return triggers[hookName] || 'manual';
  }

  generateSessionBrief() {
    return `# ${this.projectData.name} - Session Brief

## Contexte du Projet
${this.projectData.brief.description}

## Vision
${this.projectData.brief.vision || 'Définie lors de l\'initialisation'}

## Architecture
- Type: ${this.projectData.architecture.type}
- Complexité: ${this.projectData.analysis.complexity}
- Stack: ${JSON.stringify(this.projectData.architecture.technologies, null, 2)}

## Agents Disponibles
${this.projectData.agentConfig.selectedAgents.map(agent => `- ${agent}`).join('\n')}

## Workflows Actifs
${this.projectData.workflows.enabled.map(workflow => `- ${workflow}`).join('\n')}

${this.projectData.brief.brainstormingCompleted ? `
## Insights du Brainstorming
- ${this.projectData.brief.immediateOpportunities?.length || 0} opportunités immédiates
- ${this.projectData.brief.futureInnovations?.length || 0} innovations futures
- ${this.projectData.brief.moonshots?.length || 0} moonshots ambitieux

### Priorités Identifiées
${this.projectData.brief.topPriorities?.map(priority => `- ${priority}`).join('\n') || 'Aucune priorité spécifiée'}
` : ''}

## Notes
Projet généré le ${new Date().toLocaleDateString()} avec BMAD Studio Template.

Pour commencer: \`*agent bmad-orchestrator\`
`;
  }

  async finalizeProject() {
    console.log(chalk.cyan('\n🎯 === FINALISATION DU PROJET ===\n'));

    // Sauvegarde des métadonnées complètes
    const projectPath = path.join(this.options.outputPath, this.projectData.name);
    const metadataPath = path.join(projectPath, '.bmad-core', 'project-metadata.json');

    const metadata = {
      ...this.projectData,
      generation: {
        date: new Date().toISOString(),
        bmadVersion: '1.0.0',
        templateVersion: '1.0.0'
      }
    };

    await fs.writeJSON(metadataPath, metadata, { spaces: 2 });

    console.log(chalk.green('✅ Métadonnées projet sauvegardées'));
    console.log(chalk.blue('📊 Projet entièrement configuré et prêt'));
  }

  displaySuccess() {
    const projectPath = path.join(this.options.outputPath, this.projectData.name);

    console.log(chalk.green('\n🎉 ====================================='));
    console.log(chalk.green('    PROJET INITIALISÉ AVEC SUCCÈS!'));
    console.log(chalk.green('=====================================\n'));

    console.log(chalk.cyan('📁 Projet créé dans:'));
    console.log(chalk.white(`   ${projectPath}\n`));

    console.log(chalk.cyan('🤖 Agents configurés:'));
    this.projectData.agentConfig.selectedAgents.forEach(agent => {
      console.log(chalk.white(`   • ${agent}`));
    });

    console.log(chalk.cyan('\n⚙️ Workflows disponibles:'));
    this.projectData.workflows.enabled.forEach(workflow => {
      console.log(chalk.white(`   • ${workflow}`));
    });

    console.log(chalk.cyan('\n📋 Prochaines étapes:'));
    console.log(chalk.yellow('   1.') + ` cd ${this.projectData.name}`);
    console.log(chalk.yellow('   2.') + ' npm install');
    console.log(chalk.yellow('   3.') + ' Ouvrir dans Claude Code');
    console.log(chalk.yellow('   4.') + ' *agent bmad-orchestrator');

    console.log(chalk.blue('\n💡 Votre projet dispose maintenant de:'));
    console.log('   • PRD complet généré automatiquement');
    console.log('   • Architecture technique adaptée');
    console.log('   • Agents BMAD configurés et prêts');
    console.log('   • Intégration MCP pour Claude');
    console.log('   • Workflows personnalisés');

    if (this.projectData.brief.brainstormingCompleted) {
      console.log(chalk.magenta('\n✨ Bonus: Session de brainstorming complétée'));
      console.log('   • Vision clarifiée et structurée');
      console.log('   • Opportunités identifiées et priorisées');
      console.log('   • Insights projet documentés');
    }

    console.log(chalk.green('\n🚀 Prêt pour le développement agile avec BMAD Studio!'));
  }
}

module.exports = { IntegratedInitializer };
