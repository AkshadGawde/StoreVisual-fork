// public/client.js
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const vizElement = document.getElementById("visualization");
  const testButton = document.getElementById("testButton");
  const clearButton = document.getElementById("clearButton");
  const distanceDisplay = document.getElementById("distance");
  const imageContainer = document.getElementById("imageContainer");

  let coordinates = [];
  let totalDistance = 0;
  let imageHistory = [];
  const vizWidth = vizElement.offsetWidth;
  const vizHeight = vizElement.offsetHeight;

  // Calculate center point
  const centerX = vizWidth / 2;
  const centerZ = vizHeight / 2;

  // Map to store image data keyed by timestamp
  const imagePointMap = new Map();

  // Add ripple effect to buttons
  function createRipple(event) {
    const button = event.currentTarget;

    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${
      event.clientX - button.getBoundingClientRect().left - radius
    }px`;
    circle.style.top = `${
      event.clientY - button.getBoundingClientRect().top - radius
    }px`;
    circle.classList.add("ripple");

    const ripple = button.getElementsByClassName("ripple")[0];

    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  }

  // testButton.addEventListener("mousedown", createRipple);
  clearButton.addEventListener("mousedown", createRipple);

  // Receive initial history
  socket.on("coordinate-history", (history) => {
    console.log("Received coordinate history:", history);
    coordinates = history;

    // Update distance if there are coordinates
    if (history.length > 0) {
      const lastCoord = history[history.length - 1];
      totalDistance = lastCoord.distance;
      updateDistanceDisplay(lastCoord);
    }

    renderAllCoordinates();
  });

  // Receive image history
  socket.on("image-history", (history) => {
    console.log("Received image history:", history);
    imageHistory = history;

    // Update image point map
    updateImagePointMap();

    renderAllImages();
  });

  // Receive new coordinate
  socket.on("new-coordinate", (data) => {
    console.log("New coordinate received:", data);
    coordinates.push(data);
    totalDistance = data.distance;
    updateDistanceDisplay(data);
    renderCoordinate(data);
  });

  // Receive new image
  socket.on("new-image", (data) => {
    console.log("New image received:", data);

    // Add to beginning of array so newest is first
    imageHistory.unshift(data);

    // Update image point map
    updateImagePointMap();

    renderAllImages();
  });

  // Coordinates cleared
  socket.on("coordinates-cleared", () => {
    console.log("Coordinates cleared");
    coordinates = [];
    totalDistance = 0;
    updateDistanceDisplay({ distance: 0 });
    vizElement.innerHTML = "";
    imagePointMap.clear();
  });

  // Images cleared
  socket.on("images-cleared", () => {
    console.log("Images cleared");
    imageHistory = [];
    imagePointMap.clear();
    renderAllImages();
  });

  // Test button to send sample coordinates
  testButton.addEventListener("click", () => {
    // Add button press animation
    testButton.classList.add("button-pressed");
    setTimeout(() => {
      testButton.classList.remove("button-pressed");
    }, 200);

    // Generate random coordinates between -100 and 100
    let x = Math.round((Math.random() * 200 - 100) * 100) / 100;
    let z = Math.round((Math.random() * 200 - 100) * 100) / 100;
    // x=(x/100)*500;
    // z=(z/100)*250;

    // Increase total distance by a small random amount
    totalDistance += Math.random() * 0.1;

    // Randomly include a photo capture (1) or not (0)
    const photoCapture = Math.random() > 0.5 ? 1 : 0;

    const timestamp = Date.now();

    fetch("/api/coordinates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          Number.parseFloat(totalDistance.toFixed(2)),
          x,
          z,
          photoCapture,
        ],
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Response:", data);

        // If photo was captured, send a test image URL
        if (photoCapture === 1) {
          // Use a random selection of image URLs for testing
          const testImages = [
            "https://firebasestorage.googleapis.com/v0/b/fieldapp-39256.appspot.com/o/ARTracker%2FGoogle_Poster_Phone_0.9244657.png?alt=media&token=7affeac9-1f60-42b1-9e1f-d2c65a348da8",
            "https://firebasestorage.googleapis.com/v0/b/fieldapp-39256.appspot.com/o/ARTracker%2FApple_Poster_Phone.png?alt=media&token=7f75f533-e249-44e3-8056-adca5caef03d",
            "https://firebasestorage.googleapis.com/v0/b/fieldapp-39256.appspot.com/o/ARTracker%2FSamsung_Display_Tablet.png?alt=media&token=12345678",
            "https://firebasestorage.googleapis.com/v0/b/fieldapp-39256.appspot.com/o/ARTracker%2FLGE_Banner_TV.png?alt=media&token=87654321",
          ];

          const imageUrl =
            testImages[Math.floor(Math.random() * testImages.length)];

          // For testing, also send randomized banner data
          const brands = ["Google", "Apple", "Samsung", "LGE"];
          const positions = ["Top Shelf", "Eye Level", "Bottom Shelf", "End Cap"];
          const types = ["Phone", "Tablet", "TV", "Laptop"];
          
          const randomBrand = brands[Math.floor(Math.random() * brands.length)];
          const randomPosition = positions[Math.floor(Math.random() * positions.length)];
          const randomType = types[Math.floor(Math.random() * types.length)];

          // First post the image
          fetch("/api/image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: imageUrl,
              metadata: {
                timestamp: timestamp,
              },
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("Image Response:", data);
              
              // Then post the banner data
              fetch("/api/banner_data", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  imageUrl: imageUrl,
                  brand: randomBrand,
                  position: randomPosition,
                  type: randomType,
                }),
              })
                .then((response) => response.json())
                .then((data) => console.log("Banner Data Response:", data))
                .catch((error) => console.error("Error sending banner data:", error));
            })
            .catch((error) => console.error("Error sending image:", error));
        }
      })
      .catch((error) => console.error("Error:", error));
  });

  // Clear button
  clearButton.addEventListener("click", () => {
    // Add button press animation
    clearButton.classList.add("button-pressed");
    setTimeout(() => {
      clearButton.classList.remove("button-pressed");
    }, 200);

    fetch("/api/all", {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => console.log("Response:", data))
      .catch((error) => console.error("Error:", error));
  });

  function updateImagePointMap() {
    // Clear the map first
    imagePointMap.clear();

    // Find matching coordinates for each image
    imageHistory.forEach((image) => {
      // Find the closest coordinate point by timestamp
      const closestCoord = findClosestCoordinateByTimestamp(image.timestamp);
      if (closestCoord) {
        imagePointMap.set(closestCoord.timestamp, {
          image: image,
          coordinate: closestCoord,
        });
      }
    });
  }

  function findClosestCoordinateByTimestamp(timestamp) {
    if (!coordinates.length) return null;

    // Find the coordinate with closest timestamp
    return coordinates.reduce((closest, coord) => {
      const currentDiff = Math.abs(coord.timestamp - timestamp);
      const closestDiff = Math.abs(closest.timestamp - timestamp);

      return currentDiff < closestDiff ? coord : closest;
    }, coordinates[0]);
  }

  function updateDistanceDisplay(coord) {
    // Animate the distance change
    const currentDistance = Number.parseFloat(
      distanceDisplay.textContent.replace("Distance: ", "")
    );
    const targetDistance = coord.distance;

    // Use requestAnimationFrame for smooth animation
    const animateDistance = (
      timestamp,
      startValue,
      endValue,
      startTime,
      duration = 500
    ) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentValue = startValue + (endValue - startValue) * progress;

      distanceDisplay.textContent = `Distance: ${currentValue.toFixed(2)}`;

      if (progress < 1) {
        requestAnimationFrame((time) =>
          animateDistance(time, startValue, endValue, startTime, duration)
        );
      }
    };

    requestAnimationFrame((timestamp) =>
      animateDistance(timestamp, currentDistance, targetDistance)
    );
  }

  function renderAllCoordinates() {
    // Clear all points
    vizElement.innerHTML = "";

    // Render all coordinates (points only, no lines)
    coordinates.forEach((coord, index) => {
      // Add a small delay for each point to create a sequential appearance
      setTimeout(() => {
        renderPoint(coord);
      }, index * 20); // 20ms delay between each point
    });
  }

  function renderCoordinate(coord) {
    renderPoint(coord);
  }
  function plotO(){
      const pointElement = document.createElement("div");
  pointElement.className = "point";
  // pointElement.dataset.timestamp = coord.timestamp;

  // Set initial scale to 0 for animation
  pointElement.style.transform = "translate(-50%, -50%) scale(0)";
  pointElement.style.left = `${centerX}px`;
  pointElement.style.top = `${centerZ}px`;
  vizElement.appendChild(pointElement);
  }

  function renderPoint(coord) {
    // Transform coordinates from -100,100 range to screen position
    // (0,0) at center of screen
    // plotO();
    console.log(coord)
    console.log(coord.x,coord.z);
    
    console.log(centerX,centerZ);
    let screenX = centerX + (coord.x * centerX) / 100;
    let screenZ = centerZ + (coord.z * centerZ) / 100;
    
    console.log(screenX,screenZ);

    // Create point
    const pointElement = document.createElement("div");
    pointElement.className = "point";
    pointElement.dataset.timestamp = coord.timestamp;

    // Set initial scale to 0 for animation
    pointElement.style.transform = "translate(-50%, -50%) scale(0)";
    pointElement.style.backgroundColor='red'


    // If photo was captured at this point, add the photo-captured class
    if (coord.photoCapture === 1) {
      const vizElement = document.getElementById("visualization");
      let trial=find_nearest(coord.x,coord.z,coord.distance,vizElement);
      console.log(trial);
      pointElement.classList.add("photo-captured");
      pointElement.style.backgroundImage = "url('/images/image.png')";
      pointElement.style.width = "30px"; // Increase width
      pointElement.style.height = "30px"; // Increase height
      pointElement.style.backgroundSize = "cover"; // Ensures the image covers the div
      pointElement.style.backgroundRepeat = "no-repeat"; // Prevents repeating
      pointElement.style.backgroundPosition = "center"; // Centers the image
      pointElement.style.borderRadius = "50%"; // Optional: Makes it circular

      // pointElement.style.zIndex = 5;

      // Add click event to show the corresponding image
      pointElement.addEventListener("click", () => {
        const pointData = imagePointMap.get(coord.timestamp);
        if (pointData) {
          // Find the corresponding image card
          const imageCard = document.querySelector(
            `.card[data-timestamp="${pointData.image.timestamp}"]`
          );
          if (imageCard) {
            // Remove active class from all cards
            document
              .querySelectorAll(".card")
              .forEach((card) => card.classList.remove("active"));

            // Add active class to this card
            imageCard.classList.add("active");

            // Scroll to the card
            imageCard.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      });
    }

    pointElement.style.left = `${screenX}px`;
    pointElement.style.top = `${screenZ}px`;
    vizElement.appendChild(pointElement);

    // Trigger animation after a small delay
    setTimeout(() => {
      pointElement.style.transform = "translate(-50%, -50%) scale(1)";
    }, 10);
  }

  function renderAllImages() {
    // Clear image container
    imageContainer.innerHTML = "";
  
    // Render images or empty state message
    if (imageHistory.length === 0) {
      const message = document.createElement("div");
      message.className = "no-images-message";
      message.textContent = "No images available";
      imageContainer.appendChild(message);
    } else {
      // Render actual images with staggered animation
      imageHistory.forEach((image, index) => {
        const card = createCardWithImage(image);
        // Set initial state for animation
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        imageContainer.appendChild(card);
  
        // Trigger animation with staggered delay
        setTimeout(() => {
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        }, index * 100); // 100ms delay between each card
      });
    }
  }
  function parseImageUrl(url) {
    try {
      // First, decode the URL to handle any encoded characters
      const decodedUrl = decodeURIComponent(url);
      
      // Extract the filename portion from the URL
      let filename = null;
      if (decodedUrl.includes('/o/ARTracker%2F')) {
        filename = decodedUrl.split('/o/ARTracker%2F')[1];
      } else if (decodedUrl.includes('/o/ARTracker/')) {
        filename = decodedUrl.split('/o/ARTracker/')[1];
      }
      
      if (filename) {
        // Remove the query parameters
        filename = filename.split('?')[0];
        
        // Split the filename by underscores
        const parts = filename.split('_');
        
        // Handle case when there are no underscores in the filename
        if (parts.length === 1) {
          // Try to extract information from single part
          const nameParts = parts[0].replace(/\.png$/, '').split(/(?=[A-Z])/);
          if (nameParts.length > 2) {
            return {
              brand: nameParts[0] || "Unknown",
              visual: nameParts[1] || "Unknown",
              product: nameParts[2] || "Unknown",
              measurement: "N/A"
            };
          }
        }
        
        // Extract components based on position
        const brand = parts[0] || "Unknown";
        
        // Handle "Dummy device" which contains a space
        let visual = parts[1] || "Unknown";
        let productIndex = 2;
        
        // If visual has a space that was encoded in the URL, it might span multiple parts
        if (parts.length > 2 && parts[2] && !parts[2].toLowerCase().includes("phone") && 
            !parts[2].toLowerCase().includes("tablet") && !parts[2].toLowerCase().includes("tv")) {
          visual = visual + " " + parts[2];
          productIndex = 3;
        }
        
        // Get product and remove .png extension if it exists
        let product = parts[productIndex] || "Unknown";
        product = product.replace(/\.png$/i, '');
        
        // Check if we have a measurement (next part after product before .png)
        let measurement = "N/A";
        if (parts.length > productIndex + 1) {
          // Extract measurement without the .png extension
          measurement = parts[productIndex + 1].replace(/\.png$/i, '');
        }
        
        return {
          brand,
          visual,
          product,
          measurement
        };
      }
  
      // Fallback if parsing fails
      return {
        brand: "Unknown",
        visual: "Unknown",
        product: "Unknown",
        measurement: "N/A"
      };
    } catch (error) {
      console.error("Error parsing image URL:", error);
      return {
        brand: "Unknown",
        visual: "Unknown",
        product: "Unknown",
        measurement: "N/A"
      };
    }
  }
  
  async function fetchBannerData(imageUrl) {
    try {
      const response = await fetch("/api/banner_data", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const data = await response.json();
        // Find the banner data for this image URL
        const bannerData = data.find(item => item.imageUrl === imageUrl);
        return bannerData || null;
      } else {
        console.error("Error fetching banner data:", response.statusText);
        return null;
      }
    } catch (error) {
      console.error("Error fetching banner data:", error);
      return null;
    }
  }

  function createCardWithImage(imageData) {
    const card = document.createElement("div");
  card.className = "card";
  card.dataset.timestamp = imageData.timestamp;
  card.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

  // Image container for centering
  const imgContainer = document.createElement("div");
  imgContainer.className = "card-image-container";
  
  // Image element
  const img = document.createElement("img");
  img.src = imageData.url;
  img.alt = "Captured Image";
  img.className = "card-image";
  img.loading = "lazy";
  img.onerror = function () {
    this.src = "https://via.placeholder.com/340x180?text=Image+Load+Error";
  };
  
  // Add image to its container
  imgContainer.appendChild(img);
  
  // Content section
  const content = document.createElement("div");
  content.className = "card-content";
  
  // Info grid layout
  const infoGrid = document.createElement("div");
  infoGrid.className = "card-info";
  
  // Parse info from URL
  const parsedInfo = parseImageUrl(imageData.url);
  
  // Create info pairs (label + value)
  const infoPairs = [
    { label: "Brand", value: parsedInfo.brand },
    { label: "Merchandise", value: parsedInfo.visual },
    { label: "Product", value: parsedInfo.product },
    { label: "Measurement", value: parsedInfo.measurement || "N/A" }
  ];
  // Create container for labels (headings)
const labelsRow = document.createElement("div");
labelsRow.className = "card-info-row labels";

// Create container for values
const valuesRow = document.createElement("div");
valuesRow.className = "card-info-row values";

// Add each pair to the respective row
infoPairs.forEach(pair => {
  const label = document.createElement("div");
  label.className = "card-info-label";
  label.textContent = pair.label;
  labelsRow.appendChild(label);

  const value = document.createElement("div");
  value.className = "card-info-value";
  value.textContent = pair.value;
  valuesRow.appendChild(value);
});

 
  
  // Create button
  const button = document.createElement("button");
  button.className = "card-button";
  button.textContent = "View Full Report";

  const toggle = document.createElement("div");
  toggle.className = "card-toggle";
  toggle.innerHTML = `See More <span class="arrow">▼</span>`;
  
  // Extra content (initially hidden)
  const extraContent = document.createElement("div");
  extraContent.className = "card-extra-content";
  extraContent.innerHTML = `
  `;
  extraContent.style.display = "none"; // Initially hidden
  
  if (imageData.metadata && imageData.metadata.bannerData) {
    // If banner data exists in metadata, use it
    extraContent.innerHTML =
    //  `<i>AI Generated Summary: Brand - ${imageData.metadata.bannerData.brand || "N/A"}, Position - ${imageData.metadata.bannerData.position || "N/A"}, Type - ${imageData.metadata.bannerData.type || "N/A"}</i>`;
     `
     <div class="extra-content-container">
         <div class="extra-header">
             <img src="./images/star.png" alt="Icon" class="extra-icon" style='' />
             <span class="extra-title">AI Analysis</span>
         </div>
         <p class="extra-description">
             Designed for online marketing campaigns, this banner comes with various attributes to ensure adaptability across platforms:
         </p>
         <p class="extra-details">
             <strong>Brand:</strong> ${imageData.metadata.bannerData.brand || "N/A"} <br>
             <strong>Position:</strong> ${imageData.metadata.bannerData.position || "N/A"} <br>
             <strong>Type:</strong> ${imageData.metadata.bannerData.type || "N/A"}
         </p>
     </div>
 `;
  
    } else {
    // Make a placeholder and update it asynchronously
    extraContent.innerHTML = `<i>AI Generated Summary: Loading...</i>`;
    
  fetch("/api/banner_data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl: imageData.url,
      brand: parsedInfo.brand,
      position: "Auto-detected",
      type: parsedInfo.product,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      // if (data && data.data) {
      //   extraContent.innerHTML = 
      //   `<i>AI Generated Summary: Brand - ${data.data.brand || "N/A"}, Position - ${data.data.position || "N/A"}, Type - ${data.data.type || "N/A"}</i>`;
      // }
      if (data && data.data) {
        extraContent.innerHTML = 
        `
        <div class="extra-content-container">
            <div class="extra-header">
                <img src="your-image.png" alt="Icon" class="extra-icon" />
                <span class="extra-title">AI Analysis</span>
            </div>
            <p class="extra-description">
                Designed for online marketing campaigns, this banner comes with various attributes to ensure adaptability across platforms:
            </p>
            <p class="extra-details">
                <strong>Brand:</strong> ${data.data.brand || "N/A"} <br>
                <strong>Position:</strong> ${data.data.position || "N/A"} <br>
                <strong>Type:</strong> ${data.data.type || "N/A"}
            </p>
        </div>
    `;

         }
    })
    .catch((error) => {
      console.error("Error fetching banner data:", error);
      extraContent.innerHTML = `<i>AI Generated Summary: Could not load data</i>`;
    });
  }

  // Toggle event
  toggle.addEventListener("click", () => {
      const arrow = toggle.querySelector(".arrow");
      if (extraContent.style.display === "none") {
          extraContent.style.display = "block"; // Show content
          toggle.innerHTML = `See Less <span class="arrow">▲</span>`; // Change text and arrow
      } else {
          extraContent.style.display = "none"; // Hide content
          toggle.innerHTML = `See More <span class="arrow">▼</span>`; // Reset text and arrow
      }
  });

  
  // Add all elements to the card
  infoGrid.appendChild(labelsRow);
  infoGrid.appendChild(valuesRow);
  content.appendChild(infoGrid);
  content.appendChild(toggle);
  content.appendChild(extraContent);
  // content.appendChild(button);
  card.appendChild(imgContainer);
  card.appendChild(content);
  
  // Add click event for the card
  card.addEventListener("click", () => {
    // Remove active class from all cards
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("active"));
    
    // Add active class to clicked card
    card.classList.add("active");
    
    // Add a subtle scale animation
    card.style.transform = "scale(1.05)";
    setTimeout(() => {
      card.style.transform = "";
    }, 300);
  });
  
  return card;
  }
});

// Planogram Toggle Functionality
// document.addEventListener("DOMContentLoaded", function () {
//   // Get the toggle button
//   const planogramToggle = document.getElementById("planogramToggle");

//   // Get the visualization element with the overlay
//   const visualization = document.getElementById("visualization");

//   // Variable to track toggle state
//   let planogramVisible = false;

//   // Add click event listener to the toggle button
//   planogramToggle.addEventListener("click", function () {
//     // Toggle the state
//     planogramVisible = !planogramVisible;

//     // Update button text and style
//     if (planogramVisible) {
//       planogramToggle.textContent = "Planogram: ON";
//       planogramToggle.classList.add("active");

//       // Make planogram visible by adjusting overlay opacity
//       visualization.style.backgroundOpacity = "0.3";

//       // Make sure the visualization has the overlay class
//       if (!visualization.classList.contains("overlay")) {
//         visualization.classList.add("overlay");
//       }
//     } else {
//       planogramToggle.textContent = "Planogram: OFF";
//       planogramToggle.classList.remove("active");

//       // Hide planogram by removing overlay class
//       visualization.classList.remove("overlay");
//     }

//     // Add ripple effect (if you want to keep the ripple effect from the original code)
//     createRipple(event, planogramToggle);
//   });

//   // Initialize the toggle state (starting with planogram hidden)
//   planogramVisible = false;
//   planogramToggle.textContent = "Planogram: OFF";
//   visualization.classList.remove("overlay");

//   // Ripple effect function (assuming it's used in the original code)
//   function createRipple(event, button) {
//     const ripple = document.createElement("span");
//     ripple.classList.add("ripple");

//     const diameter = Math.max(button.clientWidth, button.clientHeight);
//     const radius = diameter / 2;

//     const rect = button.getBoundingClientRect();

//     ripple.style.width = ripple.style.height = `${diameter}px`;
//     ripple.style.left = `${event.clientX - rect.left - radius}px`;
//     ripple.style.top = `${event.clientY - rect.top - radius}px`;

//     button.appendChild(ripple);

//     ripple.addEventListener("animationend", () => {
//       ripple.remove();
//     });
//   }
// });

const structures = [
  // {
  //   id: 'shelf-1',
  //   name: 'A',
  //   type: 'shelf',
  //   coordinates: [[-500,-250], [-500, 250], [500, 250], [500, -250]]  
  // },
  // {
  //   id:'origin',
  //   name: 'o',
  //   type: 'entrance',
  //   coordinates: [[0,0], [0,0], [0, 0], [0, 0]]

  // },
  {
    id: 'bottom-entry',
    name: 'B',
    type: 'counter',
    coordinates:  [[-500, -250], [-500, -150], [-450, -150], [-450, -250]] 
  },
  {
    id: 'top-entry',
    name: 'C',
    type: 'counter',
    coordinates: [[-500, 250], [-500, 150], [-450, 150], [-450, 250]] 
  },
  {
    id: 'wearables',
    name: 'D',
    type: 'entrance',
    coordinates: [[-450, -250], [-450, -220], [50, -220], [50, -250]] 
  },
  {
    id: 'home appliance',
    name: 'E',
    type: 'entrance',
    coordinates:   [[50, -250], [50, -190], [500, -190], [500, -250]]  
  },
  // {
  //   id: 'PC-notebook',
  //   name: 'F',
  //   type: 'display',
  //   coordinates: [[-400, -220], [-400, -110], [50, -110], [50, -220]]  
  // },
  {
    id: 'apple-accesory',
    name: 'G',
    type: 'entrance',
    coordinates: [[-450, 250], [-450, 220], [50, 220], [50, 250]]  
  },
  // {
  //   id: 'samsung-wallbay',
  //   name: 'H',
  //   type: 'entrance',
  //   coordinates: [[50, 250], [50, 220], [500, 220], [500, 250]]  
  // },
  // {
  //   id: 'Cashier',
  //   name: 'I',
  //   type: 'shelf',
  //   coordinates: [[460, -160], [460, -60], [500, -60], [500, -160]]  
  // },
  // {
  //   id: 'samsung-tv',
  //   name: 'J',
  //   type: 'shelf',
  //   coordinates: [[460, -10], [460, 220], [500, 220], [500, -10]]  
  // },
  // {
  //   id:'tv-monitor',
  //   name: 'K',
  //   type: 'display',
  //   coordinates: [[-400, -110], [-400, 30], [-210, 30], [-210, -110]]
  // },
  {
    id:'wall',
    name: 'L',
    type: 'counter',
    coordinates: [[-200, -110], [-200, 30], [-170, 30], [-170, -110]]
  },
  {
    id:'pc-notebook',
    name: 'M',
    type: 'display',
    coordinates: [[-160, -100], [-160, 0], [50, 0], [50, -100]]
  },
  // {
  //   id:'oppo',
  //   name: 'N',
  //   type: 'display',
  //   coordinates: [[-140, 10], [-140, 70], [30, 70], [30, 10]]
  // },
  // {
  //   id:'apple-tomb-table',
  //   name: 'O',
  //   type: 'shelf',
  //   coordinates: [[-360, 100], [-360, 160], [-170, 160], [-170, 100]]
  // },
  // {
  //   id:'samsung-smart1',
  //   name: 'P',
  //   type: 'entrance',
  //   coordinates:[[150,80],[150,180],[200,180],[200,80]]
  // },
  {
    id:'samsung-smart2',
    name: 'Q',
    type: 'entrance',
    coordinates:[[250,80],[250,180],[300,180],[300,80]]
  },
  {
    id:'best-denki',
    name: 'R',
    type: 'shelf',
    coordinates:[[120,-110],[120,40],[220,40],[220,-110]]
  },
  {
    id:'samsung-oled',
    name: 'S',
    type: 'shelf',
    coordinates:[[260,-50],[260,20],[390,20],[390,-50]]
  }
];
// This function will add store structures to the visualization
function addStoreStructures(vizElement) {
  // Get the dimensions of the visualization area
  const vizWidth = vizElement.offsetWidth;
  const vizHeight = vizElement.offsetHeight;
  
  // Calculate center point
  const centerX = vizWidth / 2;
  const centerZ = vizHeight / 2;
  
  // Define store structures with coordinates
  // Each structure has: id, name, coordinates (array of [x, z] points in -100 to 100 range)

  
  // Create structures on the visualization
  structures.forEach(structure => {
    // Create a polygon for each structure
    const polygon = document.createElement('div');
    polygon.id = structure.id;
    polygon.className = `structure ${structure.type}`;
    polygon.title = structure.name;
    
    // Create SVG element for the polygon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    
    // Create the polygon path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Build the path data
    let pathData = '';
    structure.coordinates.forEach((coord, index) => {
      // Transform coordinates from -100,100 range to screen position
      const screenX = centerX + coord[0];
      const screenZ = centerZ + coord[1];
      
      if (index === 0) {
        pathData += `M ${screenX} ${screenZ} `;
      } else {
        pathData += `L ${screenX} ${screenZ} `;
      }
    });
    pathData += 'Z'; // Close the path
    
    // Set path attributes
    path.setAttribute('d', pathData);
    path.setAttribute('fill', getStructureColor(structure.type));
    path.setAttribute('stroke', '#000');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill-opacity', '0.5');
    
    // Add text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    
    // Calculate center of the structure for text positioning
    const centerCoord = getPolygonCenter(structure.coordinates);
    const textX = centerX + centerCoord[0] 
    const textY = centerZ + centerCoord[1]
    
    text.setAttribute('x', textX);
    text.setAttribute('y', textY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '12px');
    text.setAttribute('fill', '#000');
    text.setAttribute('font-weight', 'bold');
    text.textContent = structure.name;
    
    // Add elements to the DOM
    svg.appendChild(path);
    svg.appendChild(text);
    polygon.appendChild(svg);
    vizElement.appendChild(polygon);
  });
  
  // Add a legend
  // addLegend(vizElement);
}
function find_nearest(x, z,diagonal,vizElement) {
  x=(x/100)*500;
  z=(z/100)*250;
  console.log(x,z);
  if (!structures || structures.length === 0) {
    console.error("No structures found!");
    return;
}

let nearestQuadrilateral = null;
let minDistance = Infinity;

  // Find the nearest quadrilateral based on Euclidean distance
  // structures.forEach(structure => {
  //   structure.coordinates.forEach(coord => {
  //     const [x1, z1] = coord;
  //     const distance = Math.sqrt((x1 - x) ** 2 + (z1 - z) ** 2);
  //     if (distance < minDistance) {
  //       minDistance = distance;
  //       nearestStructure = structure;
  //     }
  //   });
  // });
//   structures.forEach(structure => {
//     const centroid = getPolygonCenter(structure.coordinates);
//     const distance = Math.sqrt((centroid[0] - x) ** 2 + (centroid[1] - z) ** 2);

//     if (distance < minDistance) {
//         minDistance = distance;
//         nearestStructure = structure;
//     }
// });
structures.forEach(structure => {
  let minEdgeDistance = Infinity;

  for (let i = 0; i < structure.coordinates.length; i++) {
      // Get two consecutive points forming an edge
      let [x1, z1] = structure.coordinates[i];
      let [x2, z2] = structure.coordinates[(i + 1) % 4];

      // Calculate perpendicular distance from (x, z) to this edge
      let distance = getPerpendicularDistance(x, z, x1, z1, x2, z2);

      if (distance < minEdgeDistance) {
          minEdgeDistance = distance;
      }
  }

  // Update nearest quadrilateral based on the smallest perpendicular distance
  if (minEdgeDistance < minDistance) {
      minDistance = minEdgeDistance;
      nearestStructure = structure;
  }
});

  if (!nearestStructure) {
    console.error("No nearby quadrilateral found.");
    return null;
  }

  console.log("Nearest Structure:", nearestStructure.name);
  console.log("diagonal:",diagonal);
  // Calculate square side from diagonal using Pythagoras' theorem
  const squareSide = diagonal *100/ Math.sqrt(2);
  console.log("Square Side:", squareSide);

  // Find a position inside the quadrilateral for the square
  const center = getPolygonCenter(nearestStructure.coordinates);
  const squareCoordinates = [
    [center[0] - squareSide / 2, center[1] - squareSide / 2], // Top-left
    [center[0] + squareSide / 2, center[1] - squareSide / 2], // Top-right
    [center[0] + squareSide / 2, center[1] + squareSide / 2], // Bottom-right
    [center[0] - squareSide / 2, center[1] + squareSide / 2]  // Bottom-left
  ];

  console.log("Square Coordinates:", squareCoordinates);
  createSquareVisualization(squareCoordinates, vizElement);
  return { nearestStructure, squareCoordinates };

}
function getPerpendicularDistance(x, z, x1, z1, x2, z2) {
  let A = z2 - z1;
  let B = -(x2 - x1);
  let C = x2 * z1 - z2 * x1;

  let numerator = Math.abs(A * x + B * z + C);
  let denominator = Math.sqrt(A ** 2 + B ** 2);
  let perpendicularDistance = numerator / denominator;

  // Find the projection point (xp, zp) on the line
  let t = ((x - x1) * (x2 - x1) + (z - z1) * (z2 - z1)) / ((x2 - x1) ** 2 + (z2 - z1) ** 2);

  if (t >= 0 && t <= 1) {
      // The perpendicular falls inside the segment, return the perpendicular distance
      return perpendicularDistance;
  } else {
      // The perpendicular falls outside, return the minimum distance to an endpoint
      let distanceToStart = Math.sqrt((x - x1) ** 2 + (z - z1) ** 2);
      let distanceToEnd = Math.sqrt((x - x2) ** 2 + (z - z2) ** 2);
      return Math.min(distanceToStart, distanceToEnd);
  }
}
function createSquareVisualization(squareCoordinates, vizElement) {
  const centerX = vizElement.offsetWidth / 2;
  const centerZ = vizElement.offsetHeight / 2;

  // Create an SVG element
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.pointerEvents = "none";

  // Create a path element for the square
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  // Build the path data
  let pathData = "";
  squareCoordinates.forEach((coord, index) => {
    const screenX = centerX + coord[0];
    const screenZ = centerZ + coord[1];

    if (index === 0) {
      pathData += `M ${screenX} ${screenZ} `;
    } else {
      pathData += `L ${screenX} ${screenZ} `;
    }
  });
  pathData += "Z"; // Close the path

  // Set path attributes for styling
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "rgba(255, 0, 0, 0.5)"); // Semi-transparent red
  path.setAttribute("stroke", "#000");
  path.setAttribute("stroke-width", "2");

  // Append elements to the DOM
  svg.appendChild(path);
  vizElement.appendChild(svg);
}
// Helper function to get the center of a polygon
function getPolygonCenter(coords) {
  let sumX = 0;
  let sumZ = 0;
  
  coords.forEach(coord => {
    sumX += coord[0];
    sumZ += coord[1];
  });
  
  return [sumX / coords.length, sumZ / coords.length];
}

// Helper function to get structure color based on type
function getStructureColor(type) {
  switch(type) {
    case 'shelf': return '#E6E7F8';
    case 'counter': return '#E6E7F8';
    case 'entrance': return '#E6E7F8';
    case 'display': return '#E6E7F8';
    default: return '#E6E7F8';
  }
}

// Add a legend to explain the structure types
function addLegend(vizElement) {
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.style.position = 'absolute';
  legend.style.bottom = '10px';
  legend.style.right = '10px';
  legend.style.background = 'rgba(255,255,255,0.8)';
  legend.style.padding = '10px';
  legend.style.borderRadius = '5px';
  legend.style.border = '1px solid #ccc';
  
  const types = [
    { type: 'shelf', name: 'Shelves' },
    { type: 'counter', name: 'Counters' },
    { type: 'entrance', name: 'Entrances' },
    { type: 'display', name: 'Displays' }
  ];
  
  types.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '5px';
    
    const color = document.createElement('div');
    color.style.width = '15px';
    color.style.height = '15px';
    color.style.backgroundColor = getStructureColor(item.type);
    color.style.marginRight = '5px';
    
    const text = document.createElement('span');
    text.textContent = item.name;
    
    row.appendChild(color);
    row.appendChild(text);
    legend.appendChild(row);
  });
  
  vizElement.appendChild(legend);
}

// Add CSS for the structures
function addStructureStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .structure {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
    }
    
    /* Add hover effect */
    .structure svg path:hover {
      fill-opacity: 0.7;
      cursor: pointer;
    }
  `;
  document.head.appendChild(styleElement);
}

