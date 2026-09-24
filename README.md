# CitySafe AI — Urban Safety Navigation & Guardian Response

CitySafe AI is an intelligent safety routing and community guardian platform connecting citizens with real-time route risk assessments, verified incident reporting, SOS emergency response, and localized Guardian operations.

---

## Local MongoDB Setup & Development

CitySafe AI connects directly to a local MongoDB database instance for local development. Core features (incidents, alerts, live journeys, user profiles, guardian management, and case notes) read and write to MongoDB.

### 1. Prerequisites & MongoDB Installation

1. Download and install **MongoDB Community Edition**:
   - [MongoDB Community Download](https://www.mongodb.com/try/download/community)
2. Ensure the MongoDB service is running locally on port `27017`:
   ```powershell
   # Windows service check:
   Get-Service -Name MongoDB
   # Or start if not running:
   Start-Service -Name MongoDB
   ```

### 2. Environment Configuration

Add the following variables to your `.env.local` file:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/citysafe
MONGODB_DB=citysafe
```

> **Security Note:**
> - The MongoDB URI is kept strictly server-side.
> - Never expose `NEXT_PUBLIC_MONGODB_URI` in client code.
> - Connection strings are never logged to console or public responses.

### 3. Start the Next.js Application

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 4. Health Check Endpoint

To verify that the application successfully connected to local MongoDB:

```bash
curl http://localhost:3000/api/health
```

Sample successful response:
```json
{
  "status": "ok",
  "database": "connected",
  "target": "local_mongodb",
  "latencyMs": 15,
  "timestamp": "2026-09-23T14:44:14.159Z",
  "collections": {
    "incidents": 3,
    "alerts": 2,
    "journeys": 0,
    "guardians": 2,
    "users": 1,
    "caseNotes": 0,
    "auditLogs": 0
  }
}
```

### 5. Seeding Deterministic Demo Data

Demo data is never seeded automatically on application boot; it is triggered only when explicitly requested:

```powershell
# In PowerShell:
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/seed" -Method Post

# Force reset and re-seed:
Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/seed?force=true" -Method Post
```

---

## Production Safety & Deployment

> [!CAUTION]
> - `mongodb://127.0.0.1:27017/citysafe` is a loopback address that operates **strictly on your local computer**.
> - **Do not attempt to use local MongoDB from Vercel or cloud hosts**: Serverless environments running on Vercel do not have access to your local machine's `127.0.0.1` network interface.
> - Production deployment on Vercel requires a hosted database cluster, such as **MongoDB Atlas**.
> - Never expose unauthenticated local MongoDB ports to the public internet.

When deploying to Vercel:
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Set `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/citysafe?retryWrites=true&w=majority` in the Vercel Project Environment Variables.
3. Set `MONGODB_DB=citysafe`.

---

## Database Architecture

The system uses 8 specialized collections in MongoDB with GeoJSON `2dsphere` indexes:

1. **`incidents`**: Citizen safety reports with GeoJSON `Point` (`[longitude, latitude]`), severity scores (1-100), verification statuses, photo metadata references, and action timelines.
2. **`alerts`**: SOS triggers and high-severity incidents visible to Guardians, supporting lifecycle states (`active`, `acknowledged`, `assigned`, `escalated`, `resolved`).
3. **`journeys`**: Active live journeys with real-time GeoJSON coordinates, destinations, ETAs, and consent status.
4. **`journeyLocations`**: High-frequency breadcrumb history of live locations for active journeys.
5. **`guardians`**: Registered community responders and NGO supervisors with verification statuses.
6. **`users`**: Citizen accounts, emergency contact configurations, and safety preferences.
7. **`caseNotes`**: Guardian case logs, response notes, and internal coordination history.
8. **`auditLogs`**: Immutable audit logs capturing every status transition, action, and alert dispatch.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Diagnostic health check and collection statistics |
| `POST` | `/api/seed` | Seed deterministic test data |
| `GET` | `/api/incidents` | Query incidents (supports `lat`, `lng`, `radius`, `startTime`, `endTime`) |
| `POST` | `/api/incidents` | Create a new citizen incident report |
| `GET` | `/api/incidents/:id` | Get incident report details |
| `PATCH` | `/api/incidents/:id` | Update incident report details |
| `GET` | `/api/alerts` | Query active and historical alerts |
| `POST` | `/api/alerts` | Trigger a new alert (including SOS) |
| `PATCH` | `/api/alerts/:id` | Update alert status (`acknowledged`, `resolved`, etc.) |
| `GET` | `/api/journeys` | List active or past journeys |
| `POST` | `/api/journeys` | Initiate a new live journey |
| `GET` | `/api/journeys/:id` | Retrieve journey details and location breadcrumbs |
| `PATCH` | `/api/journeys/:id` | Update journey state (`completed`, `cancelled`) |
| `POST` | `/api/journeys/:id/location` | Push a live location breadcrumb |
| `GET` | `/api/guardian/map-data` | Aggregated incidents, alerts, and live journeys for Guardians |
| `GET` | `/api/guardian/intelligence` | Area risk score, time distribution, and AI recommendations |
| `POST` | `/api/guardian/reports/:id/actions` | Execute Guardian action (`VERIFY`, `ASSIGN`, `ESCALATE`, `RESOLVE`) |
| `POST` | `/api/guardian/reports/:id/notes` | Add case note to report and `caseNotes` collection |
| `POST` | `/api/upload` | Upload report photo (validates JPG/PNG/WebP <= 5MB) |
| `GET` | `/api/uploads/:id` | Stream uploaded photo reference |
| `POST` | `/api/users` | Register citizen user profile |
| `POST` | `/api/guardians` | Register community guardian |
| `GET` | `/api/guardians` | Query registered guardians |
