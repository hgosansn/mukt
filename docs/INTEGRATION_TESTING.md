# Integration Testing for Mukt AI Agent

This document explains how to test the Mukt AI agent without requiring OpenRouter API calls or valid API keys.

## Testing Commands

### Integration Tests (No API Required)
```bash
# Run only integration tests (mocked API responses)
npm run test:integration

# Alternative command for no-API testing
npm run no-api:test
```

### Unit Tests Only
```bash
# Run unit tests excluding integration tests
npm run test:unit
```

### Complete Test Suite
```bash
# Run all tests (unit + integration)
npm run test:all

# Legacy test command (updated to include integration tests)
npm run commit:test
```

## What Integration Tests Cover

The integration tests (`tests/integration.test.js`) provide comprehensive coverage of:

### 1. Application Initialization
- Mocks ModelManager.selectModel() to avoid real API calls
- Mocks ToolSystem.loadTools() for tool definitions
- Tests complete CLI initialization without external dependencies

### 2. Tool Confirmation Mechanism
- Tests user confirmation prompts for destructive tools (write_file, create_directory, run_command)
- Tests automatic approval for read-only tools (list_files, read_file)
- Mocks readline interface for user input simulation

### 3. Conversation Flow Simulation
- Mocks realistic OpenRouter API responses with tool calls
- Tests iterative tool execution (model → tool → model → response)
- Verifies conversation history management
- Tests error handling and graceful degradation

### 4. End-to-End Workflow
- Simulates complete user interaction from input to final response
- Tests multi-step tool chains (write file → verify content)
- Validates conversation state management throughout the process

## Benefits of Integration Testing

### ✅ No External Dependencies
- No OpenRouter API key required
- No internet connection needed
- No rate limiting concerns
- Runs consistently in any environment

### ✅ Fast and Reliable
- Tests complete in ~200ms
- Deterministic results (no API variability)
- Can run offline
- Perfect for CI/CD pipelines

### ✅ Comprehensive Coverage
- Tests all major user interaction flows
- Validates tool confirmation mechanism
- Tests error handling scenarios
- Covers iterative tool execution patterns

## Migration from `quit` Command Testing

### Before (API-dependent):
```bash
# Required valid API key and network
echo 'quit' | node index.js

# Problems:
# - Needs OPENROUTER_API_KEY environment variable
# - Makes real API calls
# - Dependent on network connectivity
# - Subject to rate limits
# - Results vary based on API responses
```

### After (Mock-based):
```bash
# No API key or network required
npm run no-api:test

# Benefits:
# - Zero external dependencies
# - Consistent, fast results
# - Tests more scenarios than simple quit
# - Validates complete conversation flows
# - Perfect for development and CI
```

## Example Integration Test Scenarios

### Scenario 1: Tool Confirmation
```javascript
// Tests that destructive tools require user confirmation
const confirmed = await cli.confirmToolExecution('write_file', { 
    file_path: 'test.txt', 
    content: 'test content' 
});
```

### Scenario 2: Complete Conversation Flow
```javascript
// Simulates: User request → AI response with tools → Tool execution → Final response
// Without any real API calls - all mocked with realistic responses
```

### Scenario 3: Error Handling
```javascript
// Tests graceful handling of API errors, tool failures, etc.
// Ensures the application doesn't crash on various failure modes
```

## Running Integration Tests in Development

For development workflow, use integration tests instead of the legacy `quit` command:

```bash
# Quick verification during development
npm run test:integration

# Full development testing
npm run test:all

# Continuous development testing
npm run test  # Starts vitest in watch mode
```

This approach provides faster, more reliable, and more comprehensive testing than the previous API-dependent method.