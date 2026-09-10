# EIASC CRil Geographic Master Data

The authoritative hierarchy is:

```text
Region
  ↓
Zone/City
  ↓
Sub-city/Town
  ↓
District/Woreda
```

## Excel import format

The administrator can download the official `.xlsx` template from the administration UI. The first worksheet must contain these eight columns in row 1:

| Column | Required | Description |
|---|---|---|
| Region Code | Yes | Unique Region code |
| Region Name | Yes | Official Region name |
| Zone/City Code | Yes | Unique Zone/City code |
| Zone/City Name | Yes | Official Zone/City name |
| Sub-city/Town Code | Yes | Unique Sub-city/Town code |
| Sub-city/Town Name | Yes | Official Sub-city/Town name |
| District/Woreda Code | Yes | Unique District/Woreda code |
| District/Woreda Name | Yes | Official District/Woreda name |

Each data row represents one complete Region-to-District path. Parent records are created before their children. Existing records are not moved between parents by an import.

## Import behavior

- Maximum workbook size: 5 MB.
- Maximum data rows: 10,000.
- All eight columns are required for every non-empty row.
- Codes are unique stable identifiers.
- A duplicate code with a different parent is rejected.
- Conflicting duplicate data is rejected.
- The database operation runs in one transaction; a failed import does not leave a partial hierarchy.
- A successful import creates an immutable audit event containing the import summary.

## Manual administration

Super Admin and National Admin can create records individually from `/admin/locations`:

1. Create Region.
2. Select the Region and create Zone/City.
3. Select the Zone/City and create Sub-city/Town.
4. Select the Sub-city/Town and create District/Woreda.

Public read endpoints remain available to registration forms so applicants can select only configured hierarchy values.
