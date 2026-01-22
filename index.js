#!/usr/bin/env node

import CLI from './src/cli.js';

async function main() {
    const args = process.argv.slice(2);
    const preference = args[0] || 'google';

    const cli = new CLI(preference);
    await cli.run();
}

process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Session terminated');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error(`❌ Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`❌ Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(`❌ Fatal error: ${error.message}`);
        process.exit(1);
    });
}