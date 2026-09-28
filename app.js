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
    imgElement.style.border = "none";
  }

  // Check if we hit the 10-card minimum to unlock the start button
  const startBtn = document.getElementById('start-game-btn');
  startBtn.disabled = selectedDeck.length < 10;
  startBtn.textContent = `Start Game (${selectedDeck.length}/10+)`;
}

initApp();

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
  // Create a shuffled copy of the selected deck
  activeDeck = shuffleDeck([...selectedDeck]);
  
  // Hide the builder view, show the play view
  document.getElementById('builder-view').style.display = 'none';
  document.getElementById('play-view').style.display = 'block';
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

