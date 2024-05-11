export const prerender = true;
export const ssr = false;

export interface PlayerData {
	team: number;
	id: number;
	score: number;
	tier: number;
	acc: number;
	bonus_score_flag: boolean;
}
