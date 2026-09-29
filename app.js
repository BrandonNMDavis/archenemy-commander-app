const SCRYFALL_API_URL = 'https://api.scryfall.com/cards/search?q=t:scheme';

async function loadSchemes() {
  const cachedData = localStorage.getItem('archenemy_schemes');
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  try {
    const response = await fetch(SCRYFALL_API_URL);
    const data = await response.json();
    const schemes = data.data; 
    
    localStorage.setItem('archenemy_schemes', JSON.stringify(schemes));
    return schemes;
  } catch (error) {
    console.error("Failed to fetch from Scryfall:", error);
  }
}

let allSchemes = [];
let selectedDeck = [];

async function initApp() {
  allSchemes = await loadSchemes();
  setupSetFilter(allSchemes); // NEW: Populate the dropdown
  renderGrid(allSchemes);
}

function renderGrid(schemes) {
  const grid = document.getElementById('card-grid');
  
  // NEW: Clear existing cards before rendering the new ones
  grid.innerHTML = ''; 
  
  schemes.forEach(card => {
    const img = document.createElement('img');
    img.src = card.image_uris.normal; 
    
    img.id = `card-${card.id}`;
    img.style.cursor = "pointer";
    // Remove the inline width="200px" here if you added the CSS file!
    
    // Keep the green border if the card is already in the selectedDeck array
    if (selectedDeck.some(c => c.id === card.id)) {
      img.style.border = "4px solid #4CAF50";
    } else {
      img.style.border = "4px solid transparent";
    }
    
    img.onclick = () => toggleCardSelection(card, img);
    grid.appendChild(img);
  });
}

// NEW: Handles clicking a card in the builder view
function toggleCardSelection(card, imgElement) {
  const cardIndex = selectedDeck.findIndex(c => c.id === card.id);
  
  if (cardIndex === -1) {
    // Card is not in deck, add it
    selectedDeck.push(card);
    imgElement.style.border = "4px solid #4CAF50"; // Green border for selected
  } else {
    // Card is already in deck, remove it
    selectedDeck.splice(cardIndex, 1);
    imgElement.style.border = "4px solid transparent";
  }

  // Check if we hit the 10-card minimum to unlock the start button
  const startBtn = document.getElementById('start-game-btn');
  startBtn.disabled = selectedDeck.length < 10;
  startBtn.textContent = `Start Game (${selectedDeck.length}/10+)`;
}

let activeDeck = [];

