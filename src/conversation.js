class Conversation {
    constructor(maxMessages = 20) {
        this.messages = [];
        this.maxMessages = maxMessages;
        this.initializeSystemContext();
    }

    // Initialize with system context about tool usage limits
    initializeSystemContext() {
        const systemMessage = {
            role: "system",
            content: "You are an AI assistant with access to tools. Important: You have a maximum of 10 consecutive tool iterations before the system will pause execution to prevent infinite loops. If you anticipate needing more than 10 tool calls to complete a complex task, please inform the user about your progress and ask for permission to continue, or break the task into smaller parts that can be completed within the limit."
        };
        this.messages.push(systemMessage);
    }

    // Add a message to the conversation with optional tool metadata
    addMessage(role, content, toolCalls = null, toolCallId = null, name = null) {
        const message = this.buildMessage(role, content, toolCalls, toolCallId, name);
        this.messages.push(message);
        this.limitHistory();
    }

    buildMessage(role, content, toolCalls, toolCallId, name) {
        const message = { role, content };
        if (toolCalls) message.tool_calls = toolCalls;
        if (toolCallId) message.tool_call_id = toolCallId;
        if (name) message.name = name;
        return message;
    }

    limitHistory() {
        if (this.messages.length > this.maxMessages) {
            const excess = this.messages.length - this.maxMessages;
            if (process.env.DEBUG) console.log(`Trimming conversation history (${this.messages.length} -> ${this.maxMessages} messages)`);
            
            // Keep the system message (first message) and trim from the second message onward
            const systemMessage = this.messages[0];
            const otherMessages = this.messages.slice(1);
            const trimmedMessages = otherMessages.slice(excess);
            this.messages = [systemMessage, ...trimmedMessages];
        }
    }

    getMessages() {
        return this.messages;
    }

    getMessageCount() {
        return this.messages.length;
    }

    getByteSize() {
        return JSON.stringify(this.messages).length;
    }

    clear() {
        this.messages = [];
        this.initializeSystemContext();
    }
}

export default Conversation;