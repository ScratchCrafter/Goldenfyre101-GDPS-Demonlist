// same group = tiers, you only get the highest one

export const FORMER_TOP1 = [
    { path: 'EGGNEVERCLEARRE', name: 'EGG NEVER CLEAR RE' },
    { path: 'GoldenfyreChallenge', name: 'Goldenfyre Challenge' },
    { path: 'NoCure', name: 'No Cure' },
];

export const FORMER_TOP1_PLAYERS = ['geo', 'miokii', 'Gamer862', 'Cheese'];

export const ROLES = [
    { name: 'List Owner', colour: '#000000', category: 'Staff', group: 'staff', description: 'List owner.', check: p => p.staff === 'owner' },
    { name: 'List Admin', colour: '#555555', category: 'Staff', group: 'staff', description: 'List admin.', check: p => p.staff === 'admin' },
    { name: 'List Helper', colour: '#cccccc', category: 'Staff', group: 'staff', description: 'List helper.', check: p => p.staff === 'helper' },

    { name: '#1 Player', colour: '#ffd700', category: 'Leaderboard', group: 'placement', description: 'Be #1 on the leaderboard.', check: p => p.rank === 1 },
    { name: 'Former #1 Player', colour: '#ffe680', category: 'Leaderboard', group: 'placement', description: 'Used to be #1 on the leaderboard.', check: p => p.formerTop1Player },
    { name: 'Top 10 Player', colour: '#ff4500', category: 'Leaderboard', group: 'placement', description: 'Be in the top 10 on the leaderboard.', check: p => p.rank <= 10 },

    { name: 'Top 1 Victor', colour: '#ff0000', category: 'Hardest Level', group: 'top1', description: 'Beat the current #1 level.', check: p => p.beatTop1 },
    { name: 'Former Top 1 Victor', colour: '#ff8080', category: 'Hardest Level', group: 'top1', description: 'Beat a former top #1 Level.', check: p => p.beatFormerTop1 },

    { name: 'Extreme Master', colour: '#8a00ff', category: 'Extremes', group: 'extremes', description: 'Beat 5 or more Extreme Demons.', check: p => p.extremesBeaten >= 5 },
    { name: 'Extreme Pro', colour: '#b24dff', category: 'Extremes', group: 'extremes', description: 'Beat 3 or more Extreme Demons.', check: p => p.extremesBeaten >= 3 },
    { name: 'Extreme Victor', colour: '#dcbcff', category: 'Extremes', group: 'extremes', description: 'Beat an Extreme Demon.', check: p => p.extremesBeaten >= 1 },

    { name: 'Extreme Verifier', colour: '#0000ff', category: 'Verifying', description: 'Verify an Extreme Demon.', check: p => p.extremesVerified >= 1 },
    { name: 'Master Verifier', colour: '#2979ff', category: 'Verifying', group: 'verifier', description: 'Verify 10 or more levels.', check: p => p.verifiedCount >= 10 },
    { name: 'Pro Verifier', colour: '#a8ccff', category: 'Verifying', group: 'verifier', description: 'Verify 3 or more levels.', check: p => p.verifiedCount >= 3 },

    { name: 'Master First Victor', colour: '#00e5ff', category: 'Victors', group: 'firstvictor', description: 'Be the first victor (first to beat it after the verifier) on 5 or more levels.', check: p => p.firstVictories >= 5 },
    { name: 'Pro First Victor', colour: '#6ef3ff', category: 'Victors', group: 'firstvictor', description: 'Be the first victor on 3 or more levels.', check: p => p.firstVictories >= 3 },
    { name: 'First Victor', colour: '#bff8ff', category: 'Victors', group: 'firstvictor', description: 'Be the first victor on a level.', check: p => p.firstVictories >= 1 },
    { name: 'Grandmaster Grinder', colour: '#00e676', category: 'Victors', group: 'grinder', description: 'Beat 50 or more levels.', check: p => p.levelsBeaten >= 50 },
    { name: 'Master Grinder', colour: '#69f0ae', category: 'Victors', group: 'grinder', description: 'Beat 25 or more levels.', check: p => p.levelsBeaten >= 25 },
    { name: 'Pro Grinder', colour: '#c4f7d6', category: 'Victors', group: 'grinder', description: 'Beat 15 or more levels.', check: p => p.levelsBeaten >= 15 },

    { name: 'Pack Grandmaster', colour: '#ff9100', category: 'Packs', group: 'packs', description: 'Have the most packs completed out of everyone (ties all get it).', check: p => p.mostPacks },
    { name: 'Pack Master', colour: '#ffab40', category: 'Packs', group: 'packs', description: 'Complete 10 or more packs.', check: p => p.packsCompleted >= 10 },
    { name: 'Pack Grinder', colour: '#ffc87a', category: 'Packs', group: 'packs', description: 'Complete 5 or more packs.', check: p => p.packsCompleted >= 5 },
    { name: 'Pack Victor', colour: '#ffe3bd', category: 'Packs', group: 'packs', description: 'Complete a pack.', check: p => p.packsCompleted >= 1 },
];

export const ROLE_CATEGORIES = ['Staff', 'Leaderboard', 'Hardest Level', 'Extremes', 'Verifying', 'Victors', 'Packs'];

const isExtreme = level => (level.difficulty ?? '').toLowerCase() === 'extreme demon';

export function assignRoles(players, firstVictors, editors, top1Path) {
    const staffMap = {};
    (editors ?? []).forEach(e => {
        staffMap[e.name.toLowerCase()] = e.role;
    });

    const maxPacks = Math.max(0, ...players.map(pl => (pl.packs ?? []).length));

    players.forEach((player, i) => {
        const beaten = [...player.verified, ...player.completed];
        const stats = {
            rank: i + 1,
            staff: staffMap[player.user.toLowerCase()] ?? null,
            verifiedCount: player.verified.length,
            extremesVerified: player.verified.filter(isExtreme).length,
            extremesBeaten: beaten.filter(isExtreme).length,
            levelsBeaten: beaten.length,
            firstVictories: firstVictors[player.user.toLowerCase()] ?? 0,
            formerTop1Player: FORMER_TOP1_PLAYERS.some(n => n.toLowerCase() === player.user.toLowerCase()),
            beatTop1: beaten.some(l => l.levelPath === top1Path),
            beatFormerTop1: beaten.some(l => FORMER_TOP1.some(f => f.path === l.levelPath)),
            packsCompleted: (player.packs ?? []).length,
            mostPacks: maxPacks > 0 && (player.packs ?? []).length === maxPacks,
        };

        const usedGroups = new Set();
        player.roles = ROLES.filter(role => {
            if (role.group && usedGroups.has(role.group)) return false;
            if (!role.check(stats)) return false;
            if (role.group) usedGroups.add(role.group);
            return true;
        }).map(role => ({
            id: role.name,
            name: role.name,
            colour: role.colour,
            description: role.description,
        }));
    });
}
