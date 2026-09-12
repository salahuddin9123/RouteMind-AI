# RouteMind AI - Continuous Auto-Deployment Guide

This guide explains how **RouteMind AI** is configured for automated continuous deployment (CI/CD) so that every code push goes live immediately.

---

## 1. Hosting Platform Recommendation

### 🏆 Recommended: Vercel (Fastest & Zero Configuration)
- **Why it fits RouteMind AI best**:
  - `vercel.json` and `api/index.js` are already configured in this repository.
  - Vercel automatically deploys the frontend Vite bundle to its global Edge Network and runs the Express backend routes (`/api/*`) as Serverless Functions.
  - Generates instant preview deployments on branches and continuous live production deployment on `main`.
  - Zero-maintenance HTTPS and free SSL certificates.

### 🥈 Alternative: Render (Full Node.js Server)
- **Why it fits**:
  - `render.yaml` is pre-configured for a full-stack Docker/Node environment.
  - Great if you prefer a persistent Node.js Express process running 24/7 on Render Web Services.

---

## 2. One-Time Setup: Connecting GitHub to Vercel (Takes 60 Seconds)

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Select your repository: `salahuddin9123/RouteMind-AI`.
4. Framework Preset: Leave as **Vite** (Vercel auto-detects `package.json`).
5. **Environment Variables** (Optional):
   - `AI_API_KEY`: *(Optional)* Your Google Gemini API key. (If omitted, RouteMind AI uses its intelligent grounded offline engine).
   - `TOMTOM_API_KEY`: *(Optional)* Your TomTom traffic API key.
   - `TOMORROW_IO_API_KEY`: *(Optional)* Your Tomorrow.io flood API key.
6. Click **Deploy**.

> Once connected, **Vercel will listen to your GitHub repository forever**. Every time you push code to `main`, Vercel auto-detects the commit, runs `npm run build`, and updates the live site in under 45 seconds!

---

## 3. How to Deploy Your Updates with 1 Click

Whenever you make code changes, you can deploy them using either method:

### Method A: One-Click Script (Recommended)
Simply double-click:
```cmd
push_to_github.bat
```
The script will:
1. Detect all new and changed files.
2. Automatically stage and commit them.
3. Push to `origin main` on GitHub.
4. Trigger Vercel / Render auto-deployment.

### Method B: Terminal Command
```bash
git add -A
git commit -m "Update RouteMind AI features"
git push origin main
```

---

## 4. Verifying Auto-Deployments

- Open your GitHub repository: [github.com/salahuddin9123/RouteMind-AI](https://github.com/salahuddin9123/RouteMind-AI)
- Click on the **Commits** tab or **Actions** tab to see the latest build.
- On Vercel / Render, visit your project dashboard to see the live deployment URL and build logs.
