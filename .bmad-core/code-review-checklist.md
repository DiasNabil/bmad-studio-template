# BMAD Studio Code Review Checklist

## 1. General Code Quality
### 1.1 Code Structure
- [ ] Follows modular design principles
- [ ] Clear separation of concerns
- [ ] Consistent naming conventions
- [ ] Appropriate use of design patterns

### 1.2 Readability
- [ ] Well-documented functions and classes
- [ ] Meaningful variable and function names
- [ ] Comments explain complex logic
- [ ] No overly complex functions (max 20 lines)

## 2. Technical Excellence
### 2.1 Performance
- [ ] Efficient algorithm implementation
- [ ] Minimal computational complexity
- [ ] Appropriate data structures used
- [ ] Potential memory leak considerations

### 2.2 Error Handling
- [ ] Comprehensive error handling
- [ ] Graceful degradation mechanisms
- [ ] Proper error logging
- [ ] Meaningful error messages

## 3. Security Considerations
- [ ] Input validation implemented
- [ ] No hardcoded credentials
- [ ] Secure file system operations
- [ ] Protection against common vulnerabilities

## 4. TypeScript & Type Safety
- [ ] Strict type checking enabled
- [ ] No `any` type usage
- [ ] Proper type annotations
- [ ] Interfaces and type definitions clear

## 5. Testing
- [ ] Unit tests covering critical paths
- [ ] Integration tests for complex interactions
- [ ] High test coverage (target 85%+)
- [ ] Edge cases and error scenarios tested

## 6. MCP & Agent Configuration
- [ ] Follows BMAD configuration standards
- [ ] Proper agent selection logic
- [ ] Configuration validation implemented
- [ ] Fallback and error recovery mechanisms

## 7. Workflow & Generator Quality
- [ ] Supports multiple project types
- [ ] Flexible and extensible design
- [ ] Handles complex configuration scenarios
- [ ] Robust template generation

## 8. Code Review Severity Levels
- **Critical**: Must fix before merge
- **High**: Strong recommendation to address
- **Medium**: Consider improvement
- **Low**: Optional optimization

## 9. Quality Gates
### Automated Checks
- Fails if:
  - Test coverage < 80%
  - Critical security issues detected
  - Linting errors present
  - Build process fails

### Manual Review Requirements
- Minimum of 2 senior developer approvals
- Pair programming for complex changes
- Comprehensive change description

## 10. Documentation
- [ ] Updated architecture documentation
- [ ] Changelog entries
- [ ] API documentation for new features