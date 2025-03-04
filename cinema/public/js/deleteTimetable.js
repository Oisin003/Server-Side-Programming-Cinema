// This event listener waits for the DOM to be fully loaded before executing the script.
document.addEventListener('DOMContentLoaded', () => {
  
  // Select all buttons with the class '.delete-timetable-button' on the page.
  // These buttons are assumed to be the ones that will trigger the deletion of timetable entries.
  const deleteButtons = document.querySelectorAll('.delete-timetable-button');

  // Iterate over all the delete buttons on the page.
  deleteButtons.forEach(button => {
    // Add a 'click' event listener to each delete button.
    button.addEventListener('click', (event) => {
      
      // Retrieve the unique timetable ID from the 'data-id' attribute of the clicked button.
      const timetableId = button.getAttribute('data-id'); 

      // Confirm with the user if they are sure about deleting the timetable entry.
      if (confirm('Are you sure you want to delete this timetable entry?')) {
        
        // Use the Fetch API to send a DELETE request to the server with the timetable ID.
        fetch(`/admin/delete-timetable/${timetableId}`, {
          method: 'POST', // Use 'POST' because the action is modifying data on the server.
          headers: {
            'Content-Type': 'application/json', // Set content type to JSON 
          },
        })
        .then(response => {
          // Check if the response from the server is OK
          if (response.ok) {
            // Reload the page to reflect the changes after successful deletion.
            window.location.reload(); 
          } else {
            // If the server responds with an error, alert the user.
            alert('Error deleting timetable entry');
          }
        })
        .catch(error => {
          // If there is an error during the fetch log it to the console and alert the user.
          console.error('Error:', error);
          alert('An error occurred while deleting the timetable entry');
        });
      }
    });
  });
});
