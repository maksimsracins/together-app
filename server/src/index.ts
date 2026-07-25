import 'dotenv/config';
import { app } from './app';
import { startReportScheduler } from './scheduler';

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Together server listening on http://localhost:${PORT}`);
  startReportScheduler();
});
