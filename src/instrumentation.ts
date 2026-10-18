// Runs once when the server starts, before it takes any request. The check is written inline
// so the edge build drops the import of server-only code.
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await (await import('./instrumentation-node')).register();
    }
}
