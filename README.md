# Cursor Hackathon · IE University · March 2026

**Organized by TechIE x Building and Tech · Sponsored by Cursor**

## 1. Overview

This repository is your starting point for the hackathon.

Your flow is simple.

1. Clone this repo
2. Build your project during the event
3. Deploy it on Vercel
4. Submit it through the Google Form
5. Present it live

This repo is here to help you move quickly from idea to deployment.

## 2. The Challenge

**Make one person’s hard day easier.**

This challenge is intentionally open to interpretation.

You are not being asked to build one specific type of product. You are being asked to identify a real person, understand what makes their day difficult, and build something that helps in a meaningful way.

The strongest projects will be grounded in a real situation, focused in scope, and clear in their usefulness.

Read the full brief and rubric in [CHALLENGE.md](./CHALLENGE.md).

## 3. Who Can Participate

1. Solo participants or teams of up to 4
2. No technical background required
3. All participants receive Cursor credits

You do not need to be an experienced developer to participate. If you can clearly describe what should exist, you can use this hackathon to build it.

## 4. Rules

1. Your project must be built during the event
2. Your project must be deployed on Vercel
3. Your final submission must include a live link
4. Teams may have up to 4 people
5. Solo participation is allowed

## 5. Evaluation Rubric

Projects will be evaluated based on the rubric in [CHALLENGE.md](./CHALLENGE.md), with particular attention to the following areas:

1. Understanding of the person and problem
2. Relevance and usefulness
3. Quality of execution
4. Creativity and interpretation
5. Use of tools to extend what was possible
6. Presentation and storytelling

## 6. AgentCanvas MVP Architecture

This repository now includes an MVP implementation path for AgentCanvas that fits hackathon constraints:

- Vercel-compatible API entrypoint via `api/index.py`
- FastAPI runtime and typed contracts with Pydantic in `backend_or_api/app/`
- SSE event stream for live node progress and token chunks
- Minimal DAG executor with parallel execution for independent node layers
- JSON schema artifact for run payload in `schemas/run_request.schema.json`

The event contract used by the UI is:

- `node_start`
- `token_chunk`
- `node_complete`
- `node_error`
- `run_complete`

This keeps the frontend transport-agnostic and compatible with a later migration to full FastAPI + Docker + optional WebSockets.

### 6.1 Current pipeline behavior

- Agent nodes execute as a DAG (`agent -> agent`) and stream live progress.
- The Collector is now a final synthesis agent:
  - it only consumes outputs from agents directly connected to it (`agent -> collector`)
  - it runs with its own prompt/model settings
  - it emits a final summary plus references to upstream outputs
- UI includes a structured Collector output panel:
  - final summary
  - direct inputs used for synthesis
  - collapsible upstream references

## 7. Local Development

### 7.1 Run with Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend_or_api/requirements.txt
uvicorn backend_or_api.app.main:app --reload
```

Open [http://localhost:8000](http://localhost:8000).

If your machine does not have local Node.js, build the frontend with Docker:

```bash
docker run --rm -v "C:/path/to/repo/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
```

Then run uvicorn and open the same URL.

### 7.2 Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8000](http://localhost:8000).

### 7.3 API Endpoints

- `POST /runs` starts a run and returns `run_id` (requires auth token in the app flow)
- `GET /runs/{run_id}/events` streams SSE updates
- `GET /runs/{run_id}` returns run snapshot state
- `GET /health` returns service status

## 8. Deploy to Vercel

The repository includes `vercel.json` and `api/index.py` for Vercel deployment:

```bash
npx vercel
```

If needed, set the project framework to "Other" and ensure Python serverless support is enabled.

## 9. How to Use This Repo

### 9.1 Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_NAME>
```

### 9.2 Build your project

Use this starter however you want. You can adapt it, replace it, or extend it to match your idea.

Your goal is to create a project that clearly demonstrates your solution and can be accessed through a live URL.

### 9.3 Run locally

Use either Python or Docker instructions from sections above.

### 9.4 Deploy to Vercel

Your final project must be live on Vercel.

A typical deployment flow looks like this:

```bash
npx vercel
```

You can also connect your GitHub repository directly to Vercel and deploy from there.

Before submitting, make sure the deployment link works, the project loads correctly, and the core functionality is accessible to judges.

## 10. Submission

Once your project is deployed, submit it through the Google Form:

**[Submit here](https://forms.gle/dS1H98eJoZwsXj7e7).**

Your submission should include the following:

1. Team name
2. Team members
3. Project title
4. Short description
5. Deployed Vercel link

Only submitted projects with a working deployed link will be considered.

## 11. Presentation

After submitting, your team will present the project live.

Your presentation should clearly communicate four things:

1. Who you built for
2. What problem you identified
3. What you built
4. Why your solution makes that person’s day easier

This is not only about showing features. It is also about showing your reasoning, your interpretation of the challenge, and the story behind the project.

## 12. Included Resources

1. [Challenge brief and rubric](./CHALLENGE.md)
2. [Practical tips](./resources/tips.md)
3. [Architecture and implementation idea](./IDEA.md)

## 13. Final Reminder

Build something focused.

Deploy it.

Submit the live link.

Then tell the story of why it matters.