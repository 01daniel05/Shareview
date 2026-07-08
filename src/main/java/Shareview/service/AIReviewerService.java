package Shareview.service;

import Shareview.dto.ReviewerGenerateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Service
public class AIReviewerService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model}")
    private String model;

    public Object generateReviewer(ReviewerGenerateRequest request) throws Exception {
        String prompt = buildPrompt(request);

        Map<String, Object> body = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        String jsonBody = objectMapper.writeValueAsString(body);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent?key="
                + apiKey;

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(
                httpRequest,
                HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("AI generation failed: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String text = root
                .path("candidates")
                .get(0)
                .path("content")
                .path("parts")
                .get(0)
                .path("text")
                .asText();

        text = cleanJsonText(text);

        return objectMapper.readValue(text, Object.class);
    }

    private String buildPrompt(ReviewerGenerateRequest request) {
        int count = request.getCount() == null ? 10 : request.getCount();
        String style = request.getStyle() == null ? "conceptual" : request.getStyle().toLowerCase();

        if ("quiz".equalsIgnoreCase(request.getType())) {
            return """
                    Create a quiz reviewer from the notes below.

                    Requirements:
                    - Difficulty: %s
                    - Number of questions: %d
                    - Return ONLY valid JSON.
                    - JSON must be an array.
                    - Each item must have:
                      question, options, correctAnswer, explanation
                    - options must contain A, B, C, D.
                    - correctAnswer must be A, B, C, or D.

                    %s

                    Notes:
                    %s
                    """.formatted(
                    request.getDifficulty(),
                    count,
                    getQuizStyleInstructions(style),
                    request.getSourceText()
            );
        }

        return """
                Create flashcards from the notes below.

                Requirements:
                - Difficulty: %s
                - Number of flashcards: %d
                - Return ONLY valid JSON.
                - JSON must be an array.
                - Each item must have:
                  question, answer

                %s

                Notes:
                %s
                """.formatted(
                request.getDifficulty(),
                count,
                getFlashcardStyleInstructions(style),
                request.getSourceText()
        );
    }

    private String getFlashcardStyleInstructions(String style) {
        switch (style) {
            case "definition":
                return """
                        Style: DEFINITION FOCUSED.
                        - Every question must ask "What is X?" or "Define X."
                        - The answer must be ONE formal, precise, textbook-style definition sentence.
                        - Do NOT include extra context, examples, or elaboration in the answer.
                        - Prioritize key terms, vocabulary, and named concepts from the notes.
                        """;
            case "exam":
                return """
                        Style: EXAM STYLE.
                        - Phrase questions the way a professor would phrase them on a written exam
                          (e.g. "Explain the significance of...", "Compare X and Y", "What happens when...").
                        - Answers should be exam-answer length: 1-3 sentences, precise and to the point,
                          written the way a strong student would answer to earn full marks.
                        - Favor application and cause-and-effect questions over simple recall.
                        """;
            case "identification":
                return """
                        Style: IDENTIFICATION.
                        - Questions should describe a concept, process, or characteristic and ask the reader
                          to identify/name it (e.g. "This process converts light energy into chemical energy.").
                        - The answer field must be ONLY the key term or short phrase being identified —
                          MAXIMUM 5 words. Do NOT write a full sentence or explanation in the answer.
                        - Example answer format: "Photosynthesis", "Mitochondria", "Newton's Second Law".
                        """;
            case "conceptual":
            default:
                return """
                        Style: CONCEPTUAL.
                        - Questions should probe understanding of relationships, causes, and "why/how"
                          (e.g. "Why does X lead to Y?", "How does X relate to Y?").
                        - Answers can be 1-3 sentences that explain reasoning, not just facts.
                        - Focus on connecting ideas together rather than isolated definitions.
                        """;
        }
    }

    private String getQuizStyleInstructions(String style) {
        switch (style) {
            case "definition":
                return """
                        Style: DEFINITION FOCUSED.
                        - Question stems should ask directly for the definition or meaning of a term
                          (e.g. "What is the definition of X?").
                        - The correct option and all distractor options should be short definition-style
                          phrases, not full sentences or scenarios.
                        - The "explanation" field should state the formal definition in one sentence.
                        """;
            case "exam":
                return """
                        Style: EXAM STYLE.
                        - Question stems should read like a formal exam question, testing application or
                          analysis (e.g. "Which of the following best explains why...", "A student observes
                          X; which principle explains this?").
                        - Distractor options must be plausible misconceptions, not random unrelated text.
                        - The "explanation" field should briefly justify why the correct answer is right
                          and why the closest distractor is wrong.
                        """;
            case "identification":
                return """
                        Style: IDENTIFICATION.
                        - Question stems should describe a concept/process/structure and ask the reader to
                          identify what it is (e.g. "This organelle produces energy for the cell. What is it?").
                        - All four options (A-D) must be short terms/names only — MAXIMUM 4 words each.
                          Do NOT use full-sentence options.
                        - The "explanation" field should briefly state why that term matches the description.
                        """;
            case "conceptual":
            default:
                return """
                        Style: CONCEPTUAL.
                        - Question stems should test understanding of relationships and reasoning
                          (e.g. "Why does X cause Y?", "What would happen if X changed?").
                        - Options may be short phrases or brief statements, not single words.
                        - The "explanation" field should explain the underlying reasoning, not just restate
                          the correct option.
                        """;
        }
    }

    private String cleanJsonText(String text) {
        return text
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }
}