import * as fs from 'fs';
import * as path from 'path';
import { AgentConfigurator } from '../configurators/AgentConfigurator';
import { BMadError } from '../core/ErrorHandler';
import { Logger } from '../core/Logger';

// Mock interfaces to resolve type checking issues
interface BMadErrorOptions {
    code: string;
    context?: Record<string, unknown>;
}

interface MetricsInterface {
    recordSchemaValidationTime: (duration: number) => void;
    incrementSchemaValidationSuccess: () => void;
    incrementSchemaValidationFailure: () => void;
}

interface MCPSchema {
    version: string;
    projectName: string;
    agents: Array<{
        name: string;
        type: string;
        configuration: Record<string, unknown>;
    }>;
    environments: Array<{
        name: string;
        type: string;
        parameters: Record<string, unknown>;
    }>;
}

export class MCPSchemaValidator {
    private static SCHEMA_VERSION = '1.0.0';
    private logger: Logger;
    private metrics: MetricsInterface;

    constructor() {
        // Assuming Logger can be instantiated this way
        this.logger = new (Logger as any)('MCPSchemaValidator');

        // Mock metrics object
        this.metrics = {
            recordSchemaValidationTime: (_duration: number) => {},
            incrementSchemaValidationSuccess: () => {},
            incrementSchemaValidationFailure: () => {},
        };
    }

    public validateMCPSchema(filePath: string): boolean {
        try {
            const startTime = Date.now();

            // Assuming logger has a method to log info
            (this.logger as any).info(`Starting MCP schema validation for ${filePath}`);

            // Read and parse the schema file
            const rawSchema = fs.readFileSync(filePath, 'utf-8');
            const schema: MCPSchema = JSON.parse(rawSchema);

            // Validation checks
            this.validateVersion(schema);
            this.validateProjectName(schema);
            this.validateAgents(schema);
            this.validateEnvironments(schema);

            const duration = Date.now() - startTime;
            this.metrics.recordSchemaValidationTime(duration);
            this.metrics.incrementSchemaValidationSuccess();

            // Assuming logger has audit method
            (this.logger as any).audit({
                event: 'MCP_SCHEMA_VALIDATION_SUCCESS',
                filePath,
                duration,
                schemaVersion: schema.version,
            });

            return true;
        } catch (error) {
            this.handleValidationError(error, filePath);
            return false;
        }
    }

    private validateVersion(schema: MCPSchema): void {
        if (schema.version !== MCPSchemaValidator.SCHEMA_VERSION) {
            const errorOptions: BMadErrorOptions = {
                code: 'SCHEMA_VERSION_MISMATCH',
                context: {
                    expected: MCPSchemaValidator.SCHEMA_VERSION,
                    actual: schema.version,
                },
            };
            throw new BMadError('Invalid schema version', errorOptions);
        }
    }

    private validateProjectName(schema: MCPSchema): void {
        if (!schema.projectName || schema.projectName.trim() === '') {
            const errorOptions: BMadErrorOptions = {
                code: 'INVALID_PROJECT_NAME',
                context: {
                    message: 'Project name is required and cannot be empty',
                },
            };
            throw new BMadError('Invalid project name', errorOptions);
        }
    }

    private validateAgents(schema: MCPSchema): void {
        if (!schema.agents || schema.agents.length === 0) {
            const errorOptions: BMadErrorOptions = {
                code: 'NO_AGENTS_DEFINED',
                context: {
                    message: 'At least one agent must be defined',
                },
            };
            throw new BMadError('No agents defined', errorOptions);
        }

        schema.agents.forEach((agent, index) => {
            if (!agent.name || !agent.type) {
                const errorOptions: BMadErrorOptions = {
                    code: 'INVALID_AGENT_DEFINITION',
                    context: {
                        index,
                        message: `Agent at index ${index} is missing name or type`,
                    },
                };
                throw new BMadError('Invalid agent definition', errorOptions);
            }

            // Assuming AgentConfigurator might have a method to validate configuration
            try {
                const agentConfigurator = new AgentConfigurator();
                if ('validateConfiguration' in agentConfigurator) {
                    (agentConfigurator as any).validateConfiguration(agent);
                }
            } catch (validationError) {
                const errorOptions: BMadErrorOptions = {
                    code: 'AGENT_CONFIGURATION_INVALID',
                    context: {
                        agent,
                        error:
                            validationError instanceof Error
                                ? validationError.message
                                : String(validationError),
                    },
                };
                throw new BMadError('Agent configuration validation failed', errorOptions);
            }
        });
    }

    private validateEnvironments(schema: MCPSchema): void {
        if (!schema.environments || schema.environments.length === 0) {
            const errorOptions: BMadErrorOptions = {
                code: 'NO_ENVIRONMENTS_DEFINED',
                context: {
                    message: 'At least one environment must be defined',
                },
            };
            throw new BMadError('No environments defined', errorOptions);
        }

        schema.environments.forEach((env, index) => {
            if (!env.name || !env.type) {
                const errorOptions: BMadErrorOptions = {
                    code: 'INVALID_ENVIRONMENT_DEFINITION',
                    context: {
                        index,
                        message: `Environment at index ${index} is missing name or type`,
                    },
                };
                throw new BMadError('Invalid environment definition', errorOptions);
            }
        });
    }

    private handleValidationError(error: unknown, filePath: string): void {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Assuming logger has error and audit methods
        (this.logger as any).error(`MCP Schema Validation Error: ${errorMessage}`, {
            filePath,
            error: error instanceof BMadError ? error.code : 'UNKNOWN_ERROR',
        });

        this.metrics.incrementSchemaValidationFailure();

        // Optional: Create detailed audit log
        (this.logger as any).audit({
            event: 'MCP_SCHEMA_VALIDATION_FAILURE',
            filePath,
            errorMessage,
            errorCode: error instanceof BMadError ? error.code : 'UNKNOWN_ERROR',
        });

        // Rethrow the error to be caught by the calling context
        throw error;
    }

    public static validateProjectMCPSchema(projectRoot: string): boolean {
        const mcpSchemaPath = path.join(projectRoot, 'project.mcp.json');

        if (!fs.existsSync(mcpSchemaPath)) {
            const errorOptions: BMadErrorOptions = {
                code: 'MCP_SCHEMA_FILE_MISSING',
                context: {
                    message: 'MCP schema file (project.mcp.json) not found',
                    path: mcpSchemaPath,
                },
            };
            throw new BMadError('MCP schema file missing', errorOptions);
        }

        const validator = new MCPSchemaValidator();
        return validator.validateMCPSchema(mcpSchemaPath);
    }
}
