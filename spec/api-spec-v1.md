# API Specification V1

## Purpose

This REST API specification supports Sprint 0 and the first playable solo city prototype.

It assumes a Node.js TypeScript backend using NestJS, PostgreSQL, Redis/BullMQ for later workers, and JSON balance config as the initial source of static game data.

## API Rules

- Base path: `/api/v1`
- Request and response body format: JSON
- Authentication: placeholder session or development user for Sprint 0
- IDs: UUIDs for database entities, string IDs for static config
- Timestamps: ISO 8601 strings
- Amounts and durations: integers
- Validation is required for every mutation.
- Errors must use the standard error response shape.

## Standard Error Response

```json
{
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "message": "Not enough resources to start this upgrade.",
    "details": {
      "resourceId": "wood",
      "required": 120,
      "available": 80
    }
  }
}
```

Common error codes:

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | No active user/session |
| `FORBIDDEN` | 403 | Entity belongs to another player |
| `NOT_FOUND` | 404 | Entity does not exist |
| `VALIDATION_ERROR` | 400 | Invalid request body or params |
| `INSUFFICIENT_RESOURCES` | 409 | Player cannot afford action |
| `QUEUE_LIMIT_REACHED` | 409 | Active construction or research slot already used |
| `REQUIREMENTS_NOT_MET` | 409 | Missing building or research prerequisite |
| `JOB_ALREADY_COMPLETED` | 409 | Completion endpoint was called for completed job |

## Data Shapes

### ResourceAmount

```json
{
  "resourceId": "wood",
  "amount": 500,
  "storageCapacity": 2500,
  "protectedCapacity": 300,
  "productionPerHour": 180
}
```

### BuildingState

```json
{
  "buildingId": "city_hall",
  "name": "City Hall",
  "level": 1,
  "maxLevel": 5,
  "nextLevel": {
    "level": 2,
    "cost": {
      "wood": 120,
      "stone": 100,
      "food": 60
    },
    "durationSeconds": 300,
    "canStart": true
  }
}
```

### ResearchState

```json
{
  "researchId": "basic_engineering",
  "name": "Basic Engineering",
  "level": 0,
  "maxLevel": 1,
  "status": "available",
  "nextLevel": {
    "level": 1,
    "cost": {
      "wood": 120,
      "stone": 120,
      "knowledge": 80
    },
    "durationSeconds": 900,
    "canStart": false,
    "missingRequirements": [
      {
        "type": "building",
        "id": "academy",
        "requiredLevel": 1,
        "currentLevel": 0
      }
    ]
  }
}
```

### JobState

```json
{
  "id": "9bc1b3be-dcfd-4e6f-a55c-219de6cb5c43",
  "type": "construction",
  "targetId": "warehouse",
  "fromLevel": 1,
  "toLevel": 2,
  "status": "in_progress",
  "startedAt": "2026-07-05T10:00:00.000Z",
  "completesAt": "2026-07-05T10:04:00.000Z",
  "durationSeconds": 240
}
```

## Endpoints

### GET `/health`

Returns backend health.

Response `200`:

```json
{
  "status": "ok",
  "version": "v1"
}
```

### GET `/me`

