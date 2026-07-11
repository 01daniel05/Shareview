package Shareview.controller;

import Shareview.service.PostService;
import Shareview.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final PostService postService;

    public UserController(UserService userService, PostService postService) {
        this.userService = userService;
        this.postService = postService;
    }
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody Map<String, String> updates) {
        return userService.updateUser(userId, updates);
    }
    @GetMapping("/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId) {
        return userService.getUserById(userId);
    }

    @GetMapping("/{userId}/posts")
    public ResponseEntity<?> getUserPosts(@PathVariable Long userId) {
        return postService.getUserPosts(userId);
    }

    @GetMapping("/{userId}/saved-posts")
    public ResponseEntity<?> getSavedPosts(@PathVariable Long userId) {
        return postService.getSavedPosts(userId);
    }

    @GetMapping("/{userId}/liked-posts")
    public ResponseEntity<?> getLikedPosts(@PathVariable Long userId) {
        return postService.getLikedPosts(userId);
    }
}
