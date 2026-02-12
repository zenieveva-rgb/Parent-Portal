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
const table = document.getElementById('attendanceTable');

// --- Search Animation & Toggle ---
searchBtn.addEventListener('click', () => {
    // Rotate Icon
    searchBtn.classList.add('rotate');
    setTimeout(() => searchBtn.classList.remove('rotate'), 500);

    // Toggle Search Bar
    nameInput.classList.toggle('active');
    
    if (nameInput.classList.contains('active')) {
        nameInput.focus();
    } else {
        performSearch(); // Search when bar is closed
    }
});

// Real-time listener para sa lahat ng data
function performSearch() {
    const queryName = nameInput.value.trim().toLowerCase();
    const attRef = ref(db, 'attendance');

    onValue(attRef, (snapshot) => {
        const data = snapshot.val();
        table.innerHTML = ''; 

        if (data) {
            const records = Object.values(data);
            
            // Filter by Name (Hindi na LRN)
            const filtered = records.filter(r => 
                r.displayName.toLowerCase().includes(queryName)
            ).sort((a, b) => b.timestamp - a.timestamp);

            if (filtered.length > 0) {
                filtered.forEach(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    table.innerHTML += `
                        <div class="attendance-row">
                            <span style="color:white; font-weight:500;">${log.displayName}</span>
                            <span style="color:var(--tech-blue);">${log.grade || 'N/A'}</span>
                            <span style="color:var(--neon-cyan);">${time}</span>
                        </div>
                    `;
                });
            } else {
                table.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px; margin-top:20px;">No record found.</p>';
            }
        }
    });
}

// Initial Load
performSearch();
