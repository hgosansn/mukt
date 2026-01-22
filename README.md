# Mukt - Free AI Agent

Node.js implementation of a free AI agent with tool support using the OpenRouter API. 
Mukt (Hindi: मुक्त, meaning "free/liberated") automatically finds and uses free AI models.

## Features

- 🤖 **Conversational AI**: Continuous chat loop with context preservation
- 🛠️ **Tool Support**: Built-in tools for file operations and command execution
- 📝 **Smart Memory**: Automatic conversation history management
- ⏱️ **Timeout Handling**: Robust API timeout and error handling
- 🧪 **Tested**: Comprehensive test suite with Vitest
- 🎯 **Model Selection**: Auto-selects free models based on preferences
- 🔧 **Modular Architecture**: Separated concerns for easy testing and maintenance

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
node llm.js
```

## Example Session

```
🎯 Selected Model: google/gemma-2-9b-it:free
📁 Working Directory: /Users/hsanson/scripts
💬 Starting agent conversation (type "quit" or "exit" to stop)
🛠️  Available tools: list_files, read_file, run_command
────────────────────────────────────────────────────────

👤 You: What files are in this directory?
🤖 Assistant: I'll check what files are in your current directory.
🛠️  Using tool: list_files
📁 Listing files in: .
total 32
-rw-r--r--  1 user  staff   245 Jan 22 10:30 package.json
-rwxr-xr-x  1 user  staff  8247 Jan 22 10:29 llm.js
-rwxr-xr-x  1 user  staff  2156 Jan 22 10:30 test.js

🤖 Assistant: I can see you have 3 main files in your directory:

1. **package.json** - Node.js project configuration file
2. **llm.js** - The main LLM agent script (executable)
3. **test.js** - Test suite for the agent (executable)

This appears to be a Node.js project for an LLM agent with testing capabilities.

👤 You: Can you read the package.json?
```

## Improvements over Bash Version

1. **Better Error Handling**: Proper try/catch with detailed error messages
2. **Type Safety**: Native JSON handling without external dependencies
3. **Async/Await**: Clean asynchronous code patterns
4. **Memory Management**: Automatic conversation history trimming
5. **Testable**: Modular design with comprehensive test suite
6. **Maintainable**: Clean class-based architecture
7. **Cross-platform**: Works on any system with Node.js

## Testing

Run the test suite to verify everything works:

```bash
npm test
```

Tests cover:
- Agent initialization
- Tool definitions and execution
- Conversation management
- Error handling
- JSON parsing/formatting

## Requirements

- Node.js 18+ (for fetch API support)
- OpenRouter API key