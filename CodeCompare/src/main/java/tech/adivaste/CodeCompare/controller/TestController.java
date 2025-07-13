package tech.adivaste.CodeCompare.controller;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    @GetMapping("/health")
    public Map<String, Object> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("application", "CodeCompare");
        response.put("version", "1.0.0");
        return response;
    }

    @GetMapping("/hello")
    public Map<String, String> hello() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello from CodeCompare API!");
        response.put("timestamp", LocalDateTime.now().toString());
        return response;
    }

    @GetMapping("/hello/{name}")
    public Map<String, String> helloWithName(@PathVariable String name) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hello " + name + " from CodeCompare API!");
        response.put("timestamp", LocalDateTime.now().toString());
        return response;
    }

    @PostMapping("/echo")
    public Map<String, Object> echo(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        response.put("received", request);
        response.put("timestamp", LocalDateTime.now());
        response.put("echo", "Your data has been received successfully!");
        return response;
    }

    @GetMapping("/info")
    public Map<String, Object> getInfo() {
        Map<String, Object> response = new HashMap<>();
        response.put("application", "CodeCompare");
        response.put("description", "Salesforce Code Compare Tool");
        response.put("version", "0.0.1-SNAPSHOT");
        response.put("javaVersion", System.getProperty("java.version"));
        response.put("timestamp", LocalDateTime.now());
        return response;
    }
} 