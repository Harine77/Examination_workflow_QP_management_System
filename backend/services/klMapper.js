const compromise = require('compromise');

class KLMapper {

  // Optimized Bloom taxonomy mapping (5 Levels Only)
  static bloomKeywords = {

    // K5 = Evaluate + Create + Design (Merged level)
    K5: {
      primary: [
        'evaluate', 'justify', 'critique', 'assess', 'recommend', 'judge',
        'defend', 'argue', 'validate', 'prioritize',
        'design', 'develop', 'construct', 'formulate', 'create',
        'devise', 'plan', 'build', 'compose', 'generate', 'invent', 'propose', 'architect'
      ],
      phrases: [
        'critically evaluate', 'justify the', 'assess the', 'recommend the',
        'critique the', 'design a', 'develop a', 'create a',
        'formulate a', 'build a', 'propose a', 'construct a'
      ]
    },

    K4: {
      primary: [
        'analyze', 'analyse', 'differentiate', 'distinguish', 'examine',
        'investigate', 'compare', 'contrast', 'categorize', 'decompose'
      ],
      phrases: [
        'compare and contrast', 'differentiate between',
        'distinguish between', 'analyze the', 'examine the'
      ]
    },

    K3: {
      primary: [
        'apply', 'solve', 'demonstrate', 'calculate', 'implement',
        'use', 'execute', 'compute', 'simulate', 'derive', 'show'
      ],
      phrases: [
        'apply the', 'solve the', 'calculate the',
        'implement the', 'demonstrate how', 'compute the'
      ]
    },

    K2: {
      primary: [
        'explain', 'discuss', 'describe', 'summarize', 'interpret',
        'classify', 'elaborate', 'illustrate', 'review'
      ],
      phrases: [
        'explain how', 'explain why', 'describe the', 'discuss the',
        'summarize the', 'interpret the',
        'what is the need for',
        'importance of', 'role of', 'purpose of', 'significance of',
        'why is', 'how does', 'how do'
      ]
    },

    K1: {
      primary: [
        'define', 'list', 'state', 'name', 'identify',
        'recall', 'label', 'recognize'
      ],
      phrases: [
        'define the', 'list the', 'state the', 'name the',
        'identify the', 'what is', 'what are'
      ]
    }
  };

  static extractVerbs(text) {
    const doc = compromise(text);
    return doc.verbs().out('array').map(v => v.toLowerCase());
  }

  static normalize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static mapKL(questionText) {
    const rawText = questionText;
    const text = this.normalize(questionText);
    const verbs = this.extractVerbs(rawText);

    // Priority order (highest cognitive level first)
    const levels = ['K5', 'K4', 'K3', 'K2', 'K1'];

    for (const level of levels) {
      const { primary, phrases } = this.bloomKeywords[level];

      // Phrase-level detection
      for (const phrase of phrases) {
        if (text.includes(phrase)) {
          return {
            level,
            verb: phrase,
            confidence: 96,
            method: 'Semantic phrase match'
          };
        }
      }

      // Keyword detection
      for (const kw of primary) {
        const regex = new RegExp(`(^|\\s)${kw}(\\s|$)`, 'i');
        if (regex.test(text)) {
          return {
            level,
            verb: kw,
            confidence: 90,
            method: 'Action verb match'
          };
        }
      }

      // NLP fallback
      for (const v of verbs) {
        if (primary.includes(v)) {
          return {
            level,
            verb: v,
            confidence: 85,
            method: 'NLP verb match'
          };
        }
      }
    }

    // Structural reasoning rules
    if (
      text.includes('need for') ||
      text.includes('importance of') ||
      text.includes('role of') ||
      text.includes('purpose of') ||
      text.includes('significance of')
    ) {
      return {
        level: 'K2',
        verb: 'explain',
        confidence: 88,
        method: 'Conceptual intent rule'
      };
    }

    if (text.startsWith('why')) {
      return {
        level: 'K2',
        verb: 'explain',
        confidence: 85,
        method: 'Why-question reasoning'
      };
    }

    if (text.startsWith('how')) {
      return {
        level: 'K2',
        verb: 'explain',
        confidence: 80,
        method: 'How-question pattern'
      };
    }

    // Pure definitional detection
    if (
      (text.startsWith('what is') || text.startsWith('what are')) &&
      (text.includes('definition') || text.includes('mean by') || text.includes('define'))
    ) {
      return {
        level: 'K1',
        verb: 'define',
        confidence: 80,
        method: 'Pure definition pattern'
      };
    }

    // Fallback
    return {
      level: 'K1',
      verb: 'undetected',
      confidence: 45,
      method: 'Heuristic fallback'
    };
  }
}

module.exports = KLMapper;
