export const RMBG_2_0 = 'briaai/RMBG-2.0';
export const RMBG_1_4 = 'briaai/RMBG-1.4';
export const MODNET = 'Xenova/modnet';

export const BG_REMOVAL_MODELS = [RMBG_2_0, RMBG_1_4, MODNET] as const;
export type BGRemovalModel = (typeof BG_REMOVAL_MODELS)[number];

export interface WorkerRequest {
	type: 'PROCESS_IMAGE';
	id: string;
	image: Blob;
	model: BGRemovalModel;
}

export interface WorkerProgress {
	type: 'PROGRESS';
	id: string;
	status: string;
}

export interface WorkerDone {
	type: 'DONE';
	id: string;
	output: Blob;
}

export interface WorkerError {
	type: 'ERROR';
	id: string;
	error: string;
}

export interface WorkerStart {
	type: 'START';
}

export type WorkerMessage = WorkerRequest | WorkerProgress | WorkerDone | WorkerError | WorkerStart;
