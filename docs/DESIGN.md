# Mukt AI Agent - Technical Design Document

## Project Overview

**Mukt** (Hindi: मुक्त, meaning "free/liberated") is a modular, zero-dependency AI agent CLI tool that provides free AI model access through OpenRouter's API. The project focuses on delivering a clean, maintainable Node.js implementation with robust tool support and automated model selection.

### Core Philosophy
- **Zero Runtime Dependencies**: Pure Node.js implementation using only built-in modules
- **Free-First**: Automatically discovers and prioritizes free AI models
- **Modular Architecture**: Separated concerns for testability and maintainability
- **Tool Integration**: Built-in function calling capabilities for file operations and system commands

## Architecture Overview

### System Design Pattern
The project follows a **modular service architecture** with dependency injection, enabling:
- Independent testing of each module
- Clear separation of concerns  
- Easy mocking and stubbing for tests
- Scalable addition of new features

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI (Entry)   │───▶│  ModelManager   │───▶│   ApiClient     │
│                 │    │                 │    │                 │
│ - User I/O      │    │ - Model Select  │    │ - API Calls     │
│ - Session Mgmt  │    │ - Scoring Logic │    │ - Error Handle  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Conversation   │    │   ToolSystem    │
│                 │    │                 │
│ - History Mgmt  │    │ - Tool Exec     │
│ - Context Trim  │    │ - JSON Config    │
└─────────────────┘    └─────────────────┘
```

## Module Specifications

### 1. CLI Module (`src/cli.js`)
**Purpose**: Main orchestrator and user interface

**Key Responsibilities**:
- User input/output management via readline
- Session lifecycle (initialization → conversation loop → cleanup)
- Iterative tool execution with safeguards (max 10 iterations)
- Error handling and graceful degradation

**Architecture Features**:
- Dependency injection for all core services
- Async/await pattern throughout
- Robust error boundaries with specific error categorization
- Signal handling for graceful shutdowns

### 2. ModelManager Module (`src/modelManager.js`)
**Purpose**: Intelligent model discovery and selection

**Key Responsibilities**:
- OpenRouter API integration for model discovery
- Free model filtering (pricing.prompt = "0" AND pricing.completion = "0")
- Tool support validation (supported_parameters includes 'tools')
- Model scoring algorithm for optimal selection

**Selection Algorithm**:
```javascript
// Scoring weights for model selection
const weights = {
    supported_parameters: 2,    // Tool support capability
    context_length: 1,         // Context window size
    preference_match: 3        // User preference alignment
}
```

### 3. ApiClient Module (`src/apiClient.js`)
**Purpose**: OpenRouter API communication layer

**Key Responsibilities**:
- HTTP request handling with proper authentication
- Timeout management (30s default)
- Error categorization (404, 429, 500, etc.)
- Response validation and parsing

**Error Handling Strategy**:
- Network errors → Retry suggestion
- 404 errors → Model not found explanation
- 429 errors → Rate limiting guidance
- Tool-related errors → Feature availability notice

### 4. Conversation Module (`src/conversation.js`)
**Purpose**: Context and message history management

**Key Responsibilities**:
- Message history with role-based structure (user/assistant/system/tool)
- Automatic context trimming (keeps system message, trims middle)
- Tool call metadata preservation
- Conversation size calculation for API limits

**Memory Management**:
- Default limit: 20 messages
- System message always preserved
- LIFO trimming strategy
- Byte size tracking for API optimization

### 5. ToolSystem Module (`src/toolSystem.js`)
**Purpose**: External tool integration and execution

**Key Responsibilities**:
- JSON-based tool definition loading
- Safe command execution with error isolation
- File system operations (list, read)
- System command execution with output capture

**Available Tools**:
- `list_files`: Directory listing with hidden file options
- `read_file`: File content reading with line limits
- `run_command`: Safe shell command execution

## Data Flow Architecture

### 1. Initialization Flow
```
index.js → CLI.constructor() → CLI.initialize() → [
    ToolSystem.loadTools(),
    ModelManager.selectModel()
] → Ready State
```

### 2. Conversation Flow
```
User Input → Conversation.addMessage('user') → 
ApiClient.makeApiCall() → Response Processing → [
    Message Content → Display,
    Tool Calls → ToolSystem.executeTool() → 
    Tool Results → Conversation.addMessage('tool') → 
    Follow-up API Call → Iteration or Final Response
]
```

### 3. Tool Execution Flow
```
Tool Call → ToolSystem.executeTool() → [
    list_files → ls command → Directory listing,
    read_file → fs.readFile() → File contents,
    run_command → execSync() → Command output
] → Formatted Response
```

## Feature Specifications

### Free Model Discovery
- **Automated Detection**: Scans OpenRouter catalog for zero-cost models
- **Tool Capability Filtering**: Only selects models supporting function calling
- **Smart Scoring**: Evaluates models based on parameters, context, and user preference
- **Fallback Strategy**: Graceful degradation when preferred models unavailable

### Iterative Tool Execution
- **Chain Processing**: Models can make sequential tool calls automatically
- **Intermediate Feedback**: Shows model "thinking" messages during tool chains
- **Loop Prevention**: 10-iteration maximum with clear user notification
- **Error Isolation**: Tool failures don't crash the conversation

### Conversation Management
- **Context Preservation**: Maintains conversation history across interactions
- **Memory Efficiency**: Automatic trimming to prevent token limit issues
- **Tool Call History**: Preserves tool interaction context for model continuity
- **Session Persistence**: Single session maintains full context

### Robust Error Handling
- **Categorized Errors**: Specific handling for network, API, model, and tool errors
- **User-Friendly Messages**: Clear explanations with actionable suggestions
- **Graceful Degradation**: Continues operation when non-critical components fail
- **Debug Modes**: Multiple verbosity levels (DEBUG=1, DEBUG=2)

## Testing Architecture

### Test Strategy
- **Unit Testing**: Each module tested in isolation using Vitest
- **Dependency Injection**: Enables easy mocking of external dependencies
- **Pure Function Testing**: Core logic functions tested independently
- **Integration Testing**: CLI flow tested with mocked dependencies

### Test Coverage Areas
```javascript
// Module test coverage
apiClient.test.js     // API communication, error handling
modelManager.test.js  // Model selection, scoring algorithm
conversation.test.js  // History management, message formatting
toolSystem.test.js    // Tool execution, file operations
```

### Test Commands
- `npm run test:run`: Full test suite execution
- `npm run commit:test`: Tests + quick CLI verification
- `echo 'quit' | node index.js`: Integration smoke test

## Development Guidelines

### Code Style Principles
1. **No Runtime Dependencies**: Use only Node.js built-ins
2. **ES Modules Only**: Consistent import/export pattern
3. **Pure Functions**: Prefer stateless, testable functions
4. **Clean Architecture**: No inline comments, descriptive function names
5. **Error-First**: Always handle errors explicitly

### File Organization
```
src/                    # Core application modules
├── cli.js             # Main orchestrator and UI
├── modelManager.js    # Model discovery and selection
├── apiClient.js       # OpenRouter API integration
├── conversation.js    # Context and history management
└── toolSystem.js      # Tool execution and management

