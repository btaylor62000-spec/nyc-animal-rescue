# Visitor submissions

One JSON file per submission, written by the contribute endpoint
(`functions/api/contribute.ts`) after its quick check passed, and read by
`npm run import` (`scripts/import/community.ts`).

- `*-add-*.json` becomes a record labelled "added by a visitor", Low
  confidence, excluded from the assistant until a check or a person confirms it.
- `*-correct-*.json` overwrites the named record's contact details, labelled
  "updated by a visitor", with the change logged against the page it was
  checked on.

To undo one, delete the file and re-run the import. Never edit `data/orgs/`
directly.
