# GitHub Copilot Instructions for Mukt

## Project Overview
Mukt is a modular AI agent CLI tool that provides free AI model access through OpenRouter. 

**Complete Technical Specification**: See [docs/DESIGN.md](../docs/DESIGN.md) for comprehensive architecture, module specifications, data flow diagrams, and design patterns. 

## CRITICAL: Always Commit Changes
** MANDATORY: After ANY code changes, file modifications, or deletions - ALWAYS commit immediately**

**Required Workflow:**
1. Make changes
2. `git add .` 
3. `git commit -m "YYYY-MM-DD: [TYPE] Description"`
4. Update CHANGELOG.md if not already done
5. Never leave uncommitted changes

**Commit Message Format:**
- `YYYY-MM-DD: [FEATURE] New functionality added`
- `YYYY-MM-DD: [BUGFIX] Fixed specific issue`  
- `YYYY-MM-DD: [REFACTOR] Code restructuring`
- `YYYY-MM-DD: [TEST] Added/updated tests`
- `YYYY-MM-DD: [DOCS] Documentation changes`

## Key Development Rules
- Use ES modules exclusively (import/export)
- Maintain zero runtime dependencies 
- Write tests for all functions
- Run npm run test:run before commits
- Focus on free OpenRouter models
- Use dependency injection for testability
- NO emojis in code or console output
- Minimal logging: only errors and debug-mode info

### Extension Points (See DESIGN.md for details)
- **New Tools**: Add to `tools.json` + implement in `ToolSystem.executeTool()`
- **New Providers**: Extend `ModelManager` with new API integration
- **Conversation Features**: Extend `Conversation` class while maintaining message format compatibility

## Code Style
- NO comments in the middle of functions
- Add comments at the top of functions if needed (explain purpose, not implementation)
- Prefer pure atomic functions when possible
- Keep functions focused on single responsibility

## Testing & Development
- **Integration Tests Preferred**: Use `npm run no-api:test` for comprehensive testing without API keys
- **No API Dependencies**: Integration tests mock OpenRouter responses - no network or API key required
- **Fast & Reliable**: Integration tests run in ~200ms with deterministic results
- Never use timeout commands (timeout, gtimeout) when testing applications
- For debugging, use DEBUG environment variables, not complex shell constructs
- Test individual modules directly when needed rather than full application timeouts

## Standard Testing Procedures
- **Integration Tests (Recommended)**: Use `npm run no-api:test` for complete app testing without API calls
- **Unit Tests**: Use `npm run test:unit` for isolated module testing
- **Complete Test Suite**: Use `npm run test:all` for both unit and integration tests
- **Legacy CLI Test**: Use `echo 'quit' | node index.js` only when API integration testing is specifically needed
- **Debug Mode Test**: Use `DEBUG=1 echo 'quit' | node index.js` to see model selection (requires API key)
- **Module Testing**: Test individual modules with `node -e "import X from './src/X.js'; ..."` pattern
- **Development Testing**: Use `npm test` for watch mode during development
- **Standard Test Scenarios**: Integration tests cover:
  - Tool execution with user confirmations
  - Complete conversation flows with iterative tool calls
  - Error handling and graceful degradation
  - Realistic API response simulation

## Debugging Commands
- `DEBUG=1`: Show model selection and basic debug info
- `DEBUG=2`: Show detailed model information and API parameters
- `npm run no-api:test`: Run comprehensive integration tests (no API key needed)
- `npm run commit:test`: Run all tests + quick CLI verification

## Structure
- src/: Core modules
- tests/: Vitest test files  
- tools.json: External tool definitions
- constants.js: API keys (git-ignored)
- index.js: CLI entry point

## Change Management
**🚨 CRITICAL RULE: COMMIT EVERY CHANGE IMMEDIATELY**

**Mandatory Workflow (NEVER skip):**
1. Make any change (code/files/docs)
2. `git add .`
3. `git commit -m "YYYY-MM-DD: [TYPE] Description"` 
4. Update CHANGELOG.md (if not in commit)
5. Push when requested or logical

**Change Types:**
- **FEATURE**: New functionality, tools, workflows
- **BUGFIX**: Error corrections, issue fixes
- **REFACTOR**: Code restructuring, cleanup, optimization
- **TEST**: Test additions, modifications, test infrastructure  
- **DOCS**: Documentation, README, comments
- **SECURITY**: Security fixes, key management

**Examples:**
- `2026-01-22: [FEATURE] Added GitHub workflows for PR automation`
- `2026-01-22: [REFACTOR] Removed redundant auto-assign workflow`
- `2026-01-22: [BUGFIX] Fixed model selection scoring algorithm`

**See [docs/DESIGN.md](../docs/DESIGN.md) for complete development workflow**

## Commands
- npm run dev: Start development
- npm run test:all: Run all tests (unit + integration)
- npm run no-api:test: Run integration tests without API key
- npm run test:unit: Run unit tests only
- npm run commit:test: Test and quick run
- ./scripts/commit-workflow.sh: Full workflow