tests/                 # Test specifications
├── *.test.js         # Unit tests for each module

tools.json            # External tool definitions
constants.js          # API keys (git-ignored)
index.js              # CLI entry point
```

### Change Management Process
1. **Atomic Changes**: Single focused change per commit
2. **Documentation**: Update CHANGELOG.md with dated entries
3. **Testing**: Run full test suite before commits
4. **Verification**: Quick CLI test with `echo 'quit' | node index.js`

## Extension Points

### Adding New Tools
1. Define tool specification in `tools.json`
2. Implement execution logic in `ToolSystem.executeTool()`
3. Add corresponding test cases
4. Update documentation

### Adding New Models/Providers
1. Extend `ModelManager` with new API integration
2. Implement provider-specific model discovery
3. Maintain consistent scoring algorithm
4. Add provider-specific error handling

### Enhancing Conversation Features
1. Extend `Conversation` class with new methods
2. Maintain backward compatibility with existing message format
3. Update trimming logic as needed
4. Add configuration options for limits

## Security Considerations

### Input Validation
- **Command Injection**: All shell commands properly escaped
- **Path Traversal**: File operations validate paths
- **API Key Protection**: Credentials stored in git-ignored constants.js

### Resource Management
- **Memory Limits**: Conversation history automatically trimmed
- **Execution Limits**: Tool iteration count capped at 10
- **Timeout Management**: API calls have 30s timeout limit
- **Error Isolation**: Tool failures contained within execution context

## Performance Characteristics

### Memory Usage
- **Baseline**: ~10MB Node.js runtime overhead
- **Conversation**: ~1KB per message (varies with tool calls)
- **Model Cache**: Minimal - only stores selected model metadata
- **Tool Execution**: Temporary - command output not persisted

### Latency Profiles
- **Model Selection**: ~2-3s (one-time per session)
- **API Calls**: 1-10s (depends on model and complexity)
- **Tool Execution**: <1s for file ops, variable for commands
- **Context Trimming**: <100ms (optimized algorithm)

### Scalability Considerations
- **Session Isolation**: Each CLI instance independent
- **Concurrent Requests**: Limited by OpenRouter API quotas
- **Tool Parallelization**: Currently sequential (design allows parallel)
- **Model Caching**: Opportunity for cross-session optimization

## Objectives and Success Metrics

### Primary Objectives
1. **Free AI Access**: Provide completely free AI agent capabilities
2. **Developer Experience**: Clean, hackable codebase for customization
3. **Reliability**: Robust error handling and graceful degradation
4. **Tool Integration**: Seamless AI-to-system interaction capability

### Success Metrics
- **Zero Runtime Cost**: No paid dependencies or services required
- **High Test Coverage**: >90% code coverage with meaningful tests
- **Fast Startup**: <5s from command to first response
- **Error Resilience**: Graceful handling of all failure modes
- **Easy Extension**: New tools addable with <20 lines of code

### Future Roadmap
- **Plugin System**: Dynamic tool loading from external packages
- **Multi-Provider**: Support for additional free AI services
- **Streaming Responses**: Real-time response display
- **Session Persistence**: Save/restore conversation state
- **Web Interface**: Browser-based alternative to CLI