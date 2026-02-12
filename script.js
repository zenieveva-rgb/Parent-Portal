import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

const searchBtn = document.getElementById('searchBtn');
const nameInput = document.getElementById('nameInput');
const tableBody = document.getElementById('attendanceTable'); // Siguraduhin na ito ay <tbody> o <div> container

// --- 1. Search Animation & Toggle ---
searchBtn.addEventListener('click', () => {
    searchBtn.classList.add('rotate');
    setTimeout(() => searchBtn.classList.remove('rotate'), 500);

    nameInput.classList.toggle('active');
    
    if (nameInput.classList.contains('active')) {
        nameInput.focus();
    } else {
        performSearch(); 
    }
});

// Makinig sa pag-type para "Real-time Filter"
nameInput.addEventListener('input', performSearch);

// --- 2. Main Data Fetching & Formatting ---
function performSearch() {
    const queryName = nameInput.value.trim().toLowerCase();
    const attRef = ref(db, 'attendance');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            // I-convert ang objects tungo sa array at i-sort (Latest First)
            const records = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            
            // I-filter ang records base sa Full Name
            const filtered = records.filter(r => 
                r.displayName.toLowerCase().includes(queryName)
            );

            if (filtered.length > 0) {
                filtered.forEach(log => {
                    // Pag-format ng Oras
                    const time = new Date(log.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });

                    // Formal Table-like Row Structure
                    const row = document.createElement('div');
                    row.className = 'attendance-row';
                    row.style.cssText = `
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        padding: 12px;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        align-items: center;
                    `;

                    row.innerHTML = `
                        <span style="color:white; font-weight:500; text-transform: uppercase;">${log.displayName}</span>
                        <span style="color:#2575fc; text-align:center;">${log.grade || 'N/A'}</span>
                        <span style="color:#00ffcc; text-align:right; font-family: monospace;">${time}</span>
                    `;
                    
                    tableBody.appendChild(row);
                });
            } else {
                tableBody.innerHTML = `
                    <div style="text-align:center; padding:40px; opacity:0.5;">
                        <i class="fa-solid fa-magnifying-glass" style="font-size: 20px; margin-bottom:10px;"></i>
                        <p>No record found for "${queryName}"</p>
                    </div>
                `;
            }
        } else {
            tableBody.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5;">Waiting for scans...</p>';
        }
    });
}

// Initial Load
performSearch();
