"""Patch the API Gateway JAR to replace load-balancer URIs with direct HTTP URIs.

This fixes the URISyntaxException that occurs when lb:// URIs fail to resolve
during Spring Cloud Gateway route initialization.

Usage:
    python patch_gateway_routes.py [--input JAR_PATH] [--output JAR_PATH]
"""
import zipfile
import os
import argparse

parser = argparse.ArgumentParser(description='Patch API Gateway JAR with route replacements.')
parser.add_argument('--input', default=os.environ.get('JAR_INPUT', 'app.jar'))
parser.add_argument('--output', default=os.environ.get('JAR_OUTPUT', 'app-fixed.jar'))
args = parser.parse_args()

jar_path = args.input
patched_path = args.output

# Map of URI replacements: lb://service -> http://docker-host:port
replacements = {
    'lb://user-service':            'http://invest_user_svc:8081',
    'lb://market-data-service':    'http://invest_market_svc:8082',
    'lb://portfolio-service':       'http://invest_portfolio_svc:8083',
    'lb://notification-service':    'http://invest_notification_svc:8084',
    # ai-intelligence-service is NOT registered with Eureka (Python FastAPI service
    # has no Eureka client). Replace lb:// with the direct container hostname/port so
    # the gateway can reach it without service discovery.
    'lb://ai-intelligence-service': 'http://fin_multi_agents:8086',
}

total_replacements = 0
with zipfile.ZipFile(jar_path, 'r') as zin:
    with zipfile.ZipFile(patched_path, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename.endswith('.yml') or item.filename.endswith('.yaml') or item.filename.endswith('.properties'):
                text = data.decode('utf-8', errors='replace')
                original = text
                for old, new in replacements.items():
                    if old in text:
                        text = text.replace(old, new)
                        total_replacements += 1
                        print(f'  {item.filename}: {old} -> {new}')
                if text != original:
                    data = text.encode('utf-8')
            zout.writestr(item, data)

print(f'Total replacements: {total_replacements}')
print(f'Patched JAR: {patched_path}')
print(f'Size: {os.path.getsize(patched_path):,} bytes')

# Verify
with zipfile.ZipFile(patched_path, 'r') as z:
    for name in z.namelist():
        if 'application.yml' in name:
            content = z.read(name).decode('utf-8', errors='replace')
            for line_no, line in enumerate(content.split('\n'), 1):
                if 'lb://' in line:
                    print(f'  ERROR - still has lb:// at {name}:{line_no}: {line.strip()}')
                if 'http://' in line and 'uri:' in line:
                    print(f'  OK {name}:{line_no}: {line.strip()}')
