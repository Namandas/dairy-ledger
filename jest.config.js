/** Jest config using ts-jest for TypeScript files */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.+(ts|tsx|js)']
};
