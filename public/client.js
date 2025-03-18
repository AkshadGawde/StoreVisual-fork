// public/client.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const vizElement = document.getElementById('visualization');
    const testButton = document.getElementById('testButton');
    const clearButton = document.getElementById('clearButton');
    const distanceDisplay = document.getElementById('distance');
    const photoIndicator = document.getElementById('photoIndicator');
    const imageContainer = document.getElementById('imageContainer');
    
    let coordinates = [];
    let totalDistance = 0;
    let imageHistory = [];
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
            updateDistanceDisplay(lastCoord);
            
            // Check if the last coordinate has a photo captured
            if (lastCoord.photoCapture === 1) {
                showPhotoIndicator();
            }
        }
        
        renderAllCoordinates();
    });
    
    // Receive image history
    socket.on('image-history', (history) => {
        console.log('Received image history:', history);
        imageHistory = history;
        renderAllImages();
    });
    
    // Receive new coordinate
    socket.on('new-coordinate', (data) => {
        console.log('New coordinate received:', data);
        coordinates.push(data);
        totalDistance = data.distance;
        updateDistanceDisplay(data);
        renderCoordinate(data);
        
        // Handle photo capture
        if (data.photoCapture === 1) {
            showPhotoIndicator();
        }
    });
    
    // Receive new image
    socket.on('new-image', (data) => {
        console.log('New image received:', data);
        
        // Add to beginning of array so newest is first
        imageHistory.unshift(data);
        
        // Keep only the latest 5 images
        if (imageHistory.length > 5) {
            imageHistory.pop();
        }
        
        renderAllImages();
    });
    
    // Coordinates cleared
    socket.on('coordinates-cleared', () => {
        console.log('Coordinates cleared');
        coordinates = [];
        totalDistance = 0;
        hidePhotoIndicator();
        updateDistanceDisplay({ distance: 0 });
        vizElement.innerHTML = '';
    });
    
    // Images cleared
    socket.on('images-cleared', () => {
        console.log('Images cleared');
        imageHistory = [];
        renderAllImages();
    });
    
    // Test button to send sample coordinates
    testButton.addEventListener('click', () => {
        // Generate random coordinates between -100 and 100
        const x = Math.round((Math.random() * 200 - 100) * 100) / 100;
        const z = Math.round((Math.random() * 200 - 100) * 100) / 100;
        
        // Increase total distance by a small random amount
        totalDistance += Math.random() * 0.1;
        
        // Randomly include a photo capture (1) or not (0)
        const photoCapture = Math.random() > 0.5 ? 1 : 0;
        
        fetch('/api/coordinates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                coordinates: [parseFloat(totalDistance.toFixed(2)), x, z, photoCapture]
            }),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Response:', data);
            
            // If photo was captured, send a test image URL
            if (photoCapture === 1) {
                // Generate random image URL from placeholder service
                const imageUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
                
                fetch('/api/image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageUrl: imageUrl,
                        metadata: {
                            x: x,
                            z: z,
                            distance: totalDistance
                        }
                    }),
                })
                .then(response => response.json())
                .then(data => console.log('Image Response:', data))
                .catch(error => console.error('Error sending image:', error));
            }
        })
        .catch(error => console.error('Error:', error));
    });
    
    // Clear button
    clearButton.addEventListener('click', () => {
        fetch('/api/all', {
            method: 'DELETE',
        })
        .then(response => response.json())
        .then(data => console.log('Response:', data))
        .catch(error => console.error('Error:', error));
    });
    
    function showPhotoIndicator() {
        photoIndicator.classList.add('active');
    }
    
    function hidePhotoIndicator() {
        photoIndicator.classList.remove('active');
    }
    
    function updateDistanceDisplay(coord) {
        distanceDisplay.textContent = `Distance: ${coord.distance.toFixed(2)}`;
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
        
        // If photo was captured at this point, add the photo-captured class
        if (coord.photoCapture === 1) {
            pointElement.classList.add('photo-captured');
        }
        
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
    
    function renderAllImages() {
        // Clear image container
        imageContainer.innerHTML = '';
        
        // Render images or placeholders
        if (imageHistory.length === 0) {
            // Create empty card templates
            for (let i = 0; i < 5; i++) {
                const card = createCardWithPlaceholder();
                imageContainer.appendChild(card);
            }
        } else {
            // Render actual images
            imageHistory.forEach(image => {
                const card = createCardWithImage(image);
                imageContainer.appendChild(card);
            });
            
            // Fill remaining slots with placeholders
            for (let i = imageHistory.length; i < 5; i++) {
                const card = createCardWithPlaceholder();
                imageContainer.appendChild(card);
            }
        }
    }
    
    function createCardWithImage(imageData) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const img = document.createElement('img');
        img.src = imageData.url;
        img.alt = 'Captured Image';
        img.className = 'card-image';
        
        const content = document.createElement('ul');
        content.className = 'card-content';
        
        // Add metadata if available
        if (imageData.metadata) {
            const distanceItem = document.createElement('li');
            distanceItem.textContent = `Virtual Merchandise, Product, Brand`;
            content.appendChild(distanceItem);
            
            const positionItem = document.createElement('li');
            positionItem.textContent = `AI Generated Summary And Text`;
            content.appendChild(positionItem);
            
            const timeItem = document.createElement('li');
            const date = new Date(imageData.timestamp);
            timeItem.textContent = `Time: ${date.toLocaleTimeString()}`;
            content.appendChild(timeItem);
        } else {
            // Default content if no metadata
            for (let i = 0; i < 3; i++) {
                const li = document.createElement('li');
                li.textContent = 'Image data';
                content.appendChild(li);
            }
        }
        card.appendChild(img);
        card.appendChild(content);
        
        return card;
    }
    
    function createCardWithPlaceholder() {
        const card = document.createElement('div');
        card.className = 'card';
        
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.textContent = 'No Image';
        
        const content = document.createElement('ul');
        content.className = 'card-content';
        
        for (let i = 0; i < 4; i++) {
            const li = document.createElement('li');
            li.textContent = 'Lorem Ipsum';
            content.appendChild(li);
        }
        
        card.appendChild(placeholder);
        card.appendChild(content);
        
        return card;
    }
    
    // Initialize with empty image cards
    renderAllImages();
});