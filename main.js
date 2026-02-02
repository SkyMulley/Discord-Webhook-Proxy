import express from "express";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";

import gitlab from "./converters/gitlab.js";
import github from "./converters/github.js";
import gmod from "./converters/gmod.js";
import gitdeploy from "./converters/gitdeploy.js";
import deployhq from "./converters/deployhq.js";
import events from "./converters/events.js";
import testhook from "./converters/testhook.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(morgan("combined"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Static pages, like configuration UI
app.use(express.static(path.resolve(__dirname, "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Register converters
gitlab(app);
github(app);
gmod(app);
gitdeploy(app);
deployhq(app);
events(app);
testhook(app);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 8100;
app.listen(port, () => {
  console.log(`Server started at port ${port}`);
});
