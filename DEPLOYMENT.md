# Deployment Guide

## Docker Production Build

### Prerequisites
- Docker installed on your system
- PostgreSQL database accessible from your production environment

### Option 1: Use Pre-built Image from Docker Hub (Recommended)

The application is automatically built and published to Docker Hub on every push to main:

```bash
docker pull rmcampos/syncable:latest
```

### Option 2: Build the Docker Image Locally

```bash
docker build -t rmcampos/syncable:latest .
```

### Run the Container

#### Using environment variables:
```bash
docker run -d \
  --name syncable \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/database" \
  -e NODE_ENV=production \
  rmcampos/syncable:latest
```

#### Using env file:
```bash
# Create .env.production from the example
cp .env.production.example .env.production
# Edit .env.production with your values

# Run with env file
docker run -d \
  --name syncable \
  -p 3000:3000 \
  --env-file .env.production \
  syncable:latest
```

### Docker Compose (Optional)

If you want to run both the app and database with Docker Compose:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: syncable
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: syncable
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - syncable-network

  app:
    build: .
    image: syncable:latest
    environment:
      DATABASE_URL: postgresql://syncable:your_secure_password@db:5432/syncable
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - db
    networks:
      - syncable-network

volumes:
  postgres_data:

networks:
  syncable-network:
    driver: bridge
```

Run with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Health Check

After starting the container, verify it's running:

```bash
curl http://localhost:3000
```

### View Logs

```bash
docker logs syncable
```

### Stop and Remove Container

```bash
docker stop syncable
docker rm syncable
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `NODE_ENV` - Set to `production` (default in Dockerfile)
- `PORT` - Port to run on (default: 3000)
- `HOSTNAME` - Hostname to bind to (default: 0.0.0.0)

## Database Setup

Make sure your PostgreSQL database is initialized with the schema:

```bash
psql -U your_user -d your_database -f init-db.sql
```

## Automated Builds

A GitHub Actions workflow automatically builds and pushes the Docker image to Docker Hub when changes are pushed to the `main` branch.

**Setup Instructions:** See `.github/DOCKER_HUB_SETUP.md` for details on configuring the automated builds.

**Available Tags:**
- `rmcampos/syncable:latest` - Latest build from main branch
- `rmcampos/syncable:main-<sha>` - Specific commit builds
- Multi-architecture support: AMD64 and ARM64

## Notes

- The Docker image uses Node.js 20 Alpine for minimal size
- Runs as a non-root user (nextjs) for security
- Uses Next.js standalone output for optimized production bundle
- Multi-stage build reduces final image size
- Timezone is set to America/Sao_Paulo in the database connection
- Images are automatically built and published via GitHub Actions
