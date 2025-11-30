package Shareview.controller;

import Shareview.service.CommentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<?> getCommentsByPost(@PathVariable Long postId) {
        return commentService.getCommentsByPost(postId);
    }

    @PostMapping("/post/{postId}")
    public ResponseEntity<?> addComment(
            @PathVariable Long postId,
            @RequestBody Map<String, String> request) {
        String content = request.get("content");
        Long userId = Long.parseLong(request.get("userId"));
        return commentService.addComment(postId, userId, content);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId) {
        return commentService.deleteComment(commentId);
    }
}