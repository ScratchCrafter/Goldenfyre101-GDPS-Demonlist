import { fetchLeaderboard } from '../content.js';
import { getFontColour } from '../util.js';
import { ROLES, ROLE_CATEGORIES } from '../roles.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        loading: true,
        holders: {},
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roles">
            <div class="roles-container">
                <h1>Roles</h1>
                <p class="roles-intro">
                    Roles are given out automatically from the list's records and show up on your
                    profile in the Leaderboard. For tiered roles, only your highest one shows.
                </p>
                <section v-for="category in categories" class="roles-category">
                    <h2>{{ category.name }}</h2>
                    <div v-for="role in category.roles" class="roles-role">
                        <div class="packs">
                            <span
                                class="pack type-label-sm"
                                :style="'background-color: ' + role.colour + '; color: ' + getFontColour(role.colour)"
                            >
                                {{ role.name }}
                            </span>
                        </div>
                        <p v-if="role.description" class="roles-description">{{ role.description }}</p>
                        <p class="roles-holders type-label-sm">
                            <template v-if="(holders[role.name] || []).length">
                                Held by {{ holders[role.name].length }}: {{ holders[role.name].join(', ') }}
                            </template>
                            <template v-else>Nobody has this role yet.</template>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    `,
    computed: {
        categories() {
            return ROLE_CATEGORIES.map(name => ({
                name,
                roles: ROLES.filter(r => r.category === name),
            })).filter(c => c.roles.length);
        },
    },
    async mounted() {
        const [leaderboard] = await fetchLeaderboard();
        const holders = {};
        (leaderboard ?? []).forEach(player => {
            (player.roles ?? []).forEach(role => {
                (holders[role.id] ??= []).push(player.user);
            });
        });
        this.holders = holders;
        this.loading = false;
    },
    methods: {
        getFontColour,
    },
};
