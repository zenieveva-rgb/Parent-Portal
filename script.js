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

// --- 4. ERASER FUNCTION (FIXED: Moves to Junk then Deletes) ---
const eraserBtn = document.getElementById('toggleDeleteMode');

eraserBtn?.addEventListener('click', async () => {
    const historyTable = document.getElementById('historyTable');
    if (!historyTable) return; 

    if (isSelectionMode && selectedAlbums.size > 0) {
        const pass = prompt(`Move ${selectedAlbums.size} items to Junk? Enter Password:`);
        
        if (pass === ADMIN_PASSWORD) {
            const deletePromises = [];

            for (let name of selectedAlbums) {
                const logsEntries = Object.entries(fullDataBuffer).filter(([k, v]) => v.studentName === name);
                
                if (logsEntries.length > 0) {
                    const trashId = `trash_${Date.now()}_${name.replace(/\s+/g, '_')}`;

                    // Backup to 'trash' node in Firebase
                    deletePromises.push(set(ref(db, `trash/${trashId}`), {
                        studentName: name,
                        deletedAt: new Date().toLocaleString(),
                        logs: logsEntries.map(([key, val]) => ({ key, ...val }))
                    }));

                    // Remove from main 'attendance' node
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
                alert("Database Error. Please try again.");
            }
        } else if (pass !== null) {
            alert("Incorrect Password.");
        }
    } else {
        isSelectionMode = !isSelectionMode;
        if (!isSelectionMode) selectedAlbums.clear();
        eraserBtn?.classList.toggle('active', isSelectionMode);
        processData();
    }
});

// --- 5. RENDER LOGIC: PORTAL (ROWS) vs HISTORY (ALBUMS) ---
function processData(searchTerm = "") {
    const attRef = ref(db, 'attendance');
    const portalTable = document.getElementById('attendanceTable'); // Used in index.html
    const historyTable = document.getElementById('historyTable');   // Used in history.html
    
    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        fullDataBuffer = data || {}; 
        
        // --- VIEW A: PARENT PORTAL (Live Monitor - List Only) ---
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
                        <span class="student-name-cell">${val.studentName}</span>
                        <span class="text-center grade-cell">${val.grade || 'N/A'}</span>
                        <span class="text-right time-cell">${val.time || val.scannedAt || '--:--'}</span>
                    `;
                    portalTable.appendChild(row);
                });
        }

        // --- VIEW B: SCAN ARCHIVE (History - Albums/Folders) ---
        if (historyTable) {
            historyTable.innerHTML = '';
            if (!data) {
                historyTable.innerHTML = '<p style="grid-column: 1/-1; text-align:center; opacity:0.5;">Empty History</p>';
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
                    
                    const checkboxHTML = isSelectionMode ? 
                        `<input type="checkbox" class="album-checkbox" onchange="toggleSelect('${name}')" ${selectedAlbums.has(name) ? 'checked' : ''}>` : '';

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

// --- 6. POPUP & MODALS ---
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
// --- 7. EXPORT TO CSV FUNCTION ---
document.getElementById('exportCSV')?.addEventListener('click', () => {
    if (!fullDataBuffer || Object.keys(fullDataBuffer).length === 0) {
        alert("No data available to export.");
        return;
    }

    // Define CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Grade/Section,Date,Time\n";

    // Fill Rows
    Object.values(fullDataBuffer).forEach(record => {
        const name = record.studentName || "Unknown";
        const grade = record.grade || "N/A";
        const time = record.time || record.scannedAt || "--:--";
        const date = record.date || new Date().toLocaleDateString(); // Fallback to current date if not in DB
        
        // Clean data (remove commas to avoid breaking CSV format)
        const row = `"${name}","${grade}","${date}","${time}"`;
        csvContent += row + "\n";
    });

    // Create Download Link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);

    link.click(); // Trigger download
    document.body.removeChild(link);
});
