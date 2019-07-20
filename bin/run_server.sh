#!/bin/bash

# We need to run the server from the root of the repo, which is the parent
# directory of where this script is located. If we run it out of src/, then the
# assets won't be visible.
cd "$(dirname "${BASH_SOURCE[0]}")"/..

echo "To view the game, connect to:"
echo "    http://localhost:8000/"

python -m SimpleHTTPServer
