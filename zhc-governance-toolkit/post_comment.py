import json, os, urllib.request

url = os.environ['PAPERCLIP_API_URL'] + '/api/issues/d68a1431-f428-4b38-949a-1c6c043bdc42/comments'
headers = {
    'Authorization': 'Bearer ' + os.environ['PAPERCLIP_API_KEY'],
    'X-Paperclip-Run-Id': os.environ['PAPERCLIP_RUN_ID'],
    'Content-Type': 'application/json',
}
body = {
    'body': (
        "## PDF Report Delivered\n\n"
        "Generated the governance toolkit PDF.\n\n"
        "**Output:** `zhc-governance-toolkit.pdf` (553 KB)\n"
        "**Location:** `C:/Users/okrik/DZHC projecten/zhc-governance-toolkit/`\n\n"
        "### Sections\n"
        "- Cover page with section index cards\n"
        "- Overview: design principles cards, 6-step guide, key concepts\n"
        "- Section 01 Governance Constitution: article overview, authority matrix, escalation path\n"
        "- Section 02 Agent Archetypes: 6 roles with authority tables, org charts (Minimal/Standard/Extended), anti-patterns\n"
        "- Section 03 Human Control Checkpoints: 6 pattern cards, circuit breaker diagram, checkpoint heatmap\n"
        "- Section 04 Approval Gate Decision Tree: visual flowchart, L1-L5 gate levels, special cases\n\n"
        "### Visual graphics rendered\n"
        "Design principles cards, org charts (3 configs), decision tree flowchart, "
        "circuit breaker state machine, checkpoint matrix heatmap, gate level (L1-L5) cards.\n\n"
        "Source: [DUT-19](/DUT/issues/DUT-19)"
    )
}
data = json.dumps(body).encode()
req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as resp:
        print(resp.read().decode())
except Exception as e:
    print('Error:', e)
