import { createIndexedDbPersister } from "tinybase/persisters/persister-indexed-db/with-schemas";
import { createStore, type TablesSchema } from "tinybase/with-schemas";

const tablesSchema = {
  images: {
    name: { type: "string" },
    model: { type: "string" },
    output: { type: "string" },
    input: { type: "string" },
    createdAt: { type: "string" },
  },
  colors: {
    name: { type: "string" },
    hex: { type: "string" },
    rgb: { type: "string" },
    hsl: { type: "string" },
    hwb: { type: "string" },
    oklab: { type: "string" },
    oklch: { type: "string" },
    createdAt: { type: "string" },
  },
} satisfies TablesSchema;

let dbInitialized = $state(false);

const store = createStore().setTablesSchema(tablesSchema);
const indexedDbPersister = createIndexedDbPersister(store, "tools-background-removal");
async function initDb() {
  if (dbInitialized) return;
  await indexedDbPersister.startAutoLoad();
  await indexedDbPersister.startAutoSave();
  dbInitialized = true;
}

void initDb();

export const isDbInitialized = () => dbInitialized;

export { store as db };
