# GitHub Repository Setup

This document explains how to configure GitHub repository settings for collaboration on the Mukt project.

## Automated Workflows

The repository includes two GitHub Actions workflows:

### 1. Tests Workflow (`.github/workflows/test.yml`)
- **Triggers**: Pull requests and pushes to main branch
- **Node.js versions**: Tests against 18.x, 20.x, and 22.x
- **Steps**: 
  - Runs full test suite (`npm run ci:test`)
  - Performs quick CLI validation
  - Validates project structure
- **Path exclusions**: Ignores documentation changes to avoid unnecessary test runs

### 2. Release Workflow (`.github/workflows/release.yml`)
- **Triggers**: When version tags (v*) are pushed
- **Restrictions**: Only repo owner can trigger releases
- **Actions**:
  - Runs full test suite before release
  - Extracts release notes from CHANGELOG.md
  - Creates GitHub release with automated notes

## Pull Request Template

Instead of automated assignment, the repository uses:
- **PR Template** (`.github/pull_request_template.md`): Provides structured checklist for contributors
- **CODEOWNERS** (`.github/CODEOWNERS`): Automatically requests review from repo owner

## Required Repository Settings

### Branch Protection Rules

To restrict access to the main branch, configure these settings in GitHub:

1. **Go to**: Repository Settings → Branches → Add rule
2. **Branch name pattern**: `main`
3. **Configure these protection rules**:

```yaml
Branch Protection Settings:
✅ Restrict pushes that create files with names exceeding 100 characters
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale reviews when new commits are pushed
  ✅ Require review from CODEOWNERS
✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Status checks to require:
      - test (ubuntu-latest, 18.x)
      - test (ubuntu-latest, 20.x) 
      - test (ubuntu-latest, 22.x)
      - lint-and-format
✅ Require conversation resolution before merging
✅ Restrict pushes to matching branches
  ✅ Restrict pushes to matching branches to repository administrators only
✅ Allow force pushes: ❌ (disabled)
✅ Allow deletions: ❌ (disabled)
```

### Repository Settings

Configure these additional settings under **Settings → General**:

```yaml
General Settings:
- Default branch: main
- Allow merge commits: ✅
- Allow squash merging: ✅ (recommended)
- Allow rebase merging: ✅
- Automatically delete head branches: ✅

Pull Requests:
- Allow auto-merge: ✅
- Require linear history: ✅ (recommended)
- Always suggest updating pull request branches: ✅
```

### Collaborator Permissions

Under **Settings → Manage access**:

```yaml
Permission Levels:
- Repository owner: Admin (full access)
- Collaborators: Write (can create PRs, cannot push to main)
- External contributors: Read (can fork and create PRs)
```

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to ensure proper review:

```
# Global ownership - repo owner reviews all changes
* @[REPO_OWNER_USERNAME]

# Critical files require extra scrutiny  
package.json @[REPO_OWNER_USERNAME]
constants.js @[REPO_OWNER_USERNAME]
.github/ @[REPO_OWNER_USERNAME]
```

## Environment Variables

For the workflows to function properly, ensure these secrets/variables are configured:

### Repository Secrets (Settings → Secrets and variables → Actions)

```yaml
Secrets:
- OPENROUTER_API_KEY: (Optional, for integration tests)

Variables:
- NODE_VERSION: "20.x" (Default Node.js version)
```

## Contribution Workflow

With these settings, the collaboration workflow becomes:

1. **Contributors**:
   - Fork the repository
   - Create feature branches
   - Submit pull requests to main
   - Address review feedback

2. **Repository Owner**:
   - Review pull requests
   - Merge after tests pass and review is complete
   - Create releases by pushing version tags

3. **Automated Systems**:
   - Run tests on all PRs
   - Prevent direct pushes to main
   - Auto-assign PRs for review
   - Create releases from tags

## Quick Setup Commands

After creating the repository on GitHub, run these commands to apply the settings programmatically (requires GitHub CLI):

```bash
# Enable branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test (ubuntu-latest, 18.x)","test (ubuntu-latest, 20.x)","test (ubuntu-latest, 22.x)","lint-and-format"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null

# Set repository settings
gh api repos/:owner/:repo \
  --method PATCH \
  --field allow_squash_merge=true \
  --field allow_merge_commit=true \
  --field allow_rebase_merge=true \
  --field delete_branch_on_merge=true
```

Replace `:owner` and `:repo` with your actual GitHub username and repository name.

## Monitoring

The repository owner can monitor collaboration through:

- **Actions tab**: View workflow runs and test results
- **Pull requests**: Review incoming contributions
- **Insights → Pulse**: Track repository activity
- **Settings → Branches**: Monitor protection rule violations