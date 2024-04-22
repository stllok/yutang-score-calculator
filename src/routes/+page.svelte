<script lang="ts">
	import { playerData } from './player_data';

	let raw_left = [];
	let raw_right = [];

	let score_left = [0, 0, 0, 0];
	let score_right = [0, 0, 0, 0];
	let acc_left = 0.0;
	let acc_right = 0.0;

	const TIER_LIMIT = [10, 7, 5, 3, 1];
	const SOCKET = new WebSocket('ws://127.0.0.1:24050/ws');

	function get_score(tier: number, placement: number): number {
		if (TIER_LIMIT[placement] > TIER_LIMIT[tier]) {
			return TIER_LIMIT[tier] + (TIER_LIMIT[placement] - TIER_LIMIT[tier]) * 0.5;
		} else {
			return TIER_LIMIT[placement];
		}
	}

	// Listen for messages
	SOCKET.addEventListener('message', (event) => {
		let data = JSON.parse(event.data)['tourney']['ipcClients'];

		// not processing when lobby has not enough 8 players by checking empty slot
		if (data.find((_) => _['spectating']['userID'] === 0) !== undefined) {
			return;
		}

		data = data.map((data) => {
			return {
				id: data['spectating']['userID'],
				score: data['gameplay']['score'],
				tier: playerData[data['spectating']['userID']].T,
				acc: data['gameplay']['accuracy']
			};
		});

		raw_left = data.slice(0, 4).sort((a, b) => b.score - a.score);
		raw_right = data.slice(4).sort((a, b) => b.score - a.score);

		acc_left = acc_right = 0.0;

		raw_left.forEach((o) => {
			const placement = raw_right.findIndex((t) => o.score >= t.score);
			const score = get_score(o.tier, placement === -1 ? 4 : placement);
			score_left[o.tier] = score;
			acc_left += o.acc;
		});

		raw_right.forEach((o) => {
			const placement = raw_left.findIndex((t) => o.score >= t.score);
			const score = get_score(o.tier, placement === -1 ? 4 : placement);
			score_right[o.tier] = score;
			acc_right += o.acc;
		});
	});
</script>

<div class="flex h-screen items-center justify-between p-5">
	<div class="flex flex-row items-center gap-5">
		{#each score_left as s}
			<p
				class="text-white first:text-5xl last:text-8xl [&:nth-child(2)]:text-6xl [&:nth-child(3)]:text-7xl"
			>
				{s}
			</p>
		{/each}
	</div>

	<div class="text-3xl text-white">
		(acc: {(acc_left / 4).toFixed(2)})
	</div>

	<div class="text-8xl text-white">
		{score_left.reduce((s, a) => s + a, 0)}
	</div>

	<p class="text-4xl text-white">VS</p>

	<div class="text-8xl text-white">
		{score_right.reduce((s, a) => s + a, 0)}
	</div>

	<div class="text-3xl text-white">
		(acc: {(acc_right / 4).toFixed(2)})
	</div>

	<div class="flex flex-row-reverse items-center gap-5">
		{#each score_right as s}
			<p
				class="text-white first:text-5xl last:text-8xl [&:nth-child(2)]:text-6xl [&:nth-child(3)]:text-7xl"
			>
				{s}
			</p>
		{/each}
	</div>
</div>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.green.950);
	}
</style>
