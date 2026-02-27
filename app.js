// --- NAVIGATION LOGIC ---
function setupNavigation() {
    const navItems = {
        'nav-dashboard': 'view-dashboard',
        'nav-live': 'view-live',
        'nav-reports': 'view-reports',
        'nav-settings': 'view-settings'
    };

    Object.keys(navItems).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(id, navItems[id]);
            });
        }
    });
}

function switchView(navId, viewId) {
    // 1. Update Active State in Sidebar
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(navId).classList.add('active');

    // 2. Switch Content Visibility
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';

        // Add a smooth fade-in effect
        targetView.style.opacity = 0;
        let opacity = 0;
        const interval = setInterval(() => {
            if (opacity >= 1) clearInterval(interval);
            targetView.style.opacity = opacity;
            opacity += 0.1;
        }, 30);
    }
}

// --- CONFIGURATION & SETTINGS ---
let config = {
    failed_login_limit: 3,
    large_download_threshold: 100,
    data_upload_threshold: 500
};

async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error("Could not load settings");
        const data = await response.json();
        config = { ...config, ...data };

        // Update UI inputs if on settings page
        ['failed_login_limit', 'large_download_threshold', 'data_upload_threshold'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = config[id];
        });
    } catch (error) {
        console.error("Error fetching settings:", error);
    }
}

async function saveSettings() {
    const btn = document.querySelector('#settingsForm button');

    const newSettings = {
        failed_login_limit: parseInt(document.getElementById('failed_login_limit').value),
        large_download_threshold: parseInt(document.getElementById('large_download_threshold').value),
        data_upload_threshold: parseInt(document.getElementById('data_upload_threshold').value)
    };

    try {
        btn.disabled = true;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Saving...";

        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });

        const result = await response.json();

        if (result.status === 'success') {
            config = { ...config, ...newSettings };
            showSettingsMessage("Settings saved successfully!", "success");
        } else {
            throw new Error(result.error || "Failed to save settings");
        }
    } catch (error) {
        showSettingsMessage(error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "<i class='bx bx-save'></i> Save Configuration";
    }
}

function showSettingsMessage(text, type) {
    const msgEl = document.getElementById('settingsMsg');
    if (!msgEl) return;

    msgEl.textContent = text;
    msgEl.style.display = 'block';
    msgEl.style.background = type === 'success' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 23, 68, 0.2)';
    msgEl.style.color = type === 'success' ? '#00e676' : '#ff1744';

    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}

// --- DATA FETCHING & RENDERING ---
// --- REFRESH / DATA FETCHING ---
async function fetchLogs() {
    try {
        const response = await fetch('./logs.json');
        if (!response.ok) throw new Error("Could not load logs from API");
        return await response.json();
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

async function fetchAlerts() {
    try {
        const response = await fetch('/api/alerts');
        if (!response.ok) throw new Error("Could not load alerts from API");
        return await response.json();
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }
}

async function loadReport() {
    const reportPre = document.getElementById('reportContent');
    if (!reportPre) return;

    reportPre.textContent = "Generating and loading latest report...";

    try {
        const response = await fetch('/api/report');
        const data = await response.json();
        if (data.report) {
            reportPre.textContent = data.report;
        } else {
            reportPre.textContent = "Error: Report content is empty or unavailable.";
        }
    } catch (error) {
        reportPre.textContent = "Failed to load report from server.";
        console.error("Error loading report:", error);
    }
}

function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

function analyzeAndRenderStats(logs, alerts) {
    let logins = 0;
    let failed = 0;
    let dloads = 0;

    logs.forEach(log => {
        if (log.event_type === "login_attempt") logins++;
        if (log.status === "failed") failed++;
        if (log.event_type === "data_download") dloads++;
    });

    // Count alerts by severity
    const criticalCount = alerts.filter(a => a.severity === 'Critical').length;

    const elements = {
        'totalLogins': logins,
        'failedAttempts': failed,
        'dataDownloads': dloads,
        'criticalAlerts': criticalCount
    };

    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });
}

