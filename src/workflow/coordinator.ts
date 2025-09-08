// src/workflow/coordinator.ts
import { EventEmitter } from 'events';
import { Domain, CoordinationResult, WorkflowContext } from './types';

/**
 * ParallelCoordinator - Handles parallel execution of workflow domains
 */
export class ParallelCoordinator extends EventEmitter {
    private activeDomains: Map<string, DomainExecution> = new Map();

    constructor() {
        super();
    }

    /**
     * Coordinate parallel execution of multiple domains
     */
    async coordinateDomains(domains: Domain[]): Promise<CoordinationResult> {
        this.emit('coordination_started', { domainCount: domains.length });

        const domainResults: Record<string, any> = {};
        const errors: Record<string, Error> = {};

        // Create execution context
        const context: WorkflowContext = {
            workflowId: 'parallel-coordination',
            initiator: 'coordinator',
            metadata: {
                domains: domains.map((d) => d.id),
                startTime: new Date().toISOString(),
            },
        };

        // Handle dependencies first
        const sortedDomains = this.sortDomainsByDependencies(domains);
        const independentDomains = sortedDomains.filter(
            (d) => !d.dependencies || d.dependencies.length === 0
        );
        const dependentDomains = sortedDomains.filter(
            (d) => d.dependencies && d.dependencies.length > 0
        );

        try {
            // Execute independent domains in parallel
            if (independentDomains.length > 0) {
                const parallelPromises = independentDomains.map((domain) =>
                    this.executeDomain(domain, context)
                );

                const independentResults = await Promise.allSettled(parallelPromises);

                independentResults.forEach((result, index) => {
                    const domain = independentDomains[index];
                    if (result.status === 'fulfilled') {
                        domainResults[domain.id] = result.value;
                        this.emit('domain_completed', {
                            domainId: domain.id,
                            result: result.value,
                        });
                    } else {
                        errors[domain.id] = result.reason;
                        this.emit('domain_failed', { domainId: domain.id, error: result.reason });
                    }
                });
            }

            // Execute dependent domains sequentially based on dependencies
            for (const domain of dependentDomains) {
                try {
                    // Check if dependencies are satisfied
                    const dependenciesSatisfied =
                        domain.dependencies?.every((dep) => domainResults[dep] !== undefined) ??
                        true;

                    if (dependenciesSatisfied) {
                        const result = await this.executeDomain(domain, context);
                        domainResults[domain.id] = result;
                        this.emit('domain_completed', { domainId: domain.id, result });
                    } else {
                        const error = new Error(
                            `Dependencies not satisfied for domain ${domain.id}`
                        );
                        errors[domain.id] = error;
                        this.emit('domain_failed', { domainId: domain.id, error });
                    }
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    errors[domain.id] = err;
                    this.emit('domain_failed', { domainId: domain.id, error: err });
                }
            }
        } catch (error) {
            this.emit('coordination_failed', { error });
            throw error;
        }

        const result: CoordinationResult = {
            domainResults,
            errors,
        };

        this.emit('coordination_completed', result);
        return result;
    }

    /**
     * Execute a single domain
     */
    private async executeDomain(domain: Domain, context: WorkflowContext): Promise<any> {
        const execution: DomainExecution = {
            domain,
            startTime: new Date(),
            status: 'running',
        };

        this.activeDomains.set(domain.id, execution);
        this.emit('domain_started', { domainId: domain.id });

        try {
            const result = await domain.handler(context);
            execution.status = 'completed';
            execution.endTime = new Date();
            execution.result = result;

            return result;
        } catch (error) {
            execution.status = 'failed';
            execution.endTime = new Date();
            execution.error = error instanceof Error ? error : new Error(String(error));

            throw execution.error;
        } finally {
            this.activeDomains.delete(domain.id);
        }
    }

    /**
     * Sort domains by their dependencies using topological sort
     */
    private sortDomainsByDependencies(domains: Domain[]): Domain[] {
        const sorted: Domain[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const visit = (domain: Domain): void => {
            if (visiting.has(domain.id)) {
                throw new Error(`Circular dependency detected involving domain: ${domain.id}`);
            }

            if (visited.has(domain.id)) {
                return;
            }

            visiting.add(domain.id);

            // Visit dependencies first
            if (domain.dependencies) {
                for (const depId of domain.dependencies) {
                    const depDomain = domains.find((d) => d.id === depId);
                    if (depDomain) {
                        visit(depDomain);
                    }
                }
            }

            visiting.delete(domain.id);
            visited.add(domain.id);
            sorted.push(domain);
        };

        for (const domain of domains) {
            if (!visited.has(domain.id)) {
                visit(domain);
            }
        }

        return sorted;
    }

    /**
     * Get status of all active domains
     */
    getActiveDomains(): Map<string, DomainExecution> {
        return new Map(this.activeDomains);
    }

    /**
     * Cancel execution of a specific domain
     */
    async cancelDomain(domainId: string): Promise<boolean> {
        const execution = this.activeDomains.get(domainId);
        if (execution && execution.status === 'running') {
            execution.status = 'cancelled';
            execution.endTime = new Date();
            this.activeDomains.delete(domainId);
            this.emit('domain_cancelled', { domainId });
            return true;
        }
        return false;
    }

    /**
     * Cancel all active domain executions
     */
    async cancelAll(): Promise<void> {
        const activeDomainIds = Array.from(this.activeDomains.keys());

        for (const domainId of activeDomainIds) {
            await this.cancelDomain(domainId);
        }

        this.emit('coordination_cancelled');
    }
}

/**
 * Represents the execution state of a domain
 */
interface DomainExecution {
    domain: Domain;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    result?: any;
    error?: Error;
}

// Export singleton instance
export const parallelCoordinator = new ParallelCoordinator();
