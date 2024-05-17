<script lang="ts">
	import type { PlayerData } from './+layout';
	import { playerData } from './player_data';

	let SCORES = [
		[0, 0, 0, 0],
		[0, 0, 0, 0]
	];
	let FINAL_SCORE = [0, 0];
	let ACCS = [0, 0];

	const TIER_LIMIT = [10, 7, 5, 3, 1];
	const SOCKET = new WebSocket('ws://127.0.0.1:24050/ws');

	let IS_ACC_MODE: boolean = false;

	function handle_global_keydown(e: KeyboardEvent) {
		switch (e.key) {
			case 't':
				IS_ACC_MODE = !IS_ACC_MODE;
				break;
		}
	}

	function mod_bonus(score: number, mods: string): number {
		return mods.match('EZ') !== null ? score * 1.75 : score;
	}

	function score_mode(a: PlayerData, b: PlayerData): number {
		return b.score - a.score;
	}

	function acc_mode(a: PlayerData, b: PlayerData): number {
		return b.acc - a.acc;
	}

	function get_score(tier: number, placement: number): number {
		return TIER_LIMIT[placement] > TIER_LIMIT[tier]
			? TIER_LIMIT[tier] + (TIER_LIMIT[placement] - TIER_LIMIT[tier]) * 0.5
			: TIER_LIMIT[placement];
	}

	$: CALCULATION_FN = IS_ACC_MODE ? acc_mode : score_mode;
	function has_bonus(player: PlayerData, opponent: PlayerData | undefined): boolean {
		if (
			!IS_ACC_MODE &&
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
					score: mod_bonus(data['gameplay']['score'], data['gameplay']['mods']['str']),
					tier: playerData[data['spectating']['userID']].T,
					acc: data['gameplay']['accuracy'],
					bonus_score_flag: false
				};
			})
			.sort(CALCULATION_FN);

		ACCS = [0, 0];
		FINAL_SCORE = [0, 0];
		players.forEach((player) => {
			const opponent = players.filter((_) => _.team != player.team);
			const placement = opponent.findIndex((_) => CALCULATION_FN(player, _) < 0);
			const score =
				get_score(player.tier, placement === -1 ? 4 : placement) +
				(has_bonus(player, opponent[placement + 1]) ? 0.5 : 0);

			SCORES[player.team][player.tier] = score;
			ACCS[player.team] += player.acc;
			FINAL_SCORE[player.team] += score;
		});
	});
</script>

<svelte:window on:keydown|preventDefault={handle_global_keydown} />

<div class="flex h-screen w-screen flex-col justify-between">
	<div class="flex items-center justify-between p-5">
		<div class="flex flex-row-reverse items-center gap-5">
			{#each SCORES[0] as s}
				<p
					class="text-white first:text-8xl last:text-5xl [&:nth-child(2)]:text-7xl [&:nth-child(3)]:text-6xl"
				>
					{s}
				</p>
			{/each}
		</div>

		<div class="text-3xl text-white">
			(acc: {(ACCS[0] / 4).toFixed(2)})
		</div>

		<div
			class="text-6xl text-white"
			class:winner={FINAL_SCORE[0] > FINAL_SCORE[1]}
			class:loser={FINAL_SCORE[1] > FINAL_SCORE[0]}
		>
			{FINAL_SCORE[0]}
		</div>

		<p class="text-4xl text-white">VS</p>

		<div
			class="text-6xl text-white"
			class:winner={FINAL_SCORE[1] > FINAL_SCORE[0]}
			class:loser={FINAL_SCORE[0] > FINAL_SCORE[1]}
		>
			{FINAL_SCORE[1]}
		</div>

		<div class="text-3xl text-white">
			(acc: {(ACCS[1] / 4).toFixed(2)})
		</div>

		<div class="flex flex-row items-center gap-5">
			{#each SCORES[1] as s}
				<p
					class="text-white first:text-8xl last:text-5xl [&:nth-child(2)]:text-7xl [&:nth-child(3)]:text-6xl"
				>
					{s}
				</p>
			{/each}
		</div>
	</div>
	{#if IS_ACC_MODE}
		<div class="mb-5 flex justify-center">
			<p class="text-9xl">ACC MODE</p>
		</div>
	{/if}
	<!--
		 <div>
		 <div class="flex justify-center">
		 <div
		 class="flex h-16 justify-end duration-150"
		 style:width="{(IS_TIE ? 0.5 : (FINAL_SCORE[0] / (FINAL_SCORE[0] + FINAL_SCORE[1]))) * 100}%"
		 />
		 <div
		 class="mb-2 rounded-lg bg-slate-200 p-3 text-5xl duration-150"
		 class:diff-blue-win={FINAL_SCORE[1] - FINAL_SCORE[0] > 0}
		 class:diff-red-win={FINAL_SCORE[0] - FINAL_SCORE[1] > 0}
		 >
		 {Math.abs(FINAL_SCORE[0] - FINAL_SCORE[1])}
		 </div>
		 <div
		 class="h-16 duration-150"
		 style:width="{(FINAL_SCORE[1] / (FINAL_SCORE[0] + FINAL_SCORE[1])) * 100}%"
		 />
		 </div>
		 <div class="flex justify-center">
		 <div
		 class="flex h-16 justify-end bg-red-500 duration-150"
		 style:width="{(FINAL_SCORE[0] / (FINAL_SCORE[0] + FINAL_SCORE[1])) * 100}%"
		 />
		 <div
		 class="h-16 bg-blue-500 duration-150"
		 style:width="{(FINAL_SCORE[1] / (FINAL_SCORE[0] + FINAL_SCORE[1])) * 100}%"
		 />
		 </div>
		 </div>
	-->
</div>

<style lang="postcss">
	/*
	.diff-blue-win {
	@apply bg-blue-500 text-white;
	}

	.diff-red-win {
	@apply bg-red-500 text-white;
	}
  */
	.winner {
		@apply text-7xl;
	}

	.loser {
		@apply text-5xl;
	}
</style>
