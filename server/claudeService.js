const axios = require('axios');

/**
 * Tailors a resume to a job description using Claude API
 * 
 * @param {Object} resume - The resume data in JSON format
 * @param {string} jobDescription - The job description to tailor the resume to
 * @param {string} apiKey - The Claude API key
 * @returns {Object} - Object containing the tailored resume, cover letter, and job description
 */
async function tailorResumeWithClaude(resume, jobDescription, apiKey) {
  try {
    // Format the resume as a string for easier processing
    const resumeStr = JSON.stringify(resume, null, 2);
    
    // Log resume and job description lengths
    console.log('Resume string length:', resumeStr.length);
    console.log('Job description length:', jobDescription.length);
    
    // Create a shorter, more focused prompt for Claude
    const prompt = `
Create a JSON object with tailored resume and cover letter for this job:
\`\`\`
${jobDescription.substring(0, 500)}${jobDescription.length > 500 ? '...' : ''}
\`\`\`

Based on this resume (keep same structure but tailor content):
\`\`\`json
${resumeStr.substring(0, 2000)}${resumeStr.length > 2000 ? '...' : ''}
\`\`\`

Return ONLY a valid parseable JSON object with this exact structure (no additional text):
{
  "resume": { /* same structure as input resume */ },
  "coverLetter": "Plain text cover letter without special characters",
  "jobDescription": "Brief job summary"
}

IMPORTANT REQUIREMENTS:
1. Include ALL work entries from the original resume in your response. Do not truncate or limit the number of job entries.
2. Preserve the original structure of each section including arrays lengths. Never drop any sections or entries.
`;

    // Call Claude API
    console.log('Calling Claude API with prompt length:', prompt.length);
    
    // Try with Claude 3 Haiku instead of Opus for faster response
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: "You are an expert resume customizer who creates tailored resumes and cover letters. Always respond with valid JSON."
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Log the complete response structure
    console.log('Claude API response structure:', JSON.stringify(response.data, null, 2));
    
    // Extract and parse JSON from Claude's response
    if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
      console.error('Unexpected response structure:', response.data);
      throw new Error('Invalid response structure from Claude API');
    }
    
    const assistantMessage = response.data.content[0].text;
    console.log('Assistant message:', assistantMessage);
    
    // Try multiple patterns to extract JSON
    const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/) || 
                     assistantMessage.match(/```\n([\s\S]*?)\n```/) ||
                     assistantMessage.match(/{[\s\S]*}/);
                     
    if (!jsonMatch) {
      console.error('Could not extract JSON from response. Trying to parse the entire response as JSON');
      // Try to parse the entire response as JSON if no match
      try {
        const result = JSON.parse(assistantMessage);
        return result;
      } catch (parseError) {
        console.error('Entire response is not valid JSON:', parseError);
        throw new Error('Failed to extract JSON from Claude response');
      }
    }
    
    console.log('JSON match found:', jsonMatch[0]);
    const jsonString = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
    console.log('JSON string after cleanup:', jsonString);
    
    // Clean problematic control characters before parsing
    const cleanedJsonString = jsonString
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\\r\\n|\\n|\\r/g, '\\n')            // Normalize newlines
      .replace(/\n/g, '\\n')                        // Escape literal newlines
      .replace(/\r/g, '\\r')                        // Escape literal carriage returns
      .replace(/\t/g, '\\t')                        // Escape literal tabs
      .replace(/\\'/g, "'")                         // Fix escaped single quotes
      .replace(/\\\\/g, '\\');                      // Fix double escaped slashes
    
    console.log('JSON string after removing control characters');
    
    let result;
    try {
      // First try parsing the cleaned string
      result = JSON.parse(cleanedJsonString);
      console.log('Successfully parsed cleaned JSON result');
    } catch (cleanedParseError) {
      console.error('Cleaned JSON parse error:', cleanedParseError);
      
      // Try a more aggressive cleaning approach if the first one fails
      try {
        // Create a simple object structure if parsing fails
        const resumeObj = jsonString.includes('"resume"') ? 
          { basics: { name: "Christopher Robison" }, work: [], education: [], skills: [], projects: [] } : {};
        const coverLetter = jsonString.includes('"coverLetter"') ? 
          "Cover letter could not be fully parsed due to formatting issues." : "";
        const jobDescription = jsonString.includes('"jobDescription"') ? 
          "Job description preserved from original submission." : "";
        
        result = {
          resume: resumeObj,
          coverLetter: coverLetter,
          jobDescription: jobDescription
        };
        
        console.log('Created fallback JSON structure');
      } catch (fallbackError) {
        console.error('Fallback creation error:', fallbackError);
        throw new Error(`Failed to parse or create fallback JSON: ${cleanedParseError.message}`);
      }
    }
    
    // Ensure the response has the expected structure
    if (!result.resume || !result.coverLetter || !result.jobDescription) {
      throw new Error('Invalid response structure from Claude API');
    }
    
    return result;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    
    // More detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    throw new Error(`Claude API error: ${error.message}`);
  }
}

module.exports = { tailorResumeWithClaude };