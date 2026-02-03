const KLMapper = require('./klMapper');
const COMapper = require('./coMapper');
const CourseOutcome = require('../models/CourseOutcome');

class NLPService {
  
  // Main function to analyze question
  static async analyzeQuestion(questionText, courseId) {
    try {
      // Step 1: Get KL mapping (Rule-based)
      const klResult = KLMapper.mapKL(questionText);
      
      // Step 2: Get all COs for this course
      const courseOutcomes = await CourseOutcome.findAll({
        where: { CourseId: courseId }
      });
      
      if (courseOutcomes.length === 0) {
        throw new Error('No course outcomes found for this course');
      }
      
      // Step 3: Get CO mapping (AI-based)
      const coResult = await COMapper.mapCO(questionText, courseOutcomes);
      
      // Step 4: Return combined results
      return {
        question: questionText,
        kl: {
          level: klResult.level,
          verb: klResult.verb,
          confidence: klResult.confidence,
          method: 'Rule-based'
        },
        co: {
          number: coResult.co,
          id: coResult.coId,
          description: coResult.coDescription,
          confidence: coResult.confidence,
          matchedKeywords: coResult.matchedKeywords,
          method: 'AI Similarity-based'
        }
      };
      
    } catch (error) {
      console.error('Error in NLP analysis:', error);
      throw error;
    }
  }
}

module.exports = NLPService;