# LLEF Interactive Slide App

A PowerPoint-like web app based on the LLEF teaching approach. Students see a slide
part by part (click to reveal), hear the spoken text (VD), and answer questions.
Teachers manage all slides from an admin page.

## Features

- Click-to-reveal slides with text-to-speech and a replay button
- Two slide types: simple slides, and multi-part slides with optional questions
- Students' answers are checked right away (Correct / Wrong)
- Admin page: add, edit, delete and preview slides, with image upload
- Images are resized in the browser and stored in MongoDB with the slide

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB Atlas (Mongoose)
- Hosting: Render

## Project structure

- `index.html`, `script.js` - the slide viewer for students
- `admin.html`, `admin.js` - the admin page
- `Backend/server.js` - API routes
- `Backend/Slide.js` - slide data model
- `Backend/seed.js` - adds the two sample slides

## API

| Method | Route | What it does |
|---|---|---|
| GET | `/api/slides` | List all slides |
| POST | `/api/slides` | Create a slide |
| PUT | `/api/slides/:id` | Update a slide |
| DELETE | `/api/slides/:id` | Delete a slide |
| POST | `/api/answers` | Save a student's answer |
| GET | `/api/answers` | List saved answers |

## Run locally

1. Go into the `Backend` folder and run `npm install`.
2. Create a `.env` file there with:
   `MONGODB_URI=your MongoDB connection string`
3. (Optional) run `node seed.js` once to add the sample slides.
4. Run `node server.js`.
5. Open `index.html` or `admin.html` with Live Server.

## Known limitations

- The admin page has no login, so anyone with the link can edit slides.
- Students' answers are kept in server memory and are lost when the server restarts.
- On Render's free plan the server sleeps when idle, so the first load can take up to a minute.