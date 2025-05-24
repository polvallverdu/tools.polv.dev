import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db/with-schemas';
import { createStore } from 'tinybase/with-schemas';

const tablesSchema = {
	images: {
		id: { type: 'string' },
		name: { type: 'string' },
		path: { type: 'string' },
		createdAt: { type: 'string' },
		updatedAt: { type: 'string' },
		deletedAt: { type: 'string' },
		model: { type: 'string' },
		status: { type: 'string' },
		error: { type: 'string' },
		output: { type: 'string' },
		input: { type: 'string' },
		outputPath: { type: 'string' }
	}
} as const;

let dbInitialized = $state(false);

const store = createStore().setTablesSchema(tablesSchema);
const indexedDbPersister = createIndexedDbPersister(store, 'tools-background-removal');

async function initDb() {
	if (dbInitialized) return;
	await indexedDbPersister.startAutoLoad();
	await indexedDbPersister.startAutoSave();
	dbInitialized = true;
}

void initDb();

export const isDbInitialized = () => dbInitialized;

export { store as db };
