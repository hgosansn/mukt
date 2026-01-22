import { describe, it, expect, beforeEach } from 'vitest';
import Conversation from '../src/conversation.js';

describe('Conversation', () => {
    let conversation;
    
    beforeEach(() => {
        conversation = new Conversation(3); // Small limit for testing
    });
    
    it('should initialize with system message', () => {
        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('maximum of 10 consecutive tool iterations');
        expect(conversation.getMessageCount()).toBe(1);
    });
    
    it('should add messages correctly', () => {
        conversation.addMessage('user', 'Hello');
        conversation.addMessage('assistant', 'Hi there!');
        
        const messages = conversation.getMessages();
        expect(messages).toHaveLength(3); // system + 2 added messages
        expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
        expect(messages[2]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });
    
    it('should add messages with tool calls', () => {
        const toolCalls = [{ id: 'call_1', function: { name: 'test', arguments: '{}' } }];
        conversation.addMessage('assistant', 'Using tool', toolCalls);
        
        const messages = conversation.getMessages();
        expect(messages[1].tool_calls).toEqual(toolCalls); // system message is at index 0
    });
    
    it('should limit conversation history', () => {
        // Add more messages than limit (limit is 3, system message takes 1 slot)
        conversation.addMessage('user', 'Message 1');
        conversation.addMessage('assistant', 'Response 1');
        conversation.addMessage('user', 'Message 2');
        conversation.addMessage('assistant', 'Response 2');
        conversation.addMessage('user', 'Message 3');
        
        const messages = conversation.getMessages();
        expect(messages).toHaveLength(3);
        expect(messages[0].role).toBe('system'); // System message preserved
        expect(messages[1].content).toBe('Response 2');
        expect(messages[2].content).toBe('Message 3');
    });
    
    it('should build messages correctly', () => {
        const message = conversation.buildMessage('user', 'Hello', null, null, null);
        expect(message).toEqual({ role: 'user', content: 'Hello' });
        
        const toolMessage = conversation.buildMessage('assistant', 'Using tool', [{ id: 'call_1' }], null, null);
        expect(toolMessage.tool_calls).toEqual([{ id: 'call_1' }]);
    });
    
    it('should calculate byte size correctly', () => {
        conversation.addMessage('user', 'Hello');
        const size = conversation.getByteSize();
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
    });
    
    it('should clear messages', () => {
        conversation.addMessage('user', 'Hello');
        expect(conversation.getMessageCount()).toBe(2); // system + user message
        
        conversation.clear();
        expect(conversation.getMessageCount()).toBe(1); // only system message remains
        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('system');
    });
});