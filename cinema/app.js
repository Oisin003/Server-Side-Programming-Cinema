import express from 'express';
import sqlite3 from 'sqlite3';
import { engine } from 'express-handlebars';
import axios from 'axios'; // Import Axios for API requests
import weather from 'weather-js';  // Import weather-js
import moment from 'moment'; // Import moment.js for formatting time
import OMDB from 'omdb-api'; // Import the OMDb API wrapper module
import { generateTimetable } from './generateTimetable.js';

const app = express();
const db = new sqlite3.Database('./cinema.db');
const OMDB_API_KEY = '671abf4';

// Setup Handlebars as the view engine and add a JSON helper
app.engine('handlebars', engine({
  helpers: {
    json: (context) => JSON.stringify(context),
    eq: (a, b) => a === b  // helper to compare values
  }
}));
app.set('view engine', 'handlebars');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Ensure timetable table has required columns
function ensureColumns() {
  db.all('PRAGMA table_info(timetable)', (err, rows) => {
    if (err) return console.error(err.message);

    const columnNames = rows.map(row => row.name);

    if (!columnNames.includes('show_date')) {
      db.run('ALTER TABLE timetable ADD COLUMN show_date TEXT NOT NULL DEFAULT ""', (err) => {
        if (err) console.error(err.message);
      });
    }
    if (!columnNames.includes('show_time')) {
      db.run('ALTER TABLE timetable ADD COLUMN show_time TEXT NOT NULL DEFAULT ""', (err) => {
        if (err) console.error(err.message);
      });
    }
  });
}
ensureColumns();

app.get('/', (req, res) => res.redirect('/movies'));

// Get all movies
app.get('/movies', (req, res) => {
  db.all('SELECT * FROM movies ORDER BY title', (err, movies) => {
    if (err) throw err;
    res.render('movies', { movies });
  });
});

// Get a specific movie by id
app.get('/movie/:id', (req, res) => {
  const movieId = req.params.id;
  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err) throw err;
    res.render('movie', { movie });
  });
});

// Admin page to manage movies
app.get('/admin', (req, res) => {
  db.all('SELECT * FROM movies ORDER BY title', (err, movies) => {
    if (err) throw err;
    res.render('admin', { movies });
  });
});

app.get('/search', async (req, res) => {
  const { query, filter } = req.query;

  // Initialize the filter object based on the selected filter type
  let filterCondition = {};

  // Set up filter conditions for each search filter
  if (filter === 'genre') {
    filterCondition.genre = query;
  } else if (filter === 'year') {
    filterCondition.year = query;
  } else if (filter === 'actor') {
    filterCondition.actors = query;
  } else if (filter === 'certification') {
    filterCondition.certification = query;
  } else if (filter === 'title') {
    // Default: search by title if no filter or 'movie name' is selected
    filterCondition.title = { $regex: query, $options: 'i' }; // Case-insensitive search
  }

  const itemsPerPage = 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * itemsPerPage;

  try {
    // Query the database with the filterCondition for the selected filter
    db.all('SELECT * FROM movies WHERE title LIKE ? OR genre LIKE ? OR year LIKE ? OR actors LIKE ? OR certification LIKE ? LIMIT ? OFFSET ?',
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, itemsPerPage, offset],
      (err, movies) => {
        if (err) {
          console.error('Error fetching movies:', err);
          return res.status(500).send('Error fetching movies.');
        }

        // Calculate the total number of pages for pagination
        db.get('SELECT COUNT(*) AS count FROM movies WHERE title LIKE ? OR genre LIKE ? OR year LIKE ? OR actors LIKE ? OR certification LIKE ?',
          [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
          (err, row) => {
            if (err) {
              console.error('Error calculating total pages:', err);
              return res.status(500).send('Error fetching movies.');
            }

            const totalMovies = row.count;
            const totalPages = Math.ceil(totalMovies / itemsPerPage);
            const hasPreviousPage = page > 1;
            const hasNextPage = page < totalPages;

            res.json({
              success: true,
              movies,
              currentPage: page,
              totalPages,
              hasPreviousPage,
              hasNextPage,
              previousPage: page - 1,
              nextPage: page + 1,
            });
          });
      });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).send('Error fetching movies.');
  }
});

