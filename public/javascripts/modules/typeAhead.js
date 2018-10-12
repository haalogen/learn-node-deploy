import axios from 'axios'; // Kind of fetch, has sane defaults, can cancel requests
import dompurify from 'dompurify'; // For sanitizing user input

function createSearchResultsHTML (stores) {
  return stores.map((store) => {
    return `
      <a href="/stores/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `;
  }).join('');
}

function typeAhead (searchBox) {
  if (!searchBox) return;

  const searchInput = searchBox.querySelector('input[name="search"]');
  const searchResults = searchBox.querySelector('.search__results')

  // Bling.js shortcut for addEventListener()
  searchInput.on('input', function () {
    // If there is no value, quit it!
    if (!this.value) {
      searchResults.style.display = 'none'; // Hide results
      return; // Stop!
    };

    // Show the search results!
    searchResults.style.display = 'block';
    searchResults.innerHTML = '';

    axios
      .get(`/api/v1/search?q=${this.value}`)
      .then((res) => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(createSearchResultsHTML(res.data));
          return;
        }
        // Tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for <strong>${this.value}</strong> found!</div>`);
      })
      .catch(console.error);
  });

  // Handle search results list navigating
  searchInput.on('keyup', (event) => {
    // If they don't press UP, DOWN or ENTER, who cares!
    if (![38, 40, 13].includes(event.keyCode)) return; // Skip it!

    const activeClass = 'search__result--active';
    const current = searchBox.querySelector(`.${activeClass}`);
    const items = searchBox.querySelectorAll('.search__result');

    let next; // Next selected item
    if (event.keyCode === 40 && current) {
      // They press "DOWN" while element is selected
      next = current.nextElementSibling || items[0];
    } else if (event.keyCode === 40) {
      // They press "DOWN" while no element is selected
      next = items[0];
    } else if (event.keyCode === 38 && current) {
      // They press "UP" while element is selected
      next = current.previousElementSibling || items[items.length - 1];
    } else if (event.keyCode === 38) {
      // They press "UP" while no element is selected
      next = items[items.length - 1];
    } else if (event.keyCode === 13 && current.href) {
      // They press "ENTER" while element with non-empty "href" is selected
      window.location = current.href;
      return; // Stop this function
    }

    next.classList.add(activeClass);
    if (current) current.classList.remove(activeClass);
  });

}

export default typeAhead;
