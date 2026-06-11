import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachCurrentUser } from './middleware/auth.js';
import { apiRouter } from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const clientDistDir = path.join(rootDir, 'dist', 'client');

const app = express();
const port = Number(process.env.PORT || 3000);

app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(attachCurrentUser);

app.use('/api', apiRouter);
app.use(express.static(publicDir));
app.use('/app', express.static(clientDistDir));

app.get('*', (req, res) => {
  const appIndex = path.join(clientDistDir, 'index.html');

  if (fs.existsSync(appIndex)) {
    res.sendFile(appIndex);
    return;
  }

  res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Household Resume App</title>
      </head>
      <body>
        <main style="font-family: system-ui, sans-serif; max-width: 760px; margin: 4rem auto; padding: 0 1rem;">
          <h1>Dashboard build not found</h1>
          <p>Run <code>npm run dev</code> during development or <code>npm run build</code> before starting the production server.</p>
        </main>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Household Resume app listening on http://localhost:${port}`);
});
