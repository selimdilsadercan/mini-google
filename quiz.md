# Quiz - Search Engine

**My Word:** Savaş

1. Find a word that appears on multiple URLs (Check your own SQLite DB): **Savaş**

2. URL 1: **https://www.hurriyet.com.tr/...**
3. URL 2: **https://www.haber7.com/**
4. URL 3: **https://kutuphane.itu.edu.tr/arastirma/itu-yayinlari**

5. Get the frequency of your word for each URL from the DB. Use the depth of the page from the DB.
   - Entry 1: (Frequency: **23**, Depth: **0**)
   - Entry 2: (Frequency: **10**, Depth: **0**)
   - Entry 3: (Frequency: **2**, Depth: **2**)

6. Now manually calculate the score for each of your 3 entries using the formula:

   score = (frequency x 10) + 1000 (exact match bonus) - (depth x 5)
   - Entry 1 score: ( 23 x 10 ) + 1000 - ( 0 x 5 ) = ****1230****
   - Entry 2 score: ( 10 x 10 ) + 1000 - ( 0 x 5 ) = ****1100****
   - Entry 3 score: ( 2 x 10 ) + 1000 - ( 2 x 5 ) = ****1010****

7. Does the highest score you calculated match the API's #1 result? Yes / No: ****Yes****

8. How could you enhance the process in a Chain-of-Thought Manner. Explain.

### Project Data Table (Word: Savaş)

| URL | Frequency | Depth | Score |
|-----|-----------|-------|-------|
| https://www.hurriyet.com.tr/... | 23 | 0 | 60 |
| https://www.haber7.com/ | 10 | 0 | 10 |
| https://kutuphane.itu.edu.tr/arastirma/itu-yayinlari | 2 | 2 | 8 |

### Comparison with API Results
API results match the ranking order of the table above. The Top result has a high score (60) because the word "Savaş" appears directly in the HTML `<title>` tag, adding a +50 bonus. Results with Depth 0 rank higher due to our `(10 - depth)` ranking factor, which aligns with the manual calculation where depth 0 is also prioritized (less penalty).

### Enhanced Search with Chain-of-Thought (CoT)
To improve search relevance, the "Search Agent" should follow these steps:
1.  **Analyze Query**: Identify if the word is a general term (e.g., "Savaş") or a specific entity.
2.  **Identify Intent**: If "Savaş" is searched during active conflicts, prioritize "News" (Depth 0) over "Libraries" (Depth 2+).
3.  **Contextual Ranking**: Boost pages where the word appears in the `<h1>` or `<h2>` tags, not just frequency in body text.
4.  **Verification**: Before showing results, cross-check if the snippet actually contains meaningful sentences related to the term.