function renderLogsTable(logs) {
    const tbody = document.getElementById('logsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Show only last 10 logs for performance/clarity
    const recent = logs.slice(-10).reverse();

    recent.forEach(log => {
        const tr = document.createElement('tr');

        let statusHtml = '';
        if (log.status === 'success') {
            statusHtml = `<span class="status-tag tag-success">Success</span>`;
        } else if (log.status === 'failed') {
            statusHtml = `<span class="status-tag tag-failed">Failed</span>`;
        } else if (log.event_type === 'data_download') {
            statusHtml = `<span class="status-tag tag-info">${log.size_mb} MB</span>`;
        }

        tr.innerHTML = `
            <td>${formatTime(log.timestamp)}</td>
            <td style="color: var(--text-muted); text-transform: capitalize;">${log.event_type.replace('_', ' ')}</td>
            <td>${log.user_id}</td>
            <td>${log.ip_address}</td>
            <td>${statusHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderThreatFeed(alerts) {
    const feed = document.getElementById('threatFeed');
    if (!feed) return;
    feed.innerHTML = '';

    if (alerts.length === 0) {
        feed.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No active threats detected.</div>`;
        return;
    }

    // Sort: Critical at top
    const severityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
    const sorted = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    sorted.forEach((alert, index) => {
        const div = document.createElement('div');
        div.className = `threat-item ${alert.severity.toLowerCase()}`;
        div.style.animationDelay = `${index * 0.1}s`;

        div.innerHTML = `
            <div class="threat-header">
                <span class="threat-time">${formatTime(alert.timestamp)}</span>
                <span class="threat-type">${alert.type}</span>
            </div>
            <div class="threat-details">${alert.description}</div>
        `;
        feed.appendChild(div);
    });
}

async function refreshData() {
    const btnIcon = document.querySelector('.btn-primary i');
    if (btnIcon) btnIcon.style.animation = 'spin 1s linear infinite';

    try {
        const [logs, alerts] = await Promise.all([fetchLogs(), fetchAlerts()]);

        analyzeAndRenderStats(logs, alerts);
        renderLogsTable(logs);
        renderThreatFeed(alerts);

        // Also trigger report load in background if on reports page
        if (document.getElementById('view-reports').style.display === 'block') {
            loadReport();
        }
    } catch (e) {
        console.error("Refresh failed:", e);
    } finally {
        if (btnIcon) btnIcon.style.animation = 'none';
    }
}

// --- LIVE MONITOR LOGIC ---
let liveRefreshInterval = null;

async function refreshLiveMonitor() {
    const btnIcon = document.querySelector('#view-live .btn-primary i');
    if (btnIcon) btnIcon.style.animation = 'spin 1s linear infinite';

    try {
        const logs = await fetchLogs();
        renderLiveMonitor(logs);
    } catch (e) {
        console.error("Live monitor refresh failed:", e);
    } finally {
        if (btnIcon) btnIcon.style.animation = 'none';
    }
}

function startLiveMonitor() {
    if (liveRefreshInterval) clearInterval(liveRefreshInterval);
    refreshLiveMonitor();
    liveRefreshInterval = setInterval(refreshLiveMonitor, 5000); // 5s refresh
}

function stopLiveMonitor() {
    if (liveRefreshInterval) clearInterval(liveRefreshInterval);
}

function renderLiveMonitor(logs) {
    const tbody = document.getElementById('liveLogsBody');
    const alertsFeed = document.getElementById('liveAlertsFeed');
    if (!tbody || !alertsFeed) return;

    tbody.innerHTML = '';
    alertsFeed.innerHTML = '';

    const failedCounts = {};
    const recentLogs = [...logs].reverse(); // Most recent first

    recentLogs.forEach(log => {
        const tr = document.createElement('tr');
        const priority = detectPriority(log, failedCounts);

        // Color coding for table rows
        let priorityClass = 'tag-success';
        if (priority === 'CRITICAL') priorityClass = 'tag-failed';
        if (priority === 'HIGH') priorityClass = 'tag-warning';

        tr.innerHTML = `
            <td>${formatTime(log.timestamp).split(',')[2]}</td>
            <td>${log.event_type}</td>
            <td class="${isExternal(log.ip_address) ? 'text-warning' : ''}">${log.ip_address}</td>
            <td>${log.user_id}</td>
            <td><span class="status-tag ${priorityClass}">${priority}</span></td>
        `;
        tbody.appendChild(tr);

        // Generate dynamic alerts for the Alert Console
        generateLiveAlert(log, priority, alertsFeed);
    });
}

function isExternal(ip) {
    if (!ip) return false;
    // Campus internal network is 192.168.x.x
    return !ip.startsWith('192.168.');
}

function detectPriority(log, failedCounts) {
    // 1. Brute Force Detection (Threshold from config)
    if (log.event_type === 'login_attempt' && log.status === 'failed') {
        failedCounts[log.ip_address] = (failedCounts[log.ip_address] || 0) + 1;
        if (failedCounts[log.ip_address] >= config.failed_login_limit) return 'CRITICAL';
    }

    // 2. Data Upload to External IP (Threshold from config)
    if (log.event_type === 'data_upload' && isExternal(log.destination_ip)) {
        if (log.size_mb >= config.data_upload_threshold) return 'CRITICAL';
        return 'HIGH';
    }

    // 3. Large Download (Threshold from config)
    if (log.event_type === 'data_download' && log.size_mb > config.large_download_threshold) {
        return 'HIGH';
    }

    // 4. External IP Activity
    if (isExternal(log.ip_address)) {
        return 'HIGH';
    }

    return 'NORMAL';
}

function generateLiveAlert(log, priority, feed) {
    if (priority === 'NORMAL') return;

    const alertDiv = document.createElement('div');
    // CSS classes: critical (red border), high (yellow border)
    const cssClass = priority === 'CRITICAL' ? 'critical' : 'high';
    alertDiv.className = `threat-item ${cssClass}`;

    let description = '';
    if (priority === 'CRITICAL') {
        if (log.event_type === 'data_upload') {
            description = `UNAUTHORIZED UPLOAD: ${log.size_mb}MB sent to external host ${log.destination_ip}. (Threshold: ${config.data_upload_threshold}MB)`;
        } else {
            description = `BRUTE FORCE: ${config.failed_login_limit} failed login attempts originating from ${log.ip_address}. Account protection triggered.`;
        }
    } else {
        if (log.size_mb > config.large_download_threshold) {
            description = `DATA ANOMALY: Large volume of data (${log.size_mb}MB) downloaded by user ${log.user_id}. (Threshold: ${config.large_download_threshold}MB)`;
        } else {
            description = `EXTERNAL ACCESS: Login activity detected from non-campus host ${log.ip_address}.`;
        }
    }

    alertDiv.innerHTML = `
        <div class="threat-header">
            <span class="threat-time">${formatTime(log.timestamp).split(',')[2]}</span>
            <span class="threat-type">${priority}</span>
        </div>
        <div class="threat-details">${description}</div>
    `;
    feed.appendChild(alertDiv);
}

// Update Navigation to start/stop live monitor automatically
function switchView(navId, viewId) {
    // 1. Update Active State in Sidebar
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(navId).classList.add('active');

    // 2. Switch Content Visibility
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
        targetView.classList.add('active');

        // Control Live Monitor lifecycle
        if (viewId === 'view-live') {
            startLiveMonitor();
        } else {
            stopLiveMonitor();
        }

        // Refresh settings UI when entering settings page
        if (viewId === 'view-settings') {
            fetchSettings();
        }

        // Smooth transition effect
        targetView.style.opacity = 0;
        let opacity = 0;
        const interval = setInterval(() => {
            if (opacity >= 1) clearInterval(interval);
            targetView.style.opacity = opacity;
            opacity += 0.1;
        }, 30);
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    // Initialize settings before the first data refresh
    fetchSettings().then(() => {
        refreshData();
    });
});
