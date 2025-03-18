const express = require('express');
const router = express.Router();

// Create an in-memory store for chat histories
// In production, you'd use a database instead
const chatSessions = new Map();

router.post('/', async (req, res) => {
  try {
    const { userQuery, sessionId } = req.body;
    if (!userQuery) return res.status(400).json({ error: "User query is required." });
    if (!sessionId) return res.status(400).json({ error: "Session ID is required." });

    // Access services from app.locals
    const { pinecone, hf, genAI } = req.app.locals;

    // Create or retrieve chat history for this session
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, []);
    }
    
    const chatHistory = chatSessions.get(sessionId);

    // Generate embeddings using Hugging Face
    const embeddingResponse = await hf.featureExtraction({
      model: "mixedbread-ai/mxbai-embed-large-v1",
      inputs: userQuery,
    });
    const queryEmbedding = Array.from(embeddingResponse);

    // Query Pinecone for relevant information
    const index = pinecone.index("index-one");
    const queryResponse = await index.namespace("Union-BOI").query({
      topK: 5,
      vector: queryEmbedding,
      includeMetadata: true,
    });

    // Set a threshold for relevance
    const similarityThreshold = 0.60;
    
    // Check if we got meaningful matches
    const hasMeaningfulMatches = queryResponse.matches.length > 0 && 
                                queryResponse.matches[0].score >= similarityThreshold;

    const retrievals = hasMeaningfulMatches
      ? queryResponse.matches.map((match) => match.metadata?.chunk).join("\n\n")
      : "<nomatches>";

    console.log("Relevant Chunks:", retrievals);
    console.log("Top match score:", queryResponse.matches.length > 0 ? queryResponse.matches[0].score : "No matches");
    
    // Format chat history for the prompt
    const formattedHistory = chatHistory.map((entry, index) => 
      `Message ${index + 1}:
User: ${entry.userMessage}
Assistant: ${entry.assistantResponse}`
    ).join("\n\n");
    
    // Define the schema for structured response
    const responseSchema = {
      type: "OBJECT",
      properties: {
        response: {
          type: "STRING",
          description: "The chatbot's response to the user query"
        },
        needsHumanSupport: {
          type: "BOOLEAN",
          description: "Flag indicating if the query requires human assistance"
        }
      },
      required: ["response", "needsHumanSupport"]
    };

    // Configure the model to return JSON
    const structuredModel = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: { 
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
    
    // Construct AI prompt with chat history included
    const finalPrompt = `
**Customer Query:** ${userQuery}
**Relevant Information:** ${retrievals}
${chatHistory.length > 0 ? `\n**Chat History:**\n${formattedHistory}\n` : ''}

You are UVA, a professional banking assistant for the Union Bank of India.

FIRST ANALYZE THE CUSTOMER QUERY AND DETERMINE IF IT NEEDS HUMAN SUPPORT.
Set "needsHumanSupport" to TRUE if the query involves ANY of the following:
- Complex disputes or fraud cases requiring investigation
- High-value transactions or specialized business banking needs
- Requests for personalized financial advice or investment guidance
- Technical issues with the app or website that need technical troubleshooting
- Negotiating loan terms, interest rates, or fee waivers
- Direct requests to speak with a human representative or bank officer
- Loan applications or requests for credit products
- Questions about account-specific information that requires verification
- Requests for services that require in-person identity verification

If none of the above apply, set "needsHumanSupport" to FALSE.

THEN GENERATE A RESPONSE BASED ON THE FOLLOWING CRITERIA:

IF THE CUSTOMER QUERY IS A GENERAL GREETING OR UNRELATED TO BANKING (like "hello", "hi", or introducing themselves):
- Respond with a friendly greeting only
- Do not provide banking information
- Example: "Hello! I'm UVA, your Union Bank of India virtual assistant. How may I help you with your banking needs today?"

IF THE CUSTOMER QUERY IS BANKING-RELATED AND MATCHES THE RETRIEVED INFORMATION:
- Provide a helpful response using the relevant information
- Keep it professional and concise
- If human support is needed, acknowledge this and let them know they will be connected to a representative

IF THE RETRIEVED INFORMATION SHOWS "<nomatches>" OR IS INSUFFICIENT:
- Provide a general response acknowledging their query
- Ask them to specify their banking question
- Do not make up facts

IMPORTANT: In your 'response' field, always provide a well-formatted human-readable text response. 
DO NOT return raw JSON data inside the response field - format any structured information into proper readable text with bullet points, paragraphs, and clear headers as appropriate.

For example, instead of returning:
{"documents":[{"type":"Identity Proof","options":["Aadhaar Card","Passport","Voter ID"]}]}

Return:
To open a savings account, you'll need the following documents:

Identity Proof:
- Aadhaar Card
- Passport 
- Voter ID

Address Proof:
- Utility Bill
- Rent Agreement

Other Documents:
- Passport-sized photographs

IMPORTANT: Look at the chat history (if any) to maintain context from previous messages. Reference previous information when appropriate.

Remember: Only discuss banking information if the customer explicitly asks about banking services.

DO NOT mention "needsHumanSupport" in your response. It should only be used as a flag in the JSON structure.`;

    const result = await structuredModel.generateContent(finalPrompt);
    const responseData = JSON.parse(result.response.text());
    
    // Update chat history with this exchange
    chatHistory.push({
      userMessage: userQuery,
      assistantResponse: responseData.response
    });
    
    // Keep chat history to a reasonable size (last 10 messages)
    if (chatHistory.length > 10) {
      chatHistory.shift();
    }

    res.json({ 
      response: responseData.response,
      needsHumanSupport: responseData.needsHumanSupport,
      sessionId: sessionId  // Return the session ID for future requests
    });
  } catch (error) {
    console.error("Error handling chat request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/clear', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }
    
    // Remove the session from the map
    if (chatSessions.has(sessionId)) {
      chatSessions.delete(sessionId);
      return res.json({ message: "Chat history cleared successfully." });
    } else {
      return res.json({ message: "No chat history found for this session." });
    }
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;