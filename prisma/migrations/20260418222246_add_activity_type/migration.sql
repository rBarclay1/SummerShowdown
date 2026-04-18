-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "postId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Comment" ("authorId", "authorToken", "content", "createdAt", "id", "postId") SELECT "authorId", "authorToken", "content", "createdAt", "id", "postId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_Leaderboard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mainLiftId" INTEGER NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Leaderboard" ("createdAt", "endDate", "id", "mainLiftId", "name") SELECT "createdAt", "endDate", "id", "mainLiftId", "name" FROM "Leaderboard";
DROP TABLE "Leaderboard";
ALTER TABLE "new_Leaderboard" RENAME TO "Leaderboard";
CREATE UNIQUE INDEX "Leaderboard_name_key" ON "Leaderboard"("name");
CREATE TABLE "new_Lift" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'lift',
    "unit" TEXT NOT NULL DEFAULT 'lbs',
    "isTotalLoad" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lift" ("createdAt", "id", "isTotalLoad", "name") SELECT "createdAt", "id", "isTotalLoad", "name" FROM "Lift";
DROP TABLE "Lift";
ALTER TABLE "new_Lift" RENAME TO "Lift";
CREATE UNIQUE INDEX "Lift_name_key" ON "Lift"("name");
CREATE TABLE "new_NotificationPreferences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "athleteId" INTEGER NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_NotificationPreferences" ("athleteId", "createdAt", "email", "emailEnabled", "id", "pushEnabled") SELECT "athleteId", "createdAt", "email", "emailEnabled", "id", "pushEnabled" FROM "NotificationPreferences";
DROP TABLE "NotificationPreferences";
ALTER TABLE "new_NotificationPreferences" RENAME TO "NotificationPreferences";
CREATE UNIQUE INDEX "NotificationPreferences_athleteId_key" ON "NotificationPreferences"("athleteId");
CREATE TABLE "new_PREntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "athleteId" INTEGER NOT NULL,
    "liftId" INTEGER NOT NULL,
    "leaderboardId" INTEGER NOT NULL,
    "weightLbs" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PREntry" ("athleteId", "createdAt", "date", "id", "leaderboardId", "liftId", "weightLbs") SELECT "athleteId", "createdAt", "date", "id", "leaderboardId", "liftId", "weightLbs" FROM "PREntry";
DROP TABLE "PREntry";
ALTER TABLE "new_PREntry" RENAME TO "PREntry";
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "imageData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Post" ("authorId", "content", "createdAt", "id", "imageData") SELECT "authorId", "content", "createdAt", "id", "imageData" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE TABLE "new_PushSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "athleteId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PushSubscription" ("athleteId", "auth", "createdAt", "endpoint", "id", "p256dh") SELECT "athleteId", "auth", "createdAt", "endpoint", "id", "p256dh" FROM "PushSubscription";
DROP TABLE "PushSubscription";
ALTER TABLE "new_PushSubscription" RENAME TO "PushSubscription";
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
