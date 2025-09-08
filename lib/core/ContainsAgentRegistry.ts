import * as fs from 'fs';

import * as yaml from 'js-yaml';
import { Logger, LogLevel } from './Logger';

// Type definitions for flexible agent configuration
export interface AgentProfile {
    id: string;
    name: string;
    matchPatterns: string[];
    priority?: number;
    tags?: string[];
    configuration?: Record<string, string | number | boolean | null>;
}

export interface MatchResult {
    agentId: string;
    matchedPattern: string;
    confidence: number;
    matchedTags?: ReadonlyArray<string>;
}

export class ContainsAgentRegistry {
    private readonly logger: Logger;
    private agents: AgentProfile[];

    constructor(configPath?: string) {
        this.logger = Logger.getInstance();
        this.logger.setLogLevel(LogLevel.WARN);
        this.agents = configPath ? this.loadAgentsFromConfig(configPath) : [];
    }

    // Load agents from a YAML configuration file
    private loadAgentsFromConfig(configPath: string): AgentProfile[] {
        try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const parsedConfig = yaml.load(configContent);
            const config = parsedConfig as { agents?: AgentProfile[] };

            if (!config?.agents || !Array.isArray(config.agents)) {
                this.logger.error('Invalid configuration format', { configPath });
                return [];
            }

            return config.agents;
        } catch (error) {
            this.logger.error('Error loading agent configuration', {
                configPath,
                errorMessage: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }

    // Core matching algorithm with intelligent matching
    matchAgents(
        input: string,
        options: {
            maxResults?: number;
            minConfidence?: number;
        } = {}
    ): MatchResult[] {
        const { maxResults = 3, minConfidence = 0.5 } = options;

        const matches: MatchResult[] = this.agents
            .map((agent) => this.calculateMatchConfidence(input, agent))
            .filter((match) => match.confidence >= minConfidence)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxResults);

        return matches;
    }

    // Intelligent confidence calculation
    private calculateMatchConfidence(input: string, agent: AgentProfile): MatchResult {
        let bestMatch: MatchResult = {
            agentId: agent.id,
            matchedPattern: '',
            confidence: 0,
            matchedTags: agent.tags,
        };

        for (const pattern of agent.matchPatterns) {
            // Multiple matching strategies
            const confidence = this.calculatePatternConfidence(input, pattern);

            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    agentId: agent.id,
                    matchedPattern: pattern,
                    confidence,
                    matchedTags: agent.tags,
                };
            }
        }

        return bestMatch;
    }

    // Advanced pattern matching with multiple strategies
    private calculatePatternConfidence(input: string, pattern: string): number {
        // Case-insensitive substring match
        const normalizedInput = input.toLowerCase();
        const normalizedPattern = pattern.toLowerCase();

        if (normalizedInput.includes(normalizedPattern)) {
            // More precise scoring based on match characteristics
            const matchRatio = pattern.length / input.length;
            const baseConfidence =
                matchRatio > 0.8 ? 1.0 : matchRatio > 0.5 ? 0.8 : matchRatio > 0.3 ? 0.6 : 0.4;

            return baseConfidence;
        }

        return 0;
    }

    // Add new agents dynamically
    registerAgent(agent: AgentProfile): void {
        this.agents = [...this.agents, agent];
    }

    // Get all registered agents
    getAllAgents(): AgentProfile[] {
        return [...this.agents];
    }
}

export default ContainsAgentRegistry;
