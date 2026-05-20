const updateMasterStreak = async (user, today) => {
    // Check if user has completed ALL three modules for the given day
    if (
        user.lastSubmissionDate && new Date(user.lastSubmissionDate).setHours(0,0,0,0) === today.getTime() &&
        user.lastMCQDate && new Date(user.lastMCQDate).setHours(0,0,0,0) === today.getTime() &&
        user.lastSQLDate && new Date(user.lastSQLDate).setHours(0,0,0,0) === today.getTime()
    ) {
        // If lastMasterStreakDate != today, increment master streak
        if (!user.lastMasterStreakDate || new Date(user.lastMasterStreakDate).setHours(0,0,0,0) !== today.getTime()) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (user.lastMasterStreakDate && new Date(user.lastMasterStreakDate).setHours(0,0,0,0) === yesterday.getTime()) {
                user.masterStreak += 1;
            } else {
                user.masterStreak = 1;
            }
            
            if (user.masterStreak > user.longestMasterStreak) {
                user.longestMasterStreak = user.masterStreak;
            }

            user.lastMasterStreakDate = today;
            await user.save();
            return { streakUpdated: true, currentStreak: user.masterStreak };
        }
    }
    return { streakUpdated: false, currentStreak: user.masterStreak };
};

module.exports = { updateMasterStreak };