function shuffleDeck(array) {
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // Swap elements
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

document.getElementById('start-game-btn').onclick = () => {
  activeDeck = shuffleDeck([...selectedDeck]);
  
  document.getElementById('builder-view').style.display = 'none';
  document.getElementById('play-view').style.display = 'block';
  
  renderLifeTracker(); // NEW: Draw the life totals on the board
};

document.getElementById('draw-scheme-btn').onclick = () => {
  if (activeDeck.length === 0) {
    alert("The scheme deck is empty!");
    return;
  }

  // Remove and return the last card in the array
  const drawnCard = activeDeck.pop(); 
  
  renderCurrentScheme(drawnCard);

  // Check Scryfall's type_line property for the word "Ongoing"
  if (drawnCard.type_line.includes("Ongoing")) {
    renderOngoingScheme(drawnCard);
  }
};

function renderCurrentScheme(card) {
  let displayContainer = document.getElementById('current-scheme-display');
  
  // Create the container on the first draw if it doesn't exist
  if (!displayContainer) {
    displayContainer = document.createElement('div');
    displayContainer.id = 'current-scheme-display';
    const playView = document.getElementById('play-view');
    const drawBtn = document.getElementById('draw-scheme-btn');
    playView.insertBefore(displayContainer, drawBtn);
  }

  displayContainer.innerHTML = `
    <h3 style="color: white; font-family: sans-serif;">Current Scheme:</h3>
    <img src="${card.image_uris.normal}" style="width: 300px; display: block; margin-bottom: 20px; border-radius: 4.75% / 3.5%;" />
  `;
}

function renderOngoingScheme(card) {
  const activeContainer = document.getElementById('active-schemes');
  
  const wrapper = document.createElement('div');
  wrapper.style.display = 'inline-block';
  wrapper.style.margin = '10px';
  wrapper.style.textAlign = 'center';
  
  const img = document.createElement('img');
  img.src = card.image_uris.normal;
  img.style.width = '200px';
  img.style.display = 'block';
  img.style.borderRadius = '4.75% / 3.5%'; // MTG card corner ratio
  
  const abandonBtn = document.createElement('button');
  abandonBtn.textContent = 'Abandon Scheme';
  abandonBtn.style.marginTop = '10px';
  abandonBtn.style.cursor = 'pointer';
  
  // Clicking abandon destroys the HTML wrapper holding the card
  abandonBtn.onclick = () => {
    wrapper.remove();
  };
  
  wrapper.appendChild(img);
  wrapper.appendChild(abandonBtn);
  activeContainer.appendChild(wrapper);
}

function setupSetFilter(schemes) {
  const filter = document.getElementById('set-filter');
  
  // Create an array of unique set names
  const uniqueSets = [...new Set(schemes.map(card => card.set_name))];
  
  // Add an option to the dropdown for each unique set
  uniqueSets.forEach(setName => {
    const option = document.createElement('option');
    option.value = setName;
    option.textContent = setName;
    filter.appendChild(option);
  });

  // Listen for changes and re-render the grid
  filter.addEventListener('change', (e) => {
    const selectedSet = e.target.value;
    if (selectedSet === 'all') {
      renderGrid(schemes);
    } else {
      // Filter the array to only include cards from the chosen set
      const filteredSchemes = schemes.filter(card => card.set_name === selectedSet);
      renderGrid(filteredSchemes);
    }
  });
}
// NEW: Life Tracker State 
let players = [
  { name: "Archenemy", life: 60 },
  { name: "Player 1", life: 40 },
  { name: "Player 2", life: 40 },
  { name: "Player 3", life: 40 }
];

function renderLifeTracker() {
  const container = document.getElementById('life-tracker-container');
  if (!container) return;
  
  container.innerHTML = ''; // Clear before redrawing
  
  players.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-life-box';
    
    playerDiv.innerHTML = `
      <h4 style="margin: 0 0 10px 0; color: #90caf9;">${player.name}</h4>
      <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
        <button onclick="updateLife(${index}, -1)" style="margin: 0; padding: 5px 15px; background-color: #cf6679;">-</button>
        <span style="font-size: 1.5rem; font-weight: bold; width: 40px;">${player.life}</span>
        <button onclick="updateLife(${index}, 1)" style="margin: 0; padding: 5px 15px; background-color: #4CAF50;">+</button>
      </div>
    `;
    container.appendChild(playerDiv);
  });
}

// This updates the array and instantly refreshes the UI
// Attaching it to the window object ensures the inline HTML onclick can find it
window.updateLife = function(index, amount) {
  players[index].life += amount;
  renderLifeTracker();
};

document.getElementById('reset-game-btn').onclick = () => {
  // 1. Clear the game board arrays
  activeDeck = [];
  selectedDeck = [];
  
  // 2. Wipe the HTML board clean
  const activeContainer = document.getElementById('active-schemes');
  activeContainer.innerHTML = '';
  
  const currentDisplay = document.getElementById('current-scheme-display');
  if (currentDisplay) {
    currentDisplay.remove();
  }
  
  // 3. Reset Life Totals to default
  players = [
    { name: "Archenemy", life: 60 },
    { name: "Player 1", life: 40 },
    { name: "Player 2", life: 40 },
    { name: "Player 3", life: 40 }
  ];
  
  // 4. Reset the "Start Game" button state
  const startBtn = document.getElementById('start-game-btn');
  startBtn.disabled = true;
  startBtn.textContent = 'Start Game';
  
  // 5. Swap the display views back
  document.getElementById('play-view').style.display = 'none';
  document.getElementById('builder-view').style.display = 'block';
  
  // 6. Force the grid to re-render to remove the green borders
  const filter = document.getElementById('set-filter');
  if (filter.value === 'all') {
    renderGrid(allSchemes);
  } else {
    const filteredSchemes = allSchemes.filter(card => card.set_name === filter.value);
    renderGrid(filteredSchemes);
  }
};
initApp();
