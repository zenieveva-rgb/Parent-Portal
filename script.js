import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// 1. FIREBASE CONFIG
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

// 2. STATE & CONSTANTS
const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 

// 3. UI ANIMATION HELPERS
function animateIcon(element) {
    if (!element) return;
    element.classList.add('icon-pop');
    setTimeout(() => element.classList.remove('icon-pop'), 300);
}

// 4. CORE NAVIGATION & UI LOGIC
document.addEventListener('DOMContentLoaded', () => {
    const historyBtn = document.getElementById('navToHistory');
    const trashBtn = document.getElementById('trashBinBtn');
    const backBtn = document.getElementById('navToPortal');
    const searchTrigger = document.querySelector('.search-trigger');
    const searchBox = document.getElementById('searchBox');
    const nameInput = document.getElementById('nameInput');

    // Navigation with animation delay
    if (historyBtn) historyBtn.onclick = (e) => {
        animateIcon(e.currentTarget);
        setTimeout(() => window.location.href = 'history.html', 250);
    };
    if (trashBtn) trashBtn.onclick = (e) => {
        animateIcon(e.currentTarget);
        setTimeout(() => window.location.href = 'junk.html', 250);
    };
    if (backBtn) backBtn.onclick = (e) => {
        animateIcon(e.currentTarget);
        setTimeout(() => window.location.href = 'index.html', 250);
    };

    // Search Toggle
    if (searchTrigger && searchBox) {
        searchTrigger.onclick = (e) => {
            animateIcon(e.currentTarget);
            searchBox.classList.toggle('active');
            if (searchBox.classList.contains('active')) nameInput?.focus();
        };
    }

    // Real-time search filter
    nameInput?.addEventListener('input', (e) => processData(e.target.value.toLowerCase()));
});

// 5. SELECTION & DELETE LOGIC
const eraserBtn = document.getElementById('toggleDeleteMode');
eraserBtn?.addEventListener('click', async (e) => {
    animateIcon(e.currentTarget);
    
    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`Move ${selectedAlbums.size} items to Junk? Password:`);
        if (pass === ADMIN_PASSWORD) {
            const updates = {};
            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                if (logsEntries.length > 0) {
                    const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;
                    updates[`trash/${trashId}`] = {
                        studentName: name,
                        deletedAt: new Date().toLocaleString(),
                        logs: logsEntries.map(([key, val]) => ({ ...val, originalKey: key }))
                    };
                    logsEntries.forEach(([key]) => { updates[`attendance/${key}`] = null; });
                }
            }
            try {
                await update(ref(db), updates);
                alert("Moved to Junk.");
                selectedAlbums.clear();
                isSelectionMode = false;
                eraserBtn.classList.remove('active');
            } catch (err) { alert("Error updating database."); }
        } else if (pass !== null) {
            alert("Wrong Password.");
        }
    } else {
        isSelectionMode = !isSelectionMode;
        if (!isSelectionMode) selectedAlbums.clear();
        eraserBtn?.classList.toggle('active', isSelectionMode);
        processData();
    }
});

// 6. DATA PROCESSING & RENDERING
function processData(searchTerm = "") {
    onValue(ref(db, 'attendance'), (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        const portalTable = document.getElementById('attendanceTable'); 
        const historyTable = document.getElementById('historyTable');   
        
        // Render Portal View (Live Monitor)
        if (portalTable) {
            portalTable.innerHTML = '';
            Object.entries(fullDataBuffer)
                .filter(([k, v]) => (v.studentName || "").toLowerCase().includes(searchTerm))
                .reverse()
                .forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <span>${val.studentName || 'Unknown Name'}</span>
                        <span class="text-center">${val.grade || 'N/A'}</span>
                        <span class="text-right">${val.time || val.scannedAt || '--:--'}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        // Render Archive View (History)
        if (historyTable) {
            historyTable.innerHTML = '';
            const albums = {};
            
            Object.entries(fullDataBuffer).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown Student";
                if (!albums[sName]) {
                    albums[sName] = { grade: val.grade || 'N/A', logs: [] };
                }
                albums[sName].logs.push({ key, ...val });
            });

            Object.keys(albums)
                .filter(n => n.toLowerCase().includes(searchTerm))
                .forEach(name => {
                    const studentLogs = albums[name].logs;
                    const lastScan = studentLogs[studentLogs.length - 1].time || studentLogs[studentLogs.length - 1].scannedAt || '--:--';
                    const wrapper = document.createElement('div');
                    wrapper.className = 'album-row-wrapper';
                    
                    const checkboxHTML = isSelectionMode ? 
                        `<input type="checkbox" class="album-checkbox" data-name="${name}" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
                    
                    wrapper.innerHTML = `
                        ${checkboxHTML}
                        <div class="student-album">
                            <div class="album-icon"><i class="fa-solid fa-folder-open"></i></div>
                            <div class="album-info-meta">
                                <div class="album-name">${name}</div>
                                <div class="album-sub">Grade: ${albums[name].grade} • Last seen: ${lastScan}</div>
                            </div>
                            <div class="total-scans">${studentLogs.length} Logs</div>
                        </div>`;
                    
                    // Handle Checkbox inside wrapper
                    wrapper.querySelector('.album-checkbox')?.addEventListener('change', () => toggleSelect(name));

                    wrapper.querySelector('.student-album').onclick = () => { 
                        if (!isSelectionMode) showPopUp(name, studentLogs); 
                    };
                    historyTable.appendChild(wrapper);
                });
        }
    });
}

// 7. WINDOW FUNCTIONS (Global access for HTML buttons)
window.toggleSelect = (name) => {
    if (selectedAlbums.has(name)) selectedAlbums.delete(name);
    else selectedAlbums.add(name);
};

window.showPopUp = (name, logs) => {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    document.getElementById('modalStudentName').innerText = name;
    const list = document.getElementById('individualLogs');
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt || log.time}</span>
            <button class="delete-log-btn" data-key="${log.key}" style="background:none; border:none; color:white; cursor:pointer;">
                <i class="fa-solid fa-trash"></i>
            </button>`;
        
        item.querySelector('.delete-log-btn').onclick = (e) => {
            animateIcon(e.currentTarget);
            deleteLogEntry(log.key);
        };
        list.appendChild(item);
    });
    modal.style.display = 'flex';
};

window.deleteLogEntry = (key) => { 
    if (prompt("Admin Password:") === ADMIN_PASSWORD) {
        remove(ref(db, `attendance/${key}`)); 
    } else {
        alert("Incorrect Password.");
    }
};

document.getElementById('closeModal')?.addEventListener('click', () => { 
    document.getElementById('historyModal').style.display = 'none'; 
});

// Start the app
processData();
