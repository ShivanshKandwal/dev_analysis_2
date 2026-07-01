# Walkthrough: GitHub Pages CI/CD Setup

We have successfully configured the project for automated deployments to GitHub Pages.

## Completed Actions

### 1. GitHub Actions Workflow Configuration
* Created **[.github/workflows/deploy.yml](file:///C:/Software/dev_analysis_2/.github/workflows/deploy.yml)**.
* On every push to `main` modifying the `frontend/` directory, the action will:
  1. Check out the repository.
  2. Install dependencies with `--legacy-peer-deps`.
  3. Compile the production code using `npm run build`.
  4. Automatically push the generated static output from `frontend/dist/` to the `gh-pages` branch.

### 2. Relative Base Routing
* Modified [vite.config.ts](file:///C:/Software/dev_analysis_2/frontend/vite.config.ts) to use `base: './'`.
* This ensures that all stylesheet, script, and image references resolve correctly under the GitHub Pages repository sub-directory path (`https://<username>.github.io/<repo-name>/`).

---

## How to Access
Once the GitHub Actions workflow completes:
1. Go to your repository settings on GitHub $\rightarrow$ **Pages**.
2. Select the source branch as **`gh-pages`** (folder `/root`).
3. Your live React console will be accessible at:
   **`https://ShivanshKandwal.github.io/dev_analysis_2/`**
