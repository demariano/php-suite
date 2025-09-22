const nxPreset = require('@nx/jest/preset').default;

module.exports = { 
  ...nxPreset,
  // Global coverage thresholds for all projects
  coverageThreshold: {
    global: {
      branches: 50,    // Start conservative
      functions: 55,   // Current is ~60%, so set slightly below
      lines: 55,       // Current is ~58%, so set slightly below  
      statements: 55   // Current is ~59%, so set slightly belows
    }
  },
  // What files to include in coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/*.d.ts'
  ]
};