/// Route to render the "Add Movie" form (GET)
app.get('/admin/add-movie', (req, res) => {
  res.render('add-movie');  // Render the add-movie form (handlebars page)
});

// Route to handle the form submission (POST)
app.post('/admin/add-movie', (req, res) => {
  const { title, year, actors, genre, certification, age_recommendation, image_url } = req.body;

  // SQL query to insert a new movie into the database
  const sql = `INSERT INTO movies (title, year, actors, genre, certification, age_recommendation, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const params = [title, year, actors, genre, certification, age_recommendation, image_url];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).send('Error adding movie');
    res.redirect('/admin');  // After adding the movie, redirect to the admin page
  });
});

// Delete a movie by id
app.post('/admin/delete-movie/:id', (req, res) => {
  const movieId = req.params.id;

  // First, check if the movie exists
  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err) {
      console.error('Error fetching movie:', err.message);
      return res.status(500).send('Error fetching movie');
    }

    if (!movie) {
      return res.status(404).send('Movie not found');
    }

    // Now delete the movie
    db.run('DELETE FROM movies WHERE id = ?', [movieId], (err) => {
      if (err) {
        console.error('Error deleting movie:', err.message);
        return res.status(500).send('Error deleting movie');
      }

      // Redirect back to the admin page after successful deletion
      res.redirect('/admin');
    });
  });
});

// Get the movie details for the update form (GET)
app.get('/admin/update-movie/:id', (req, res) => {
  const movieId = req.params.id;
  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err) {
      console.error('Error fetching movie:', err);
      return res.status(500).send('Error fetching movie');
    }
    if (!movie) {
      return res.status(404).send('Movie not found');
    }
    // Render the update movie page with the movie details pre-filled
    res.render('update-movie', { movie });
  });
});

// Route to handle movie update (POST)
app.post('/admin/update-movie/:id', (req, res) => {
  const { title, year, actors, genre, certification, age_recommendation, image_url } = req.body;
  const movieId = req.params.id;

  const sql = `
    UPDATE movies
    SET title = ?, year = ?, actors = ?, genre = ?, certification = ?, age_recommendation = ?, image_url = ?
    WHERE id = ?;
  `;
  const params = [title, year, actors, genre, certification, age_recommendation, image_url, movieId];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error updating movie:', err.message);
      return res.status(500).send('Error updating movie');
    }
    // Redirect to the movie details page after updating
    res.redirect(`/movie/${movieId}`);
  });
});

app.post('/admin/delete-movie/:id', (req, res) => {
  const movieId = req.params.id;

  // First, check if the movie exists
  db.get('SELECT * FROM movies WHERE id = ?', [movieId], (err, movie) => {
    if (err) {
      console.error('Error fetching movie:', err.message);
      return res.status(500).send('Error fetching movie');
    }

    if (!movie) {
      return res.status(404).send('Movie not found');
    }

    // Now delete the movie
    db.run('DELETE FROM movies WHERE id = ?', [movieId], (err) => {
      if (err) {
        console.error('Error deleting movie:', err.message);
        return res.status(500).send('Error deleting movie');
      }

      // Redirect back to the admin page after successful deletion
      res.redirect('/admin');
    });
  });
});

// Route to generate the timetable
app.get('/generate-timetable', (req, res) => {
  const showtimes = generateTimetable(); // Call the function to generate the timetable
  res.render('generated-timetable', { showtimes }); // Render the timetable in the new view
});

// Timetable Route
// Route to get the timetable
app.get('/timetable', (req, res) => {
  const sql = `
    SELECT timetable.show_date, timetable.show_time, movies.title AS movie_title, timetable.id
    FROM timetable
    JOIN movies ON timetable.movie_id = movies.id
    ORDER BY timetable.show_date, timetable.show_time
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).send('Error fetching timetable');
    res.render('timetable', { showtimes: rows });
  });
});

// Route to delete a timetable entry
app.post('/admin/delete-timetable/:id', (req, res) => {
  const timetableId = req.params.id;

  // Check if the timetable entry exists
  db.get('SELECT * FROM timetable WHERE id = ?', [timetableId], (err, entry) => {
    if (err) {
      console.error('Error fetching timetable entry:', err.message);
      return res.status(500).send('Error fetching timetable entry');
    }

    if (!entry) {
      return res.status(404).send('Timetable entry not found');
    }

    // Now delete the timetable entry
    db.run('DELETE FROM timetable WHERE id = ?', [timetableId], (err) => {
      if (err) {
        console.error('Error deleting timetable entry:', err.message);
        return res.status(500).send('Error deleting timetable entry');
      }

      // Redirect back to the timetable page after successful deletion
      res.redirect('/timetable');
    });
  });
});

