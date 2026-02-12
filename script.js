import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdlEvDlQ1qWr8xdL4bV25NW4RgcTajYqM",
    authDomain: "database-98a70.firebaseapp.com",
    databaseURL: "https://database-98a70-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "database-98a70",
    storageBucket: "database-98a70.firebasestorage.app",
    messagingSenderId: "460345885965",
    appId: "1:460345885965:web:8484da766b979a0eaf9c44"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 3. Get HTML Elements
const tableBody = document.getElementById('attendanceTable');
const nameInput = document.getElementById('nameInput');

// 4. Define the Function First (Para kilala na ito ng browser bago gamitin)
function performSearch() {
    const queryName = nameInput.value.trim().toLowerCase();
    const attRef = ref(db, 'attendance');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            // I-convert ang objects sa array at i-sort: Latest scan sa itaas
            const records = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            
            records.filter(r => r.displayName.toLowerCase().includes(queryName))
            .forEach(log => {
                const time = new Date(log.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });

                const row = document.createElement('div');
                row.className = 'attendance-row';
                row.innerHTML = `
                    <span class="col-name">${log.displayName}</span>
                    <span class="col-grade">${log.grade || 'N/A'}</span>
                    <span class="col-time">${time}</span>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<p style="text-align:center; color:white; opacity:0.5; padding:20px;">No records yet.</p>';
        }
    });
}

// 5. Add Event Listener (Makinig sa pag-type ng user)
nameInput.addEventListener('input', performSearch);

// 6. Initial Load (Para lumabas agad ang data pagbukas ng page)
performSearch();
