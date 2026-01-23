# Mukt - Free AI Agent

Node.js implementation of a free AI agent with tool support using the OpenRouter API. 

**Mukt** (Hindi: मुक्त, meaning "free/liberated") automatically finds and uses free AI models on OpenRouter.ai, making AI experimentation accessible to everyone.

## Why Mukt?

I believe experimenting with the newest AI models should be accessible to all. Most AI providers require credit cards upfront, creating barriers for many users. Mukt is designed for developers and tech enthusiasts who want to explore AI capabilities without financial commitment.

**Disclaimer**: While Mukt helps avoid charges by selecting free models, usage is subject to OpenRouter's terms and conditions. Free models may have different privacy or data usage policies than paid models. Check your settings at https://openrouter.ai/settings/privacy. 

## Features

- **Conversational AI**: Continuous chat loop with context preservation
- **Tool Support**: Built-in tools for file operations and command execution
- **Smart Memory**: Automatic conversation history management
- **Timeout Handling**: Robust API timeout and error handling
- **Tested**: Comprehensive test suite with Vitest
- **Model Selection**: Auto-selects free models based on preferences
- **Modular Architecture**: Separated concerns for easy testing and maintenance

## Available Tools

- **`list_files`** - List directory contents
- **`read_file`** - Read file contents with optional line limits
- **`run_command`** - Execute shell commands safely

## Installation

### Global Installation

```bash
npm install -g mukt
```

### Local Development

```bash
# Clone and setup
git clone <repository>
cd mukt
npm install

# Make executable
chmod +x index.js
```

## Usage

```bash
# Run with default preference (google)
mukt

# Run with specific model preference
mukt llama
mukt mistral
mukt claude

# Local development
node index.js [preference]
```

## Environment Variables

Set `OPENROUTER_API_KEY` environment variable for security:

```bash
export OPENROUTER_API_KEY="your-api-key-here"
```

### Configuration Setup

Create a `constants.js` file for local development:

```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "your-api-key-here";

export {
    OPENROUTER_API_KEY
};
```

**Note**: The `constants.js` file is git-ignored to prevent accidental API key commits.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests once
npm run test:run

# Start development
npm start
```

## Project Structure

```
mukt/
├── src/
│   ├── modelManager.js     # OpenRouter model management
│   ├── apiClient.js        # API communication
│   ├── toolSystem.js       # Tool loading and execution
│   ├── conversation.js     # Message history management
│   └── cli.js             # User interface
├── tests/                 # Vitest test suite
├── tools.json            # Tool definitions
├── constants.js          # API key configuration (git-ignored)
└── index.js              # Main entry point
```

```bash
export OPENROUTER_API_KEY="your-api-key-here"
node index.js
```

## Testing

### Complete Test Suite
```bash
# Run all tests (unit + integration)
npm run test:all
```

### No-API Testing (Recommended)
```bash
# Test without requiring OpenRouter API key
npm run no-api:test
```

### Individual Test Suites  
```bash
# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# Development testing (watch mode)
npm test
```

Tests cover:
- Agent initialization and model selection
- Tool definitions and execution with confirmations
- Complete conversation flows (mocked API responses)
- Iterative tool execution
- User confirmation prompts
- Error handling and graceful degradation
- JSON parsing/formatting

**See [docs/INTEGRATION_TESTING.md](docs/INTEGRATION_TESTING.md) for detailed testing documentation.**

## Requirements

- Node.js (version 16 or higher)
- [OpenRouter API key](https://openrouter.ai/settings/keys) (free account)
- Set credit limit to zero to avoid any charges

## License & Usage

This project is open source. You provide your own API key and are responsible for your own usage according to OpenRouter's terms of service.

Important Legal Notice: "Client Tooling" vs. "Reselling"

**This tool is designed for legitimate "client tooling" usage:**

**Safe & Legal**: A CLI where **you provide your own OpenRouter API key**. This is considered a "client" application (like a browser or mobile app) and is perfectly legal under OpenRouter's terms.

**Prohibited**: A service that uses someone else's API key to provide free access to many users. This would be "redistributing" or "reselling" the service, which violates OpenRouter's terms without a specific partner agreement.
