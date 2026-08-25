# Testing evidence for Chapter 4

These checks are read-only. They do not start the API, connect to MongoDB, or modify source files.

## Unit tests (11/11)

```bash
node testing/unit-tests.mjs
```

Helpers covered: `calculateGrade`, `isPassingMark`, `formatMarks`, `formatRank`, backend `validateRegistrationInput`, frontend password/email rules, and `inferGradeLevel` / `normalizeGradeLevel`.

Latest log: `testing/unit-test-results.txt`

## JavaScript syntax

```bash
find backend/src backend/scripts testing -name "*.js" -o -name "*.mjs" | xargs -n1 node --check
find frontend/src -name "*.js" | xargs -n1 node --check
```

## Python syntax

```bash
python3 -m py_compile ml-model/app.py ml-model/train_all.py ml-model/utils/*.py
```

## Frontend lint

```bash
cd frontend && npm run lint
```

ESLint findings are style/hooks rules on existing files. Latest log: `testing/frontend-eslint.txt`
