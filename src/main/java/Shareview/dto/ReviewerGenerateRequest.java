package Shareview.dto;

import lombok.Data;

@Data  // ✅ This generates all getters, setters, toString, equals, hashCode
public class ReviewerGenerateRequest {
    private String type;
    private String sourceText;
    private String difficulty;
    private Integer count;
    private String style;
    
    // ✅ New fields for Cloudinary
    private String sourceFileUrl;
    private String sourceFileName;
    private String sourceFileType;
}