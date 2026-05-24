use serde::{Deserialize, Serialize};

/// A single word sense — one meaning of a word within a synset.
///
/// Each sense ties a word to a concept (synset) and carries the definition,
/// related words, and usage examples for that particular meaning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordSense {
    pub synset_id: i64,
    /// Part of speech code: "n", "v", "a", "r", "s"
    pub pos: String,
    pub definition: String,
    pub synonyms: Vec<String>,
    pub antonyms: Vec<String>,
    pub examples: Vec<String>,
    /// Ordering within the synset (lower = more common sense)
    pub sense_num: i32,
}

/// Full detail for a looked-up word, including all senses and relations.
///
/// Senses are sorted by POS then by sense_num so the most common meanings
/// come first within each part-of-speech group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordDetail {
    pub word: String,
    pub pronunciation: Option<String>,
    pub senses: Vec<WordSense>,
    /// Lemmas of hypernym synset members ("type of" relationships)
    pub hypernyms: Vec<String>,
    /// Lemmas of hyponym synset members ("types" relationships)
    pub hyponyms: Vec<String>,
    pub meronyms: Vec<String>,
    pub holonyms: Vec<String>,
    /// Words derived from this word via derivation relations
    pub derived_forms: Vec<String>,
}

/// A lightweight search result returned during type-ahead/prefix search.
///
/// Designed to be fast to serialize — carries only enough data to render
/// a search dropdown item.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub word: String,
    /// All POS codes this word appears as (e.g., ["n", "v"])
    pub pos_list: Vec<String>,
    /// First definition only, for the search dropdown preview
    pub short_def: String,
}
