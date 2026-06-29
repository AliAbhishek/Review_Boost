#!/bin/bash
set -e
echo "Installing dependencies..."
pip3 install -r requirements.txt
echo ""
echo "Starting ReviewBoost..."
python3 main.py
