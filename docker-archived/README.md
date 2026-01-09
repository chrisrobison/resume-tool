# Docker Infrastructure Archive

This directory contains Docker configuration files that were created for a planned SaaS/monetization expansion of the Job Hunt Manager application.

## Archived Files

- **Dockerfile** - Multi-stage build for Node.js application
- **docker-compose.yml** - Complete stack with MySQL, Redis, Nginx, and marketing site
- **.dockerignore** - Docker build exclusions

## Why Archived?

The core Job Hunt Manager application is a **static site** that runs entirely in the browser with optional Node.js backend for AI features. The Docker infrastructure was built for a more complex deployment scenario that includes:

- Multi-user authentication (OAuth, JWT)
- MySQL database for user accounts
- Redis for session management
- Stripe payment integration
- Dedicated marketing site (Next.js)
- Nginx reverse proxy

This infrastructure is **not currently deployed or required** for the primary use case of the application, which is:
- Local browser-based resume/job management
- Optional AI integration via simple Node.js server
- LocalStorage/IndexedDB for data persistence
- Privacy-first, no-account-required design

## If You Need Docker

If you want to deploy the full SaaS version with multi-user support and monetization:

1. Review the files in this directory
2. Set up the required environment variables (see `server/.env.example`)
3. Move the files back to the root directory
4. Run `docker-compose up -d`

See `MONETIZATION-INTEGRATION-COMPLETE.md` for full documentation on the SaaS features.

## Date Archived

January 9, 2025
