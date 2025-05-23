import "@hotwired/turbo-rails"
import "controllers"

(function() {
let cachedDashEvents = JSON.parse(localStorage.getItem("cachedDashEvents")) || [];
let originalDashEvents = cachedDashEvents.slice();
let eventDashCardListenersAdded = false;
let DashFilterSortListenersAdded = false;
let refreshButtonDashListenerAdded = false;
let eventDashModal;
let cachedUserEvents = [];

document.addEventListener("turbo:load", initializeDashboard);

document.addEventListener('turbo:before-cache', function() {
  // Reset flags
  eventDashCardListenersAdded = false;
  DashFilterSortListenersAdded = false;
  refreshButtonDashListenerAdded = false;

  const eventModalElement = document.getElementById("event-modal-2");
  if(eventModalElement){
    eventDashModal = new bootstrap.Modal(eventModalElement, {
      backdrop: 'static' // Explicitly setting backdrop
    });
  }

});

function initializeDashboard() {
  eventDashCardListenersAdded = false;
  DashFilterSortListenersAdded = false;
  refreshButtonDashListenerAdded = false;
  // Check if the URL has the refresh parameter
  const urlParams = new URLSearchParams(window.location.search);
  const shouldRefresh = urlParams.has('refresh');

  const userId = document.body.dataset.userId;
  if (!userId) return; 
  
  localStorage.setItem("loggedInUserId", userId);
  cachedUserEvents = syncDashboardWithUserEvents() || [];
  originalDashEvents = cachedUserEvents.slice();
  
  if (shouldRefresh || cachedUserEvents.length == 0) {
    initializeDashEvents(); 

    urlParams.delete('refresh');
  const newQueryString = urlParams.toString();
  const newUrl = newQueryString ? `${window.location.pathname}?${newQueryString}` : window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
  } else {
    renderDashEvents(cachedUserEvents); 
    populateDashFilters();
    addSearchAndFilterListenersDash();
  }
  const eventModalElement = document.getElementById("event-modal-2");
  if(eventModalElement){
    eventDashModal = new bootstrap.Modal(eventModalElement, {
      backdrop: 'static' // Explicitly setting backdrop
    });
  }

  const refreshButton = document.getElementById("refresh-dash-button");
  if(refreshButton && !refreshButtonDashListenerAdded){
    refreshButton.addEventListener("click", refreshDashEvents);
    refreshButtonDashListenerAdded = true;
  }
}

function populateDashFilters(){
  const categories = new Set();
  const hosts = new Set();
  const clubs = new Set();
  const locations = new Set();

  originalDashEvents.forEach(event => {
    if (event.category && event.category.name) {
      categories.add(event.category.name);
    }
    if (event.host && event.host.first_name && event.host.last_name) {
      hosts.add(`${event.host.first_name} ${event.host.last_name}`);
    }
    if (event.club && event.club.club_name) {
      clubs.add(event.club.club_name);
    }
    if (event.location) {
      locations.add(event.location);
    }
  });

  const populateSelect = (selectElement, options, placeholders) => {
    if (selectElement) {
      selectElement.innerHTML = ''; // Clear existing options
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = placeholders; // Placeholder option
      selectElement.appendChild(defaultOption);

      options.forEach(optionText => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        selectElement.appendChild(option);
      });
    }
  };

  // Populate each filter with unique values
  populateSelect(document.getElementById("category-filter-dash"), categories, "All Categories");
  populateSelect(document.getElementById("host-filter-dash"), hosts, "All Hosts");
  populateSelect(document.getElementById("club-filter-dash"), clubs, "All Clubs");
  populateSelect(document.getElementById("location-filter-dash"), locations, "All Locations");
}


function syncDashboardWithUserEvents(){
  const loggedInUserId = localStorage.getItem("loggedInUserId");
  if(!loggedInUserId) return; 

  // filter events where the user is aparticipants 
  const userEvents = cachedDashEvents.filter(event => 
    event.users && event.users.some(user => user.id == loggedInUserId)
  )  

  // renderDashEvents(userEvents);
  return userEvents;
}

function addSearchAndFilterListenersDash() {
  if (DashFilterSortListenersAdded) return; // Prevent adding multiple listeners
  DashFilterSortListenersAdded = true;

  const searchInput = document.getElementById("search-input-dash");
  const categoryFilter = document.getElementById("category-filter-dash");
  const hostFilter = document.getElementById("host-filter-dash");
  const clubFilter = document.getElementById("club-filter-dash");
  const locationFilter = document.getElementById("location-filter-dash");

  if (searchInput) {
    searchInput.addEventListener("input", filterAndRenderDashEvents);
  }
  if (categoryFilter) {
    categoryFilter.addEventListener("change", filterAndRenderDashEvents);
  }
  if (hostFilter) {
    hostFilter.addEventListener("change", filterAndRenderDashEvents);
  }
  if (clubFilter) {
    clubFilter.addEventListener("change", filterAndRenderDashEvents);
  }
  if (locationFilter) {
    locationFilter.addEventListener("change", filterAndRenderDashEvents);
  }
}

function filterAndRenderDashEvents() {
  const searchInput = document.getElementById("search-input-dash").value.toLowerCase();
  const categoryValue = document.getElementById("category-filter-dash").value;
  const hostValue = document.getElementById("host-filter-dash").value;
  const clubValue = document.getElementById("club-filter-dash").value;
  const locationValue = document.getElementById("location-filter-dash").value;

  
  let filteredEvents = originalDashEvents.filter(event => {
    // Check search input
    const titleMatch = event.title && event.title.toLowerCase().includes(searchInput);
    const descriptionMatch = event.description && event.description.toLowerCase().includes(searchInput);
    const searchMatch = !searchInput || titleMatch || descriptionMatch;

    // Check category filter
    const categoryMatch = !categoryValue || (event.category && event.category.name === categoryValue);

    // Check host filter
    const hostName = event.host ? `${event.host.first_name} ${event.host.last_name}` : "";
    const hostMatch = !hostValue || hostName === hostValue;

    // Check club filter
    const clubName = event.club ? event.club.club_name : "";
    const clubMatch = !clubValue || clubName === clubValue;

    // Check location filter
    const locationMatch = !locationValue || event.location === locationValue;

    return searchMatch && categoryMatch && hostMatch && clubMatch && locationMatch;
  });

  // Render filtered events
  renderDashEvents(filteredEvents);
}

function refreshDashEvents(){
  localStorage.removeItem("cachedDashEvents");
  cachedDashEvents = [];
  originalDashEvents = [];

  clearDashFilters();
  initializeDashEvents();
  
}

function clearDashFilters(){
  const searchInput = document.getElementById("search-input-dash");
  const categoryFilter = document.getElementById("category-filter-dash");
  const hostFilter = document.getElementById("host-filter-dash");
  const clubFilter = document.getElementById("club-filter-dash");
  const locationFilter = document.getElementById("location-filter-dash");

  if (searchInput) searchInput.value = "";
  if (categoryFilter) categoryFilter.innerHTML = `<option value="">All Categories</option>`;
  if (hostFilter) hostFilter.innerHTML = `<option value="">All Hosts</option>`;
  if (clubFilter) clubFilter.innerHTML = `<option value="">All Clubs</option>`;
  if (locationFilter) locationFilter.innerHTML = `<option value="">All Locations</option>`;

}

function initializeDashEvents() {

    const eventsContainer = document.getElementById("events-container2");
    const loadingMessage = document.getElementById("loading-message2");
    
    // Show the loading message and clear previous content
    if(loadingMessage){
      loadingMessage.style.display = "block";
    }
    if(eventsContainer){
      eventsContainer.innerHTML = "";
    }
    
  
    // Fetch events from the API
    fetch("/api/events")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch events");
        return response.json();
      })
      .then((events) => {
        if(loadingMessage){
          loadingMessage.style.display = "none";
        }
        cachedDashEvents = events;
        cachedUserEvents = syncDashboardWithUserEvents();
        originalDashEvents = cachedUserEvents.slice();
        localStorage.setItem("cachedDashEvents", JSON.stringify(events));
  
        // Populate filters and add listeners
        populateDashFilters();
        addSearchAndFilterListenersDash();

        // syncDashboardWithUserEvents();
        renderDashEvents(cachedUserEvents);
      })
      .catch((error) => {
        if(eventsContainer){
          eventsContainer.innerHTML = `<p class="text-center text-danger">Failed to load events. Please try again later.</p>`;
        }
      });
  }
  
  function renderDashEvents(events) {
    const eventsContainer = document.getElementById("events-container2");
    
    if(eventsContainer){
      eventsContainer.innerHTML = "";
    }
  
    if (events.length === 0 && eventsContainer) {
      eventsContainer.innerHTML = `<p class="text-center">No upcoming events at the moment. Please check back later!</p>`;
      return;
    }
  
    // Render each event card
    events.forEach((event) => {
      const eventHTML = renderDashEventCard(event);
      if(eventsContainer){
        eventsContainer.insertAdjacentHTML("beforeend", eventHTML);
      }
    });
  
    addDashEventCardListeners(); 
  }

  function nameToAvatar(first_name, last_name) {
    const first_char = first_name ? first_name.charAt(0).toUpperCase() : "";
    const last_char = last_name ? last_name.charAt(0).toUpperCase() : "";
    
    return `<div class="avatar me-2 d-flex justify-content-center align-items-center"> ${first_char} ${last_char} </div>`
  }
  // Function to render an event card
  function renderDashEventCard(event) {
    const eventDate = new Date(event.event_datetime).toLocaleString();
  
    // Provide default values if event_type or icon is missing
    const eventType = event.event_type || {};
    const eventTypeName = eventType.type_name || 'Event';

    const loadParticipants = event.users ? event.users.map(user => nameToAvatar(user.first_name, user.last_name)).join("")
    : '<div> No participants in the event </div>';
  
    return `
      <article class="card custom-card mb-3 hover-shadow" role="article" data-event-id="${event.id}">
    <div class="card-body">
      <!-- Title and Subtitles (Aligned Left and Right) -->
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="card-title">${event.title}</h5>
        <div class="event-details-right">
          <h6 class="card-subtitle mb-0">Type: ${eventTypeName}</h6>
          <h6 class="card-subtitle">Sport: ${event.category.name}</h6>
        </div>
      </div>

        <!-- Row 1: Hosted By & Participants -->
        <div class="d-flex justify-content-between align-items-center">
          <p class="card-text">Hosted by: ${event.host.first_name} ${event.host.last_name}</p>
          <p class="card-text"><i class="bi bi-person-standing"></i> ${event.capacity} participants</p>
        </div>

        <!-- Row 2: Organized By & Location -->
        ${event.club ? `
        <div class="d-flex justify-content-between align-items-center">
          <p class="card-text">Organized by: ${event.club.club_name}</p>
          <p class="card-text"><i class="bi bi-geo icon-blue"></i> ${event.location}</p>
        </div>` : ""}

        <!-- Row 3: Date and Time -->
        <div class="d-flex">
          <p class="card-text"><i class="bi bi-calendar-event icon-yellow"></i> ${eventDate}</p>
        </div>
      </div>

      <footer class="card-footer custom-card-footer">
        <div class="d-flex align-items-center">
          <span class="me-2">Current Users:</span>
          <div class="d-flex">
            ${loadParticipants}
          </div>
        </div>
      </footer>
    </article>
  `;
}

// Function to add event listeners to event cards
function addDashEventCardListeners() {
    if (eventDashCardListenersAdded) return;
    eventDashCardListenersAdded = true;

  const eventsContainer = document.getElementById("events-container2");
  
  if(eventsContainer){
    eventsContainer.addEventListener("click", (event) => {
    const card = event.target.closest("[data-event-id]");
    if (card) {
      const eventId = card.getAttribute("data-event-id");
      openEventModal2(eventId);
    }
  });
}
}

// Function to open event modal
function openEventModal2(eventId) {
  const event = cachedDashEvents.find((e) => e.id == eventId);
  if (!event) return;

  // Update modal content
  document.getElementById("eventModalLabel").textContent = event.title;
  document.getElementById("eventDescription").textContent = event.description;

  const eventLocation = event.location || 'Default Location';
  document.getElementById("eventModalMap").innerHTML = `<iframe
    width="100%"
    height="100%"
    frameborder="0"
    style="border:0"
    src="https://www.google.com/maps?q=${encodeURIComponent(eventLocation)}&output=embed"
    allowfullscreen>
  </iframe>`;
  
  eventDashModal.show();
}
})();
