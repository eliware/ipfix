#!/usr/bin/env node

import { run } from "../src/cli.mjs";

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
