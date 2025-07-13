package com.salesforce.codecompare.controller;

import com.salesforce.codecompare.model.CompareRequest;
import com.salesforce.codecompare.model.CompareResponse;
import com.salesforce.codecompare.model.DiffResult;
import com.salesforce.codecompare.model.FileContent;
import tech.adivaste.CodeCompare.service.GitService;
import tech.adivaste.CodeCompare.service.SfdxService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/compare")
@CrossOrigin(origins = "*")
public class CompareController {

    @Autowired
    private GitService gitService;

    @Autowired
    private SfdxService sfdxService;

    /**
     * Get directory structure comparison between two branches
     */
    @GetMapping("/structure")
    public ResponseEntity<CompareResponse> compareStructure(
            @RequestParam String orgPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch) {
        
        try {

            System.out.println("Comparing structure between " + sourceBranch + " and " + targetBranch + " for org " + orgPath);
            Path orgDirectory = Paths.get(orgPath);
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + orgPath));
            }

            // Get file lists from both branches
            List<String> sourceFiles = gitService.getFileList(orgDirectory, sourceBranch);
            List<String> targetFiles = gitService.getFileList(orgDirectory, targetBranch);

            // Find differences
            Set<String> sourceSet = new HashSet<>(sourceFiles);
            Set<String> targetSet = new HashSet<>(targetFiles);

            List<String> added = targetFiles.stream()
                .filter(file -> !sourceSet.contains(file))
                .collect(Collectors.toList());

            List<String> removed = sourceFiles.stream()
                .filter(file -> !targetSet.contains(file))
                .collect(Collectors.toList());

            List<String> common = sourceFiles.stream()
                .filter(targetSet::contains)
                .collect(Collectors.toList());

            Map<String, Object> structure = new HashMap<>();
            structure.put("added", added);
            structure.put("removed", removed);
            structure.put("common", common);
            structure.put("sourceCount", sourceFiles.size());
            structure.put("targetCount", targetFiles.size());

            return ResponseEntity.ok(CompareResponse.success(structure));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error comparing structure: " + e.getMessage()));
        }
    }

    /**
     * Get diff between two branches for a specific file
     */
    @GetMapping("/diff")
    public ResponseEntity<CompareResponse> getDiff(
            @RequestParam String orgPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch,
            @RequestParam(required = false) String filePath) {
        
        try {
            Path orgDirectory = Paths.get(orgPath);
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + orgPath));
            }

            if (filePath != null && !filePath.isEmpty()) {
                // Single file diff
                DiffResult diff = gitService.getFileDiff(orgDirectory, sourceBranch, targetBranch, filePath);
                return ResponseEntity.ok(CompareResponse.success(diff));
            } else {
                // Full diff
                List<DiffResult> diffs = gitService.getAllDiffs(orgDirectory, sourceBranch, targetBranch);
                return ResponseEntity.ok(CompareResponse.success(diffs));
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting diff: " + e.getMessage()));
        }
    }

    /**
     * Get file content from a specific branch
     */
    @GetMapping("/content")
    public ResponseEntity<CompareResponse> getFileContent(
            @RequestParam String orgPath,
            @RequestParam String branch,
            @RequestParam String filePath) {
        
        try {
            Path orgDirectory = Paths.get(orgPath);
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + orgPath));
            }

            FileContent content = gitService.getFileContent(orgDirectory, branch, filePath);
            return ResponseEntity.ok(CompareResponse.success(content));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting file content: " + e.getMessage()));
        }
    }

    /**
     * Comprehensive comparison with diff2html integration
     */
    @PostMapping("/comprehensive")
    public ResponseEntity<CompareResponse> comprehensiveCompare(@RequestBody CompareRequest request) {
        
        try {
            Path orgDirectory = Paths.get(request.getOrgPath());
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + request.getOrgPath()));
            }

            Map<String, Object> result = new HashMap<>();
            
            // 1. Directory structure comparison
            List<String> sourceFiles = gitService.getFileList(orgDirectory, request.getSourceBranch());
            List<String> targetFiles = gitService.getFileList(orgDirectory, request.getTargetBranch());
            
            Set<String> sourceSet = new HashSet<>(sourceFiles);
            Set<String> targetSet = new HashSet<>(targetFiles);

            List<String> added = targetFiles.stream()
                .filter(file -> !sourceSet.contains(file))
                .collect(Collectors.toList());

            List<String> removed = sourceFiles.stream()
                .filter(file -> !targetSet.contains(file))
                .collect(Collectors.toList());

            List<String> common = sourceFiles.stream()
                .filter(targetSet::contains)
                .collect(Collectors.toList());

            // 2. Get diffs for common files
            List<DiffResult> diffs = new ArrayList<>();
            for (String file : common) {
                try {
                    DiffResult diff = gitService.getFileDiff(orgDirectory, request.getSourceBranch(), request.getTargetBranch(), file);
                    if (diff != null && diff.getDiffText() != null && !diff.getDiffText().trim().isEmpty()) {
                        diffs.add(diff);
                    }
                } catch (Exception e) {
                    // Skip files that can't be diffed
                    System.err.println("Could not diff file: " + file + " - " + e.getMessage());
                }
            }

            // 3. Generate diff2html JSON
            String diff2htmlJson = generateDiff2HtmlJson(diffs, request.getSourceBranch(), request.getTargetBranch());

            // 4. Build comprehensive result
            result.put("structure", Map.of(
                "added", added,
                "removed", removed,
                "common", common,
                "sourceCount", sourceFiles.size(),
                "targetCount", targetFiles.size()
            ));
            
            result.put("diffs", diffs);
            result.put("diff2html", diff2htmlJson);
            result.put("summary", Map.of(
                "totalFiles", sourceFiles.size() + targetFiles.size(),
                "changedFiles", diffs.size(),
                "addedFiles", added.size(),
                "removedFiles", removed.size(),
                "unchangedFiles", common.size() - diffs.size()
            ));

            return ResponseEntity.ok(CompareResponse.success(result));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error in comprehensive comparison: " + e.getMessage()));
        }
    }

    /**
     * Get unified directory structure of both branches focusing on force-app
     */
    @GetMapping("/unified-structure")
    public ResponseEntity<CompareResponse> getUnifiedStructure(
            @RequestParam String orgPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch) {
        
        try {
            Path orgDirectory = Paths.get(orgPath);
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + orgPath));
            }

            // Focus on force-app directory
            Path forceAppPath = orgDirectory.resolve("force-app");
            if (!Files.exists(forceAppPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("force-app directory does not exist in: " + orgPath));
            }

            Map<String, Object> result = new HashMap<>();
            
            // Get file lists from both branches (or current directory if not git repo)
            List<String> sourceFiles = getForceAppFiles(forceAppPath, sourceBranch);
            List<String> targetFiles = getForceAppFiles(forceAppPath, targetBranch);
            
            // Create unified structure
            Set<String> allFiles = new HashSet<>();
            allFiles.addAll(sourceFiles);
            allFiles.addAll(targetFiles);
            
            // Categorize files
            List<String> added = targetFiles.stream()
                .filter(file -> !sourceFiles.contains(file))
                .collect(Collectors.toList());

            List<String> removed = sourceFiles.stream()
                .filter(file -> !targetFiles.contains(file))
                .collect(Collectors.toList());

            List<String> common = sourceFiles.stream()
                .filter(targetFiles::contains)
                .collect(Collectors.toList());

            // Group files by metadata type
            Map<String, List<String>> metadataGroups = groupByMetadataType(new ArrayList<>(allFiles));
            Map<String, List<String>> addedGroups = groupByMetadataType(added);
            Map<String, List<String>> removedGroups = groupByMetadataType(removed);
            Map<String, List<String>> commonGroups = groupByMetadataType(common);

            result.put("unifiedStructure", Map.of(
                "allFiles", new ArrayList<>(allFiles),
                "added", added,
                "removed", removed,
                "common", common,
                "sourceCount", sourceFiles.size(),
                "targetCount", targetFiles.size(),
                "totalCount", allFiles.size()
            ));
            
            result.put("metadataGroups", Map.of(
                "all", metadataGroups,
                "added", addedGroups,
                "removed", removedGroups,
                "common", commonGroups
            ));

            return ResponseEntity.ok(CompareResponse.success(result));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting unified structure: " + e.getMessage()));
        }
    }

    /**
     * Get hierarchical union directory structure with status metadata
     */
    @GetMapping("/hierarchical-union")
    public ResponseEntity<CompareResponse> getHierarchicalUnionStructure(
            @RequestParam String orgPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch) {
        
        try {
            Path orgDirectory = Paths.get(orgPath);
            if (!Files.exists(orgDirectory)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Org directory does not exist: " + orgPath));
            }

            Map<String, Object> hierarchicalStructure = buildHierarchicalUnionStructure(orgDirectory, sourceBranch, targetBranch);
            return ResponseEntity.ok(CompareResponse.success(hierarchicalStructure));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting hierarchical union structure: " + e.getMessage()));
        }
    }

    /**
     * Get hierarchical union directory structure using JGit (respects .gitignore)
     */
    @GetMapping("/hierarchical-union-jgit")
    public ResponseEntity<CompareResponse> getHierarchicalUnionJGit(
            @RequestParam String orgPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch) {
        try {
            Path repoPath = Paths.get(orgPath);
            if (!Files.exists(repoPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Repository path does not exist: " + orgPath));
            }
            Map<String, Object> tree = buildHierarchicalUnionJGit(repoPath, sourceBranch, targetBranch);
            return ResponseEntity.ok(CompareResponse.success(tree));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error building JGit hierarchical union: " + e.getMessage()));
        }
    }

    /**
     * Get files from force-app directory, handling both git and non-git scenarios
     */
    private List<String> getForceAppFiles(Path forceAppPath, String branchName) {
        try {
            // First try to get files from git branch
            if (gitService.repositoryExists(forceAppPath.getParent().getFileName().toString(), 
                                          forceAppPath.getParent().getParent().toString())) {
                return gitService.getFileList(forceAppPath.getParent(), branchName)
                    .stream()
                    .filter(file -> file.startsWith("force-app/"))
                    .map(file -> file.substring("force-app/".length()))
                    .collect(Collectors.toList());
            } else {
                // If not a git repo, just get current files
                return Files.walk(forceAppPath)
                    .filter(Files::isRegularFile)
                    .map(path -> forceAppPath.relativize(path).toString())
                    .filter(path -> !path.startsWith(".git"))
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            // Fallback to current directory files
            try {
                return Files.walk(forceAppPath)
                    .filter(Files::isRegularFile)
                    .map(path -> forceAppPath.relativize(path).toString())
                    .filter(path -> !path.startsWith(".git"))
                    .collect(Collectors.toList());
            } catch (IOException ex) {
                return List.of();
            }
        }
    }

    /**
     * Group files by Salesforce metadata type
     */
    private Map<String, List<String>> groupByMetadataType(List<String> files) {
        Map<String, List<String>> groups = new HashMap<>();
        
        for (String file : files) {
            String metadataType = getMetadataType(file);
            groups.computeIfAbsent(metadataType, k -> new ArrayList<>()).add(file);
        }
        
        return groups;
    }

    /**
     * Determine Salesforce metadata type from file path
     */
    private String getMetadataType(String filePath) {
        if (filePath.contains("/classes/")) return "Apex Classes";
        if (filePath.contains("/triggers/")) return "Triggers";
        if (filePath.contains("/pages/")) return "Visualforce Pages";
        if (filePath.contains("/components/")) return "Visualforce Components";
        if (filePath.contains("/layouts/")) return "Page Layouts";
        if (filePath.contains("/objects/")) return "Custom Objects";
        if (filePath.contains("/fields/")) return "Custom Fields";
        if (filePath.contains("/validationRules/")) return "Validation Rules";
        if (filePath.contains("/workflows/")) return "Workflows";
        if (filePath.contains("/flows/")) return "Flows";
        if (filePath.contains("/staticresources/")) return "Static Resources";
        if (filePath.contains("/documents/")) return "Documents";
        if (filePath.contains("/email/")) return "Email Templates";
        if (filePath.contains("/reports/")) return "Reports";
        if (filePath.contains("/dashboards/")) return "Dashboards";
        if (filePath.contains("/profiles/")) return "Profiles";
        if (filePath.contains("/permissionsets/")) return "Permission Sets";
        if (filePath.contains("/tabs/")) return "Custom Tabs";
        if (filePath.contains("/applications/")) return "Custom Applications";
        if (filePath.contains("/queues/")) return "Queues";
        if (filePath.contains("/groups/")) return "Public Groups";
        if (filePath.contains("/roles/")) return "Roles";
        if (filePath.contains("/territories/")) return "Territories";
        if (filePath.contains("/data/")) return "Data";
        if (filePath.contains("/translations/")) return "Translations";
        if (filePath.contains("/siteDotComSites/")) return "Site.com Sites";
        if (filePath.contains("/sites/")) return "Sites";
        if (filePath.contains("/connectedApps/")) return "Connected Apps";
        if (filePath.contains("/authproviders/")) return "Auth Providers";
        if (filePath.contains("/customMetadata/")) return "Custom Metadata";
        if (filePath.contains("/approvalProcesses/")) return "Approval Processes";
        if (filePath.contains("/assignmentRules/")) return "Assignment Rules";
        if (filePath.contains("/autoResponseRules/")) return "Auto Response Rules";
        if (filePath.contains("/escalationRules/")) return "Escalation Rules";
        if (filePath.contains("/matchingRules/")) return "Matching Rules";
        if (filePath.contains("/package.xml")) return "Package";
        if (filePath.contains("/destructiveChangesPost.xml")) return "Destructive Changes";
        if (filePath.contains("/destructiveChangesPre.xml")) return "Destructive Changes";
        if (filePath.contains("/lwc/")) return "Lightning Web Components";
        if (filePath.contains("/aura/")) return "Lightning Components";
        if (filePath.contains("/wave/")) return "Analytics";
        if (filePath.contains("/experiences/")) return "Experience Cloud";
        if (filePath.contains("/bots/")) return "Chatter Bots";
        if (filePath.contains("/knowledge/")) return "Knowledge";
        if (filePath.contains("/settings/")) return "Settings";
        if (filePath.contains("/schemas/")) return "Schemas";
        if (filePath.contains("/templates/")) return "Templates";
        if (filePath.contains("/quickActions/")) return "Quick Actions";
        if (filePath.contains("/flexipages/")) return "Flexi Pages";
        if (filePath.contains("/globalValueSets/")) return "Global Value Sets";
        if (filePath.contains("/standardValueSets/")) return "Standard Value Sets";
        if (filePath.contains("/labels/")) return "Custom Labels";
        if (filePath.contains("/remoteSiteSettings/")) return "Remote Site Settings";
        if (filePath.contains("/corsWhitelistOrigins/")) return "CORS Settings";
        if (filePath.contains("/namedCredentials/")) return "Named Credentials";
        if (filePath.contains("/synonymDictionaries/")) return "Synonym Dictionaries";
        if (filePath.contains("/sharingRules/")) return "Sharing Rules";
        if (filePath.contains("/sharingOwnerRules/")) return "Sharing Owner Rules";
        if (filePath.contains("/sharingCriteriaRules/")) return "Sharing Criteria Rules";
        if (filePath.contains("/sharingGuestRules/")) return "Sharing Guest Rules";
        if (filePath.contains("/sharingTerritoryRules/")) return "Sharing Territory Rules";
        if (filePath.contains("/communities/")) return "Communities";
        if (filePath.contains("/networks/")) return "Networks";
        if (filePath.contains("/brandingSets/")) return "Branding Sets";
        if (filePath.contains("/callCenters/")) return "Call Centers";
        if (filePath.contains("/chatterAnswers/")) return "Chatter Answers";
        if (filePath.contains("/contentassets/")) return "Content Assets";
        if (filePath.contains("/cspTrustedSites/")) return "CSP Trusted Sites";
        if (filePath.contains("/customPermissions/")) return "Custom Permissions";
        if (filePath.contains("/dataSources/")) return "Data Sources";
        if (filePath.contains("/delegatedGroups/")) return "Delegated Groups";
        if (filePath.contains("/eventTypes/")) return "Event Types";
        if (filePath.contains("/externalDataSources/")) return "External Data Sources";
        if (filePath.contains("/fileUploadAndDownloadSecuritySettings/")) return "File Upload Settings";
        if (filePath.contains("/flowCategories/")) return "Flow Categories";
        if (filePath.contains("/groupings/")) return "Groupings";
        if (filePath.contains("/installedPackages/")) return "Installed Packages";
        if (filePath.contains("/keyboards/")) return "Keyboards";
        if (filePath.contains("/liveChatAgents/")) return "Live Chat Agents";
        if (filePath.contains("/liveChatButtons/")) return "Live Chat Buttons";
        if (filePath.contains("/liveChatDeployments/")) return "Live Chat Deployments";
        if (filePath.contains("/liveChatSensitiveDataRule/")) return "Live Chat Sensitive Data Rules";
        if (filePath.contains("/managedTopics/")) return "Managed Topics";
        if (filePath.contains("/matchingRules/")) return "Matching Rules";
        if (filePath.contains("/moderationRules/")) return "Moderation Rules";
        if (filePath.contains("/notificationTypes/")) return "Notification Types";
        if (filePath.contains("/pathAssistants/")) return "Path Assistants";
        if (filePath.contains("/permissionsets/")) return "Permission Sets";
        if (filePath.contains("/postTemplates/")) return "Post Templates";
        if (filePath.contains("/presenceDeclines/")) return "Presence Declines";
        if (filePath.contains("/presenceUserConfigs/")) return "Presence User Configs";
        if (filePath.contains("/profilePasswordPolicies/")) return "Profile Password Policies";
        if (filePath.contains("/profileSessionSettings/")) return "Profile Session Settings";
        if (filePath.contains("/queueRoutingConfigs/")) return "Queue Routing Configs";
        if (filePath.contains("/reportTypes/")) return "Report Types";
        if (filePath.contains("/searchLayouts/")) return "Search Layouts";
        if (filePath.contains("/securitySettings/")) return "Security Settings";
        if (filePath.contains("/servicePresenceStatuses/")) return "Service Presence Statuses";
        if (filePath.contains("/skillTypes/")) return "Skill Types";
        if (filePath.contains("/standardValueSetTranslations/")) return "Standard Value Set Translations";
        if (filePath.contains("/synonymDictionaries/")) return "Synonym Dictionaries";
        if (filePath.contains("/topicsForObjects/")) return "Topics for Objects";
        if (filePath.contains("/weblinks/")) return "Web Links";
        if (filePath.contains("/workflows/")) return "Workflows";
        
        return "Other";
    }

    /**
     * Generate diff2html compatible JSON
     */
    private String generateDiff2HtmlJson(List<DiffResult> diffs, String sourceBranch, String targetBranch) {
        StringBuilder json = new StringBuilder();
        json.append("{\n");
        json.append("  \"diff\": [\n");
        
        for (int i = 0; i < diffs.size(); i++) {
            DiffResult diff = diffs.get(i);
            json.append("    {\n");
            json.append("      \"oldName\": \"").append(diff.getFilePath()).append("\",\n");
            json.append("      \"newName\": \"").append(diff.getFilePath()).append("\",\n");
            json.append("      \"oldHeader\": \"").append(sourceBranch).append("\",\n");
            json.append("      \"newHeader\": \"").append(targetBranch).append("\",\n");
            json.append("      \"hunks\": [\n");
            
            // Parse diff text and convert to hunks
            String[] lines = diff.getDiffText().split("\n");
            List<Map<String, Object>> hunks = parseDiffToHunks(lines);
            
            for (int j = 0; j < hunks.size(); j++) {
                Map<String, Object> hunk = hunks.get(j);
                json.append("        {\n");
                json.append("          \"oldStart\": ").append(hunk.get("oldStart")).append(",\n");
                json.append("          \"oldLines\": ").append(hunk.get("oldLines")).append(",\n");
                json.append("          \"newStart\": ").append(hunk.get("newStart")).append(",\n");
                json.append("          \"newLines\": ").append(hunk.get("newLines")).append(",\n");
                json.append("          \"content\": \"").append(escapeJson(hunk.get("content").toString())).append("\"\n");
                json.append("        }");
                if (j < hunks.size() - 1) json.append(",");
                json.append("\n");
            }
            
            json.append("      ]\n");
            json.append("    }");
            if (i < diffs.size() - 1) json.append(",");
            json.append("\n");
        }
        
        json.append("  ]\n");
        json.append("}");
        
        return json.toString();
    }

    /**
     * Parse diff text into hunks for diff2html
     */
    private List<Map<String, Object>> parseDiffToHunks(String[] lines) {
        List<Map<String, Object>> hunks = new ArrayList<>();
        List<String> currentHunkLines = new ArrayList<>();
        int oldStart = 0, oldLines = 0, newStart = 0, newLines = 0;
        
        for (String line : lines) {
            if (line.startsWith("@@")) {
                // Save previous hunk if exists
                if (!currentHunkLines.isEmpty()) {
                    Map<String, Object> hunk = new HashMap<>();
                    hunk.put("oldStart", oldStart);
                    hunk.put("oldLines", oldLines);
                    hunk.put("newStart", newStart);
                    hunk.put("newLines", newLines);
                    hunk.put("content", String.join("\n", currentHunkLines));
                    hunks.add(hunk);
                    currentHunkLines.clear();
                }
                
                // Parse hunk header
                String[] parts = line.split(" ");
                if (parts.length >= 3) {
                    String[] oldInfo = parts[1].substring(1).split(",");
                    String[] newInfo = parts[2].substring(1).split(",");
                    oldStart = Integer.parseInt(oldInfo[0]);
                    oldLines = oldInfo.length > 1 ? Integer.parseInt(oldInfo[1]) : 1;
                    newStart = Integer.parseInt(newInfo[0]);
                    newLines = newInfo.length > 1 ? Integer.parseInt(newInfo[1]) : 1;
                }
            }
            currentHunkLines.add(line);
        }
        
        // Add last hunk
        if (!currentHunkLines.isEmpty()) {
            Map<String, Object> hunk = new HashMap<>();
            hunk.put("oldStart", oldStart);
            hunk.put("oldLines", oldLines);
            hunk.put("newStart", newStart);
            hunk.put("newLines", newLines);
            hunk.put("content", String.join("\n", currentHunkLines));
            hunks.add(hunk);
        }
        
        return hunks;
    }

    /**
     * Escape JSON string
     */
    private String escapeJson(String str) {
        return str.replace("\\", "\\\\")
                 .replace("\"", "\\\"")
                 .replace("\n", "\\n")
                 .replace("\r", "\\r")
                 .replace("\t", "\\t");
    }

    /**
     * Build hierarchical union directory structure with status metadata
     */
    private Map<String, Object> buildHierarchicalUnionStructure(Path orgDirectory, String sourceBranch, String targetBranch) {
        try {
            // Get file lists from both branches
            List<String> sourceFiles = gitService.getFileList(orgDirectory, sourceBranch);
            List<String> targetFiles = gitService.getFileList(orgDirectory, targetBranch);

            // Create sets for efficient lookup
            Set<String> sourceSet = new HashSet<>(sourceFiles);
            Set<String> targetSet = new HashSet<>(targetFiles);

            // Build hierarchical structure
            Map<String, Object> rootNode = new HashMap<>();
            rootNode.put("name", orgDirectory.getFileName().toString());
            rootNode.put("type", "directory");
            rootNode.put("path", "");
            rootNode.put("status", "common");
            rootNode.put("children", new HashMap<String, Object>());

            // Process all files to build the tree
            Set<String> allPaths = new HashSet<>();
            allPaths.addAll(sourceFiles);
            allPaths.addAll(targetFiles);

            for (String filePath : allPaths) {
                addFileToHierarchy(rootNode, filePath, sourceSet, targetSet, sourceBranch, targetBranch);
            }

            // Calculate summary statistics
            Map<String, Object> summary = calculateHierarchySummary(rootNode);

            Map<String, Object> result = new HashMap<>();
            result.put("hierarchicalStructure", rootNode);
            result.put("summary", summary);
            result.put("sourceBranch", sourceBranch);
            result.put("targetBranch", targetBranch);
            result.put("orgPath", orgDirectory.toString());

            return result;

        } catch (Exception e) {
            throw new RuntimeException("Error building hierarchical structure: " + e.getMessage(), e);
        }
    }

    /**
     * Add a file to the hierarchical structure
     */
    @SuppressWarnings("unchecked")
    private void addFileToHierarchy(Map<String, Object> rootNode, String filePath, Set<String> sourceSet, Set<String> targetSet, String sourceBranch, String targetBranch) {
        String[] pathParts = filePath.split("/");
        Map<String, Object> currentLevel = (Map<String, Object>) rootNode.get("children");
        
        StringBuilder currentPath = new StringBuilder();
        
        // Create directory structure
        for (int i = 0; i < pathParts.length - 1; i++) {
            String dirName = pathParts[i];
            currentPath.append(dirName).append("/");
            
            if (!currentLevel.containsKey(dirName)) {
                Map<String, Object> dirNode = new HashMap<>();
                dirNode.put("name", dirName);
                dirNode.put("type", "directory");
                dirNode.put("path", currentPath.toString());
                dirNode.put("status", "same");
                dirNode.put("children", new HashMap<String, Object>());
                currentLevel.put(dirName, dirNode);
            }
            
            currentLevel = (Map<String, Object>) currentLevel.get(dirName);
            currentLevel = (Map<String, Object>) currentLevel.get("children");
        }
        
        // Add the file
        String fileName = pathParts[pathParts.length - 1];
        currentPath.append(fileName);
        
        Map<String, Object> fileNode = new HashMap<>();
        fileNode.put("name", fileName);
        fileNode.put("type", "file");
        fileNode.put("path", currentPath.toString());
        
        // Determine status
        boolean inSource = sourceSet.contains(filePath);
        boolean inTarget = targetSet.contains(filePath);
        
        String status;
        if (inSource && inTarget) {
            status = "common";
        } else if (inSource && !inTarget) {
            status = "missing_in_target";
        } else if (!inSource && inTarget) {
            status = "missing_in_source";
        } else {
            status = "unknown";
        }
        
        fileNode.put("status", status);
        
        // Add metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("inSource", inSource);
        metadata.put("inTarget", inTarget);
        metadata.put("sourceBranch", sourceBranch);
        metadata.put("targetBranch", targetBranch);
        fileNode.put("metadata", metadata);
        
        currentLevel.put(fileName, fileNode);
        
        // Update parent directory status
        updateParentStatus(rootNode, filePath, status);
    }

    /**
     * Update parent directory status based on children
     */
    @SuppressWarnings("unchecked")
    private void updateParentStatus(Map<String, Object> rootNode, String filePath, String fileStatus) {
        String[] pathParts = filePath.split("/");
        Map<String, Object> currentLevel = (Map<String, Object>) rootNode.get("children");
        
        for (int i = 0; i < pathParts.length - 1; i++) {
            String dirName = pathParts[i];
            
            if (currentLevel.containsKey(dirName)) {
                Map<String, Object> dirNode = (Map<String, Object>) currentLevel.get(dirName);
                String currentStatus = (String) dirNode.get("status");
                
                // Update directory status based on file status
                String newStatus = determineDirectoryStatus(currentStatus, fileStatus);
                dirNode.put("status", newStatus);
                
                currentLevel = (Map<String, Object>) dirNode.get("children");
            } else {
                break;
            }
        }
    }

    /**
     * Determine directory status based on file status
     */
    private String determineDirectoryStatus(String currentDirStatus, String fileStatus) {
        if ("common".equals(currentDirStatus) && "same".equals(fileStatus)) {
            return "same";
        } else if ("common".equals(currentDirStatus) && "modified".equals(fileStatus)) {
            return "modified";
        } else if ("common".equals(currentDirStatus) && "missing_in_target".equals(fileStatus)) {
            return "modified";
        } else if ("common".equals(currentDirStatus) && "missing_in_source".equals(fileStatus)) {
            return "modified";
        } else if ("same".equals(currentDirStatus) && "same".equals(fileStatus)) {
            return "same";
        } else if ("same".equals(currentDirStatus) && "modified".equals(fileStatus)) {
            return "modified";
        } else if ("same".equals(currentDirStatus) && "missing_in_target".equals(fileStatus)) {
            return "modified";
        } else if ("same".equals(currentDirStatus) && "missing_in_source".equals(fileStatus)) {
            return "modified";
        } else if ("missing_in_target".equals(currentDirStatus) && "missing_in_target".equals(fileStatus)) {
            return "missing_in_target";
        } else if ("missing_in_source".equals(currentDirStatus) && "missing_in_source".equals(fileStatus)) {
            return "missing_in_source";
        } else {
            return "modified";
        }
    }

    /**
     * Calculate summary statistics for the hierarchy
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> calculateHierarchySummary(Map<String, Object> rootNode) {
        Map<String, Integer> statusCounts = new HashMap<>();
        statusCounts.put("common", 0);
        statusCounts.put("missing_in_source", 0);
        statusCounts.put("missing_in_target", 0);
        statusCounts.put("modified", 0);
        statusCounts.put("same", 0);
        
        Map<String, Integer> typeCounts = new HashMap<>();
        typeCounts.put("files", 0);
        typeCounts.put("directories", 0);
        
        countItems(rootNode, statusCounts, typeCounts);
        
        Map<String, Object> summary = new HashMap<>();
        summary.put("statusCounts", statusCounts);
        summary.put("typeCounts", typeCounts);
        summary.put("totalItems", statusCounts.values().stream().mapToInt(Integer::intValue).sum());
        
        return summary;
    }

    /**
     * Recursively count items in the hierarchy
     */
    @SuppressWarnings("unchecked")
    private void countItems(Map<String, Object> node, Map<String, Integer> statusCounts, Map<String, Integer> typeCounts) {
        String status = (String) node.get("status");
        String type = (String) node.get("type");
        
        // Count status
        statusCounts.put(status, statusCounts.get(status) + 1);
        
        // Count type
        if ("file".equals(type)) {
            typeCounts.put("files", typeCounts.get("files") + 1);
        } else if ("directory".equals(type)) {
            typeCounts.put("directories", typeCounts.get("directories") + 1);
        }
        
        // Recursively count children
        if (node.containsKey("children")) {
            Map<String, Object> children = (Map<String, Object>) node.get("children");
            for (Object child : children.values()) {
                if (child instanceof Map) {
                    countItems((Map<String, Object>) child, statusCounts, typeCounts);
                }
            }
        }
    }

    /**
     * Build hierarchical union directory structure using JGit
     */
    private Map<String, Object> buildHierarchicalUnionJGit(Path repoPath, String sourceBranch, String targetBranch) throws Exception {
        // Get file sets from both branches using JGit
        Set<String> sourceFiles = getGitTreeFiles(repoPath, sourceBranch);
        Set<String> targetFiles = getGitTreeFiles(repoPath, targetBranch);
        Set<String> allFiles = new HashSet<>();
        allFiles.addAll(sourceFiles);
        allFiles.addAll(targetFiles);

        // Build hierarchical tree
        Map<String, Object> root = new HashMap<>();
        root.put("name", repoPath.getFileName().toString());
        root.put("type", "directory");
        root.put("path", "");
        root.put("status", "same");
        root.put("children", new HashMap<String, Object>());
        root.put("repoPath", repoPath.toString()); // Store repo path for file difference checking

        for (String filePath : allFiles) {
            addFileToHierarchyJGit(root, filePath, sourceFiles, targetFiles, sourceBranch, targetBranch);
        }
        Map<String, Object> summary = calculateHierarchySummary(root);
        Map<String, Object> result = new HashMap<>();
        result.put("hierarchicalStructure", root);
        result.put("summary", summary);
        result.put("sourceBranch", sourceBranch);
        result.put("targetBranch", targetBranch);
        result.put("orgPath", repoPath.toString());
        return result;
    }

    /**
     * Get all file paths in a branch using JGit
     */
    private Set<String> getGitTreeFiles(Path repoPath, String branch) throws Exception {
        try (org.eclipse.jgit.api.Git git = org.eclipse.jgit.api.Git.open(repoPath.toFile());
             org.eclipse.jgit.lib.Repository repository = git.getRepository();
             org.eclipse.jgit.revwalk.RevWalk revWalk = new org.eclipse.jgit.revwalk.RevWalk(repository)) {
            org.eclipse.jgit.lib.ObjectId branchId = repository.resolve(branch);
            if (branchId == null) throw new IllegalArgumentException("Branch not found: " + branch);
            org.eclipse.jgit.revwalk.RevCommit commit = revWalk.parseCommit(branchId);
            org.eclipse.jgit.revwalk.RevTree tree = commit.getTree();
            Set<String> files = new HashSet<>();
            try (org.eclipse.jgit.treewalk.TreeWalk treeWalk = new org.eclipse.jgit.treewalk.TreeWalk(repository)) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(true);
                while (treeWalk.next()) {
                    if (!treeWalk.isSubtree()) {
                        files.add(treeWalk.getPathString());
                    }
                }
            }
            return files;
        }
    }

    /**
     * Add a file to the hierarchical structure (JGit version)
     */
    @SuppressWarnings("unchecked")
    private void addFileToHierarchyJGit(Map<String, Object> rootNode, String filePath, Set<String> sourceSet, Set<String> targetSet, String sourceBranch, String targetBranch) {
        String[] pathParts = filePath.split("/");
        Map<String, Object> currentLevel = (Map<String, Object>) rootNode.get("children");
        StringBuilder currentPath = new StringBuilder();
        for (int i = 0; i < pathParts.length - 1; i++) {
            String dirName = pathParts[i];
            currentPath.append(dirName).append("/");
            if (!currentLevel.containsKey(dirName)) {
                Map<String, Object> dirNode = new HashMap<>();
                dirNode.put("name", dirName);
                dirNode.put("type", "directory");
                dirNode.put("path", currentPath.toString());
                dirNode.put("status", "same");
                dirNode.put("children", new HashMap<String, Object>());
                currentLevel.put(dirName, dirNode);
            }
            currentLevel = (Map<String, Object>) currentLevel.get(dirName);
            currentLevel = (Map<String, Object>) currentLevel.get("children");
        }
        String fileName = pathParts[pathParts.length - 1];
        currentPath.append(fileName);
        Map<String, Object> fileNode = new HashMap<>();
        fileNode.put("name", fileName);
        fileNode.put("type", "file");
        fileNode.put("path", currentPath.toString());
        boolean inSource = sourceSet.contains(filePath);
        boolean inTarget = targetSet.contains(filePath);
        String status;
        if (inSource && inTarget) {
            // Check if files have actual differences
            Path repoPath = Paths.get((String) rootNode.get("repoPath"));
            boolean hasDifferences = hasFileDifferences(repoPath, sourceBranch, targetBranch, filePath);
            status = hasDifferences ? "modified" : "same";
        } else if (inSource && !inTarget) {
            status = "missing_in_target";
        } else if (!inSource && inTarget) {
            status = "missing_in_source";
        } else {
            status = "unknown";
        }
        fileNode.put("status", status);
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("inSource", inSource);
        metadata.put("inTarget", inTarget);
        metadata.put("sourceBranch", sourceBranch);
        metadata.put("targetBranch", targetBranch);
        fileNode.put("metadata", metadata);
        currentLevel.put(fileName, fileNode);
        updateParentStatus(rootNode, filePath, status);
    }

    /**
     * Check if a file has differences between two branches
     */
    private boolean hasFileDifferences(Path repoPath, String sourceBranch, String targetBranch, String filePath) {
        try (org.eclipse.jgit.api.Git git = org.eclipse.jgit.api.Git.open(repoPath.toFile());
             org.eclipse.jgit.lib.Repository repository = git.getRepository();
             org.eclipse.jgit.revwalk.RevWalk revWalk = new org.eclipse.jgit.revwalk.RevWalk(repository)) {
            
            org.eclipse.jgit.lib.ObjectId sourceId = repository.resolve(sourceBranch);
            org.eclipse.jgit.lib.ObjectId targetId = repository.resolve(targetBranch);
            
            if (sourceId == null || targetId == null) {
                return false;
            }
            
            org.eclipse.jgit.revwalk.RevCommit sourceCommit = revWalk.parseCommit(sourceId);
            org.eclipse.jgit.revwalk.RevCommit targetCommit = revWalk.parseCommit(targetId);
            
            // Get the tree for each branch
            org.eclipse.jgit.revwalk.RevTree sourceTree = sourceCommit.getTree();
            org.eclipse.jgit.revwalk.RevTree targetTree = targetCommit.getTree();
            
            // Use TreeWalk to compare the specific file
            try (org.eclipse.jgit.treewalk.TreeWalk treeWalk = new org.eclipse.jgit.treewalk.TreeWalk(repository)) {
                treeWalk.addTree(sourceTree);
                treeWalk.addTree(targetTree);
                treeWalk.setFilter(org.eclipse.jgit.treewalk.filter.PathFilter.create(filePath));
                treeWalk.setRecursive(false);
                
                if (treeWalk.next()) {
                    // Check if the file exists in both trees
                    org.eclipse.jgit.lib.ObjectId sourceFileId = treeWalk.getObjectId(0);
                    org.eclipse.jgit.lib.ObjectId targetFileId = treeWalk.getObjectId(1);
                    
                    // If either file doesn't exist, there are differences
                    if (sourceFileId == null || targetFileId == null) {
                        return true;
                    }
                    
                    // Compare the object IDs - if they're different, the files have differences
                    return !sourceFileId.equals(targetFileId);
                }
            }
            
            return false;
        } catch (Exception e) {
            // If there's an error checking differences, assume there are differences
            System.err.println("Error checking file differences for " + filePath + ": " + e.getMessage());
            return true;
        }
    }
} 