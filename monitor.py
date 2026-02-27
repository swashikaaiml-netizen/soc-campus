import json
from collections import defaultdict
from datetime import datetime

# Threat detection thresholds
FAILED_LOGIN_THRESHOLD = 3
LARGE_DOWNLOAD_THRESHOLD_MB = 100
SUSPICIOUS_IPS = ["103.45.67.89"] # Mock threat intelligence feed

def load_logs(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def analyze_logs(logs):
    failed_logins = defaultdict(int)
    alerts = []

    print("--- AI-Driven Campus Security Monitoring ---")
    print(f"[{datetime.now().isoformat()}] Analyzing logs...\n")

    for log in logs:
        event_type = log.get("event_type")
        ip = log.get("ip_address")
        user = log.get("user_id")

        # 1. Detect suspicious IPs
        if ip in SUSPICIOUS_IPS:
            alerts.append(f"[WARNING] Activity from known suspicious IP: {ip} (User: {user})")

        # 2. Detect brute force logins
        if event_type == "login_attempt":
            if log.get("status") == "failed":
                failed_logins[ip] += 1
                if failed_logins[ip] >= FAILED_LOGIN_THRESHOLD:
                    alerts.append(f"[CRITICAL] Possible brute force attack from IP: {ip} on User: {user}")
            elif log.get("status") == "success":
                # Reset counter on success
                failed_logins[ip] = 0

        # 3. Detect large data exfiltration
        if event_type == "data_download":
            size = log.get("size_mb", 0)
            if size > LARGE_DOWNLOAD_THRESHOLD_MB:
                resource = log.get("resource")
                alerts.append(f"[ALERT] Large data download detected: {size}MB by User: {user} (Resource: {resource})")

    # Automated Incident Response (Simulation)
    if alerts:
        print("=== Security Alerts Generated ===")
        # Deduplicate alerts for cleaner output
        for alert in list(dict.fromkeys(alerts)):
            print(alert)
        print("\n=== Automated Response Triggered ===")
        print("-> Blocking suspicious IP addresses in firewall...")
        print("-> Forcing password reset for compromised accounts...")
        print("-> Alerting Campus Security team via SMS/Email...")
    else:
        print("No threats detected. System normal.")

if __name__ == "__main__":
    try:
        logs = load_logs("logs.json")
        analyze_logs(logs)
    except FileNotFoundError:
        print("Error: logs.json file not found. Please ensure it is in the same directory.")
