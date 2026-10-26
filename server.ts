import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Deployment & Runtime Auto-Bootstrap:
// When running in production under plain 'node server.ts', transparently boot via tsx loader
// so all TypeScript files and ES module mappings run without build errors.
if (!process.env.__TSX_BOOTSTRAPPED__ && !process.execArgv.some((a) => a.includes('tsx'))) {
  const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, __TSX_BOOTSTRAPPED__: '1' },
  });

  child.on('exit', (code, sig) => {
    if (sig) {
      process.kill(process.pid, sig);
    } else {
      process.exit(code ?? 0);
    }
  });
} else {
  // TSX loader is active; load and run full-stack server
  const { runServer } = await import('./src/server/appServer.js');
  runServer().catch((err) => {
    console.error('[Road Not Taken POS] Fatal server startup error:', err);
    process.exit(1);
  });
}
