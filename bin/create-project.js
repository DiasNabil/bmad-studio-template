#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const { BmadStudioCLI } = require('./bmad-studio');

const program = new Command();

async function createProject(projectName, _options) {
  const spinner = ora(`🚀 Création du projet ${projectName}...`).start();

  try {
    const projectPath = path.resolve(process.cwd(), projectName);

    if (await fs.pathExists(projectPath)) {
      spinner.fail(`❌ Le dossier ${projectName} existe déjà!`);
      process.exit(1);
    }

    // Créer le dossier du projet
    await fs.ensureDir(projectPath);

    spinner.text = '📋 Lancement du briefing interactif...';

    // Utiliser la CLI principale pour le briefing
    const cli = new BmadStudioCLI();

    spinner.stop();

    await cli.displayWelcome();

    // Briefing interactif
    const briefAnswers = await cli.interactiveBriefing();

    const spinner2 = ora('🧠 Génération de la configuration...').start();

    // Analyser et générer
    const config = await cli.analyzeAndGenerate(briefAnswers);

    // Initialiser le projet
    spinner2.text = '🏗️ Initialisation du projet...';
    await initializeProjectStructure(projectPath, config);

    spinner2.succeed(`✅ Projet ${projectName} créé avec succès!`);

    displayProjectInfo(projectName, projectPath, config);

  } catch (error) {
    spinner.fail(`❌ Erreur lors de la création: ${error.message}`);
    process.exit(1);
  }
}

async function initializeProjectStructure(projectPath, config) {
  const templatesPath = path.join(__dirname, '../templates');

  // Copier la structure de base
  await fs.copy(
    path.join(templatesPath, 'base'),
    projectPath
  );

  // Copier les templates spécifiques
  for (const projectType of config.analysis.projectTypes) {
    const typePath = path.join(templatesPath, projectType);
    if (await fs.pathExists(typePath)) {
      await fs.copy(typePath, projectPath, { overwrite: true });
    }
  }

  // Générer les fichiers de configuration
  await generateConfigurationFiles(projectPath, config);
}

async function generateConfigurationFiles(projectPath, config) {
  // Core configuration BMAD
  const bmadConfig = {
    project: {
      name: config.analysis.projectName,
      type: config.analysis.projectTypes,
      complexity: config.analysis.complexity,
      version: '1.0.0',
      generated: new Date().toISOString()
    },
    agents: {
      available: config.agentConfig.selectedAgents,
      default: 'bmad-orchestrator',
      autoActivation: true
    },
    workflows: {
      enabled: config.workflows.enabled,
      default: config.workflows.enabled[0] || 'greenfield-fullstack'
    },
    mcp: config.mcpConfig,
    validation: {
      preCommitHooks: true,
      storyValidation: true,
      performanceMonitoring: config.analysis.complexity !== 'simple'
    }
  };

  await fs.ensureDir(path.join(projectPath, '.bmad-core'));
  await fs.writeFile(
    path.join(projectPath, '.bmad-core', 'core-config.yaml'),
    require('yaml').stringify(bmadConfig)
  );

  // Générer PRD
  await fs.ensureDir(path.join(projectPath, 'docs'));
  await fs.writeJSON(
    path.join(projectPath, 'docs', 'prd.json'),
    config.documents.prd,
    { spaces: 2 }
  );

  // Générer Architecture
  await fs.writeJSON(
    path.join(projectPath, 'docs', 'architecture.json'),
    config.documents.architecture,
    { spaces: 2 }
  );

  // Générer Claude MCP configuration
  await fs.ensureDir(path.join(projectPath, '.claude'));
  const mcpConfig = {
    mcpServers: {},
    hooks: config.mcpConfig.hooks.map(hook => ({
      name: hook,
      enabled: true,
      config: {}
    })),
    agents: config.agentConfig.selectedAgents.map(agent => ({
      id: agent,
      enabled: true
    }))
  };

  await fs.writeJSON(
    path.join(projectPath, '.claude', 'project.mcp.json'),
    mcpConfig,
    { spaces: 2 }
  );
}

function displayProjectInfo(projectName, projectPath, config) {
  console.log('\n' + chalk.green('🎉 Projet créé avec succès!\n'));

  console.log(chalk.cyan('📁 Structure du projet:'));
  console.log(`  ${projectName}/`);
  console.log('  ├── .bmad-core/          # Configuration BMAD');
  console.log('  ├── .claude/             # Configuration MCP');
  console.log('  ├── docs/                # Documentation générée');
  console.log('  ├── src/                 # Code source');
  console.log('  └── tests/               # Tests');

  console.log('\n' + chalk.cyan('🤖 Agents configurés:'));
  config.agentConfig.selectedAgents.forEach(agent => {
    console.log(`  • ${agent}`);
  });

  console.log('\n' + chalk.cyan('⚙️ Workflows disponibles:'));
  config.workflows.enabled.forEach(workflow => {
    console.log(`  • ${workflow}`);
  });

  console.log('\n' + chalk.cyan('📋 Prochaines étapes:'));
  console.log(`  ${chalk.yellow('1.')} cd ${projectName}`);
  console.log(`  ${chalk.yellow('2.')} Ouvrir dans Claude Code`);
  console.log(`  ${chalk.yellow('3.')} Utiliser *agent bmad-orchestrator pour commencer`);

  console.log('\n' + chalk.blue('💡 Le briefing et l\'architecture sont dans docs/'));
}

program
  .name('create-bmad-project')
  .description('Créer un nouveau projet BMAD Studio')
  .version('1.0.0');

program
  .argument('<project-name>', 'Nom du projet à créer')
  .option('-t, --template <template>', 'Template à utiliser')
  .option('--quick', 'Mode rapide avec paramètres par défaut')
  .action(createProject);

program.parse(process.argv);

module.exports = { createProject };
