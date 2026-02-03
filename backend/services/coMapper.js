const natural = require('natural');
const compromise = require('compromise');

class COMapper {
  
  // Extract important keywords from question
  static extractKeywords(questionText) {
    const doc = compromise(questionText);
    
    // Extract nouns and noun phrases
    const nouns = doc.nouns().out('array');
    const topics = doc.topics().out('array');
    
    // Combine and clean
    const keywords = [...new Set([...nouns, ...topics])]
      .map(k => k.toLowerCase())
      .filter(k => k.length > 2);  // Remove very short words
    
    return keywords;
  }

  // Calculate similarity between two texts using TF-IDF
  static calculateSimilarity(text1, text2) {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    
    tfidf.addDocument(text1.toLowerCase());
    tfidf.addDocument(text2.toLowerCase());
    
    // Get common terms
    const terms1 = text1.toLowerCase().split(/\s+/);
    const terms2 = text2.toLowerCase().split(/\s+/);
    
    // Calculate Jaccard similarity (simple but effective)
    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const similarity = intersection.size / union.size;
    
    return similarity;
  }

  // Map question to Course Outcome
  static async mapCO(questionText, courseOutcomes) {
    const questionKeywords = this.extractKeywords(questionText);
    
    let bestMatch = null;
    let maxScore = 0;
    
    // Compare question with each CO's keywords
    for (const co of courseOutcomes) {
      let score = 0;
      
      // Method 1: Keyword matching
      for (const qKeyword of questionKeywords) {
        for (const coKeyword of co.keywords) {
          if (coKeyword.toLowerCase().includes(qKeyword) || 
              qKeyword.includes(coKeyword.toLowerCase())) {
            score += 2;  // Exact match bonus
          }
        }
      }
      
      // Method 2: Similarity between question and CO description
      const similarity = this.calculateSimilarity(
        questionText, 
        co.description + ' ' + co.keywords.join(' ')
      );
      
      score += similarity * 10;  // Weight similarity score
      
      if (score > maxScore) {
        maxScore = score;
        bestMatch = co;
      }
    }
    
    // Calculate confidence percentage
    const confidence = Math.min(60 + (maxScore * 5), 95);
    
    return {
      co: bestMatch ? bestMatch.coNumber : 'CO1',
      coId: bestMatch ? bestMatch.id : null,
      coDescription: bestMatch ? bestMatch.description : '',
      confidence: Math.round(confidence),
      matchedKeywords: questionKeywords
    };
  }
}

module.exports = COMapper;