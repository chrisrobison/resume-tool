const axios = require('axios');

/**
 * Tailors a resume to a job description using ChatGPT API
 * 
 * @param {Object} resume - The resume data in JSON format
 * @param {string} jobDescription - The job description to tailor the resume to
 * @param {string} apiKey - The OpenAI API key
 * @returns {Object} - Object containing the tailored resume, cover letter, and job description
 */
async function tailorResumeWithChatGPT(resume, jobDescription, apiKey) {
  try {
    // Format the resume as a string for easier processing
    const resumeStr = JSON.stringify(resume, null, 2);
    
    // Create the prompt for ChatGPT
    const messages = [
      {
        role: 'system',
        content: `You are an expert resume and cover letter writer with extensive knowledge of the job market and hiring practices. 
Your task is to tailor a resume to a job description and create a matching cover letter.
Your response must be a valid JSON object containing the tailored resume, cover letter, and original job description.
You must preserve ALL job entries in the work history section of the resume. Do not truncate or limit the number of entries.`
      },
      {
        role: 'user',
        content: `
I need you to tailor a resume and create a matching cover letter for a specific job description.

Here is the resume in JSON format:
\`\`\`json
${resumeStr}
\`\`\`

Here is the job description:
\`\`\`
${jobDescription}
\`\`\`

TASKS:
1. Analyze the job description to identify key requirements, skills, and qualifications.
2. Tailor the resume to highlight relevant experiences and skills that match the job description.
3. Create a personalized cover letter that:
   - Addresses the key requirements of the job
   - Highlights the most relevant experiences from the resume
   - Explains why the candidate is a good fit for the position
   - Uses a professional tone

RESPONSE FORMAT:
Provide your response as a JSON object with the following structure:
{
  "resume": {
    // The tailored resume JSON object (maintaining the original schema)
  },
  "coverLetter": "Full text of the cover letter",
  "jobDescription": "The original job description"
}

IMPORTANT REQUIREMENTS:
1. Include ALL work entries from the original resume in your response. Do not truncate or limit the number of job entries.
2. Preserve the original structure of each section including arrays lengths. Never drop any sections or entries.
3. DO NOT include any explanations outside of the JSON object. The response should be a valid JSON object that can be parsed.`
      }
    ];

    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Extract and parse JSON from ChatGPT's response
    const assistantMessage = response.data.choices[0].message.content;
    let result;
    
    try {
      // Try to parse the entire response as JSON
      result = JSON.parse(assistantMessage);
    } catch (parseError) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = assistantMessage.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/) || 
                        assistantMessage.match(/\`\`\`\n([\s\S]*?)\n\`\`\`/) ||
                        assistantMessage.match(/{[\s\S]*}/);
                        
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from ChatGPT response');
      }
      
      const jsonString = jsonMatch[0].replace(/\`\`\`json\n|\`\`\`\n|\`\`\`/g, '');
      result = JSON.parse(jsonString);
    }
    
    // Ensure the response has the expected structure
    if (!result.resume || !result.coverLetter || !result.jobDescription) {
      throw new Error('Invalid response structure from ChatGPT API');
    }
    
    return result;
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    throw new Error(`ChatGPT API error: ${error.message}`);
  }
}

module.exports = { tailorResumeWithChatGPT };