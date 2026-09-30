-- The authoritative geography source is Region -> Zone/City -> Woreda.
-- Districts imported from that source may belong directly to a zone/city,
-- so subcityId must be nullable while zoneId carries the authoritative parent.
ALTER TABLE "District" ALTER COLUMN "subcityId" DROP NOT NULL;
