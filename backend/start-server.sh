#!/bin/bash
cd /Applications/XAMPP/xamppfiles/htdocs/BugRicer/backend
while true; do
    echo "Starting signaling server..."
    php api/meetings/signaling-server.php
    echo "Server crashed, restarting in 5 seconds..."
    sleep 5
done
