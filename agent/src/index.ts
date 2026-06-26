import { initConfig } from "./config/env";
import { getLLM } from "./config/llm";
import { startServer } from "./server";
import app from "./server";

const config = initConfig();
getLLM();

startServer();

const port = config.PORT;
export default {
  port,
  fetch: app.fetch,
};
