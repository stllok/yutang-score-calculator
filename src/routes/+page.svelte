<script lang="ts">
	import type { PlayerData } from './+layout';
	import { playerData } from './player_data';

	let scores = [
		[0, 0, 0, 0],
		[0, 0, 0, 0]
	];
	let final_score = [0, 0];
	let accs = [0, 0];

	const TIER_LIMIT = [10, 7, 5, 3, 1];
	const SOCKET = new WebSocket('ws://127.0.0.1:24050/ws');

	let is_acc_mode: boolean = false;

	function score_mode(a: PlayerData, b: PlayerData): number {
		return b.score - a.score;
	}

	function acc_mode(a: PlayerData, b: PlayerData): number {
		return b.acc - a.acc;
	}

	function get_score(tier: number, placement: number): number {
		if (TIER_LIMIT[placement] > TIER_LIMIT[tier]) {
			return TIER_LIMIT[tier] + (TIER_LIMIT[placement] - TIER_LIMIT[tier]) * 0.5;
		} else {
			return TIER_LIMIT[placement];
		}
	}

	function has_bonus(player: PlayerData, opponent: PlayerData | undefined): boolean {
		if (
			!is_acc_mode &&
			opponent !== undefined &&
			!player.bonus_score_flag &&
			player.score > 2 * opponent.score
		) {
			opponent.bonus_score_flag = true;
			return true;
		} else {
			return false;
		}
	}

	// Listen for messages
	SOCKET.addEventListener('message', (event) => {
		let data = JSON.parse(event.data)['tourney']['ipcClients'];

		// not processing when lobby has not enough 8 players by checking empty slot
		if (data.find((_) => _['spectating']['userID'] === 0) !== undefined) {
			return;
		}

		let players: PlayerData[] = data
			.map((data, i) => {
				return {
					team: i < 4 ? 0 : 1,
					id: data['spectating']['userID'],
					score: data['gameplay']['score'],
					tier: playerData[data['spectating']['userID']].T,
					acc: data['gameplay']['accuracy'],
					bonus_score_flag: false
				};
			})
			.sort(is_acc_mode ? acc_mode : score_mode);

		accs = [0, 0];
		players.forEach((player) => {
			const opponent = players.filter((_) => _.team != player.team);
			const placement = opponent.findIndex(
				(_) => (is_acc_mode ? acc_mode : score_mode)(player, _) < 0
			);
			const score =
				get_score(player.tier, placement === -1 ? 4 : placement) +
				(has_bonus(player, opponent[placement + 1]) ? 0.5 : 0);

			scores[player.team][player.tier] = score;
			accs[player.team] += player.acc;
			final_score[player.team] += score;
		});
	});
</script>

<div class="flex h-screen w-screen flex-col justify-between">
	<div class="flex items-center justify-between p-5">
		<div class="flex flex-row items-center gap-5">
			{#each scores[0] as s}
				<p
					class="text-white first:text-5xl last:text-8xl [&:nth-child(2)]:text-6xl [&:nth-child(3)]:text-7xl"
				>
					{s}
				</p>
			{/each}
		</div>

		<div class="text-3xl text-white">
			(acc: {(accs[0] / 4).toFixed(2)})
		</div>

		<div
			class="text-6xl text-white"
			class:winner={final_score[0] > final_score[1]}
			class:loser={final_score[1] > final_score[0]}
		>
			{final_score[0]}
		</div>

		<p class="text-4xl text-white">VS</p>

		<div
			class="text-6xl text-white"
			class:winner={final_score[1] > final_score[0]}
			class:loser={final_score[0] > final_score[1]}
		>
			{final_score[1]}
		</div>

		<div class="text-3xl text-white">
			(acc: {(accs[1] / 4).toFixed(2)})
		</div>

		<div class="flex flex-row-reverse items-center gap-5">
			{#each scores[1] as s}
				<p
					class="text-white first:text-5xl last:text-8xl [&:nth-child(2)]:text-6xl [&:nth-child(3)]:text-7xl"
				>
					{s}
				</p>
			{/each}
		</div>
	</div>
	<div>
		<div class="flex justify-center">
			<div
				class="flex h-16 justify-end duration-150"
				style:width="{(final_score[0] / (final_score[0] + final_score[1])) * 100}%"
			/>
			<div
				class="mb-2 rounded-lg bg-slate-200 p-3 text-5xl duration-150"
				class:diff-blue-win={final_score[1] - final_score[0] > 0}
				class:diff-red-win={final_score[0] - final_score[1] > 0}
			>
				{Math.abs(final_score[0] - final_score[1])}
			</div>
			<div
				class="h-16 duration-150"
				style:width="{(final_score[1] / (final_score[0] + final_score[1])) * 100}%"
			/>
		</div>
		<div class="flex justify-center">
			<div
				class="flex h-16 justify-end bg-red-500 duration-150"
				style:width="{(final_score[0] / (final_score[0] + final_score[1])) * 100}%"
			/>
			<div
				class="h-16 bg-blue-500 duration-150"
				style:width="{(final_score[1] / (final_score[0] + final_score[1])) * 100}%"
			/>
		</div>
	</div>
</div>

<style lang="postcss">
	.diff-blue-win {
		@apply bg-blue-500 text-white;
	}

	.diff-red-win {
		@apply bg-red-500 text-white;
	}

	.winner {
		@apply text-7xl;
	}

	.loser {
		@apply text-5xl;
	}
</style>
