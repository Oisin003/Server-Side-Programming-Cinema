// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', function() {
    // Get the form element by its ID
    const form = document.getElementById('add-movie-form');
    
    // Add an event listener to the form for the 'submit' event
    form.addEventListener('submit', function(event) {
        // Prevent the default form submission behavior (which reloads the page)
        event.preventDefault();
  
        // Collect the form data using the FormData object
        const formData = new FormData(form);
  
        // Create an object to hold the movie data from the form fields
        const movieData = {
            title: formData.get('title'),  // Get the value of the 'title' field
            year: formData.get('year'),    // Get the value of the 'year' field
            actors: formData.get('actors'), // Get the value of the 'actors' field
            genre: formData.get('genre'),  // Get the value of the 'genre' field
            certification: formData.get('certification'), // Get the value of the 'certification' field
            age_recommendation: formData.get('age_recommendation'), // Get the value of 'age_recommendation' field
            image_url: formData.get('image_url'), // Get the value of the 'image_url' field
            // Split the 'show_dates' field (which is expected to be a comma-separated string) into an array
            show_dates: formData.get('show_dates').split(',').map(date => date.trim()) // Trim each date to remove excess spaces
        };
  
        // Validate if all necessary fields are filled in before proceeding
        if (!movieData.title || !movieData.year || !movieData.actors || !movieData.genre) {
            alert('Please fill in all required fields!'); // Alert the user if a required field is missing
            return; // Prevent further action if validation fails
        }
  
        // Use the Fetch API to send the movie data to the server 
        fetch('/admin/add-movie', {
            method: 'POST', // Specify the HTTP method as POST
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
            },
            body: JSON.stringify(movieData), // Convert the movieData object to a JSON string for the body
        })
        .then(response => {
            // Check if the response from the server was successful
            if (response.ok) {
                // If successful, redirect to the admin page
                window.location.href = '/admin'; // Redirect the user to the admin page
            } else {
                // If the response is not OK, extract the error message and throw an error
                return response.json().then(error => {
                    throw new Error(error.message || 'Failed to add movie');
                });
            }
        })
        .catch(error => {
            // Handle any errors that occur during the fetch request
            console.error('Error:', error); // Log the error to the console for debugging purposes
            alert(error.message || 'An error occurred while adding the movie'); // Alert the user if an error occurred
        });
    });
  });
  