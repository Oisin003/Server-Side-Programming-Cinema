document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');

  // Prevent form submission and handle it with JavaScript
  searchForm.addEventListener('submit', function(event) {
      event.preventDefault();  // Prevent page reload

      const query = document.querySelector('input[name="query"]').value.trim();
      const filter = document.querySelector('select[name="filter"]').value;

      if (!query) {
          alert("Please enter a search query.");
          return;
      }

      // Send the search request to the server
      fetch(`/search?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`, {
          method: 'GET'
      })
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              displaySearchResults(data.movies);
          } else {
              displaySearchResults([]);
          }
      })
      .catch(error => console.error('Error during search:', error));
  });

  // Function to display search results dynamically
  function displaySearchResults(movies) {
      const moviesContainer = document.getElementById('movies-container');
      moviesContainer.innerHTML = '';  // Clear previous results

      // Check if there are any movies to display
      if (movies.length > 0) {
          movies.forEach(movie => {
              const movieCard = document.createElement('div');
              movieCard.classList.add('movie-card');

              movieCard.innerHTML = `
                  <!-- Display the movie image -->
                  <img src="${movie.image_url}" alt="${movie.title}" class="movie-image" />
                  <h2>${movie.title}</h2>
                  <p>${movie.year}</p>
                  <p>Rating: ${movie.rating}</p>
              `;

              moviesContainer.appendChild(movieCard);
          });
      } else {
          moviesContainer.innerHTML = '<p>No movies found.</p>';
      }
  }
});
