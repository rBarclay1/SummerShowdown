-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Leaderboard_mainLiftId_idx" ON "Leaderboard"("mainLiftId");

-- CreateIndex
CREATE INDEX "PREntry_athleteId_idx" ON "PREntry"("athleteId");

-- CreateIndex
CREATE INDEX "PREntry_liftId_idx" ON "PREntry"("liftId");

-- CreateIndex
CREATE INDEX "PREntry_leaderboardId_idx" ON "PREntry"("leaderboardId");

-- CreateIndex
CREATE INDEX "PREntry_date_idx" ON "PREntry"("date");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "PushSubscription_athleteId_idx" ON "PushSubscription"("athleteId");
