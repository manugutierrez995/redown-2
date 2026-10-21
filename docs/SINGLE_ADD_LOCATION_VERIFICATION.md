# Single Add new location control

Moved destination creation to one button at the far right of the Simple/Nested controls row, below Refresh locations. Simple cards no longer repeat Add New Option; Nested cards no longer repeat Add bucket. Folder Create and + Child actions remain because they address a particular parent.

With one configured R2 destination, the action directly adds the active mode's local configuration row. With several destinations, a dialog asks which profile to use. Simple focuses the new label; Nested adds an empty bucket root for explicit selection. The action itself does not create remote folders/buckets. Existing save/message contracts are retained.

Validation: syntax checks passed; 17 focused tests passed. Full suite: 152 tests, 125 passed, same 27 existing failures. Browser visual acceptance is not claimed.
