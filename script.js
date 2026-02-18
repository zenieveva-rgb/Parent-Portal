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
        panel.style.transition = "all 0.5s ease";
        panel.style.transform = "scale(0.9) opacity(0)";
    }
    setTimeout(() => { window.location.href = url; }, 500);
}

document.getElementById('trashBinBtn')?.addEventListener('click', () => smoothNavigate('junk.html'));
document.getElementById('navToPortal')?.addEventListener('click', () => smoothNavigate('index.html'));

// --- 4. SELECTION & DELETE LOGIC ---
const eraserBtn = document.getElementById('toggleDeleteMode');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// When clicking the Eraser Icon
eraserBtn?.addEventListener('click', () => {
    isSelectionMode = !isSelectionMode;
    
    // Toggle Visuals
    eraserBtn.classList.toggle('active', isSelectionMode);
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = isSelectionMode ? "block" : "none";
    }

    if (!isSelectionMode) {
        selectedAlbums.clear(); // Clear selections if exiting mode
    }
    processData(); 
});

// Handle Checkbox Toggles
window.toggleSelect = (studentName) => {
    if (selectedAlbums.has(studentName)) {
        selectedAlbums.delete(studentName);
    } else {
        selectedAlbums.add(studentName);
    }
};

// The Verification & Delete Process
bulkDeleteBtn?.addEventListener('click', async () => {
    if (selectedAlbums.size === 0) return alert("Please select at least one student.");
    
    // 1. Verify Identity
    const pass = prompt(`CONFIRMATION: Enter Admin Password to move ${selectedAlbums.size} items to Junk:`);
    
    if (pass === ADMIN_PASSWORD) {
        const confirmAction = confirm(`Are you sure you want to move selected students to the Junk Bin?`);
        
        if (confirmAction) {
            for (let name of selectedAlbums) {
                // Filter all log entries for this specific student
                const studentLogs = Object.entries(fullDataBuffer)
                    .filter(([key, val]) => val.studentName === name);

                const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;
                
                // 2. Backup to 'trash' node
                await set(ref(db, `trash/${trashId}`), {
                    studentName: name,
                    deletedAt: new Date().toLocaleString(),
                    logs: studentLogs.map(([key, val]) => ({ key, ...val }))
                });

                // 3. Remove from 'attendance' node
                for (let [key] of studentLogs) {
                    await remove(ref(db, `attendance/${key}`));
                }
            }
            
            alert("Success: Moved to Junk.");
            selectedAlbums.clear();
            isSelectionMode = false;
            bulkDeleteBtn.style.display = "none";
            processData();
        }
    } else {
        alert("Verification Failed: Incorrect Password.");
    }
});

// --- 5. RENDER DATA ---
function processData() {
    const attRef = ref(db, 'attendance');
    const historyBody = document.getElementById('historyTable');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        if (!historyBody) return;
        historyBody.innerHTML = '';
        
        if (!data) {
            historyBody.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;">Archive is empty.</div>';
            return;
        }

        const albums = {};
        Object.entries(data).forEach(([key, val]) => {
            const sName = val.studentName || "Unknown";
            if (!albums[sName]) albums[sName] = { grade: val.grade, logs: [] };
            albums[sName].logs.push({ key, ...val });
        });

        Object.keys(albums).forEach(name => {
            const container = document.createElement('div');
            container.className = 'album-row-wrapper';
            
            // Show Checkbox only in Selection Mode
            const checkboxHTML = isSelectionMode ? 
                `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';
            
            container.innerHTML = `
                ${checkboxHTML}
                <div class="student-album">
                    <div class="album-icon"><i class="fa-solid fa-folder"></i></div>
                    <div class="album-name">${name}</div>
                    <div class="album-sub">${albums[name].grade}</div>
                    <div class="total-scans">${albums[name].logs.length} Total</div>
                </div>
            `;
            
            // Click to view logs (only if NOT in selection mode)
            container.querySelector('.student-album').onclick = () => {
                if (!isSelectionMode) showPopUp(name, albums[name].logs);
            };
            historyBody.appendChild(container);
        });
    });
}

// --- 6. POPUP & INDIVIDUAL ACTIONS ---
window.showPopUp = (name, logs) => {
    const list = document.getElementById('individualLogs');
    document.getElementById('modalStudentName').innerText = name;
    list.innerHTML = '';

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'attendance-row popup-grid';
        item.innerHTML = `
            <span>${log.scannedAt}</span>
            <div class="log-actions">
                <button onclick="editLogEntry('${log.key}', '${log.studentName}')"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLogEntry('${log.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    document.getElementById('historyModal').style.display = 'flex';
};

window.deleteLogEntry = (key) => {
    if (prompt("ADMIN VERIFICATION:") === ADMIN_PASSWORD) {
        remove(ref(db, `attendance/${key}`));
    }
};

window.editLogEntry = (key, currentName) => {
    const newName = prompt("Edit Name:", currentName);
    if (newName && prompt("ADMIN VERIFICATION:") === ADMIN_PASSWORD) {
        update(ref(db, `attendance/${key}`), { studentName: newName });
    }
};

document.getElementById('closeModal')?.addEventListener('click', () => {
    document.getElementById('historyModal').style.display = 'none';
});

processData();
