// =============================
// CONFIGURATION
// =============================

let config = {
    failed_login_limit: 3,
    large_download_threshold: 100,
    data_upload_threshold: 500
};

// =============================
// NAVIGATION
// =============================

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
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(navId).classList.add('active');

    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });

    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';

        if (viewId === 'view-live') startLiveMonitor();
        else stopLiveMonitor();

        if (viewId === 'view-settings') fetchSettings();
        if (viewId === 'view-reports') loadReport();
    }
}

// =============================
// SETTINGS (STATIC DEMO MODE)
// =============================

async function fetchSettings() {
    try {
        const response = await fetch('./settings.json');
        const data = await response.json();
        config = { ...config, ...data };

        ['failed_login_limit', 'large_download_threshold', 'data_upload_threshold']
        .forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = config[id];
        });

    } catch (error) {
        console.error("Settings load failed:", error);
    }
}

function saveSettings() {
    const newSettings = {
        failed_login_limit: parseInt(document.getElementById('failed_login_limit').value),
        large_download_threshold: parseInt(document.getElementById('large_download_threshold').value),
        data_upload_threshold: parseInt(document.getElementById('data_upload_threshold').value)
    };

    config = { ...config, ...newSettings };

    showSettingsMessage("Settings updated (Demo Mode)", "success");
}

function showSettingsMessage(text, type) {
    const msgEl = document.getElementById('settingsMsg');
    if (!msgEl) return;

    msgEl.textContent = text;
    msgEl.style.display = 'block';

    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}

// =============================
// DATA FETCHING
// =============================

async function fetchLogs() {
    try {
        const response = await fetch('./logs.json');
        return await response.json();
    } catch (error) {
        console.error("Logs load failed:", error);
        return [];
    }
}

async function fetchAlerts() {
    try {
        const response = await fetch('./alerts.json');
        return await response.json();
    } catch (error) {
        console.error("Alerts load failed:", error);
        return [];
    }
}

async function loadReport() {
    const reportPre = document.getElementById('reportContent');
    if (!reportPre) return;

    try {
        const response = await fetch('./report.json');
        const data = await response.json();
        reportPre.textContent = data.report;
    } catch (error) {
        reportPre.textContent = "Report unavailable.";
    }
}

// =============================
// DASHBOARD RENDERING
// =============================

function analyzeAndRenderStats(logs, alerts) {
    let logins = 0;
    let failed = 0;
    let dloads = 0;

    logs.forEach(log => {
        if (log.event_type === "login_attempt") logins++;
        if (log.status === "failed") failed++;
        if (log.event_type === "data_download") dloads++;
    });

    const criticalCount = alerts.filter(a => a.severity === 'Critical').length;

    document.getElementById('totalLogins').textContent = logins;
    document.getElementById('failedAttempts').textContent = failed;
    document.getElementById('dataDownloads').textContent = dloads;
    document.getElementById('criticalAlerts').textContent = criticalCount;
}

function renderLogsTable(logs) {
    const tbody = document.getElementById('logsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    logs.slice(-10).reverse().forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.event_type}</td>
            <td>${log.user_id}</td>
            <td>${log.ip_address}</td>
            <td>${log.status || log.size_mb + " MB"}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderThreatFeed(alerts) {
    const feed = document.getElementById('threatFeed');
    if (!feed) return;

    feed.innerHTML = '';

    alerts.forEach(alert => {
        const div = document.createElement('div');
        div.className = "threat-item";
        div.innerHTML = `
            <strong>${alert.severity}</strong><br>
            ${alert.description}
        `;
        feed.appendChild(div);
    });
}

async function refreshData() {
    const [logs, alerts] = await Promise.all([
        fetchLogs(),
        fetchAlerts()
    ]);

    analyzeAndRenderStats(logs, alerts);
    renderLogsTable(logs);
    renderThreatFeed(alerts);
}

// =============================
// LIVE MONITOR
// =============================

let liveRefreshInterval = null;

async function refreshLiveMonitor() {
    const logs = await fetchLogs();
    renderLiveMonitor(logs);
}

function startLiveMonitor() {
    stopLiveMonitor();
    refreshLiveMonitor();
    liveRefreshInterval = setInterval(refreshLiveMonitor, 5000);
}

function stopLiveMonitor() {
    if (liveRefreshInterval) clearInterval(liveRefreshInterval);
}

function renderLiveMonitor(logs) {
    const tbody = document.getElementById('liveLogsBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    logs.slice().reverse().forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.event_type}</td>
            <td>${log.ip_address}</td>
            <td>${log.user_id}</td>
            <td>${log.status || 'NORMAL'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =============================
// INITIAL LOAD
// =============================

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    fetchSettings().then(refreshData);
});