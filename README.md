# SkyNestia: The AI-Powered Social Horizon 🌌

Welcome to **SkyNestia**, a next-generation social platform built to foster genuine connections in a secure, intelligent environment. Unlike traditional social media, SkyNestia integrates safety and creativity at its core, leveraging **Google Gemini AI** to moderate content and empower user expression.

Built with passion using the **MERN Stack** (MongoDB, Express, React, Node.js), this project represents a leap forward in how we think about social interaction web apps.

---

## 🌟 Currently Implemented Features

### 🎨 The "SkyStudio" Creation Suite
We believe posting should be an art form. The custom-built **Create Post** module provides a powerhouse of tools that are fully functional:
*   **Live Capture**: Snap photos directly from your webcam within the browser.
*   **In-Browser Editing**: Fine-tune your visuals with granular control over brightness, contrast, and saturation, or apply one-tap mood filters like *Vintage Sepia*, *Noir Grayscale*, and *Cool Blue*.
*   **AI Co-Pilot**: Stuck on a caption? Let our integrated **Gemini AI** suggest witty, poetic, or engaging descriptions for your memories.
*   **Sonic Atmosphere**: Attach music tracks to your posts to set the mood.
*   **Tagging System**: Search for friends and tag them in your posts. These tags enter a pending state until approved.
*   **Location**: Add location context to your memories.

### 👤 User Profiles & Social Graph
*   **Dynamic Profile Hub**: View your bio, stats (posts, followers, following), and a beautiful 3x3 photo grid.
*   **Tag Requests Manager**: A dedicated tagging notification center where you can **Accept** or **Reject** posts you've been tagged in. Accepted posts appear on your profile; rejected ones do not.
*   **Post Deep-Dive**: Click any image on a profile grid to open a **Full-Screen Interactive Modal**, allowing you to comment and like without leaving the profile.
*   **Follow System**: Follow and unfollow users with real-time updates to your social graph.
*   **Profile Customization**: Seamlessly update your avatar and bio information.

### 🏠 Smart Feed & Interactions
*   **High-Speed Feed**: Powered by **Redis Caching**, the feed loads instantly, prioritizing content from your network.
*   **Social Actions**: Like and Comment on posts in real-time.
*   **Interactive Navigation**: Click on user avatars or names anywhere in the feed to jump straight to their profile.
*   **Share**: Built-in Web Share API support to easily share posts externally.

### 🛡️ Guardianship by Gemini (AI Moderation)
Every image and text submission is analyzed by **Google Gemini**. Inappropriate content is automatically flagged and prevented from being posted, ensuring a safe community.

---

## 🛠️ Technology Stack

SkyNestia is engineered for performance and scalability:

*   **Frontend**: React (Vite) with Framer Motion for smooth animations and responsive modals.
*   **Backend**: A robust Node.js/Express REST API.
*   **Database**: MongoDB (Mongoose) for complex relationships and user data.
*   **Caching**: **Redis** for sub-millisecond feed retrieval and user session management.
*   **AI**: Google Generative AI (Gemini) for both creativity (captions) and safety (moderation).

---

## 🚀 Deployment & Local Setup

Ready to launch SkyNestia on your local machine?

### 1. Pre-flight Checks
Ensure your environment is equipped with:
*   **Node.js** (v16 or higher recommended)
*   **MongoDB** (Local instance or Atlas cloud URI)
*   **Redis** (Service must be running for caching features)

### 2. Ignite the Server
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```
Configure your environment secrets in a `.env` file:
```env
PORT=5000
MONGO_URI=your_database_string
JWT_SECRET=super_secret_key
GEMINI_API_KEY=your_google_ai_key
REDIS_HOST=127.0.0.1 
REDIS_PORT=6379
```
Launch the backend:
```bash
npm run dev
```

### 3. Launch the Interface
In a new terminal, prepare the client:
```bash
cd client
npm install
npm run dev
```
Visit the local link (typically `http://localhost:5173`) and witness SkyNestia in action.

---

## 📜 License & Rights
This project is open for educational and portfolio purposes. Feel free to fork, explore, and innovate. 

*Crafted with 💙 and ☕.*
