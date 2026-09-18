# Data Storage — one file per entity

Every data type the app persists gets its own module in this folder.
Adding a new set of data means adding ONE file here and registering it in
`index.ts` — the rest of the app needs no changes.

## How to add a new entity

1. Define the type in `src/types/index.ts` and add the field to `AppState`.
2. Create `src/services/storage/myThings.ts`:

   ```ts
   import { MyThing } from '../../types';
   import { defineEntity } from './entityStorage';

   export const myThingsStore = defineEntity<MyThing[]>('vyaparflow_my_things_v1');

   export const loadMyThings = myThingsStore.load;
   export const saveMyThings = myThingsStore.save;
   ```

3. Register it in `src/services/storage/index.ts`:
   - one `saveMyThings(state.myThings ?? []);` line inside `saveAppState`
   - one `myThings: loadMyThings() ?? legacy?.myThings ?? [],` line inside `loadAppState`

That's it. AppContext saves the whole state on every change; your entity
is persisted automatically from that moment on.

## Where the data lives

- localStorage, one key per entity: `vyaparflow_<entity>_v1`
- Quota-exceeded errors dispatch the `storage-quota-exceeded` event
  (handled with a toast by AppContext).
- Versions before the split stored everything in ONE blob under
  `vyaparflow_crm_state_v1`. `loadAppState` migrates it automatically on
  the first run and leaves the old blob in place as a safety snapshot.

## Cloud sync (future)

When the Supabase backend lands, each entity file's `load`/`save`
internals get swapped for `dataApi` calls — one entity at a time, one
file at a time. No page or component changes required.
