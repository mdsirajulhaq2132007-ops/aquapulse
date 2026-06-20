# AquaPulse — Complete Deployment Guide

This guide will help you host your AquaPulse application online so that it is accessible from anywhere and can receive readings from your ESP32 remotely over the internet (without needing your laptop to be on the same Wi-Fi).

We will use:
1. **GitHub**: To host your source code.
2. **Render (render.com)**: To deploy your Node.js backend.
3. **Vercel (vercel.com) or Netlify (netlify.com)**: To deploy your Vite-React frontend.
4. **MongoDB Atlas**: Already hosted online (using your current connection string).

---

## Phase 1: Prepare Code for Production

### 1. Update the Frontend Build settings
Since we are deploying the client to a static host (like Vercel or Netlify), Vite proxies (`/api` and `/socket.io`) won't work in production out-of-the-box. We must make the backend endpoints point directly to your deployed Render URL.

We have configured dynamic URLs in the code so that:
- It automatically targets `http://localhost:5000` when running locally.
- It targets your production URL when deployed.

---

## Phase 2: Create a GitHub Repository

1. Open your browser and go to [github.com](https://github.com).
2. Log in and click **New** to create a new repository.
3. Name your repository (e.g., `aquapulse-water-monitor`).
4. Keep it **Private** or **Public**, and click **Create repository**.
5. Open your terminal in the root project directory (`aqua_vedesh`) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git branch -M main
   git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
   git push -u origin main
   ```

*(If you don't have Git installed, you can download the **GitHub Desktop** app to upload your folder).*

---

## Phase 3: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up using your **GitHub** account.
2. Click **New +** on the dashboard and select **Web Service**.
3. Connect your GitHub repository (`aquapulse-water-monitor`).
4. Set the following settings:
   * **Name**: `aquapulse-backend`
   * **Language**: `Node`
   * **Branch**: `main`
   * **Root Directory**: `server` *(Important: this points to your backend subfolder)*
   * **Build Command**: `npm install`
   * **Start Command**: `node index.js`
   * **Instance Type**: **Free**
5. Click **Advanced** and add the following **Environment Variables**:
   * `NODE_ENV`: `production`
   * `MONGO_URI`: `mongodb+srv://rehaan79811_db_user:TAUzRQEnJML92U0m@aquaplus.7oixqi5.mongodb.net/aquapulse?retryWrites=true&w=majority&appName=aquaplus`
   * `JWT_SECRET`: `aquapulse_jwt_secret_dev_2024_change_me`
   * `JWT_REFRESH_SECRET`: `aquapulse_refresh_secret_dev_2024_change_me`
   * `CLIENT_URL`: *(Your future Vercel frontend URL, you can edit this later)*
   * `DEVICE_API_KEY`: `aquapulse_device_secret_key_2024`
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL at the top of the page (it will look like `https://aquapulse-backend.onrender.com`).

---

## Phase 4: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up using your **GitHub** account.
2. Click **Add New** > **Project**.
3. Import your GitHub repository (`aquapulse-water-monitor`).
4. In the configuration settings:
   * **Root Directory**: Select `client` *(Important: points to your frontend subfolder)*
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. In the **Environment Variables** section, add:
   * `VITE_API_URL`: `<YOUR_RENDER_BACKEND_URL>/api` (e.g. `https://aquapulse-backend.onrender.com/api`)
   * `VITE_SOCKET_URL`: `<YOUR_RENDER_BACKEND_URL>` (e.g. `https://aquapulse-backend.onrender.com`)
6. Click **Deploy**.
7. Once deployment finishes, Vercel will give you a public URL (e.g., `https://aquapulse-water-monitor.vercel.app`).
8. *(Go back to Render, edit the `CLIENT_URL` environment variable to match this Vercel URL, and re-save).*

---

## Phase 5: Update the ESP32 Code

Now that your backend is online, you need to point your ESP32 to the internet backend URL instead of your local network IP!

1. Open your Arduino IDE.
2. In your sketch, locate line **13**:
   ```cpp
   const char* SERVER_URL = "http://192.168.1.36:5000/api/readings";
   ```
3. Change it to your new Render URL:
   ```cpp
   const char* SERVER_URL = "https://aquapulse-backend.onrender.com/api/readings"; 
   ```
4. Upload the code to your ESP32.

Now, your ESP32 can connect to any Wi-Fi hotspot (e.g., phone hot-spot or home Wi-Fi), and it will automatically stream the live pH and turbidity measurements directly to your online dashboard!
