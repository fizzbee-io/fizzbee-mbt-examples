# FizzBee MBT Quickstart - TypeScript

Model-based testing example for a Counter implementation using FizzBee.

## Setup

```bash
npm install
npm run build
```

## Run Tests

```bash
# Test with MemCounter (in-memory)
npm run test:mem

# Test with PGCounter (PostgreSQL)
npm run test:pg
```

For PGCounter tests, ensure PostgreSQL is running:
```bash
# Run PostgreSQL with Docker:
docker run --rm --name my-postgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres
```

## Run Application

```bash
npm start
```
