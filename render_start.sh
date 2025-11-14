#!/usr/bin/env bash
set -euo pipefail

node backend/seed.js --reset
node backend/server.js
