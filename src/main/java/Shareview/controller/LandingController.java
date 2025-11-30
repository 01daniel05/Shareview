package Shareview.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LandingController {
    @GetMapping("/")
    public String Landing() {
        return "index";
    }
    @GetMapping("/main-feed")
    public String MainFeed() {
        return "main-feed";
    }
    @GetMapping("/admin-dashboard")
    public String AdminDashboard() {
        return "admin-dashboard";
    }
}
