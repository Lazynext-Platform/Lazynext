# ESLint Custom Rules

Custom ESLint rules for the Lazynext monorepo.

## Rules

| Rule | File | Description |
|------|------|-------------|
| `prefer-object-params` | `rules/prefer-object-params.mjs` | Enforces object-destructured parameters for functions with 3+ arguments |

## Usage

These rules are automatically loaded by the ESLint config at repo root (`eslint.config.mjs`). No additional setup is needed.

## Adding a New Rule

1. Create `rules/your-rule-name.mjs` with the rule implementation
2. Create `rules/__tests__/your-rule-name.test.mjs` with test cases
3. Register the rule in `eslint.config.mjs`

## Testing

```bash
npx eslint --rulesdir rules __tests__/**/*.test.mjs
```
