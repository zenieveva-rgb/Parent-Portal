import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    off, 
    remove, 
    update, 
    get,
    push 
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

// ==================== GLOBAL STATE (SINGLE SOURCE OF TRUTH) ====================
const state = {
    attendanceData: {},      // Cache of all attendance data
    trashData: {},           // Cache of trash data
    currentSearch: "",        // Current search term
    isSelectionMode: false,   // Bulk delete mode
    selectedAlbums: new Set(),
    unsubscribeAttendance: null,  // Store unsubscribe function
    unsubscribeTrash: null          // Store unsubscribe function
};

const ADMIN_PASSWORD = "1234";

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
    
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== SINGLE LISTENER SETUP (THE FIX) ====================
function setupSingleAttendanceListener() {
    // CRITICAL: Only set up listener once!
    if (state.unsubscribeAttendance) {
        console.log("Listener already exists, skipping...");
        return;
    }

    const attendanceRef = ref(db, 'attendance');
    
    console.log("Setting up SINGLE attendance listener...");
    
    state.unsubscribeAttendance = onValue(attendanceRef, (snapshot) => {
        console.log("Data received from Firebase:", snapshot.val());
        state.attendanceData = snapshot.val() || {};
        
        // Route to appropriate renderer based on current page
        if (document.getElementById('attendanceTable')) {
            renderPortal(state.attendanceData, state.currentSearch);
        }
        if (document.getElementById('historyTable')) {
            renderHistory(state.attendanceData, state.currentSearch);
        }
    }, (error) => {
        console.error("Firebase error:", error);
        showToast("Connection error - check internet", "error");
    });
}

// ==================== RENDER FUNCTIONS (NO LISTENERS HERE) ====================
function renderPortal(data, searchTerm = "") {
    const table = document.getElementById('attendanceTable');
    const counter = document.getElementById('scanCounter');
    if (!table) return;

    const entries = Object.entries(data);
    const filtered = entries.filter(([key, val]) => {
        const name = (val.studentName || "").toLowerCase();
        return name.includes(searchTerm);
    }).sort((a, b) => new Date(b[1].time || b[1].scannedAt) - new Date(a[1].time || a[1].scannedAt));

    if (counter) {
        counter.textContent = `${entries.length} scan${entries.length !== 1 ? 's' : ''} today`;
    }

    if (filtered.length === 0) {
        table.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-satellite-dish"></i>
                <p>${searchTerm ? 'No matches found' : 'Waiting for scans...'}</p>
            </div>
        `;
        return;
    }

    table.innerHTML = filtered.map(([key, val], index) => `
        <div class="attendance-row scan-entry" data-key="${key}" style="animation-delay: ${index * 0.05}s">
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
}

function renderHistory(data, searchTerm = "") {
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
        
        alphabetTrack.querySelectorAll('.alpha-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                const letter = pill.getAttribute('data-letter');
                const target = document.getElementById(`letter-${letter}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ==================== MODAL FUNCTIONS ====================
window.openFolder = (name) => {
    const data = state.attendanceData;
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
        <div class="log-entry" style="animation-delay: ${i * 0.05}s">
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
    requestAnimationFrame(() => modal.classList.add('active'));
};

window.deleteLog = async (key) => {
    if (!confirm("Move this scan to trash?")) return;
    
    try {
        const entryRef = ref(db, `attendance/${key}`);
        const snapshot = await get(entryRef);
        const data = snapshot.val();
        
        if (data) {
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
    } catch (error) {
        console.error("Delete error:", error);
        showToast("Failed to delete", "error");
    }
};

// ==================== SEARCH SETUP (MORPHING ANIMATION) ====================
function initSearch() {
    // Portal page search
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
            state.currentSearch = e.target.value.toLowerCase();
            renderPortal(state.attendanceData, state.currentSearch); // Use cached data, no new listener!
        });
    }

    // Archive page morphing search
    const searchMorph = document.getElementById('searchMorph');
    const searchMorphBtn = document.getElementById('searchMorphBtn');
    const archiveSearch = document.getElementById('archiveSearch');

    if (searchMorphBtn && searchMorph) {
        searchMorphBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = searchMorph.classList.toggle('active');
            
            if (isActive) {
                archiveSearch?.focus();
            } else {
                archiveSearch.value = '';
                state.currentSearch = '';
                renderHistory(state.attendanceData, ''); // Use cached data!
            }
        });

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
            state.currentSearch = e.target.value.toLowerCase();
            renderHistory(state.attendanceData, state.currentSearch); // Use cached data, no new listener!
        });

        archiveSearch.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
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

// ==================== MODAL HANDLERS ====================
function initModalHandlers() {
    const modal = document.getElementById('historyModal');
    const closeBtns = [
        document.getElementById('closeModal'),
        document.getElementById('closeModalBottom')
    ];

    closeBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                modal?.classList.remove('active');
                setTimeout(() => {
                    if (modal) modal.style.display = 'none';
                }, 300);
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

// ==================== PARTICLES ====================
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

// ==================== FORMATTERS ====================
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

// ==================== CLEANUP ON PAGE UNLOAD ====================
window.addEventListener('beforeunload', () => {
    if (state.unsubscribeAttendance) {
        state.unsubscribeAttendance();
    }
    if (state.unsubscribeTrash) {
        state.unsubscribeTrash();
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Parent Portal...");
    initNavigation();
    initSearch();
    initModalHandlers();
    initParticles();
    
    // CRITICAL: Set up single listener only once!
    setupSingleAttendanceListener();
});
