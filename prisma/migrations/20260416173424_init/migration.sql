-- CreateTable
CREATE TABLE "Athlete" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Lift" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mainLiftId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Leaderboard_mainLiftId_fkey" FOREIGN KEY ("mainLiftId") REFERENCES "Lift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaderboardLift" (
    "leaderboardId" INTEGER NOT NULL,
    "liftId" INTEGER NOT NULL,

    PRIMARY KEY ("leaderboardId", "liftId"),
    CONSTRAINT "LeaderboardLift_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeaderboardLift_liftId_fkey" FOREIGN KEY ("liftId") REFERENCES "Lift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PREntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "athleteId" INTEGER NOT NULL,
    "liftId" INTEGER NOT NULL,
    "leaderboardId" INTEGER NOT NULL,
    "weightLbs" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PREntry_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PREntry_liftId_fkey" FOREIGN KEY ("liftId") REFERENCES "Lift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PREntry_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_name_key" ON "Athlete"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Lift_name_key" ON "Lift"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_name_key" ON "Leaderboard"("name");
