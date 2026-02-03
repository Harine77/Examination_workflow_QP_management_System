const compromise = require('compromise');

class KLMapper {
  
  // Rule-based Bloom's taxonomy keyword mapping
  static bloomKeywords = {
    K1: ['define', 'list', 'state', 'name', 'label', 'recall', 'identify', 'describe', 'what is', 'who is', 'when', 'where'],
    K2: ['explain', 'discuss', 'summarize', 'interpret', 'compare', 'classify', 'give example', 'illustrate', 'describe how', 'why'],
    K3: ['apply', 'solve', 'demonstrate', 'calculate', 'implement', 'use', 'execute', 'compute', 'show', 'find'],
    K4: ['analyze', 'differentiate', 'distinguish', 'examine', 'break down', 'investigate', 'compare and contrast', 'categorize'],
    K5: ['evaluate', 'justify', 'critique', 'assess', 'recommend', 'argue', 'judge', 'defend', 'support'],
    K6: ['design', 'develop', 'construct', 'formulate', 'create', 'devise', 'plan', 'build', 'compose', 'generate']
  };

  // Extract verbs from question using compromise
  static extractVerbs(questionText) {
    const doc = compromise(questionText);
    const verbs = doc.verbs().out('array');
    return verbs.map(v => v.toLowerCase());
  }

  // Map question to Bloom's level
  static mapKL(questionText) {
    const text = questionText.toLowerCase();
    const verbs = this.extractVerbs(questionText);
    
    let detectedLevel = 'K1';
    let detectedVerb = '';
    let confidence = 50;

    // Check for exact keyword matches first
    for (const [level, keywords] of Object.entries(this.bloomKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detectedLevel = level;
          detectedVerb = keyword;
          confidence = 90;
          return { level: detectedLevel, verb: detectedVerb, confidence };
        }
      }
    }

    // If no exact match, check extracted verbs
    for (const verb of verbs) {
      for (const [level, keywords] of Object.entries(this.bloomKeywords)) {
        if (keywords.includes(verb)) {
          detectedLevel = level;
          detectedVerb = verb;
          confidence = 75;
          return { level: detectedLevel, verb: detectedVerb, confidence };
        }
      }
    }

    // Default to K1 with low confidence
    return { level: 'K1', verb: 'not detected', confidence: 40 };
  }
}

module.exports = KLMapper;