Returns the current user and player profile.

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "displayName": "Dev Player",
    "isGuest": true
  },
  "player": {
    "id": "uuid",
    "publicName": "Dev Player"
  }
}
```

### POST `/bootstrap`

Creates the development user, player, world, island, default city, starter resources, starter buildings, and starter research state if they do not already exist.

This endpoint is for Sprint 0 local development only.

Request:

```json
{
  "displayName": "Dev Player"
}
```

Response `201`:

```json
{
  "playerId": "uuid",
  "cityId": "uuid",
  "created": true
}
```

### GET `/game-state`

Returns all data needed by the first playable city screen.

Response `200`:

```json
{
  "serverTime": "2026-07-05T10:00:00.000Z",
  "world": {
    "id": "uuid",
    "slug": "alpha",
    "name": "Alpha World",
    "speedMultiplier": 1
  },
  "city": {
    "id": "uuid",
    "name": "New Haven",
    "level": 1,
    "population": 25,
    "happiness": 50
  },
  "resources": [],
  "buildings": [],
  "research": [],
  "activeJobs": []
}
```

### GET `/cities`

Returns cities owned by the current player.

Response `200`:

```json
{
  "cities": [
    {
      "id": "uuid",
      "name": "New Haven",
      "level": 1,
      "population": 25,
      "happiness": 50
    }
  ]
}
```

### GET `/cities/:cityId`

Returns one city with resources, buildings, and active construction jobs.

Response `200`:

```json
{
  "city": {
    "id": "uuid",
    "name": "New Haven",
    "level": 1,
    "population": 25,
    "happiness": 50
  },
  "resources": [],
  "buildings": [],
  "activeConstructionJobs": []
}
```

### GET `/cities/:cityId/resources`

Applies offline production, then returns current resources.

Response `200`:

```json
{
  "resources": []
}
```

### GET `/cities/:cityId/buildings`

Returns all configured buildings and city levels.

Response `200`:

```json
{
  "buildings": []
}
```

### POST `/cities/:cityId/buildings/:buildingId/upgrade`

Starts a building upgrade.

Validation:

- City belongs to current player.
- Building exists in `buildings.json`.
- Next level exists and does not exceed max level.
- City has enough resources.
- City has no active construction job.

Response `201`:

```json
{
  "job": {
    "id": "uuid",
    "type": "construction",
    "targetId": "warehouse",
    "fromLevel": 1,
    "toLevel": 2,
    "status": "in_progress",
    "startedAt": "2026-07-05T10:00:00.000Z",
    "completesAt": "2026-07-05T10:04:00.000Z",
    "durationSeconds": 240
  },
  "resources": []
}
```

### POST `/construction-jobs/:jobId/complete`

Completes a construction job if its timer has finished.

In production this should normally be handled by a worker. Sprint 0 can expose this endpoint for local manual testing.

Response `200`:

```json
{
  "job": {
    "id": "uuid",
    "status": "completed"
  },
  "city": {
    "id": "uuid",
    "name": "New Haven",
    "level": 1
  },
  "buildings": [],
  "resources": []
}
```

### GET `/research`

Returns all configured research and current player progress.

Response `200`:

```json
{
  "research": [],
  "activeResearchJobs": []
}
```

### POST `/research/:researchId/start`

Starts a research job.

Validation:

- Research exists in `research.json`.
- Player has no active research job.
- Required buildings and previous research are complete.
- Player has enough resources in the selected city.

Request:

```json
{
  "cityId": "uuid"
}
```

Response `201`:

```json
{
  "job": {
    "id": "uuid",
    "type": "research",
    "targetId": "basic_engineering",
    "fromLevel": 0,
    "toLevel": 1,
    "status": "in_progress",
    "startedAt": "2026-07-05T10:00:00.000Z",
    "completesAt": "2026-07-05T10:15:00.000Z",
    "durationSeconds": 900
  },
  "resources": []
}
```

### POST `/research-jobs/:jobId/complete`

Completes a research job if its timer has finished.

Response `200`:

```json
{
  "job": {
    "id": "uuid",
    "status": "completed"
  },
  "research": []
}
```

### GET `/config/balance`

Returns public static config required by the client.

Response `200`:

```json
{
  "resources": [],
  "buildings": [],
  "research": [],
  "world": {}
}
```

## Backend Implementation Notes

- `GET /game-state` should be the first frontend integration target.
- Resource production should be applied before returning city state.
- Mutations must use database transactions.
- Upgrade and research starts must subtract resources in the same transaction that creates the job.
- Job completion must be idempotent.
- Balance config should be validated at backend startup.
- API tests should cover successful start, insufficient resources, queue limit, and idempotent completion.

## Acceptance Alignment

This API supports the Sprint 0 acceptance criteria:

- Player can access the game through `/me` and `/bootstrap`.
- A default city is created by `/bootstrap`.
- City name and level are returned by `/game-state`.
- Resource bar data is returned by `/game-state` and `/cities/:cityId/resources`.
- Buildings are returned by `/game-state` and `/cities/:cityId/buildings`.
- Data is loaded from backend endpoints.
