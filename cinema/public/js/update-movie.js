// Wait until the DOM content is loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {

  // Select the form element
  const updateForm = document.querySelector('form');
  // Select the update button to disable it during submission
  const updateButton = document.querySelector('.update-button');

  // Listen for the form submit event
  updateForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent the default form submission behavior

    // Retrieve values from the form fields
    const title = document.querySelector('#title').value;
    const year = document.querySelector('#year').value;
    const actors = document.querySelector('#actors').value;
    const genre = document.querySelector('#genre').value;
    const certification = document.querySelector('#certification').value;
    const ageRecommendation = document.querySelector('#age_recommendation').value;
    const imageUrl = document.querySelector('#image_url').value;

    // Validate that all fields are filled
    if (title && year && actors && genre && certification && ageRecommendation && imageUrl) {
      // Disable the update button to show the form is being submitted
      updateButton.disabled = true;

      // Create a new FormData object to send the form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('year', year);
      formData.append('actors', actors);
      formData.append('genre', genre);
      formData.append('certification', certification);
      formData.append('age_recommendation', ageRecommendation);
      formData.append('image_url', imageUrl);

      // Send the form data via POST to the server
      fetch(updateForm.action, {
        method: 'POST',
        body: formData,
      })
        .then(response => {
          // Check if the response is successful
          if (response.ok) {
            // If successful, redirect to the movie details page
            window.location.href = `/movie/${response.id}`; 
          } else {
            // If an error occurred during the request
            alert('Error updating movie');
            updateButton.disabled = false; // Re-enable the button
          }
        })
        .catch(error => {
          // Log error to the console and show an alert
          console.error(error);
          alert('Error updating movie');
          updateButton.disabled = false; // Re-enable the button
        });
    } else {
      // Alert the user if any of the required fields are missing
      alert('Please fill out all fields');
    }
  });
});
