// public/client.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const vizElement = document.getElementById('visualization');
    const testButton = document.getElementById('testButton');
    const clearButton = document.getElementById('clearButton');
    const distanceDisplay = document.getElementById('distance');
    const coordinatesDisplay = document.getElementById('coordinates');
    
    let coordinates = [];
    let totalDistance = 0;
    const vizWidth = vizElement.offsetWidth;
    const vizHeight = vizElement.offsetHeight;
    
    // Calculate center point
    const centerX = vizWidth / 2;
    const centerZ = vizHeight / 2;
    
    // Receive initial history
    socket.on('coordinate-history', (history) => {
        console.log('Received coordinate history:', history);
        coordinates = history;
        
        // Update distance if there are coordinates
        if (history.length > 0) {
            const lastCoord = history[history.length - 1];
            totalDistance = lastCoord.distance;
            updateInfoDisplays(lastCoord);
        }
        
        renderAllCoordinates();
    });
    
    // Receive new coordinate
    socket.on('new-coordinate', (data) => {
        console.log('New coordinate received:', data);
        coordinates.push(data);
        totalDistance = data.distance;
        updateInfoDisplays(data);
        renderCoordinate(data);
    });
    
    // Coordinates cleared
    socket.on('coordinates-cleared', () => {
        console.log('Coordinates cleared');
        coordinates = [];
        totalDistance = 0;
        updateInfoDisplays({ distance: 0, x: 0, z: 0 });
        vizElement.innerHTML = '';
    });
    
    // Test button to send sample coordinates
    testButton.addEventListener('click', () => {
        // Generate random coordinates between -100 and 100
        const x = Math.round((Math.random() * 200 - 100) * 100) / 100;
        const z = Math.round((Math.random() * 200 - 100) * 100) / 100;
        
        // Increase total distance by a small random amount
        totalDistance += Math.random() * 0.1;
        
        fetch('/api/coordinates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: [parseFloat(totalDistance.toFixed(2)), x, z]
            }),
        })
        .then(response => response.json())
        .then(data => console.log('Response:', data))
        .catch(error => console.error('Error:', error));
    });
    
    // Clear button
    clearButton.addEventListener('click', () => {
        fetch('/api/coordinates', {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => console.log('Response:', data))
        .catch(error => console.error('Error:', error));
    });
    
    function updateInfoDisplays(coord) {
        distanceDisplay.textContent = `Distance: ${coord.distance.toFixed(2)}`;
        coordinatesDisplay.textContent = `X: ${coord.x.toFixed(2)}, Z: ${coord.z.toFixed(2)}`;
    }
    
    function renderAllCoordinates() {
        // Clear all points and lines
        vizElement.innerHTML = '';
        
        // Render all coordinates
        coordinates.forEach((coord, index) => {
            if (index > 0) {
                renderLine(coordinates[index - 1], coord);
            }
            renderPoint(coord);
        });
    }
    
    function renderCoordinate(coord) {
        const index = coordinates.indexOf(coord);
        if (index > 0) {
            renderLine(coordinates[index - 1], coord);
        }
        renderPoint(coord);
    }
    
    function renderPoint(coord) {
        // Transform coordinates from -100,100 range to screen position
        // (0,0) at center of screen
        const screenX = centerX + (coord.x * centerX / 100);
        const screenZ = centerZ + (coord.z * centerZ / 100);
        
        // Create point
        const pointElement = document.createElement('div');
        pointElement.className = 'point';
        pointElement.style.left = `${screenX}px`;
        pointElement.style.top = `${screenZ}px`;
        vizElement.appendChild(pointElement);
    }
    
    function renderLine(fromCoord, toCoord) {
        // Transform coordinates
        const fromX = centerX + (fromCoord.x * centerX / 100);
        const fromZ = centerZ + (fromCoord.z * centerZ / 100);
        const toX = centerX + (toCoord.x * centerX / 100);
        const toZ = centerZ + (toCoord.z * centerZ / 100);
        
        const lineElement = document.createElement('div');
        lineElement.className = 'line';
        
        // Position at from point
        lineElement.style.left = `${fromX}px`;
        lineElement.style.top = `${fromZ}px`;
        
        // Calculate line length and angle
        const dx = toX - fromX;
        const dy = toZ - fromZ;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        lineElement.style.width = `${length}px`;
        lineElement.style.transform = `rotate(${angle}deg)`;
        
        vizElement.appendChild(lineElement);
    }
});