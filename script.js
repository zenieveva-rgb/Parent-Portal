import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    off, 
    remove, 
    update, 
    push,
    get 
} from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==================== STATE & CONSTANTS ====================
const ADMIN_PASSWORD = "1234";
let isSelectionMode = false;
let selectedAlbums = new Set();
let attendanceListener = null;
let currentSearchTerm = "";
let currentRestoreKey = null;

// ==================== UTILITY FUNCTIONS ====================
function animateIcon(element) {
    if (!element) return;
    element.style.transform = "scale(1.2)";
    element.style.color = "var(--neon-cyan)";
    setTimeout(() => {
        element.style.transform = "scale(1)";
        element.style.color = "";
    }, 300);
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== NAVIGATION ====================
function initNavigation() {
    const routes = {
        'navToPortal': 'index.html',
        'navToHistory': 'history.html',
        'trashBinBtn': 'junk.html'
    };

    Object.entries(routes).forEach(([id, url]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                animateIcon(e.currentTarget);
                setTimeout(() => window.location.href = url, 200);
            });
        }
    });
}

// ==================== ENHANCED SEARCH WITH MORPH ANIMATION ====================
function initSearch() {
    // Portal page search (existing)
    const searchTrigger = document.querySelector('.search-trigger');
    const searchBox = document.getElementById('searchBox');
    const nameInput = document.getElementById('nameInput');

    if (searchTrigger && searchBox) {
        searchTrigger.addEventListener('click', (e) => {
            animateIcon(e.currentTarget);
            searchBox.classList.toggle('active');
            if (searchBox.classList.contains('active') && nameInput) {
                nameInput.focus();
            }
        });
    }

    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            renderPortalData(window.lastAttendanceData || {}, currentSearchTerm);
        });
    }

    // Archive page morphing search
    const searchMorph = document.getElementById('searchMorph');
    const searchMorphBtn = document.getElementById('searchMorphBtn');
    const archiveSearch = document.getElementById('archiveSearch');

    if (searchMorphBtn && searchMorph) {
        searchMorphBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchMorph.classList.toggle('active');
            
            if (searchMorph.classList.contains('active')) {
                archiveSearch?.focus();
                // Animate icon
                searchMorphBtn.style.transform = 'rotate(90deg) scale(1.1)';
                setTimeout(() => {
                    searchMorphBtn.style.transform = '';
                }, 300);
            } else {
                archiveSearch.value = '';
                currentSearchTerm = '';
                renderHistoryData(window.lastAttendanceData || {}, '');
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (searchMorph?.classList.contains('active') && 
                !searchMorph.contains(e.target) && 
                !archiveSearch?.value) {
                searchMorph.classList.remove('active');
            }
        });
    }

    if (archiveSearch) {
        archiveSearch.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase();
            renderHistoryData(window.lastAttendanceData || {}, currentSearchTerm);
        });

        // Prevent closing when typing
        archiveSearch.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// ==================== ENHANCED HISTORY RENDERER ====================
