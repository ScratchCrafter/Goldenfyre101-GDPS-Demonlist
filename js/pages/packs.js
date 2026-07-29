export default {
    template: `
    <main class="page-packs">

        <div class="packs-container">

            <section
                class="pack"
                v-for="pack in packs"
            >

                <h1>{{ pack.name }}</h1>

                <p>{{ pack.description }}</p>

                <h3>
                    Completion Bonus:
                    +{{ pack.bonus }} points
                </h3>


                <div class="pack-levels">

                    <div
                        class="pack-level"
                        v-for="level in pack.levelData"
                    >

                        <img
                            :src="thumbnail(level.verification)"
                            alt=""
                        >

                        <div>
                            <h2>{{ level.name }}</h2>
                            <p>ID: {{ level.id }}</p>
                        </div>

                    </div>

                </div>

            </section>

        </div>

    </main>
    `,


    data() {
        return {
            packs: []
        };
    },


    methods: {

        thumbnail(url) {

            const id =
                new URL(url)
                .searchParams
                .get("v");

            return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

        }

    },


    async mounted() {

        const packs =
            await fetch("/data/packs.json")
            .then(r => r.json());


        for (const pack of packs) {

            pack.levelData = [];


            for (const level of pack.levels) {

                const data =
                    await fetch(`/data/${level}.json`)
                    .then(r => r.json());


                pack.levelData.push(data);

            }

        }


        this.packs = packs;

    }
};