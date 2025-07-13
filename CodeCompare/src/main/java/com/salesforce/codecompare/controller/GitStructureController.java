package com.salesforce.codecompare.controller;

import com.salesforce.codecompare.model.CompareResponse;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.adivaste.CodeCompare.service.GitService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/git-structure")
@CrossOrigin(origins = "*")
public class GitStructureController {

    @Autowired
    private GitService gitService;

    /**
     * Get directory structure from git repository respecting .gitignore
     */
    @GetMapping("/directory")
    public ResponseEntity<CompareResponse> getGitDirectoryStructure(
            @RequestParam String repoPath,
            @RequestParam(required = false, defaultValue = "HEAD") String branch) {
        
        try {
            Path repositoryPath = Paths.get(repoPath);
            if (!Files.exists(repositoryPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Repository path does not exist: " + repoPath));
            }

            Map<String, Object> structure = getGitStructure(repositoryPath, branch);
            return ResponseEntity.ok(CompareResponse.success(structure));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting git directory structure: " + e.getMessage()));
        }
    }

    /**
     * Get directory structure from git repository focusing on force-app
     */
    @GetMapping("/force-app")
    public ResponseEntity<CompareResponse> getForceAppStructure(
            @RequestParam String repoPath,
            @RequestParam(required = false, defaultValue = "HEAD") String branch) {
        
        try {
            Path repositoryPath = Paths.get(repoPath);
            if (!Files.exists(repositoryPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Repository path does not exist: " + repoPath));
            }

            Map<String, Object> structure = getForceAppGitStructure(repositoryPath, branch);
            return ResponseEntity.ok(CompareResponse.success(structure));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting force-app structure: " + e.getMessage()));
        }
    }

    /**
     * Compare directory structure between two branches
     */
    @GetMapping("/compare")
    public ResponseEntity<CompareResponse> compareGitStructure(
            @RequestParam String repoPath,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch,
            @RequestParam(required = false, defaultValue = "false") boolean forceAppOnly) {
        
        try {
            Path repositoryPath = Paths.get(repoPath);
            if (!Files.exists(repositoryPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Repository path does not exist: " + repoPath));
            }

            Map<String, Object> comparison;
            if (forceAppOnly) {
                comparison = compareForceAppStructure(repositoryPath, sourceBranch, targetBranch);
            } else {
                comparison = compareGitStructure(repositoryPath, sourceBranch, targetBranch);
            }
            
            return ResponseEntity.ok(CompareResponse.success(comparison));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error comparing git structure: " + e.getMessage()));
        }
    }

    /**
     * Get detailed file tree with metadata
     */
    @GetMapping("/tree")
    public ResponseEntity<CompareResponse> getGitFileTree(
            @RequestParam String repoPath,
            @RequestParam(required = false, defaultValue = "HEAD") String branch,
            @RequestParam(required = false) String path) {
        
        try {
            Path repositoryPath = Paths.get(repoPath);
            if (!Files.exists(repositoryPath)) {
                return ResponseEntity.badRequest()
                    .body(CompareResponse.error("Repository path does not exist: " + repoPath));
            }

            Map<String, Object> tree = getGitFileTree(repositoryPath, branch, path);
            return ResponseEntity.ok(CompareResponse.success(tree));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(CompareResponse.error("Error getting git file tree: " + e.getMessage()));
        }
    }

    /**
     * Get git structure using JGit
     */
    private Map<String, Object> getGitStructure(Path repoPath, String branch) throws IOException, GitAPIException {
        try (Git git = Git.open(repoPath.toFile());
             Repository repository = git.getRepository();
             RevWalk revWalk = new RevWalk(repository)) {

            ObjectId branchId = repository.resolve(branch);
            if (branchId == null) {
                throw new IllegalArgumentException("Branch not found: " + branch);
            }

            RevCommit commit = revWalk.parseCommit(branchId);
            RevTree tree = commit.getTree();

            List<Map<String, Object>> files = new ArrayList<>();
            List<Map<String, Object>> directories = new ArrayList<>();

            try (TreeWalk treeWalk = new TreeWalk(repository)) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(true);

                while (treeWalk.next()) {
                    String path = treeWalk.getPathString();
                    
                    Map<String, Object> item = new HashMap<>();
                    item.put("path", path);
                    item.put("name", getFileName(path));
                    item.put("size", treeWalk.getObjectId(0).getName());
                    
                    if (treeWalk.isSubtree()) {
                        directories.add(item);
                    } else {
                        files.add(item);
                    }
                }
            }

            Map<String, Object> structure = new HashMap<>();
            structure.put("repository", repoPath.toString());
            structure.put("branch", branch);
            structure.put("commit", commit.getName());
            structure.put("commitMessage", commit.getFullMessage());
            structure.put("author", commit.getAuthorIdent().getName());
            structure.put("date", commit.getAuthorIdent().getWhen());
            structure.put("files", files);
            structure.put("directories", directories);
            structure.put("totalFiles", files.size());
            structure.put("totalDirectories", directories.size());

            return structure;
        }
    }

    /**
     * Get force-app structure using JGit
     */
    private Map<String, Object> getForceAppGitStructure(Path repoPath, String branch) throws IOException, GitAPIException {
        try (Git git = Git.open(repoPath.toFile());
             Repository repository = git.getRepository();
             RevWalk revWalk = new RevWalk(repository)) {

            ObjectId branchId = repository.resolve(branch);
            if (branchId == null) {
                throw new IllegalArgumentException("Branch not found: " + branch);
            }

            RevCommit commit = revWalk.parseCommit(branchId);
            RevTree tree = commit.getTree();

            List<Map<String, Object>> files = new ArrayList<>();
            Map<String, List<String>> metadataGroups = new HashMap<>();

            try (TreeWalk treeWalk = new TreeWalk(repository)) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(true);
                treeWalk.setFilter(PathFilter.create("force-app"));

                while (treeWalk.next()) {
                    String path = treeWalk.getPathString();
                    
                    // Skip if not in force-app
                    if (!path.startsWith("force-app/")) {
                        continue;
                    }

                    // Remove force-app/ prefix for relative path
                    String relativePath = path.substring("force-app/".length());
                    
                    Map<String, Object> item = new HashMap<>();
                    item.put("path", relativePath);
                    item.put("fullPath", path);
                    item.put("name", getFileName(relativePath));
                    item.put("size", treeWalk.getObjectId(0).getName());
                    
                    if (!treeWalk.isSubtree()) {
                        files.add(item);
                        
                        // Group by metadata type
                        String metadataType = getMetadataType(relativePath);
                        metadataGroups.computeIfAbsent(metadataType, k -> new ArrayList<>()).add(relativePath);
                    }
                }
            }

            Map<String, Object> structure = new HashMap<>();
            structure.put("repository", repoPath.toString());
            structure.put("branch", branch);
            structure.put("commit", commit.getName());
            structure.put("files", files);
            structure.put("metadataGroups", metadataGroups);
            structure.put("totalFiles", files.size());

            return structure;
        }
    }

    /**
     * Compare git structure between two branches
     */
    private Map<String, Object> compareGitStructure(Path repoPath, String sourceBranch, String targetBranch) 
            throws IOException, GitAPIException {
        
        Map<String, Object> sourceStructure = getGitStructure(repoPath, sourceBranch);
        Map<String, Object> targetStructure = getGitStructure(repoPath, targetBranch);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sourceFiles = (List<Map<String, Object>>) sourceStructure.get("files");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> targetFiles = (List<Map<String, Object>>) targetStructure.get("files");

        Set<String> sourcePaths = sourceFiles.stream()
            .map(file -> (String) file.get("path"))
            .collect(Collectors.toSet());
        
        Set<String> targetPaths = targetFiles.stream()
            .map(file -> (String) file.get("path"))
            .collect(Collectors.toSet());

        List<String> added = targetPaths.stream()
            .filter(path -> !sourcePaths.contains(path))
            .collect(Collectors.toList());

        List<String> removed = sourcePaths.stream()
            .filter(path -> !targetPaths.contains(path))
            .collect(Collectors.toList());

        List<String> common = sourcePaths.stream()
            .filter(targetPaths::contains)
            .collect(Collectors.toList());

        Map<String, Object> comparison = new HashMap<>();
        comparison.put("sourceBranch", sourceBranch);
        comparison.put("targetBranch", targetBranch);
        comparison.put("added", added);
        comparison.put("removed", removed);
        comparison.put("common", common);
        comparison.put("sourceCount", sourceFiles.size());
        comparison.put("targetCount", targetFiles.size());
        comparison.put("addedCount", added.size());
        comparison.put("removedCount", removed.size());
        comparison.put("commonCount", common.size());

        return comparison;
    }

    /**
     * Compare force-app structure between two branches
     */
    private Map<String, Object> compareForceAppStructure(Path repoPath, String sourceBranch, String targetBranch) 
            throws IOException, GitAPIException {
        
        Map<String, Object> sourceStructure = getForceAppGitStructure(repoPath, sourceBranch);
        Map<String, Object> targetStructure = getForceAppGitStructure(repoPath, targetBranch);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sourceFiles = (List<Map<String, Object>>) sourceStructure.get("files");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> targetFiles = (List<Map<String, Object>>) targetStructure.get("files");

        Set<String> sourcePaths = sourceFiles.stream()
            .map(file -> (String) file.get("path"))
            .collect(Collectors.toSet());
        
        Set<String> targetPaths = targetFiles.stream()
            .map(file -> (String) file.get("path"))
            .collect(Collectors.toSet());

        List<String> added = targetPaths.stream()
            .filter(path -> !sourcePaths.contains(path))
            .collect(Collectors.toList());

        List<String> removed = sourcePaths.stream()
            .filter(path -> !targetPaths.contains(path))
            .collect(Collectors.toList());

        List<String> common = sourcePaths.stream()
            .filter(targetPaths::contains)
            .collect(Collectors.toList());

        // Group by metadata type
        Map<String, List<String>> addedGroups = groupByMetadataType(added);
        Map<String, List<String>> removedGroups = groupByMetadataType(removed);
        Map<String, List<String>> commonGroups = groupByMetadataType(common);

        Map<String, Object> comparison = new HashMap<>();
        comparison.put("sourceBranch", sourceBranch);
        comparison.put("targetBranch", targetBranch);
        comparison.put("added", added);
        comparison.put("removed", removed);
        comparison.put("common", common);
        comparison.put("addedGroups", addedGroups);
        comparison.put("removedGroups", removedGroups);
        comparison.put("commonGroups", commonGroups);
        comparison.put("sourceCount", sourceFiles.size());
        comparison.put("targetCount", targetFiles.size());
        comparison.put("addedCount", added.size());
        comparison.put("removedCount", removed.size());
        comparison.put("commonCount", common.size());

        return comparison;
    }

    /**
     * Get git file tree with metadata
     */
    private Map<String, Object> getGitFileTree(Path repoPath, String branch, String path) 
            throws IOException, GitAPIException {
        
        try (Git git = Git.open(repoPath.toFile());
             Repository repository = git.getRepository();
             RevWalk revWalk = new RevWalk(repository)) {

            ObjectId branchId = repository.resolve(branch);
            if (branchId == null) {
                throw new IllegalArgumentException("Branch not found: " + branch);
            }

            RevCommit commit = revWalk.parseCommit(branchId);
            RevTree tree = commit.getTree();

            List<Map<String, Object>> treeItems = new ArrayList<>();

            try (TreeWalk treeWalk = new TreeWalk(repository)) {
                treeWalk.addTree(tree);
                treeWalk.setRecursive(false);

                if (path != null && !path.isEmpty()) {
                    treeWalk.setFilter(PathFilter.create(path));
                }

                while (treeWalk.next()) {
                    String itemPath = treeWalk.getPathString();
                    
                    Map<String, Object> item = new HashMap<>();
                    item.put("path", itemPath);
                    item.put("name", getFileName(itemPath));
                    item.put("isDirectory", treeWalk.isSubtree());
                    
                    if (!treeWalk.isSubtree()) {
                        item.put("size", treeWalk.getObjectId(0).getName());
                    }
                    
                    treeItems.add(item);
                }
            }

            Map<String, Object> treeData = new HashMap<>();
            treeData.put("repository", repoPath.toString());
            treeData.put("branch", branch);
            treeData.put("path", path != null ? path : "/");
            treeData.put("items", treeItems);
            treeData.put("totalItems", treeItems.size());

            return treeData;
        }
    }

    /**
     * Get file name from path
     */
    private String getFileName(String path) {
        int lastSlash = path.lastIndexOf('/');
        return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
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
        if (filePath.contains("/lwc/")) return "Lightning Web Components";
        if (filePath.contains("/aura/")) return "Lightning Components";
        if (filePath.contains("/labels/")) return "Custom Labels";
        if (filePath.contains("/customMetadata/")) return "Custom Metadata";
        if (filePath.contains("/package.xml")) return "Package";
        
        return "Other";
    }
} 