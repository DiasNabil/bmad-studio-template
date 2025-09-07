#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { IntegratedInitializer } = require('../lib/core/IntegratedInitializer');

const program = new Command();

// ASCII Art Logo
const logo = `
██████╗ ███╗   ███╗ █████╗ ██████╗     ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗ 
██╔══██╗████╗ ████║██╔══██╗██╔══██╗    ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗
██████╔╝██╔████╔██║███████║██║  ██║    ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║
██╔══██╗██║╚██╔╝██║██╔══██║██║  ██║    ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║
██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝    ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝
╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝     ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝ 
                                                                                        
Framework Évolutif Intelligent pour Projets Agiles
`;

class BmadStudioCLI {
  constructor() {
    this.initializer = new IntegratedInitializer();
  }

  displayWelcome() {
    console.clear();
    console.log(chalk.cyan(logo));
    console.log(chalk.yellow('🚀 Intelligence Adaptative pour Projets Agiles\n'));
  }

  async initialize(options = {}) {
    this.displayWelcome();
    
    try {
      await this.initializer.initialize(options);
      this.displaySuccess();
    } catch (error) {
      console.error(chalk.red(`❌ Erreur d'initialisation: ${error.message}`));
      process.exit(1);
    }
  }

  displaySuccess() {
    console.log(chalk.green('\n🎉 ====================================='));
    console.log(chalk.green('    BMAD STUDIO TEMPLATE PRÊT!'));
    console.log(chalk.green('=====================================\n'));
    
    console.log(chalk.cyan('💡 Le framework est maintenant opérationnel'));
    console.log(chalk.cyan('🚀 Utilisez "bmad-studio init" pour créer un nouveau projet'));
  }
}

// Commandes CLI
program
  .name('bmad-studio')
  .description('BMAD-Studio - Framework Évolutif Intelligent')
  .version('1.0.0');

program
  .command('init [project-name]')
  .description('Initialiser un nouveau projet avec briefing interactif')
  .option('-o, --output <path>', 'Répertoire de sortie', process.cwd())
  .option('--skip-brainstorming', 'Ignorer la session de brainstorming')
  .option('--brainstorming-only', 'Uniquement session de brainstorming')
  .action(async (projectName, options) => {
    const cli = new BmadStudioCLI();
    
    const initOptions = {
      projectName: projectName,
      outputPath: options.output,
      skipBrainstorming: options.skipBrainstorming,
      brainstormingOnly: options.brainstormingOnly
    };
    
    await cli.initialize(initOptions);
  });

program
  .command('brainstorm')
  .description('Lancer uniquement une session de brainstorming')
  .option('-o, --output <path>', 'Répertoire de sortie', process.cwd())
  .action(async (options) => {
    const cli = new BmadStudioCLI();
    
    const initOptions = {
      outputPath: options.output,
      brainstormingOnly: true
    };
    
    await cli.initialize(initOptions);
  });

program
  .command('setup')
  .description('Configuration initiale du framework BMAD Studio')
  .action(async () => {
    const cli = new BmadStudioCLI();
    cli.displayWelcome();
    
    console.log(chalk.green('✅ BMAD Studio Template est prêt à l\'utilisation'));
    console.log(chalk.cyan('💡 Utilisez "bmad-studio init" pour créer votre premier projet'));
  });

// Gestion des erreurs
program.on('command:*', () => {
  console.error(chalk.red('Commande inconnue: %s\n'), program.args.join(' '));
  program.help();
});

if (process.argv.length < 3) {
  program.help();
}

program.parse(process.argv);

module.exports = { BmadStudioCLI };