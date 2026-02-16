# Create Pick – Filters Explained

## Country filter: what does "World" mean?

**"World (international)"** in the Country dropdown means **international/global competitions** that are not tied to a single country. The API returns `country: "World"` for:

- UEFA Champions League  
- UEFA Europa League  
- UEFA Europa Conference League  
- FIFA World Cup  
- UEFA European Championship  
- Africa Cup of Nations  
- Other continental or global tournaments  

Selecting **World (international)** shows only fixtures from those competitions.

---

## Are countries and competitions limited to the 7-day fixture window?

**No.** The **Country** and **Competition** dropdowns are **not** restricted to “only options that have fixtures in the next 7 days”.

- **Countries** come from all **enabled leagues** (seed + migrations) and from the **league** table (synced from the API). So you see every country we support, even if there are no fixtures for the selected date.
- **Competitions** come from the same sources: enabled leagues that exist in the **league** table. So you see all competitions we’ve enabled and synced, not only those with fixtures in the next 7 days.

If you pick a competition or country and the selected date has no fixtures, you get an empty list; the filters still show all options.

---

## Why do I only see 68 fixtures or few leagues/countries?

1. **Fixture count (e.g. 68)**  
   The API only returns fixtures that **exist for the next 7 days (UTC)** for the leagues we have enabled. So the number (e.g. 68) is “how many fixtures the API had for those dates and those leagues”. It can be low if:
   - It’s off-season for many leagues.  
   - Many of our enabled leagues are not returned as **current** by the API (e.g. World Cup, Euros, Africa Cup when not in active window).  
   - The 7-day window simply has fewer matches on some days.

2. **Few leagues/countries in the dropdowns**  
   Competition and country options are built from the **league** table. That table is filled when we **sync**:
   - From the bulk calls: `leagues?type=league&current=true` and `leagues?type=cup&current=true` (only leagues the API considers “current”).  
   - From **backfill**: for any **enabled** league that was not in those responses, we now fetch it by id (up to 30 per sync) and insert it into the **league** table.

   So after **several syncs** (or one run with many enabled leagues already “current”), the league table fills with all enabled leagues and you get **more competitions and countries** in the dropdowns. Run **Admin → Fixtures → Sync Fixtures** again to backfill more league metadata and refresh options.

---

## Summary

| Question | Answer |
|----------|--------|
| What does **World** mean in Country? | International competitions (Champions League, World Cup, Euros, Africa Cup, etc.). Shown in the UI as **World (international)**. |
| Do filters only show countries/leagues with fixtures in the 7-day window? | No. They show all enabled (and synced) countries and competitions. |
| Why only 68 fixtures? | The API only has that many fixtures in the next 7 days for our enabled leagues; run sync again when more matches are available. |
| Why few competitions/countries? | They come from the league table. Sync runs a backfill of up to 30 missing leagues per run; run **Sync Fixtures** again to grow the list. |
