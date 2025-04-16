/**
 * Keyword extraction utility for video generation
 * Extracts meaningful keywords from text to improve video generation results
 */

const natural = require('natural');
const stopwords = require('stopwords').english;

/**
 * Extract keywords from text using TF-IDF and natural language processing
 * @param {string} text - Text to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords to extract (default: 5)
 * @returns {string[]} Array of extracted keywords
 */
function extractKeywords(text, maxKeywords = 5) {
  try {
    // If natural module is not available, use simple extraction
    if (!natural) {
      return simpleKeywordExtraction(text, maxKeywords);
    }

    // Tokenize the text
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text.toLowerCase());
    
    // Remove stopwords and short words
    const filteredTokens = tokens.filter(token => 
      token.length > 3 && !stopwords.includes(token) && /^[a-z]+$/.test(token)
    );
    
    // Count word frequency
    const wordFrequency = {};
    filteredTokens.forEach(token => {
      wordFrequency[token] = (wordFrequency[token] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Return top keywords
    return sortedWords.slice(0, maxKeywords);
  } catch (error) {
    console.error('Error extracting keywords:', error.message);
    // Fallback to simple extraction if an error occurs
    return simpleKeywordExtraction(text, maxKeywords);
  }
}

/**
 * Simple keyword extraction without external dependencies
 * @param {string} text - Text to extract keywords from
 * @param {number} maxKeywords - Maximum number of keywords to extract
 * @returns {string[]} Array of extracted keywords
 */
function simpleKeywordExtraction(text, maxKeywords = 5) {
  // Common stopwords to filter out
  const commonWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'with', 'by', 'about', 'as', 'of', 'is', 'are', 'was', 'were', 'be', 
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 
    'would', 'should', 'can', 'could', 'may', 'might', 'must', 'shall', 
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 
    'they', 'me', 'him', 'her', 'us', 'them'
  ];
  
  // Remove punctuation and split into words
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  
  // Filter out common words and short words
  const filteredWords = words.filter(word => 
    word.length > 3 && !commonWords.includes(word)
  );
  
  // Count word frequency
  const wordFrequency = {};
  filteredWords.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return top keywords
  return sortedWords.slice(0, maxKeywords);
}

/**
 * Categorize keywords into predefined categories
 * @param {string[]} keywords - Array of keywords to categorize
 * @returns {object} Object with categories as keys and boolean values
 */
function categorizeKeywords(keywords) {
  // Define category keywords
  const categories = {
    nature: ['nature', 'landscape', 'mountain', 'ocean', 'forest', 'river', 'lake', 'beach', 'sky', 'sunset', 'sunrise'],
    technology: ['technology', 'computer', 'digital', 'tech', 'innovation', 'future', 'robot', 'ai', 'artificial'],
    people: ['people', 'person', 'man', 'woman', 'child', 'family', 'group', 'crowd', 'human'],
    business: ['business', 'office', 'work', 'meeting', 'corporate', 'professional', 'company', 'startup'],
    food: ['food', 'meal', 'restaurant', 'cooking', 'kitchen', 'chef', 'recipe', 'dish', 'cuisine'],
    travel: ['travel', 'vacation', 'trip', 'journey', 'adventure', 'tourism', 'destination', 'explore'],
    sports: ['sports', 'athlete', 'game', 'competition', 'fitness', 'exercise', 'workout', 'training']
  };
  
  // Initialize result object
  const result = {};
  
  // Check each category
  for (const [category, categoryKeywords] of Object.entries(categories)) {
    // Check if any keyword matches this category
    result[category] = keywords.some(keyword => 
      categoryKeywords.includes(keyword.toLowerCase())
    );
  }
  
  return result;
}

module.exports = {
  extractKeywords,
  categorizeKeywords
};