// Add button to toggle structures visibility
// function addStructureToggle() {
//   const controlPanel = document.querySelector('.control-panel');
//   const div = document.querySelector('.control-panel div:last-child');
  
//   const structureToggle = document.createElement('button');
//   structureToggle.id = 'structureToggle';
//   structureToggle.type = 'button';
//   structureToggle.className = 'toggle';
//   structureToggle.textContent = 'Structures: OFF';
  
//   div.appendChild(structureToggle);
  
//   // Add event listener
//   structureToggle.addEventListener('click', function(event) {
//     // Toggle structures visibility
//     const structures = document.querySelectorAll('.structure');
//     const isVisible = structureToggle.classList.contains('active');
    
//     structures.forEach(structure => {
//       structure.style.display = isVisible ? 'none' : 'block';
//     });
    
//     // Update button state
//     structureToggle.textContent = isVisible ? 'Structures: OFF' : 'Structures: ON';
//     structureToggle.classList.toggle('active');
    
//     // Add ripple effect
//     createRipple(event);
//   });
// }

document.getElementById('structureToggle').addEventListener('change', function () {
  const structures = document.querySelectorAll('.structure');
  structures.forEach(structure => {
    structure.style.display = this.checked ? 'block' : 'none';
  });
});

// Function to initialize the store layout visualization
function initializeStoreLayout() {
  const vizElement = document.getElementById('visualization');
  
  if (!vizElement) {
    console.error('Visualization element not found!');
    return;
  }
  
  // Add CSS for structures
  addStructureStyles();
  
  // Add structures to the visualization
  addStoreStructures(vizElement);
  
  // Add toggle button
  addStructureToggle();
  
  // Initially hide structures
  const structures = document.querySelectorAll('.structure');
  structures.forEach(structure => {
    structure.style.display = 'none';
  });
}

// Call the initialization function after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit to ensure the visualization element is ready
  setTimeout(initializeStoreLayout, 500);
});