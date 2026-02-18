import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// --- 1. FIREBASE CONFIGURATION ---
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

// --- 2. GLOBAL STATE ---
const ADMIN_PASSWORD = "1234"; 
let isSelectionMode = false;
let selectedAlbums = new Set();
let fullDataBuffer = {}; 

// --- 3. NAVIGATION ---
function smoothNavigate(url) {
    const panel = document.getElementById('mainPanel');
    if (panel) {
        panel.style.opacity = "0";
        panel.style.transform = "scale(0.9)";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

document.getElementById('navToHistory')?.addEventListener('click', () => smoothNavigate('history.html'));
document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));

document.getElementById('nameInput')?.addEventListener('input', (e) => {
    processData(e.target.value.toLowerCase());
});

// --- 4. RELIABLE DELETE LOGIC (Moves to Junk then Deletes) ---
const eraserBtn = document.getElementById('toggleDeleteMode');

eraserBtn?.addEventListener('click', async () => {
    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`CONFIRM: Move ${selectedAlbums.size} album(s) to Junk? Enter Password:`);
        
        if (pass === ADMIN_PASSWORD) {
            const deletePromises = [];

            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                
                if (logsEntries.length > 0) {
                    const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;

                    // 1. Prepare the backup to Junk
                    deletePromises.push(set(ref(db, `trash/${trashId}`), {
                        studentName: name,
                        deletedAt: new Date().toLocaleString(),
                        logs: logsEntries.map(([key, val]) => ({ key, ...val }))
                    }));

                    // 2. Prepare the removal from main list
                    logsEntries.forEach(([key]) => {
                        deletePromises.push(remove(ref(db, `attendance/${key}`)));
                    });
                }
            }

            try {
                await Promise.all(deletePromises);
                alert("Success: Moved to Junk.");
                selectedAlbums.clear();
                isSelectionMode = false;
                eraserBtn.classList.remove('active');
                processData(); 
            } catch (error) {
                alert("Error: " + error.message);
            }
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

// --- 5. DATA RENDERING (Corrects Portal vs History View) ---
function processData(searchTerm = "") {
    const attRef = ref(db, 'attendance');
    const portalTable = document.getElementById('attendanceTable'); // Used in index.html (Main Portal)
    const historyTable = document.getElementById('historyTable');   // Used in history.html (Albums)
    
    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        
        // --- VIEW 1: PARENT PORTAL (Simple List Rows: Name, Grade, Time) ---
        if (portalTable) {
            portalTable.innerHTML = '';
            if (!data) return;
            Object.entries(data)
                .filter(([k, v]) => v.studentName?.toLowerCase().includes(searchTerm))
                .reverse()
                .forEach(([key, val]) => {
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <span>${val.studentName || "Unknown"}</span>
                        <span class="text-center">${val.grade || 'N/A'}</span>
                        <span class="text-right">${val.time || val.scannedAt || "No Time"}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        // --- VIEW 2: SCAN HISTORY (Folder Albums) ---
        if (historyTable) {
            historyTable.innerHTML = '';
            if (!data) {
                historyTable.innerHTML = '<p style="grid-column: 1/-1; text-align:center; opacity:0.5;">No history found.</p>';
                return;
            }

            const albums = {};
            Object.entries(data).forEach(([key, val]) => {
                const sName = val.studentName || "Unknown";
                if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
                albums[sName].logs.push({ key, ...val });
            });

            Object.keys(albums)
                .filter(name => name.toLowerCase().includes(searchTerm))
                .forEach(name => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'album-row-wrapper';
                    
                    const isChecked = selectedAlbums.has(name) ? 'checked' : '';
                    const checkboxHTML = isSelectionMode ? 
                        `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${isChecked}>` : '';

                    wrapper.innerHTML = `
                        ${checkboxHTML}
                        <div class="student-album">
                            <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                            <div class="album-name">${name}</div>
                            <div class="album-sub">${albums[name].grade || 'N/A'}</div>
                            <div class="total-scans">${albums[name].logs.length} Scans</div>
                        </div>
                    `;
                    
                    wrapper.querySelector('.student-album').onclick = () => {
                        if (!isSelectionMode) showPopUp(name, albums[name].logs);
                    };
                    historyTable.appendChild(wrapper);
                });
        }
    });
}

window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) selectedAlbums.delete(studentName);
    else selectedAlbums.add(studentName);
};

// --- 6. POPUP FOR INDIVIDUAL LOGS ---
window.showPopUp = (name, logs) => {
    document.getElementById('modalStudentName').innerText = name;
    const list = document.getElementById('individualLogs');
    list.innerHTML = '';
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt || log.time}</span>
            <div class="log-actions">
                <button onclick="deleteLogEntry('${log.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>`;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => {
    if (prompt("ADMIN PASSWORD:") === ADMIN_PASSWORD) remove(ref(db, `attendance/${key}`));
};

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
