import app from './app.js';
import config from './config/index.js';
// Server entry — auto-restarts via --watch

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║   🏥 HealthTech MVP — Backend Server                ║
  ║   Unified Health Record Access System               ║
  ╠══════════════════════════════════════════════════════╣
  ║   🚀 Server:     http://localhost:${PORT}              ║
  ║   🌍 Environment: ${config.nodeEnv.padEnd(18)}          ║
  ║   🤖 AI Summary:  ${config.groqApiKey ? 'Groq Active' : 'Fallback Mode'}${config.groqApiKey ? '  ' : '    '}         ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
