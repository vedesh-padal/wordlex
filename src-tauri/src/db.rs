use rusqlite::{params, Connection, OptionalExtension, Result};
use std::collections::HashMap;

use crate::models::{SearchResult, WordDetail, WordSense};

// ─── Relation IDs from the `relations` table ───────────────────────────────
// These are the numeric IDs used in semrelations and lexrelations.
const REL_HYPERNYM: i64 = 1;
const REL_HYPONYM: i64 = 2;
const REL_HOLONYM_PART: i64 = 11;
const REL_MERONYM_PART: i64 = 12;
const REL_HOLONYM_MEMBER: i64 = 13;
const REL_MERONYM_MEMBER: i64 = 14;
const REL_HOLONYM_SUB: i64 = 15;
const REL_MERONYM_SUB: i64 = 16;
const REL_ANTONYM: i64 = 30;
const REL_DERIVATION: i64 = 81;

/// Creates an FTS5 virtual table on `words.word` if it doesn't exist, then rebuilds it.
///
/// This is idempotent — safe to call on every startup. The FTS5 table enables
/// fast prefix search which is critical for the type-ahead experience.
///
/// We use an external-content FTS table (content='words') so the index
/// references the real `words` table without duplicating data. The `rebuild`
/// command synchronizes the FTS index with the content table.
pub fn setup_fts(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
            word,
            content='words',
            content_rowid='wordid'
        );",
    )?;
    conn.execute_batch("INSERT INTO words_fts(words_fts) VALUES('rebuild');")?;
    Ok(())
}

/// Prefix search for the type-ahead dropdown.
///
/// Uses FTS5 prefix matching (appending `*` to the query) for fast lookups.
/// Falls back to LIKE if FTS5 fails for any reason (e.g., special characters).
///
/// Returns at most `limit` results, each containing the word, all its POS values,
/// and the first definition as a preview.
pub fn search_words(conn: &Connection, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(vec![]);
    }

    // Sanitize the query for FTS5: remove any special FTS syntax characters
    let sanitized: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '-' || *c == '\'')
        .collect();

    if sanitized.is_empty() {
        return Ok(vec![]);
    }

    // Try FTS5 prefix search first
    let fts_query = format!("\"{}\"*", sanitized);

    let mut stmt = conn.prepare(
        "SELECT w.word, w.wordid
         FROM words_fts fts
         JOIN words w ON w.wordid = fts.rowid
         WHERE words_fts MATCH ?1
         ORDER BY
           CASE WHEN LOWER(w.word) = LOWER(?2) THEN 0 ELSE 1 END,
           LENGTH(w.word),
           w.word
         LIMIT ?3",
    )?;

    let rows: Vec<(String, i64)> = stmt
        .query_map(params![fts_query, query, limit as i64], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    if rows.is_empty() {
        // Fallback to LIKE search
        return search_words_like(conn, query, limit);
    }

    build_search_results(conn, &rows)
}

