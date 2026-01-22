# GitHub Copilot Instructions for Mukt

## Project Overview
Mukt is a modular AI agent CLI tool that provides free AI model access through OpenRouter. 

**📋 Complete Technical Specification**: See [docs/DESIGN.md](../docs/DESIGN.md) for comprehensive architecture, module specifications, data flow diagrams, and design patterns. 

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
- Never use timeout commands (timeout, gtimeout) when testing applications
- Use simple direct commands: `echo 'quit' | node index.js` for testing CLI
- For debugging, use DEBUG environment variables, not complex shell constructs
- Test individual modules directly when needed rather than full application timeouts

## Standard Testing Procedures
- **Unit Tests**: Always use `npm run test:run` for comprehensive test suite
- **Quick CLI Test**: Use `echo 'quit' | node index.js` to verify app initialization
- **Debug Mode Test**: Use `DEBUG=1 echo 'quit' | node index.js` to see model selection
- **Module Testing**: Test individual modules with `node -e "import X from './src/X.js'; ..."` pattern
- **Standard Test Questions**: Use consistent test inputs:
  - "What is 2+2?" for basic functionality
  - "quit" to exit gracefully
  - Never use complex multi-line inputs in testing examples

## Debugging Commands
- `DEBUG=1`: Show model selection and basic debug info
- `DEBUG=2`: Show detailed model information and API parameters
- `npm run commit:test`: Run tests + quick CLI verification

## Structure
- src/: Core modules
- tests/: Vitest test files  
- tools.json: External tool definitions
- constants.js: API keys (git-ignored)
- index.js: CLI entry point

## Change Management
**See [docs/DESIGN.md](../docs/DESIGN.md) for complete development workflow**

- Each feature/fix/refactoring must be atomic (single focused change)
- Add dated entries to CHANGELOG.md at project root
- Format: `YYYY-MM-DD: [TYPE] Description`
- Types: FEATURE, BUGFIX, REFACTOR, TEST, DOCS
- Test → Log → Commit each change independently
- Example: `2026-01-22: [FEATURE] Added user authentication module`

## Commands
- npm run dev: Start development
- npm run test:run: Run all tests
- npm run commit:test: Test and quick run
- ./scripts/commit-workflow.sh: Full workflow
