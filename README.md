**🔹 Start the Backend Server**

Open a terminal and run:

cd backend

node server.js

**🔹 Start the Frontend**

Open a new terminal and run:

  cd frontend
  
  npm run dev

**📌 Notes**

Make sure Node.js is installed.
Run npm install inside both backend and frontend folders before starting the project (if dependencies are not installed).

cd backend

npm install

cd ../frontend

npm install    

**Ollama Setup**

To generate answer keys locally when a panel member returns a finalized paper to faculties:

1. Install and start Ollama.
2. Pull a local model, for example:
   `ollama pull llama3.2`
3. Optionally set these backend environment variables:
   `OLLAMA_URL=http://127.0.0.1:11434`
   `OLLAMA_MODEL=llama3.2`

The new panel route is:
`POST /api/hod/panel/papers/:id/return-to-faculties`

This route:
- marks the paper as `returned_to_faculties`
- generates an answer key using Ollama
- makes the finalized paper visible to all faculty users


**THE CREDENTIALS FOR EACH LOGIN, IS PROVIDED ON THE LOGIN PAGE ITSELF. **

mail id before "/" is the username and the part after "/" is the password for the corresponding username.
