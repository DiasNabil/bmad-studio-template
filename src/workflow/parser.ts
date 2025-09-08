// src/workflow/parser.ts
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Local types import
import { WorkflowConfig, WorkflowDefinition, WorkflowStep } from './types';

// Mock Logger for now - replace with actual implementation
interface Logger {
    info: (message: string) => void;
    error: (message: string, error?: unknown) => void;
    warn: (message: string) => void;
}

class ConsoleLogger implements Logger {
    info(message: string): void {
        console.info(`[INFO] ${message}`);
    }

    error(message: string, error?: unknown): void {
        console.error(`[ERROR] ${message}`, error);
    }

    warn(message: string): void {
        console.warn(`[WARN] ${message}`);
    }
}

export class WorkflowParser {
    private logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new ConsoleLogger();
    }

    /**
     * Parse workflow YAML file
     * @param filePath Path to the workflow YAML file
     * @returns Parsed WorkflowDefinition
     */
    parseWorkflowFile(filePath: string): WorkflowDefinition {
        try {
            // Read YAML file
            const fileContents = fs.readFileSync(filePath, 'utf8');
            const config = yaml.load(fileContents) as WorkflowConfig;

            // Validate basic configuration
            if (!config.workflow_id || !config.name) {
                throw new Error('Invalid workflow configuration: missing workflow_id or name');
            }

            // Convert YAML config to WorkflowDefinition
            const steps: WorkflowStep[] = [];

            // Handle sequential steps
            if (config.sequence) {
                config.sequence.forEach((stepId, index) => {
                    steps.push({
                        id: stepId,
                        type: 'sequential',
                        action: stepId,
                        dependencies: index > 0 ? [config.sequence![index - 1]] : undefined,
                    });
                });
            }

            // Handle parallel steps
            if (config.parallel) {
                config.parallel.forEach((stepId) => {
                    steps.push({
                        id: stepId,
                        type: 'parallel',
                        action: stepId,
                    });
                });
            }

            // Logging
            this.logger.info(`Parsed workflow: ${config.name} (ID: ${config.workflow_id})`);

            return {
                id: config.workflow_id,
                name: config.name,
                version: config.version || '1.0.0',
                steps,
            };
        } catch (error) {
            this.logger.error(`Error parsing workflow file: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * List available workflow files in a directory
     * @param directoryPath Path to workflows directory
     * @returns Array of workflow file paths
     */
    listWorkflowFiles(directoryPath: string): string[] {
        try {
            return fs
                .readdirSync(directoryPath)
                .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
                .map((file) => `${directoryPath}/${file}`);
        } catch (error) {
            this.logger.error(`Error listing workflow files in ${directoryPath}`, error);
            return [];
        }
    }
}
