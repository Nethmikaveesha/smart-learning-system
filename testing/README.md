# Testing

## Unit tests (no server)

```bash
node testing/unitTests.js
```

Covers grade calculation, pass mark, ranking behaviour, Z-score sign.

## API / security tests (backend running on :5001)

```bash
node testing/apiTests.js
# or: cd backend && npm run test:api
```

Covers wrong password, invalid JWT, unauthorized `/api/risk`, role blocks,
Commerce validation, parent/student dashboard fields, attendance/Commerce
ownership (IDOR), contact validation, essay submit binding, and result validation.

Override demo passwords with `TEST_ADMIN_PASSWORD`, `TEST_STUDENT_PASSWORD`, etc.
Demo seed accounts (`*.@edutrack.test`) also work after `npm run seed:commerce-risk`.
