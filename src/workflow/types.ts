// src/workflow/types.ts

/**
 * Workflow status enum representing different states of a workflow
 */
export enum WorkflowStatus {
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Represents a single workflow step
 */
export interface WorkflowStep {
    id: string;
    type: 'sequential' | 'parallel';
    action: string;
    dependencies?: string[];
}

/**
 * Workflow definition structure
 */
export interface WorkflowDefinition {
    id: string;
    name: string;
    version: string;
    steps: WorkflowStep[];
}

/**
 * Context for workflow execution
 */
export interface WorkflowContext {
    workflowId: string;
    initiator: string;
    metadata: Record<string, any>;
    environmentVariables?: Record<string, string>;
}

/**
 * Result of a single workflow step
 */
export interface StepResult {
    stepId: string;
    status: 'success' | 'failure' | 'skipped';
    output?: any;
    error?: string;
}

/**
 * Validation gate for workflow progression
 */
export interface ValidationGate {
    id: string;
    condition: (context: WorkflowContext) => Promise<boolean>;
    errorMessage?: string;
}

/**
 * Result of validation gates
 */
export interface ValidationResult {
    passed: boolean;
    failedGates: ValidationGate[];
}

/**
 * Domain coordination structure
 */
export interface Domain {
    id: string;
    dependencies?: string[];
    handler: (context: WorkflowContext) => Promise<any>;
}

/**
 * Result of parallel domain coordination
 */
export interface CoordinationResult {
    domainResults: Record<string, any>;
    errors: Record<string, Error>;
}

/**
 * Workflow configuration for parsing YAML
 */
export interface WorkflowConfig {
    workflow_id: string;
    name: string;
    version: string;
    sequence?: string[];
    parallel?: string[];
    validation_gates?: string[];
}
