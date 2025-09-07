import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // Workflow-specific Jest configuration
  displayName: 'Workflows',
  
  // Test environment and preprocessor
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root and file matching
  roots: ['<rootDir>/workflows'],
  testMatch: [
    '<rootDir>/workflows/**/*.spec.ts'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: {
        warnOnly: false
      }
    }]
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@workflows/(.*)$': '<rootDir>/workflows/$1'
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/workflows',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '.*\\.d\\.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Performance and parallelism
  maxWorkers: '50%',
  
  // Reporting and verbosity
  verbose: true,
  
  // Error handling
  bail: 1,
  errorOnDeprecated: true,
  
  // Additional Jest configuration
  collectCoverageFrom: [
    'workflows/**/*.ts',
    '!workflows/**/*.d.ts',
    '!workflows/**/*.spec.ts'
  ],
  
  // Mocking configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Performance optimization
  cache: true,
  
  // Global setup and teardown
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts'
  ]
};

export default config;