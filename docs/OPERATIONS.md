# Project Operations

This document details the CI pipeline, database migrations, and operational procedures for the Adult Ad Network with Compliance Scoring project.

## CI Pipeline

The project uses GitHub Actions for Continuous Integration. The pipeline is defined in `.github/workflows/ci.yml`.

### Workflow Steps

1. **Setup**: Configures Node.js (v20) and caching for dependencies.
2. **Install**: Runs `npm install` in the root directory to install and link all workspace packages.
3. **Lint**: Runs `npm run lint` to ensure code quality and style consistency.
4. **Build**: Runs `npm run build` to type-check all packages and build the distribution artifacts.
5. **Test**: Runs `npm test` to execute all unit and integration tests across the monorepo.

## Database Migrations

The project uses **Drizzle ORM** and **Drizzle Kit** for database management.

### Unified Migration Command

To run migrations for all database-backed packages at once, run:

```bash
npm run migrate
```

### Manual Migrations

To generate or push migrations for a specific package (e.g., `packages/identity`):

```bash
cd packages/identity
npm run generate  # Generate migration SQL
npm run push      # Push changes directly to the database (development)
```

## Service Ports

| Service | Port |
| --- | --- |
| Identity | 3000 |
| Ad Server | 3001 |
| Campaign Manager | 3002 |
| Consent Manager | 3003 |
| Audit Log | 3004 |
| Web3 Anchor | 3005 |
| Scoring Engine | 3006 |
| Dashboard API | 3007 |

## Troubleshooting

- **Database Connectivity**: Ensure PostgreSQL is running via `docker-compose up -d`. Check the `DATABASE_URL` in the respective `.env` files.
- **Kafka Issues**: Use `docker logs` to inspect Kafka and Zookeeper. Ensure the `KAFKA_BROKERS` environment variable is correctly set.
- **Redis Cache**: Verify Redis connectivity for the Ad Server and Scoring Engine.
