import fs from 'fs'; // <-- Import fs here
import moment from 'moment';

// Your function
export function generateTimetable() {
  const movieData = JSON.parse(fs.readFileSync('./data/movies.json', 'utf-8')); // Reading the movies.json file
  const timetable = [];
  const existingTimetable = []; // To store already assigned dates and times

  movieData.forEach(movie => {
    movie.show_dates.forEach(date => {
      let showTime;
      do {
        // Generate a random show time between 10:00 AM and 10:00 PM
        const randomHour = Math.floor(Math.random() * (22 - 10 + 1)) + 10; // Hour between 10 and 22
        const randomMinute = Math.floor(Math.random() * 4) * 15; // Minutes: 0, 15, 30, 45
        showTime = moment({ year: 2024, month: 11, day: parseInt(date.split('-')[2]) })
          .set('hour', randomHour)
          .set('minute', randomMinute)
          .format('HH:mm');
      } while (isTimeOverlap(date, showTime, existingTimetable)); // Check if the time already exists

      // Add the movie and the generated show time to the timetable
      existingTimetable.push({ show_date: date, show_time: showTime, movie_title: movie.title });
    });
  });

  return existingTimetable;
}

// Function to check if the show time for the given date overlaps with any existing times
function isTimeOverlap(date, showTime, existingTimetable) {
  return existingTimetable.some(entry => entry.show_date === date && entry.show_time === showTime);
}
