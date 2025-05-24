import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    files: ['**/*.ts'],
    ...eslint.configs.recommended,
  },
  tseslint.configs.strict.map((config) => ({
    ...config,
    files: ['**/*.ts'],
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  })),
  tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts'],
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  })),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    files: ['**/*.ts'],
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  }
);
