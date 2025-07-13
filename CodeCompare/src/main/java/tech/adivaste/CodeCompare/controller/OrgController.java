package tech.adivaste.CodeCompare.controller;

import tech.adivaste.CodeCompare.model.Org;
import tech.adivaste.CodeCompare.service.OrgService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/org")
@CrossOrigin(origins = "*")
public class OrgController {
    
    private static final Logger logger = LoggerFactory.getLogger(OrgController.class);
    
    @Autowired
    private OrgService orgService;
    
    /**
     * Check if SFDX is available
     */
    @GetMapping("/sfdx-status")
    public ResponseEntity<Map<String, Object>> getSfdxStatus() {
        Map<String, Object> response = new HashMap<>();
        boolean isAvailable = orgService.isSfdxAvailable();
        
        response.put("sfdxAvailable", isAvailable);
        response.put("message", isAvailable ? "SFDX CLI is available" : "SFDX CLI is not available");
        response.put("timestamp", java.time.LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * List all connected Salesforce orgs
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> listConnectedOrgs() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Org> orgs = orgService.listConnectedOrgs();
            response.put("orgs", orgs);
            response.put("count", orgs.size());
            response.put("message", "Successfully retrieved connected orgs");
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error listing connected orgs: {}", e.getMessage());
            response.put("error", "Failed to list connected orgs: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Connect to a Salesforce org
     */
    @PostMapping("/connect")
    public ResponseEntity<Map<String, Object>> connectToOrg(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        String orgAlias = request.get("orgAlias");
        String instanceUrl = request.get("instanceUrl");
        
        if (orgAlias == null || instanceUrl == null) {
            response.put("error", "orgAlias and instanceUrl are required");
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            logger.info("Connecting to org: {} with instance: {}", orgAlias, instanceUrl);
            
            CompletableFuture<Org> orgFuture = orgService.connectAndSetupOrg(orgAlias, instanceUrl);
            
            // For now, we'll wait for the result. In production, you might want to make this async
            Org org = orgFuture.get();
            
            if (org != null) {
                response.put("org", org);
                response.put("message", "Successfully connected to org: " + orgAlias);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.ok(response);
            } else {
                response.put("error", "Failed to connect to org: " + orgAlias);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.internalServerError().body(response);
            }
        } catch (Exception e) {
            logger.error("Error connecting to org {}: {}", orgAlias, e.getMessage());
            response.put("error", "Failed to connect to org: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get org information by alias
     */
    @GetMapping("/{orgAlias}")
    public ResponseEntity<Map<String, Object>> getOrgInfo(@PathVariable String orgAlias) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Org org = orgService.getOrgInfo(orgAlias);
            
            if (org != null) {
                response.put("org", org);
                response.put("message", "Successfully retrieved org info");
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.ok(response);
            } else {
                response.put("error", "Org not found: " + orgAlias);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error getting org info for {}: {}", orgAlias, e.getMessage());
            response.put("error", "Failed to get org info: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Check if org is connected
     */
    @GetMapping("/{orgAlias}/status")
    public ResponseEntity<Map<String, Object>> getOrgStatus(@PathVariable String orgAlias) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            boolean isConnected = orgService.isOrgConnected(orgAlias);
            boolean repoExists = orgService.repositoryExists(orgAlias);
            String currentBranch = orgService.getCurrentBranch(orgAlias);
            
            response.put("orgAlias", orgAlias);
            response.put("isConnected", isConnected);
            response.put("repositoryExists", repoExists);
            response.put("currentBranch", currentBranch);
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting org status for {}: {}", orgAlias, e.getMessage());
            response.put("error", "Failed to get org status: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Setup complete org with all branches and metadata
     */
    @PostMapping("/{orgAlias}/setup")
    public ResponseEntity<Map<String, Object>> setupCompleteOrg(
            @PathVariable String orgAlias,
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        String instanceUrl = request.get("instanceUrl");
        String metadataTypes = request.getOrDefault("metadataTypes", "ApexClass,ApexTrigger,CustomObject,Layout,Profile");
        
        if (instanceUrl == null) {
            response.put("error", "instanceUrl is required");
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            logger.info("Setting up complete org: {} with instance: {}", orgAlias, instanceUrl);
            
            boolean success = orgService.setupCompleteOrg(orgAlias, instanceUrl, metadataTypes);
            
            if (success) {
                response.put("message", "Successfully setup complete org: " + orgAlias);
                response.put("orgAlias", orgAlias);
                response.put("metadataTypes", metadataTypes);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.ok(response);
            } else {
                response.put("error", "Failed to setup complete org: " + orgAlias);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.internalServerError().body(response);
            }
        } catch (Exception e) {
            logger.error("Error setting up complete org {}: {}", orgAlias, e.getMessage());
            response.put("error", "Failed to setup complete org: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Retrieve metadata for a specific branch
     */
    @PostMapping("/{orgAlias}/retrieve")
    public ResponseEntity<Map<String, Object>> retrieveMetadata(
            @PathVariable String orgAlias,
            @RequestBody Map<String, String> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        String branchName = request.get("branchName");
        String metadataTypes = request.getOrDefault("metadataTypes", "ApexClass,ApexTrigger,CustomObject,Layout,Profile");
        
        if (branchName == null) {
            response.put("error", "branchName is required");
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            logger.info("Retrieving metadata for org: {} branch: {}", orgAlias, branchName);
            
            boolean success = orgService.retrieveMetadataForBranch(orgAlias, branchName, metadataTypes);
            
            if (success) {
                response.put("message", "Successfully retrieved metadata for org: " + orgAlias + " branch: " + branchName);
                response.put("orgAlias", orgAlias);
                response.put("branchName", branchName);
                response.put("metadataTypes", metadataTypes);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.ok(response);
            } else {
                response.put("error", "Failed to retrieve metadata for org: " + orgAlias + " branch: " + branchName);
                response.put("timestamp", java.time.LocalDateTime.now());
                return ResponseEntity.internalServerError().body(response);
            }
        } catch (Exception e) {
            logger.error("Error retrieving metadata for org {} branch {}: {}", orgAlias, branchName, e.getMessage());
            response.put("error", "Failed to retrieve metadata: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * Get repository files
     */
    @GetMapping("/{orgAlias}/files")
    public ResponseEntity<Map<String, Object>> getRepositoryFiles(@PathVariable String orgAlias) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<String> files = orgService.getRepositoryFiles(orgAlias);
            
            response.put("orgAlias", orgAlias);
            response.put("files", files);
            response.put("count", files.size());
            response.put("message", "Successfully retrieved repository files");
            response.put("timestamp", java.time.LocalDateTime.now());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting repository files for {}: {}", orgAlias, e.getMessage());
            response.put("error", "Failed to get repository files: " + e.getMessage());
            response.put("timestamp", java.time.LocalDateTime.now());
            return ResponseEntity.internalServerError().body(response);
        }
    }
} 