/// Fallback search using LIKE when FTS5 doesn't return results.
fn search_words_like(conn: &Connection, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
    let lower_query = query.to_lowercase();
    let has_wildcards = lower_query.contains('*') || lower_query.contains('?');

    // If the user uses explicit wildcards, replace them with SQL wildcards.
    // Otherwise, default to prefix matching.
    let pattern = if has_wildcards {
        lower_query.replace('*', "%").replace('?', "_")
    } else {
        format!("{}%", lower_query)
    };

    let mut stmt = conn.prepare(
        "SELECT word, wordid FROM words
         WHERE LOWER(word) LIKE ?1
         ORDER BY
           CASE WHEN LOWER(word) = LOWER(?2) THEN 0 ELSE 1 END,
           LENGTH(word),
           word
         LIMIT ?3",
    )?;

    let rows: Vec<(String, i64)> = stmt
        .query_map(params![pattern, query, limit as i64], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    build_search_results(conn, &rows)
}

/// Given a list of (word, wordid) pairs, fetch POS list and first definition
/// to build SearchResult items for the dropdown.
fn build_search_results(conn: &Connection, rows: &[(String, i64)]) -> Result<Vec<SearchResult>> {
    let mut results = Vec::with_capacity(rows.len());

    for (word, wordid) in rows {
        // Get all POS values for this word
        let mut pos_stmt = conn.prepare(
            "SELECT DISTINCT l.posid
             FROM lexes l
             WHERE l.wordid = ?1
             ORDER BY l.posid",
        )?;
        let pos_list: Vec<String> = pos_stmt
            .query_map(params![wordid], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        // Get first definition
        let short_def: String = conn
            .query_row(
                "SELECT ss.definition
                 FROM senses s
                 JOIN synsets ss ON ss.synsetid = s.synsetid
                 WHERE s.wordid = ?1
                 ORDER BY s.sensenum
                 LIMIT 1",
                params![wordid],
                |row| row.get(0),
            )
            .unwrap_or_default();

        results.push(SearchResult {
            word: word.clone(),
            pos_list,
            short_def,
        });
    }

    Ok(results)
}

/// Full word lookup — the main query that powers the definition view.
///
/// Joins words → senses → synsets to get all meanings. For each synset:
/// - Collects synonyms (other words in the same synset)
/// - Collects usage examples from the `samples` table
/// - Collects antonyms via `lexrelations` where relationid = 30
///
/// Also collects word-level relations:
/// - Hypernyms (relationid = 1) via `semrelations`
/// - Hyponyms (relationid = 2) via `semrelations`
/// - Derived forms (relationid = 81) via `lexrelations`
///
/// Senses are sorted by POS (n, v, a, s, r) then by sense_num.
pub fn lookup_word(conn: &Connection, word_query: &str) -> Result<Option<WordDetail>> {
    let word_query = word_query.trim();
    if word_query.is_empty() {
        return Ok(None);
    }

    // Find the wordid
    let wordid: i64 = match conn.query_row(
        "SELECT wordid FROM words WHERE LOWER(word) = LOWER(?1)",
        params![word_query],
        |row| row.get(0),
    ) {
        Ok(id) => id,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
        Err(e) => return Err(e),
    };

    // Get the canonical word spelling
    let word: String = conn.query_row(
        "SELECT word FROM words WHERE wordid = ?1",
        params![wordid],
        |row| row.get(0),
    )?;

    // Get pronunciation (if any)
    let pronunciation: Option<String> = conn
        .query_row(
            "SELECT p.pronunciation 
         FROM lexes_pronunciations lp
         JOIN pronunciations p ON p.pronunciationid = lp.pronunciationid
         WHERE lp.wordid = ?1
         LIMIT 1",
            params![wordid],
            |row| row.get(0),
        )
        .optional()?;

    // Get all senses with definitions, POS, and sense ordering
    let mut sense_stmt = conn.prepare(
        "SELECT DISTINCT s.synsetid, ss.posid, ss.definition, COALESCE(s.sensenum, 0) as sensenum
         FROM senses s
         JOIN synsets ss ON ss.synsetid = s.synsetid
         WHERE s.wordid = ?1
         ORDER BY
           CASE ss.posid
             WHEN 'n' THEN 1
             WHEN 'v' THEN 2
             WHEN 'a' THEN 3
             WHEN 's' THEN 4
             WHEN 'r' THEN 5
             ELSE 6
           END,
           COALESCE(s.sensenum, 0)",
    )?;

    let sense_rows: Vec<(i64, String, String, i32)> = sense_stmt
        .query_map(params![wordid], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    if sense_rows.is_empty() {
        return Ok(None);
    }

    let mut senses = Vec::with_capacity(sense_rows.len());

    for (synsetid, posid, definition, sensenum) in &sense_rows {
        // Synonyms: other words in the same synset (excluding the lookup word itself)
        let mut syn_stmt = conn.prepare(
            "SELECT DISTINCT w2.word
             FROM senses s2
             JOIN words w2 ON w2.wordid = s2.wordid
             WHERE s2.synsetid = ?1 AND s2.wordid != ?2
             ORDER BY w2.word",
        )?;
        let synonyms: Vec<String> = syn_stmt
            .query_map(params![synsetid, wordid], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        // Antonyms: via lexrelations for this word+synset pair
        let mut ant_stmt = conn.prepare(
            "SELECT DISTINCT w2.word
             FROM lexrelations lr
             JOIN words w2 ON w2.wordid = lr.word2id
             WHERE lr.word1id = ?1
               AND lr.synset1id = ?2
               AND lr.relationid = ?3
             ORDER BY w2.word",
        )?;
        let antonyms: Vec<String> = ant_stmt
            .query_map(params![wordid, synsetid, REL_ANTONYM], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        // Usage examples from the samples table
        let mut ex_stmt = conn.prepare(
            "SELECT sample FROM samples
             WHERE synsetid = ?1
             ORDER BY sampleid",
        )?;
        let examples: Vec<String> = ex_stmt
            .query_map(params![synsetid], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        senses.push(WordSense {
            synset_id: *synsetid,
            pos: posid.clone(),
            definition: definition.clone(),
            synonyms,
            antonyms,
            examples,
            sense_num: *sensenum,
        });
    }

    // Collect synset IDs for this word (for hypernym/hyponym lookups)
    let synset_ids: Vec<i64> = sense_rows.iter().map(|(sid, _, _, _)| *sid).collect();

    let hypernyms = get_related_words_in(conn, &synset_ids, &[REL_HYPERNYM])?;
    let hyponyms = get_related_words_in(conn, &synset_ids, &[REL_HYPONYM])?;
    let meronyms = get_related_words_in(
        conn,
        &synset_ids,
        &[REL_MERONYM_PART, REL_MERONYM_MEMBER, REL_MERONYM_SUB],
    )?;
    let holonyms = get_related_words_in(
        conn,
        &synset_ids,
        &[REL_HOLONYM_PART, REL_HOLONYM_MEMBER, REL_HOLONYM_SUB],
    )?;

    // Derived forms via lexrelations
    let mut deriv_stmt = conn.prepare(
        "SELECT DISTINCT w2.word
         FROM lexrelations lr
         JOIN words w2 ON w2.wordid = lr.word2id
         WHERE lr.word1id = ?1 AND lr.relationid = ?2
         ORDER BY w2.word",
    )?;
    let derived_forms: Vec<String> = deriv_stmt
        .query_map(params![wordid, REL_DERIVATION], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Some(WordDetail {
        word,
        pronunciation,
        senses,
        hypernyms,
        hyponyms,
        meronyms,
        holonyms,
        derived_forms,
    }))
}

/// Helper: get related words via semrelations for a set of synsets and relations.
fn get_related_words_in(
    conn: &Connection,
    synset_ids: &[i64],
    relation_ids: &[i64],
) -> Result<Vec<String>> {
    if synset_ids.is_empty() || relation_ids.is_empty() {
        return Ok(vec![]);
    }

    let mut words_map: HashMap<String, ()> = HashMap::new();

    let rel_placeholders = relation_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");
    let query = format!(
        "SELECT DISTINCT w2.word
         FROM semrelations sr
         JOIN senses s2 ON s2.synsetid = sr.synset2id
         JOIN words w2 ON w2.wordid = s2.wordid
         WHERE sr.synset1id = ? AND sr.relationid IN ({})
         ORDER BY w2.word",
        rel_placeholders
    );

    for synset_id in synset_ids {
        let mut stmt = conn.prepare(&query)?;

        let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![synset_id];
        for rel in relation_ids {
            params_vec.push(rel);
        }

        let words: Vec<String> = stmt
            .query_map(rusqlite::params_from_iter(params_vec), |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        for w in words {
            words_map.entry(w).or_insert(());
        }
    }

    let mut result: Vec<String> = words_map.into_keys().collect();
    result.sort();
    Ok(result)
}

/// Returns a random "interesting" word — a noun with length > 5 that has
/// at least one definition — then does a full lookup on it.
///
/// Used for the "Word of the Day" feature and the tray icon menu item.
pub fn get_random_word(conn: &Connection) -> Result<Option<WordDetail>> {
    let word: String = match conn.query_row(
        "SELECT w.word FROM words w
         JOIN senses s ON s.wordid = w.wordid
         JOIN synsets ss ON ss.synsetid = s.synsetid
         WHERE ss.posid = 'n'
           AND LENGTH(w.word) > 5
           AND w.word NOT LIKE '% %'
           AND w.word NOT LIKE '%-%'
         ORDER BY RANDOM()
         LIMIT 1",
        [],
        |row| row.get(0),
    ) {
        Ok(w) => w,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
        Err(e) => return Err(e),
    };

    lookup_word(conn, &word)
}
