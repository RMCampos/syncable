# Docker Hub Setup for GitHub Actions

This guide will help you set up the required secrets for the automated Docker build and push workflow.

## Prerequisites

1. A Docker Hub account (create one at https://hub.docker.com if you don't have one)
2. Repository admin access on GitHub

## Step 1: Create a Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com)
2. Click on your username in the top right corner
3. Select **Account Settings**
4. Go to **Security** tab
5. Click **New Access Token**
6. Set a description (e.g., "GitHub Actions - Syncable")
7. Set permissions to **Read, Write, Delete**
8. Click **Generate**
9. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!

## Step 2: Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click on **Settings**
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

Add the following two secrets:

### Secret 1: DOCKERHUB_USERNAME
- Name: `DOCKERHUB_USERNAME`
- Value: Your Docker Hub username (e.g., `yourname`)

### Secret 2: DOCKERHUB_TOKEN
- Name: `DOCKERHUB_TOKEN`
- Value: The access token you copied from Docker Hub

## Step 3: Verify the Workflow

1. The workflow is already configured in `.github/workflows/docker-publish.yml`
2. It will automatically run when you push to the `main` branch
3. You can also manually trigger it from the **Actions** tab in GitHub

## Docker Image Tags

The workflow will create the following tags:

- `latest` - Always points to the latest build from main
- `main-<git-sha>` - Tagged with the git commit SHA
- `main` - Tagged with the branch name

## Accessing Your Docker Image

After the workflow runs successfully, your image will be available at:

```bash
docker pull <your-dockerhub-username>/syncable:latest
```

## Testing Locally

You can test the built image locally:

```bash
# Pull the image
docker pull <your-dockerhub-username>/syncable:latest

# Run it
docker run -d \
  --name syncable \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/database" \
  <your-dockerhub-username>/syncable:latest
```

## Troubleshooting

### Workflow fails with authentication error
- Double-check that both secrets are set correctly
- Make sure the Docker Hub token has the correct permissions
- Try regenerating the Docker Hub access token

### Build fails
- Check the workflow logs in the Actions tab
- Ensure the Dockerfile builds successfully locally first

### Image not found on Docker Hub
- Make sure the workflow completed successfully
- Check that your Docker Hub repository is public (or use authentication when pulling)

## Manual Trigger

You can manually trigger the workflow from the GitHub Actions tab:
1. Go to **Actions** tab in your repository
2. Select **Build and Push Docker Image** workflow
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**
