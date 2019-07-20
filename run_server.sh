#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "To view the game, connect to:"
echo "    http://localhost:8000/"

python -m SimpleHTTPServer
