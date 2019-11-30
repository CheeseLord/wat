#!/bin/bash

# We need to run the server from the root of the repo, which is the parent
# directory of where this script is located. If we run it out of src/, then the
# assets won't be visible.
cd "$(dirname "${BASH_SOURCE[0]}")"/..

echo "To view the game, connect to:"
echo "    http://localhost:8000/"

# Figure out which version of python we have.
python -c 'import sys; sys.exit(sys.version_info.major)'
PYTHON_VERSION="$?"

if [ "$PYTHON_VERSION" -eq 2 ]; then
    python -m SimpleHTTPServer
elif [ "$PYTHON_VERSION" -eq 3 ]; then
    python -m http.server
else
    echo "Error: unrecognized Python version: $PYTHON_VERSION"
    exit 1
fi