function renderHistoryData(data, searchTerm = "") {
    const table = document.getElementById('historyTable');
    const counter = document.getElementById('folderCounter');
    const alphabetTrack = document.getElementById('alphabetTrack');
    
    if (!table) return;

    // Group by student name
    const albums = {};
    Object.entries(data).forEach(([key, val]) => {
        const name = val.studentName || "Unknown Student";
        if (!albums[name]) {
            albums[name] = { 
                grade: val.grade || 'N/A', 
                logs: [],
                lastScan: null
            };
        }
        albums[name].logs.push({ key, ...val });
        
        const scanTime = new Date(val.time || val.scannedAt || 0);
        if (!albums[name].lastScan || scanTime > albums[name].lastScan) {
            albums[name].lastScan = scanTime;
        }
    });

    // Sort alphabetically
    const sortedNames = Object.keys(albums).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Update counter
    if (counter) {
        counter.textContent = `${sortedNames.length} folder${sortedNames.length !== 1 ? 's' : ''}`;
    }

    // Generate alphabet index
    if (alphabetTrack) {
        const letters = [...new Set(sortedNames.map(n => n[0].toUpperCase()))].sort();
        alphabetTrack.innerHTML = letters.map(l => 
            `<a href="#letter-${l}" class="alpha-pill" data-letter="${l}">${l}</a>`
        ).join('');
        
        // Add click handlers for smooth scroll
        alphabetTrack.querySelectorAll('.alpha-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                const letter = pill.getAttribute('data-letter');
                const target = document.getElementById(`letter-${letter}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Highlight active
                    alphabetTrack.querySelectorAll('.alpha-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                }
            });
        });
    }

    // Filter by search
    const filteredNames = sortedNames.filter(name => 
        name.toLowerCase().includes(searchTerm)
    );

    if (filteredNames.length === 0) {
        table.innerHTML = `
            <div class="empty-state-archive">
                <i class="fa-solid fa-folder-open"></i>
                <h3>${searchTerm ? 'No matches found' : 'No student records'}</h3>
                <p>${searchTerm ? 'Try a different search term' : 'Scanned data will appear here'}</p>
            </div>
        `;
        return;
    }

    let currentLetter = '';
    
    table.innerHTML = filteredNames.map((name, index) => {
        const student = albums[name];
        const firstLetter = name[0].toUpperCase();
        const showDivider = firstLetter !== currentLetter;
        currentLetter = firstLetter;
        
        const lastScanDate = student.lastScan ? 
            student.lastScan.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
            'Never';
        
        return `
            ${showDivider ? `<div id="letter-${firstLetter}" class="letter-divider">${firstLetter}</div>` : ''}
            <div class="folder-card" data-name="${name}" style="animation-delay: ${index * 0.05}s">
                <div class="folder-icon-section">
                    <div class="folder-icon-wrap">
                        <i class="fa-solid fa-folder"></i>
                        <span class="folder-count-badge">${student.logs.length}</span>
                    </div>
                    <div class="folder-info-compact">
                        <div class="folder-name-text">${name}</div>
                        <div class="folder-meta">
                            <i class="fa-solid fa-calendar"></i> Last: ${lastScanDate}
                        </div>
                    </div>
                </div>
                
                <div class="folder-stats">
                    <span class="grade-pill">${student.grade}</span>
                    <span class="scans-text">${student.logs.length} scan${student.logs.length !== 1 ? 's' : ''}</span>
                </div>
                
                <button class="folder-view-btn" onclick="window.openFolder('${name}')" title="View Details">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;
    }).join('');
}

// ==================== DATA LISTENERS (FIXED) ====================
function setupAttendanceListener() {
    // Remove existing listener to prevent duplicates
    if (attendanceListener) {
        off(ref(db, 'attendance'), 'value', attendanceListener);
    }

    const attendanceRef = ref(db, 'attendance');
    
    attendanceListener = onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val() || {};
        window.lastAttendanceData = data;
        
        // Update counter if on portal page
        const counter = document.getElementById('scanCounter');
        if (counter) {
            const count = Object.keys(data).length;
            counter.textContent = `${count} scan${count !== 1 ? 's' : ''} today`;
        }

        // Route to appropriate renderer
        if (document.getElementById('attendanceTable')) {
            renderPortalData(data, currentSearchTerm);
        }
        if (document.getElementById('historyTable')) {
            renderHistoryData(data, currentSearchTerm);
        }
    }, (error) => {
        console.error("Database error:", error);
        showToast("Connection error. Retrying...", "error");
    });
}

