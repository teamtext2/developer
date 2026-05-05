async function fetchApps() {
    const grid = document.getElementById('app-grid');

    try {
        // Add timestamp to avoid caching if app.json changes
        const response = await fetch('app.json?t=' + Date.now());
        if (!response.ok) throw new Error('Unable to load application list');

        const apps = await response.json();

        if (apps.length === 0) {
            grid.innerHTML = '<div class="error-state">No beta applications available at the moment.</div>';
            return;
        }

        grid.innerHTML = ''; // Clear loading state

        apps.forEach((app, index) => {
            const card = document.createElement('a');
            card.href = app.l;
            card.className = 'app-card';
            card.target = '_blank';
            card.style.animationDelay = `${index * 0.1}s`;

            // Handle missing icons
            const iconUrl = app.i || 'https://via.placeholder.com/80?text=App';

            const badgeText = (app.tag || 'BETA').toUpperCase();
            const badgeClass = app.tag === 'beta' ? 'badge-beta' : 'badge-prod';

            card.innerHTML = `
                        <span class="badge ${badgeClass}">${badgeText}</span>
                        <img src="${iconUrl}" alt="${app.t}" class="app-icon" onerror="this.src='https://via.placeholder.com/80?text=Icon'">
                        <div class="app-title">${app.t}</div>
                    `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = '<div class="error-state">An error occurred while loading data. Please try again later.</div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', fetchApps);

// Auto-refresh every 30 seconds to update new apps from app.json
setInterval(fetchApps, 30000);