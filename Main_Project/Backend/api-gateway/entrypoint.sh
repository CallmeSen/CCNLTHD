#!/bin/sh
# Wait for fin_multi_agents to be reachable
echo "Waiting for fin_multi_agents..."
while ! wget -q -O- -T 2 http://fin_multi_agents:8086/health > /dev/null 2>&1; do
    sleep 1
done
echo "fin_multi_agents is up!"

# Patch application.yml: replace host.docker.internal with fin_multi_agents
if grep -q 'host.docker.internal' /app/resources/application.yml 2>/dev/null; then
    sed -i 's|host.docker.internal|fin_multi_agents|g' /app/resources/application.yml
    echo "Patched application.yml: host.docker.internal -> fin_multi_agents"
fi

# Start the app
exec java -jar /app/app.jar