// Route to render the "Add Movie to Timetable" form (GET)
app.get('/admin/add-timetable', (req, res) => {
  db.all('SELECT * FROM movies ORDER BY title', (err, movies) => {
    if (err) throw err;
    res.render('add-timetable', { movies });  // Render the form with the list of movies
  });
});

// Route to handle adding a movie to the timetable (POST)
app.post('/admin/add-timetable', (req, res) => {
  const { movie_id, show_date, show_time } = req.body;

  // SQL query to insert a new timetable entry
  const sql = `
    INSERT INTO timetable (movie_id, show_date, show_time)
    VALUES (?, ?, ?)
  `;
  const params = [movie_id, show_date, show_time];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Error adding timetable entry:', err.message);
      return res.status(500).send('Error adding timetable entry');
    }
    res.redirect('/timetable');  // Redirect to the timetable page after adding
  });
});

// Weather Dashboard Route
app.get('/weather-dashboard', (req, res) => {
  // Get the current time in multiple formats using moment.js
  const currentTime = moment().format('MMMM Do YYYY, h:mm:ss a');  // Current time in "Month Day Year, Hour:Minute:Second AM/PM" format
  const shortTime = moment().format('YYYY-MM-DD HH:mm:ss');  // Shorter format "YYYY-MM-DD HH:mm:ss"

  res.render('weather-dashboard', {
    currentTime,
    shortTime
  });
});

// Handle the form submission for weather
app.post('/weather-dashboard', (req, res) => {
  const city = req.body.city; // City entered by the user

  // Fetch weather info using weather-js
  weather.find({ search: city, degreeType: 'C' }, function (err, result) {
    if (err) {
      return res.status(500).send('Error fetching weather data');
    }

    if (!result || result.length === 0) {
      return res.status(404).send('City not found');
    }

    const weatherData = result[0].current; // Get the current weather data for the city

    // Render the page with weather data and current time
    res.render('weather-dashboard', {
      city: city,
      temperature: weatherData.temperature,
      skytext: weatherData.skytext,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windspeed,
      currentTime: moment().format('MMMM Do YYYY, h:mm:ss a'),
      shortTime: moment().format('YYYY-MM-DD HH:mm:ss')
    });
  });
});

// Jokes Route
app.get('/joke', async (req, res) => {
  try {
    // Fetch a random joke
    const jokeResponse = await axios.get('https://official-joke-api.appspot.com/random_joke');
    const joke = jokeResponse.data;  // Extract the joke data

    // Render the page with the joke setup and punchline
    res.render('joke', {
      jokeSetup: joke.setup,
      jokePunchline: joke.punchline
    });
  } catch (error) {
    console.error('Error fetching joke:', error);
    res.status(500).send('Error fetching joke');
  }
});

app.get('/movie-recommendations', async (req, res) => {
  try {
    // Default genre is 'action', but you can change it based on the user's selection
    const genre = req.query.genre || 'action';  // Default genre is 'action'

    // Fetch movie recommendations based on the selected genre from OMDb API
    const response = await axios.get('http://www.omdbapi.com/', {
      params: {
        apiKey: OMDB_API_KEY,
        s: genre,  // Use the selected genre
        type: 'movie',
        page: 1,
      }
    });

    // Check if the response contains movies
    if (response.data.Response === 'True') {
      const movies = response.data.Search;  // Array of movies from OMDb API
      res.render('movie-recommendations', { movies, genre });
    } else {
      res.status(500).send('Error fetching movie data.');
    }
  } catch (error) {
    console.error('Error fetching movie data from OMDb API:', error);
    res.status(500).send('Error fetching movie data.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);  // Log the error stack to the console for debugging

  // Render the error page with a generic error message
  res.status(500).render('error', {
    errorMessage: 'Damn it broke. Try later :).'
  });
});

// Start the server
const port = 8080;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