// ==================== PORTAL RENDERER (Live Page) ====================
function renderPortalData(data, searchTerm = "") {
    const table = document.getElementById('attendanceTable');
    if (!table) return;

    const entries = Object.entries(data);
    const filtered = entries.filter(([key, val]) => {
        const name = (val.studentName || "").toLowerCase();
        return name.includes(searchTerm);
    }).reverse(); // Newest first

    if (filtered.length === 0) {
        table.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <p>${searchTerm ? 'No matches found' : 'No scans yet'}</p>
            </div>
        `;
        return;
    }

    table.innerHTML = filtered.map(([key, val]) => `
        <div class="attendance-row scan-entry" data-key="${key}">
            <div class="student-info-cell">
                <div class="avatar-sm">
                    <i class="fa-solid fa-user"></i>
                </div>
                <span class="student-name">${val.studentName || 'Unknown'}</span>
            </div>
            <span class="grade-badge">${val.grade || 'N/A'}</span>
            <span class="time-badge">
                <i class="fa-regular fa-clock"></i>
                ${formatTime(val.time || val.scannedAt)}
            </span>
        </div>
    `).join('');

    // Animate entries
    setTimeout(() => {
        document.querySelectorAll('.scan-entry').forEach((row, i) => {
            setTimeout(() => row.classList.add('visible'), i * 50);
        });
    }, 10);
}

// ==================== HISTORY RENDERER (Alphabetical Folders) ====================
function renderHistoryData(data, searchTerm = "") {
    const table = document.getElementById('historyTable');
    if (!table) return;

    // Group by student name
    const albums = {};
    Object.entries(data).forEach(([key, val]) => {
        const name = val.studentName || "Unknown Student";
        if (!albums[name]) {
            albums[name] = { 
                grade: val.grade || 'N/A', 
                logs: [],
                lastScan: null
            };
        }
        albums[name].logs.push({ key, ...val });
        
        // Track latest scan
        const scanTime = new Date(val.time || val.scannedAt || 0);
        if (!albums[name].lastScan || scanTime > albums[name].lastScan) {
            albums[name].lastScan = scanTime;
        }
    });

    // Sort alphabetically
    const sortedNames = Object.keys(albums).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Filter by search
    const filteredNames = sortedNames.filter(name => 
        name.toLowerCase().includes(searchTerm)
    );

    // Generate alphabet index
    const alphabetDiv = document.getElementById('alphabetIndex');
    if (alphabetDiv) {
        const letters = [...new Set(sortedNames.map(n => n[0].toUpperCase()))].sort();
        alphabetDiv.innerHTML = letters.map(l => 
            `<a href="#letter-${l}" class="alpha-link">${l}</a>`
        ).join('');
    }

    if (filteredNames.length === 0) {
        table.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <p>${searchTerm ? 'No folders found' : 'No student records'}</p>
            </div>
        `;
        return;
    }

    table.innerHTML = filteredNames.map((name, index) => {
        const student = albums[name];
        const firstLetter = name[0].toUpperCase();
        const showLetter = index === 0 || 
            filteredNames[index-1][0].toUpperCase() !== firstLetter;
        
        return `
            ${showLetter ? `<div id="letter-${firstLetter}" class="letter-divider">${firstLetter}</div>` : ''}
            <div class="folder-card" data-name="${name}">
                <div class="folder-icon">
                    <i class="fa-solid fa-folder"></i>
                    <span class="log-count">${student.logs.length}</span>
                </div>
                <div class="folder-info">
                    <h3 class="folder-name">${name}</h3>
                    <span class="folder-grade"><i class="fa-solid fa-graduation-cap"></i> ${student.grade}</span>
                    <span class="folder-date">Last: ${formatDate(student.lastScan)}</span>
                </div>
                <div class="folder-actions">
                    <button class="view-btn" onclick="window.openFolder('${name}')">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== MODAL FUNCTIONS ====================
window.openFolder = (name) => {
    const data = window.lastAttendanceData || {};
    const logs = Object.entries(data)
        .filter(([k, v]) => v.studentName === name)
        .map(([k, v]) => ({ key: k, ...v }))
        .sort((a, b) => new Date(b.time || b.scannedAt) - new Date(a.time || a.scannedAt));

    if (logs.length === 0) return;

    const modal = document.getElementById('historyModal');
    const nameEl = document.getElementById('modalStudentName');
    const gradeEl = document.getElementById('modalStudentGrade');
    const logsEl = document.getElementById('individualLogs');
    const totalEl = document.getElementById('totalScans');
    const lastEl = document.getElementById('lastScan');

    if (!modal) return;

    nameEl.textContent = name;
    gradeEl.textContent = `Grade: ${logs[0].grade || 'N/A'}`;
    totalEl.textContent = logs.length;
    lastEl.textContent = formatTime(logs[0].time || logs[0].scannedAt);

    logsEl.innerHTML = logs.map((log, i) => `
        <div class="log-entry" style="animation-delay: ${i * 50}ms">
            <div class="log-time">
                <i class="fa-regular fa-clock"></i>
                ${formatDateTime(log.time || log.scannedAt)}
            </div>
            <button class="delete-log-btn" onclick="window.deleteLog('${log.key}')" title="Move to Trash">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.deleteLog = async (key) => {
    if (!confirm("Move this scan to trash?")) return;
    
    const entryRef = ref(db, `attendance/${key}`);
    const snapshot = await get(entryRef);
    const data = snapshot.val();
    
    if (data) {
        // Move to trash first
        const trashKey = push(ref(db, 'trash')).key;
        await update(ref(db), {
            [`trash/${trashKey}`]: {
                ...data,
                deletedAt: new Date().toISOString(),
                originalKey: key
            },
            [`attendance/${key}`]: null
        });
        showToast("Moved to trash", "success");
    }
};

// ==================== UTILITY FORMATTERS ====================
function formatTime(timeStr) {
    if (!timeStr) return '--:--';
    const date = new Date(timeStr);
    if (isNaN(date)) return timeStr;
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

function formatDate(date) {
    if (!date) return 'Never';
    const d = new Date(date);
    if (isNaN(d)) return date;
    return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSearch();
    setupAttendanceListener();
    initModalHandlers();
    initParticles();
});

function initModalHandlers() {
    const modal = document.getElementById('historyModal');
    const closeBtns = [
        document.getElementById('closeModal'),
        document.getElementById('closeModalBottom')
    ];

    closeBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            });
        }
    });

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.style.display = 'none', 300);
            }
        });
    }
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}
