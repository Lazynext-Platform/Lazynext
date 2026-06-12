import express from 'express';
import { createServer } from 'http';
import { setupSyncServer } from './sync';

const app = express();
const port = process.env.PORT || 8002;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ai-agents' });
});

app.post('/orchestrate', (req, res) => {
  const { prompt } = req.body;
  console.log(`[AI-Agents] Received orchestration request: ${prompt}`);
  
  // Simulated Agent response orchestrating multiple tools
  setTimeout(() => {
    res.json({
      success: true,
      orchestration_plan: [
        { action: "fetch_assets", source: "stock_footage_api" },
        { action: "generate_dub", lang: "ES-ES" },
        { action: "apply_b_roll", target_timestamps: [12.5, 45.0] }
      ]
    });
  }, 1500);
});

const httpServer = createServer(app);
setupSyncServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Lazynext AI-Agents Orchestrator & Sync Server running on port ${port}`);
});
