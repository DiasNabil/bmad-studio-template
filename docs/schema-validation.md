# MCP Schema Validation

## Overview

The MCP (Master Configuration Protocol) Schema Validation system ensures the integrity and consistency of project configuration across the bmad-studio-template ecosystem.

## Validation Checks

The schema validator performs the following checks:

1. **Version Validation**
    - Ensures the schema version matches the expected version
    - Prevents usage of outdated or incompatible schema configurations

2. **Project Name Validation**
    - Confirms that the project name is defined and not empty
    - Provides a consistent naming convention

3. **Agents Validation**
    - Verifies that at least one agent is defined
    - Checks that each agent has a valid name and type
    - Optional: Validates agent-specific configuration using `AgentConfigurator`

4. **Environments Validation**
    - Ensures at least one environment is defined
    - Validates environment name and type

## Error Handling

Validation errors are managed through the `BMadError` system, providing:

- Detailed error codes
- Contextual information
- Compatibility with existing error handling mechanisms

## Metrics and Logging

- Prometheus metrics tracked for schema validation
- Audit logs generated in a Vault-compatible format
- Integration with existing logging infrastructure

## CI/CD Integration

The schema validation is integrated into the CI/CD pipeline:

- Runs on push and pull requests to main/develop branches
- Blocks merge if schema validation fails
- Exports metrics and audit logs as artifacts

## Usage

### Manual Validation

```typescript
import { MCPSchemaValidator } from './lib/validators/mcpSchemaValidator';

try {
    MCPSchemaValidator.validateProjectMCPSchema(projectRootPath);
    console.log('Schema validation successful');
} catch (error) {
    console.error('Schema validation failed', error);
}
```

### Configuration File

Create a `project.mcp.json` in your project root with the following structure:

```json
{
    "version": "1.0.0",
    "projectName": "MyBMadProject",
    "agents": [
        {
            "name": "MainAgent",
            "type": "primary",
            "configuration": {}
        }
    ],
    "environments": [
        {
            "name": "Production",
            "type": "cloud",
            "parameters": {}
        }
    ]
}
```

## Troubleshooting

- Ensure `project.mcp.json` exists in the project root
- Check error messages for specific validation failures
- Verify agent and environment configurations

## Contributing

When modifying the schema validation:

1. Update validation logic in `mcpSchemaValidator.ts`
2. Modify workflows in `.bmad-core/workflows/schema-validation.yml`
3. Ensure backwards compatibility
4. Add comprehensive test cases
