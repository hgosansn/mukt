# Test Skill

Run tests for the Mukt AI agent project.

## Usage

@copilot test

## What it does

This skill runs the complete test suite using Vitest and provides feedback on test results.

## Implementation

```bash
npm run test:run
```

This will:
1. Run all tests in the `tests/` directory
2. Execute tests for all core modules:
   - `conversation.test.js` - Message history management
   - `modelManager.test.js` - OpenRouter model selection
   - `apiClient.test.js` - API communication
   - `toolSystem.test.js` - External tool execution
3. Report test coverage and results
4. Exit with appropriate code (0 for success, 1 for failure)

## When to use

- Before committing changes
- After modifying any source code
- When debugging functionality
- As part of CI/CD pipeline verification

## Expected output

Tests should pass with output showing:
- Test file execution status
- Number of tests passed/failed
- Execution duration
- Coverage information

Example successful run:
```
✓ tests/conversation.test.js (6)
✓ tests/modelManager.test.js (4) 
✓ tests/apiClient.test.js (3)
✓ tests/toolSystem.test.js (7)

Test Files  4 passed (4)
Tests  20 passed (20)
```
