# Mukt AI Agent - Change Log

## 2026-01-23

2026-01-23: [DOCS] Updated GitHub Copilot instructions to use integration testing approach instead of API-dependent quit command testing  
2026-01-23: [FEATURE] Added comprehensive integration testing - mocks OpenRouter API responses to test complete conversation flows without requiring API keys or network connectivity  
2026-01-23: [FEATURE] Added file manipulation suite - new write_file and create_directory tools with user confirmation mechanism for destructive operations (Enter key or y/yes to confirm)  

## 2026-01-22

2026-01-22: [FEATURE] Set up GitHub collaboration workflows - added automated tests on PRs, branch protection setup guide, auto-assignment of PRs to repo owner, release automation, and CODEOWNERS configuration  
2026-01-22: [SECURITY] CRITICAL: Removed hardcoded API key from git history - rewrote initial commit to replace exposed OpenRouter API key with placeholder, completely cleaned from all git references  
2026-01-22: [FEATURE] Improved environment variable management - added .env file support with custom zero-dependency loader, .env.template for easy setup, maintains zero runtime dependencies philosophy  
2026-01-22: [DOCS] Created comprehensive design documentation (docs/DESIGN.md) covering architecture, data flow, module specifications, and development guidelines  
2026-01-22: [DOCS] Updated copilot-instructions.md to reference design documentation for better AI assistant understanding of project structure  
2026-01-22: [FEATURE] Added system context informing AI models about the 10-iteration tool limit to enable proactive user communication  
2026-01-22: [FEATURE] Implemented iterative tool execution - model can now chain multiple tool calls automatically without user input, showing intermediate thinking messages  
2026-01-22: [BUGFIX] Fixed duplicate "Selected model" debug output and model selection logic to use highest-scored model instead of preference-based selection  
2026-01-22: [FEATURE] Enhanced debug output showing data policy and model characteristics (use DEBUG=1 for summary, DEBUG=2 for detailed info)  
2026-01-22: [REFACTOR] Clean function architecture - removed inline comments, added top-level documentation, split complex functions into pure atomic components  
2026-01-22: [FEATURE] Intelligent model scoring based on supported_parameters analysis  
2026-01-22: [FEATURE] Initial modular architecture with 5 core modules  
2026-01-22: [TEST] Comprehensive Vitest test suite with 26 tests  
2026-01-22: [FEATURE] OpenRouter integration with free model detection  
2026-01-22: [FEATURE] External tool system with JSON configuration  
2026-01-22: [FEATURE] Conversation history management with auto-trimming  
2026-01-22: [FEATURE] CLI interface with graceful shutdown handling  
2026-01-22: [REFACTOR] Rebranded from llm-agent to Mukt  
2026-01-22: [FEATURE] GitHub Copilot integration with skills and workflow automation  
2026-01-22: [DOCS] Added change management process with atomic commits  
2026-01-22: [REFACTOR] Removed emojis and made logging debug-only for cleaner output  
2026-01-22: [BUGFIX] Added model fallback mechanism for when selected models are unavailable  
2026-01-22: [REFACTOR] Removed hardcoded common models, now uses API model list dynamically  
2026-01-22: [BUGFIX] Identified and fixed root cause - free models don't support tool use  
2026-01-22: [FEATURE] Filter models by tool support - only select models that support function calling  
2026-01-22: [BUGFIX] Added fallback for data policy restrictions on specific models  

---

## Format Guidelines

Each entry should follow: `YYYY-MM-DD: [TYPE] Description`

**Types:**
- **FEATURE**: New functionality added
- **BUGFIX**: Bug or issue resolved  
- **REFACTOR**: Code structure improvements
- **TEST**: New or updated tests
- **DOCS**: Documentation changes

**Rules:**
- One entry per atomic change
- Test before logging
- Commit immediately after logging
- Keep descriptions concise but clear